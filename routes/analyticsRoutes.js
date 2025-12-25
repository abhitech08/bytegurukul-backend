const express = require('express');
const router = express.Router();
const { User, Course, Enrollment, Submission, Review, Task, InstructorEarnings, Order, Progress, sequelize } = require('../models');
const { protect } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { Op } = require('sequelize');

// @route   GET /api/analytics/instructor/dashboard
router.get('/instructor/dashboard', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const courses = await Course.findAll({ where: { instructorId: userId } });

        if (courses.length === 0) {
            return res.json({
                success: true,
                data: { totalCourses: 0, totalEnrollments: 0, totalRevenue: 0, averageRating: 0, courses: [] }
            });
        }

        const courseIds = courses.map(c => c.id);
        const enrollments = await Enrollment.findAll({ where: { courseId: courseIds } });
        const reviews = await Review.findAll({ where: { courseId: courseIds } });

        const totalRevenue = enrollments.length * 500;
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;

        const courseStats = courses.map(course => ({
            courseId: course.id,
            title: course.title,
            enrollments: enrollments.filter(e => e.courseId === course.id).length,
            revenue: enrollments.filter(e => e.courseId === course.id).length * 500,
            rating: (reviews.filter(r => r.courseId === course.id).reduce((sum, r) => sum + r.rating, 0) / (reviews.filter(r => r.courseId === course.id).length || 1)).toFixed(2)
        }));

        res.json({ success: true, data: { totalCourses: courses.length, totalEnrollments: enrollments.length, totalRevenue, averageRating: avgRating, courses: courseStats } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/course/:courseId
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const course = await Course.findByPk(courseId);
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });
        if (course.instructorId !== req.user.id) return res.status(403).json({ success: false, message: "Unauthorized access" });

        const enrollments = await Enrollment.findAll({ where: { courseId }, include: [{ model: User, attributes: ['id', 'name', 'email'] }] });
        const reviews = await Review.findAll({ where: { courseId } });
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;

        res.json({ success: true, data: { courseId, courseTitle: course.title, totalEnrollments: enrollments.length, totalReviews: reviews.length, averageRating: avgRating, revenue: enrollments.length * 500, students: enrollments.map(e => ({ studentId: e.User.id, name: e.User.name, email: e.User.email, enrolledAt: e.enrollmentDate })) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/admin/dashboard
router.get('/admin/dashboard', protect, adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const studentCount = await User.count({ where: { role: 'student' } });
        const instructorCount = await User.count({ where: { role: 'instructor' } });
        const totalCourses = await Course.count();
        const totalEnrollments = await Enrollment.count();
        const totalRevenue = totalEnrollments * 500;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentEnrollments = await Enrollment.count({ where: { enrollmentDate: { [Op.gte]: sevenDaysAgo } } });

        res.json({ success: true, data: { totalUsers, studentCount, instructorCount, totalCourses, totalEnrollments, totalRevenue, recentEnrollments7Days: recentEnrollments } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/student/progress
router.get('/student/progress', protect, async (req, res) => {
    try {
        // FIX: Extract only the ID from the user object
        const userId = req.user.id || req.user; 

        // Get enrolled courses
        const enrollments = await Enrollment.findAll({
            where: { userId }, // Now correctly passes an integer
            include: [{ model: Course }]
        });

        // Get submissions
        const submissions = await Submission.findAll({
            where: { studentId: userId } // Use the integer ID here as well
        });

        const courseProgress = enrollments.map(enrollment => ({
            courseId: enrollment.Course?.id,
            courseName: enrollment.Course?.title || "Unknown Course",
            enrolledAt: enrollment.enrollmentDate
        }));

        res.json({
            success: true,
            data: {
                totalCoursesEnrolled: enrollments.length,
                totalSubmissions: submissions.length,
                courses: courseProgress
            }
        });
    } catch (error) {
        console.error("Progress Analytics Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// @route   GET /api/analytics/instructor/earnings/dashboard
router.get('/instructor/earnings/dashboard', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const totalEarnings = await InstructorEarnings.sum('netAmount', { where: { instructorId: userId } }) || 0;
        const pendingPayout = await InstructorEarnings.sum('netAmount', { where: { instructorId: userId, status: 'earned' } }) || 0;
        const paidAmount = await InstructorEarnings.sum('netAmount', { where: { instructorId: userId, status: 'paid' } }) || 0;
        const walletBalance = totalEarnings - paidAmount;
        const now = new Date();
        const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);

        res.json({ success: true, data: { walletBalance: Math.round(walletBalance / 100), pendingPayout: Math.round(pendingPayout / 100), nextPayoutDate: nextPayoutDate.toISOString().split('T')[0], totalEarned: Math.round(totalEarnings / 100) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/reports/monthly
router.get('/reports/monthly', protect, adminAuth, async (req, res) => {
    try {
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(); date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const enrollments = await Enrollment.count({ where: { enrollmentDate: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } } });
            monthlyData.push({ month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), enrollments, revenue: enrollments * 500 });
        }
        res.json({ success: true, data: monthlyData });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/platform
router.get('/platform', protect, adminAuth, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalCourses = await Course.count();
        const totalEnrollments = await Enrollment.count();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeUsers = await Enrollment.count({ where: { enrollmentDate: { [Op.gte]: thirtyDaysAgo } }, distinct: true, col: 'userId' });
        const completedCourses = await Progress.count({ where: { isCompleted: true } });
        const reviews = await Review.findAll();
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0;

        res.json({ success: true, data: { totalUsers, totalCourses, totalEnrollments, totalRevenue: totalEnrollments * 500, activeUsers, completionRate: totalEnrollments > 0 ? ((completedCourses / totalEnrollments) * 100).toFixed(2) : 0, averageRating: Number.parseFloat(avgRating) } });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// @route   GET /api/analytics/admin/top-courses
router.get('/admin/top-courses', protect, adminAuth, async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [
                { model: User, as: 'instructor', attributes: ['name'] },
                { model: Enrollment, attributes: [] }
            ],
            attributes: [
                'id', 'title',
                [sequelize.fn('COUNT', sequelize.col('Enrollments.id')), 'students']
            ],
            group: ['Course.id', 'Course.title', 'instructor.name'],
            order: [[sequelize.fn('COUNT', sequelize.col('Enrollments.id')), 'DESC']],
            limit: 5,
            subQuery: false
        });

        const topCourses = courses.map(course => ({
            id: course.id,
            name: course.title,
            instructor: course.instructor?.name || 'Unknown',
            students: parseInt(course.dataValues.enrollmentCount) || 0,
            revenue: `$${(parseInt(course.dataValues.enrollmentCount) || 0) * 500}`,
            rating: 4.8
        }));
        res.json({ success: true, data: topCourses });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// Helper function to format time ago
function getTimeAgo(date) {
    const diffMs = new Date() - new Date(date);
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 60) return `${mins} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
}

// @route   GET /api/analytics/admin/recent-activities
router.get('/admin/recent-activities', protect, adminAuth, async (req, res) => {
    try {
        const activities = [];
        const recentUsers = await User.findAll({ where: { createdAt: { [Op.gte]: new Date(Date.now() - 7 * 86400000) } }, order: [['createdAt', 'DESC']], limit: 5 });
        recentUsers.forEach(u => activities.push({ message: `New user: ${u.name}`, time: getTimeAgo(u.createdAt), priority: 'high' }));
        res.json({ success: true, data: activities.slice(0, 10) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

module.exports = router;
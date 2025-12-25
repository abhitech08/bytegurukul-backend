const express = require('express');
const router = express.Router();
const { Progress, Course, Lecture, User } = require('../models');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');

// @route   GET /api/progress/course/:courseId
// @desc    Get student's progress in a specific course
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user;

    // Find or create progress record
    const [progress] = await Progress.findOrCreate({
      where: { userId, courseId },
      defaults: {
        userId,
        courseId,
        completionPercentage: 0,
        totalTimeSpent: 0,
        lecturesCompleted: 0,
        isCompleted: false
      },
      include: [
        {
          model: Course,
          attributes: ['id', 'title', 'description', 'thumbnail']
        }
      ]
    });

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Progress retrieval error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/progress/course/:courseId
// @desc    Update student's course progress
router.put('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user;
    const {
      completionPercentage,
      totalTimeSpent,
      lecturesCompleted,
      totalLectures,
      currentLectureId,
      watchedLectureIds,
      performanceScore,
      notes
    } = req.body;

    const progress = await Progress.findOne({
      where: { userId, courseId }
    });

    if (progress) {
      // Determine if course is completed (all lectures watched or 100% completion)
      const isCompleted = completionPercentage === 100 || 
                         (totalLectures && lecturesCompleted >= totalLectures);

      // Update progress record
      await progress.update({
        completionPercentage: completionPercentage ?? progress.completionPercentage,
        totalTimeSpent: totalTimeSpent ?? progress.totalTimeSpent,
        lecturesCompleted: lecturesCompleted ?? progress.lecturesCompleted,
        totalLectures: totalLectures ?? progress.totalLectures,
        currentLectureId: currentLectureId ?? progress.currentLectureId,
        watchedLectureIds: watchedLectureIds ?? progress.watchedLectureIds,
        performanceScore: performanceScore ?? progress.performanceScore,
        notes: notes ?? progress.notes,
        isCompleted,
        completedAt: isCompleted ? new Date() : progress.completedAt,
        lastAccessedAt: new Date()
      });

      res.json({
        success: true,
        message: 'Progress updated successfully',
        data: progress
      });
    } else {
      return res.status(404).json({ message: 'Progress record not found' });
    }
  } catch (error) {
    console.error('Progress update error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/student/all
// @desc    Get all courses' progress for logged-in student
router.get('/student/all', protect, async (req, res) => {
  try {
    const userId = req.user;

    const allProgress = await Progress.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          attributes: ['id', 'title', 'description', 'thumbnail', 'instructorId'],
          include: [
            {
              model: User,
              as: 'instructor',
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ],
      order: [['lastAccessedAt', 'DESC']]
    });

    res.json({
      success: true,
      data: allProgress
    });
  } catch (error) {
    console.error('Error fetching all progress:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/progress/watch-lecture/:courseId/:lectureId
// @desc    Mark a lecture as watched
router.post('/watch-lecture/:courseId/:lectureId', protect, async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;
    const userId = req.user;
    const { timeWatched = 0 } = req.body;

    // Find progress or create new
    let progress = await Progress.findOne({
      where: { userId, courseId }
    });

    if (progress) {
      // Add to watched lectures if not already there
      const watched = Array.isArray(progress.watchedLectureIds) ? progress.watchedLectureIds : [];
      if (!watched.includes(Number.parseInt(lectureId))) {
        watched.push(Number.parseInt(lectureId));
      }

      // Get total lectures in course
      const totalLectures = await Lecture.count({ where: { courseId } });
      const lecturesCompleted = watched.length;
      const completionPercentage = totalLectures > 0 
        ? Math.round((lecturesCompleted / totalLectures) * 100)
        : 0;

      await progress.update({
        watchedLectureIds: watched,
        lecturesCompleted,
        totalLectures,
        completionPercentage,
        totalTimeSpent: (progress.totalTimeSpent || 0) + timeWatched,
        lastAccessedAt: new Date(),
        isCompleted: completionPercentage === 100
      });
    } else {
      progress = await Progress.create({
        userId,
        courseId,
        watchedLectureIds: [Number.parseInt(lectureId)]
      });
    }

    res.json({
      success: true,
      message: 'Lecture marked as watched',
      data: progress
    });
  } catch (error) {
    console.error('Watch lecture error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/analytics/:courseId
// @desc    Get course analytics (instructor view)
router.get('/analytics/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course belongs to instructor
    const course = await Course.findByPk(courseId);
    if (!course || course.instructorId !== req.user) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get all student progress
    const progressData = await Progress.findAll({
      where: { courseId },
      attributes: [
        'userId',
        'completionPercentage',
        'lecturesCompleted',
        'totalTimeSpent',
        'performanceScore',
        'isCompleted',
        'completedAt'
      ],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    // Calculate analytics
    const totalStudents = progressData.length;
    const completedStudents = progressData.filter(p => p.isCompleted).length;
    const avgCompletion = progressData.length > 0
      ? (progressData.reduce((sum, p) => sum + p.completionPercentage, 0) / progressData.length).toFixed(2)
      : 0;
    const avgTimeSpent = progressData.length > 0
      ? Math.round(progressData.reduce((sum, p) => sum + p.totalTimeSpent, 0) / progressData.length)
      : 0;
    const avgPerformance = progressData.length > 0
      ? (progressData.reduce((sum, p) => sum + (p.performanceScore || 0), 0) / progressData.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        courseId,
        courseName: course.title,
        totalStudents,
        completedStudents,
        completionRate: totalStudents > 0 ? ((completedStudents / totalStudents) * 100).toFixed(2) : 0,
        avgCompletion: Number.parseFloat(avgCompletion),
        avgTimeSpent,
        avgPerformance: Number.parseFloat(avgPerformance),
        studentProgress: progressData
      }
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/progress/course/:courseId
// @desc    Reset progress for a course (student can restart)
router.delete('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user;

    const progress = await Progress.findOne({
      where: { userId, courseId }
    });

    if (!progress) {
      return res.status(404).json({ message: 'Progress record not found' });
    }

    await progress.destroy();

    res.json({
      success: true,
      message: 'Progress reset successfully'
    });
  } catch (error) {
    console.error('Progress reset error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/analytics
// @desc    Get platform-wide progress analytics (admin only)
router.get('/analytics', protect, async (req, res) => {
  try {
    // Get all progress data
    const allProgress = await Progress.findAll({
      include: [
        {
          model: Course,
          attributes: ['id', 'title', 'instructorId']
        },
        {
          model: User,
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    // Calculate platform analytics
    const totalEnrollments = allProgress.length;
    const completedCourses = allProgress.filter(p => p.isCompleted).length;
    const completionRate = totalEnrollments > 0 ? ((completedCourses / totalEnrollments) * 100).toFixed(2) : 0;

    const avgCompletion = totalEnrollments > 0
      ? (allProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / totalEnrollments).toFixed(2)
      : 0;

    const avgTimeSpent = totalEnrollments > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.totalTimeSpent, 0) / totalEnrollments)
      : 0;

    // Group by course
    const courseAnalytics = {};
    allProgress.forEach(progress => {
      const courseId = progress.courseId;
      if (!courseAnalytics[courseId]) {
        courseAnalytics[courseId] = {
          courseId,
          courseName: progress.Course?.title || 'Unknown Course',
          totalStudents: 0,
          completedStudents: 0,
          avgCompletion: 0,
          avgTimeSpent: 0
        };
      }

      courseAnalytics[courseId].totalStudents++;
      if (progress.isCompleted) {
        courseAnalytics[courseId].completedStudents++;
      }
    });

    // Calculate averages for each course
    Object.values(courseAnalytics).forEach(course => {
      const courseProgress = allProgress.filter(p => p.courseId === course.courseId);
      course.avgCompletion = courseProgress.length > 0
        ? (courseProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / courseProgress.length).toFixed(2)
        : 0;
      course.avgTimeSpent = courseProgress.length > 0
        ? Math.round(courseProgress.reduce((sum, p) => sum + p.totalTimeSpent, 0) / courseProgress.length)
        : 0;
      course.completionRate = course.totalStudents > 0
        ? ((course.completedStudents / course.totalStudents) * 100).toFixed(2)
        : 0;
    });

    res.json({
      success: true,
      data: {
        totalEnrollments,
        completedCourses,
        completionRate: Number.parseFloat(completionRate),
        avgCompletion: Number.parseFloat(avgCompletion),
        avgTimeSpent,
        courses: Object.values(courseAnalytics)
      }
    });
  } catch (error) {
    console.error('Platform analytics error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

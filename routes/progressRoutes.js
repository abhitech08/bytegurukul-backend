const express = require('express');
const router = express.Router();
const { LectureProgress, Lecture, Enrollment, Progress, Course, User } = require('../models');
const { protect } = require('../middleware/auth');

// @route   POST /api/progress/:lectureId
// @desc    Update lecture progress
router.post('/:lectureId', protect, async (req, res) => {
  try {
    const { isCompleted, progressPercentage, timeSpent } = req.body;
    const { lectureId } = req.params;

    const lecture = await Lecture.findByPk(lectureId, { attributes: ['courseId'] });
    if (!lecture) return res.status(404).json({ success: false, message: "Lecture not found" });

    // Verify user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: { userId: req.user, courseId: lecture.courseId }
    });
    if (!enrollment) return res.status(403).json({ success: false, message: "Not enrolled in this course" });

    const [progress] = await LectureProgress.findOrCreate({
      where: { userId: req.user, lectureId },
      defaults: { isCompleted, progressPercentage, timeSpent }
    });

    if (progress) {
      await progress.update({
        isCompleted: isCompleted ?? progress.isCompleted,
        progressPercentage: progressPercentage || progress.progressPercentage,
        timeSpent: timeSpent || progress.timeSpent,
        completedAt: isCompleted ? new Date() : progress.completedAt,
        lastAccessedAt: new Date()
      });
    }

    res.json({ success: true, message: "Progress updated", data: progress });
  } catch (error) {
    console.error('Lecture progress error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

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

    // Also get lecture progress details
    const lectures = await Lecture.findAll({
      where: { courseId },
      attributes: ['id'],
      raw: true
    });

    const lectureIds = lectures.map(l => l.id);
    const lectureProgress = await LectureProgress.findAll({
      where: { userId, lectureId: lectureIds }
    });

    const completedCount = lectureProgress.filter(p => p.isCompleted).length;
    const totalLectures = lectureIds.length;
    const courseProgressPercentage = totalLectures > 0 ? (completedCount / totalLectures) * 100 : 0;

    res.json({
      success: true,
      data: {
        ...progress.toJSON(),
        lectureBreakdown: {
          courseProgress: Math.round(courseProgressPercentage),
          completedLectures: completedCount,
          totalLectures,
          lectures: lectureProgress
        }
      }
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

    if (!progress) {
      progress = await Progress.create({
        userId,
        courseId,
        watchedLectureIds: [Number.parseInt(lectureId)]
      });
    } else {
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

// @route   POST /api/progress/mark-complete
// @desc    Mark a lecture as complete
router.post('/mark-complete', protect, async (req, res) => {
  try {
    const { lectureId } = req.body;
    if (!lectureId) {
      return res.status(400).json({ success: false, message: "lectureId is required" });
    }

    const lecture = await Lecture.findByPk(lectureId, { attributes: ['courseId'] });
    if (!lecture) {
      return res.status(404).json({ success: false, message: "Lecture not found" });
    }

    const enrollment = await Enrollment.findOne({
      where: { userId: req.user, courseId: lecture.courseId }
    });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "Not enrolled in this course" });
    }

    const [lectureProgressRecord] = await LectureProgress.findOrCreate({
      where: { userId: req.user, lectureId },
      defaults: { isCompleted: true, progressPercentage: 100, completedAt: new Date() }
    });

    if (lectureProgressRecord) {
      if (lectureProgressRecord.isCompleted === false) {
        await lectureProgressRecord.update({
          isCompleted: true,
          progressPercentage: 100,
          completedAt: new Date()
        });
      }
    }

    res.json({ success: true, message: "Lecture marked as complete", data: lectureProgressRecord });
  } catch (error) {
    console.error('Mark complete error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/progress/dashboard/overview
// @desc    Get student's overall learning progress
router.get('/dashboard/overview', protect, async (req, res) => {
  try {
    const userId = req.user;

    const enrollments = await Enrollment.findAll({
      where: { userId },
      include: [{ model: Course }]
    });

    const courseProgress = [];

    for (const enrollment of enrollments) {
      const course = enrollment.Course;
      const lectures = await Lecture.findAll({
        where: { courseId: course.id }
      });

      const completedLectures = await LectureProgress.count({
        where: { userId, lectureId: lectures.map(l => l.id), isCompleted: true }
      });

      const progressPercentage = lectures.length > 0
        ? Math.round((completedLectures / lectures.length) * 100)
        : 0;

      courseProgress.push({
        courseId: course.id,
        courseName: course.title,
        totalLectures: lectures.length,
        completedLectures,
        progressPercentage
      });
    }

    const totalProgress = courseProgress.length > 0
      ? Math.round(courseProgress.reduce((sum, c) => sum + c.progressPercentage, 0) / courseProgress.length)
      : 0;

    res.json({
      success: true,
      data: {
        totalCoursesEnrolled: enrollments.length,
        totalProgress,
        courses: courseProgress
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error.message);
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

module.exports = router;

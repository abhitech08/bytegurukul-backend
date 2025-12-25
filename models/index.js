const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

module.exports = sequelize;


const db = {};

// Load all models
db.User = require('./user')(sequelize, DataTypes);
db.Course = require('./course')(sequelize, DataTypes);
db.Lecture = require('./Lecture')(sequelize, DataTypes);
db.Enrollment = require('./enrollment')(sequelize, DataTypes);
db.Progress = require('./Progress')(sequelize, DataTypes);
db.LectureProgress = require('./LectureProgress')(sequelize, DataTypes);
db.Application = require('./application')(sequelize, DataTypes);
db.Certificate = require('./certificate')(sequelize, DataTypes);
db.Comment = require('./Comment')(sequelize, DataTypes);
db.Notification = require('./Notification')(sequelize, DataTypes);
db.Task = require('./Task')(sequelize, DataTypes);
db.Submission = require('./Submission')(sequelize, DataTypes);
db.Pyq = require('./Pyq')(sequelize, DataTypes);
db.Review = require('./Review')(sequelize, DataTypes);
db.Wishlist = require('./Wishlist')(sequelize, DataTypes);
db.Project = require('./Project')(sequelize, DataTypes);
db.ProjectWishlist = require('./ProjectWishlist')(sequelize, DataTypes);
db.Order = require('./Order')(sequelize, DataTypes);
db.Chat = require('./Chat')(sequelize, DataTypes);
db.InstructorEarnings = require('./InstructorEarnings')(sequelize, DataTypes);
db.Internship = require('./internship')(sequelize, DataTypes);
db.InternshipApplication = require('./internshipApplication')(sequelize, DataTypes);
db.ActivityLog = require('./ActivityLog')(sequelize, DataTypes);

// --- Associations ---
db.User.hasMany(db.Course, { foreignKey: 'instructorId', as: 'courses' });
db.Course.belongsTo(db.User, { foreignKey: 'instructorId', as: 'instructor' });
db.User.hasMany(db.Enrollment, { foreignKey: 'userId' });
db.Enrollment.belongsTo(db.User, { foreignKey: 'userId' });
db.Course.hasMany(db.Enrollment, { foreignKey: 'courseId' });
db.Enrollment.belongsTo(db.Course, { foreignKey: 'courseId' });
db.User.hasMany(db.Progress, { foreignKey: 'userId' });
db.Progress.belongsTo(db.User, { foreignKey: 'userId' });
db.Course.hasMany(db.Progress, { foreignKey: 'courseId' });
db.Progress.belongsTo(db.Course, { foreignKey: 'courseId' });
db.Course.hasMany(db.Lecture, { foreignKey: 'courseId' });
db.Lecture.belongsTo(db.Course, { foreignKey: 'courseId' });
db.User.hasMany(db.LectureProgress, { foreignKey: 'userId' });
db.LectureProgress.belongsTo(db.User, { foreignKey: 'userId' });
db.Lecture.hasMany(db.LectureProgress, { foreignKey: 'lectureId' });
db.LectureProgress.belongsTo(db.Lecture, { foreignKey: 'lectureId' });
db.User.hasMany(db.Order, { foreignKey: 'userId' });
db.Order.belongsTo(db.User, { foreignKey: 'userId' });
db.Course.hasMany(db.Order, { foreignKey: 'courseId' });
db.Order.belongsTo(db.Course, { foreignKey: 'courseId' });
db.Project.hasMany(db.Order, { foreignKey: 'projectId' });
db.Order.belongsTo(db.Project, { foreignKey: 'projectId' });
db.User.hasMany(db.Certificate, { foreignKey: 'userId' });
db.Certificate.belongsTo(db.User, { foreignKey: 'userId' });
db.Course.hasMany(db.Certificate, { foreignKey: 'courseId' });
db.Certificate.belongsTo(db.Course, { foreignKey: 'courseId' });
db.User.hasMany(db.Application, { foreignKey: 'userId' });
db.Application.belongsTo(db.User, { foreignKey: 'userId' });
db.Application.hasMany(db.Certificate, { foreignKey: 'internshipId' });
db.Certificate.belongsTo(db.Application, { foreignKey: 'internshipId' });
db.User.hasMany(db.Submission, { foreignKey: 'studentId' });
db.Submission.belongsTo(db.User, { foreignKey: 'studentId' });
db.Task.hasMany(db.Submission, { foreignKey: 'taskId' });
db.Submission.belongsTo(db.Task, { foreignKey: 'taskId' });

// Project Wishlist associations
db.User.hasMany(db.ProjectWishlist, { foreignKey: 'userId' });
db.ProjectWishlist.belongsTo(db.User, { foreignKey: 'userId' });
db.Project.hasMany(db.ProjectWishlist, { foreignKey: 'projectId' });
db.ProjectWishlist.belongsTo(db.Project, { foreignKey: 'projectId' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// --- Improved Database Sync Function ---
async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection OK');

    // Sync in order of priority to ensure foreign keys work
    await db.User.sync({ force: false });
    await db.Course.sync({ force: false });
    await db.Project.sync({ force: false });
    await db.Application.sync({ force: false });
    await db.Enrollment.sync({ force: false }); // Explicitly sync Enrollment
    await db.ActivityLog.sync({ force: false }); // Sync ActivityLog table

    // Sync everything else
    await sequelize.sync({ force: false });
    console.log("All tables synced successfully!");

  } catch (error) {
    console.error("ERROR syncing database tables:", error);
    throw error;
  }
}

db.syncDatabase = syncDatabase;
module.exports = db;
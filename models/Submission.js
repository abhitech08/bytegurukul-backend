module.exports = function defineSubmission(sequelize, DataTypes) {
  const Submission = sequelize.define('Submission', {
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    studentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: { // 'draft', 'submitted', 'graded', 'rejected'
      type: DataTypes.STRING,
      defaultValue: 'draft'
    },
    grade: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    gradedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });
  return Submission;
};
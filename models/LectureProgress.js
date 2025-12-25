const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LectureProgress = sequelize.define('LectureProgress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    progressPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    timeSpent: {
      type: DataTypes.INTEGER, // in seconds
      defaultValue: 0,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    timestamps: true,
    tableName: 'lecture_progress'
  });

  return LectureProgress;
};

const { DataTypes } = require('sequelize');

module.exports = function defineProgress(sequelize, DataTypes) {
  const Progress = sequelize.define('Progress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        // *** FIXED: MUST MATCH USER TABLE NAME ***
        model: 'users',
        key: 'id'
      }
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'courses',
        key: 'id'
      }
    },

    completionPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    totalTimeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lecturesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    totalLectures: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    watchedLectureIds: {
      type: DataTypes.JSON,
      defaultValue: [],
      comment: 'Array of lecture IDs that student has watched'
    },
    currentLectureId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    performanceScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: { min: 0, max: 100 }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'progress',
    indexes: [
      { fields: ['userId', 'courseId'], unique: true }
    ]
  });

  return Progress;
};

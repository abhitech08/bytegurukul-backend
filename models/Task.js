module.exports = function defineTask(sequelize, DataTypes) {
  const Task = sequelize.define('Task', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    roleId: { // Role this task belongs to (android, web, cyber, etc.)
      type: DataTypes.STRING,
      allowNull: false
    },
    difficulty: { // 'easy', 'medium', 'hard'
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'medium'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    maxGrade: {
      type: DataTypes.INTEGER,
      defaultValue: 100
    },
    createdBy: { // Instructor/Admin who created task
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: { // 'active', 'closed', 'archived'
      type: DataTypes.STRING,
      defaultValue: 'active'
    }
  });
  return Task;
};

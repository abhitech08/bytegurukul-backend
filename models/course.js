module.exports = (sequelize, DataTypes) => {
  const Course = sequelize.define('Course', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Programming'
    },
    level: {
      type: DataTypes.STRING,
      defaultValue: 'Beginner'
    },
    duration: {
      type: DataTypes.STRING,
      allowNull: true
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    modules: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    lessons: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    instructorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        }
    }
  }, {
    tableName: 'courses'
  });

  return Course;
};
module.exports = (sequelize, DataTypes) => {
  const Certificate = sequelize.define('Certificate', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      }
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Courses',
        key: 'id',
      }
    },
    internshipId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Applications',
        key: 'id',
      }
    },
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    issuedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    certificateUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('course', 'internship'),
      defaultValue: 'course'
    }
  });

  return Certificate;
};

module.exports = (sequelize, DataTypes) => {
  const InternshipApplication = sequelize.define('InternshipApplication', {
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
        key: 'id'
      }
    },
    internshipId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Internships',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
      defaultValue: 'PENDING',
    },
    appliedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    decisionAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  });

  return InternshipApplication;
};

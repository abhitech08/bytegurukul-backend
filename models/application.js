module.exports = (sequelize, DataTypes) => {
  const Application = sequelize.define('Application', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    university: {
      type: DataTypes.STRING,
    },
    resumeText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
    // --- NEW FIELDS FOR INTERVIEW ---
    interviewDate: {
      type: DataTypes.DATE, 
      allowNull: true
    },
    interviewType: {
      type: DataTypes.STRING, // e.g., 'Technical', 'HR'
      allowNull: true
    },
    interviewLink: {
      type: DataTypes.STRING, // e.g., Google Meet link
      allowNull: true
    },
    internshipStatus: {
      type: DataTypes.ENUM('applied', 'ongoing', 'completed'),
      allowNull: true
    },
    isCertificatePaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'applications' // This matches what Orders table is looking for
  });

  return Application;
}
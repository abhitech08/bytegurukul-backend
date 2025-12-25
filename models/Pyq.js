module.exports = (sequelize, DataTypes) => {
  const Pyq = sequelize.define('Pyq', {
    subject: {
      type: DataTypes.STRING,
      allowNull: false
    },
    year: {
      type: DataTypes.STRING,
      allowNull: false
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: false
    },
    semester: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    filename: { // File ka naam store karenge
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: { // Pura path store karenge access ke liye
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  });

  return Pyq;
};

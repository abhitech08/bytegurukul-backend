module.exports = (sequelize, DataTypes) => {
  const Lecture = sequelize.define('Lecture', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    videoUrl: { // YouTube Embed URL or File Path
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    order: { // To sort videos (1, 2, 3...)
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });
  return Lecture;
};
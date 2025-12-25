module.exports = (sequelize, DataTypes) => {
  const Project = sequelize.define('Project', {
    title: { type: DataTypes.STRING, allowNull: false },
    domain: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 49 },
    description: { type: DataTypes.TEXT, allowNull: false },
    technologies: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    features: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    difficulty: { type: DataTypes.STRING, defaultValue: 'Intermediate' },
    rating: { type: DataTypes.FLOAT, defaultValue: 4.5 },
    icon: { type: DataTypes.STRING, defaultValue: '🚀' },
    demoLink: { type: DataTypes.STRING, allowNull: true },
    sourceCodeUrl: { type: DataTypes.STRING, allowNull: true },
    isPaid: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'projects' // FIXED: Explicitly set to lowercase for PostgreSQL
  });

  return Project;
};
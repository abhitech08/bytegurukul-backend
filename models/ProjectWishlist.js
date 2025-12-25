module.exports = (sequelize, DataTypes) => {
  const ProjectWishlist = sequelize.define('ProjectWishlist', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id'
      }
    }
  }, {
    tableName: 'project_wishlists',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'projectId']
      }
    ]
  });

  ProjectWishlist.associate = (models) => {
    ProjectWishlist.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ProjectWishlist.belongsTo(models.Project, { foreignKey: 'projectId', as: 'project' });
  };

  return ProjectWishlist;
};

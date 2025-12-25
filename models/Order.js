module.exports = function defineOrder(sequelize, DataTypes) {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    applicationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'applications',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    orderId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Razorpay order ID or mock_order_<timestamp>',
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount in paise (e.g., 99900 for 999 INR)',
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'INR',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('created', 'paid', 'failed'),
      defaultValue: 'created',
      allowNull: false,
      comment: 'Order status: created, paid, or failed',
    },
    isMock: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'True if this is a mock payment for development',
    },
    paymentDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Razorpay payment details or webhook payload',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'Orders',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'courseId'],
        name: 'idx_order_user_course',
      },
      {
        fields: ['status'],
        name: 'idx_order_status',
      },
    ],
  });

  return Order;
};

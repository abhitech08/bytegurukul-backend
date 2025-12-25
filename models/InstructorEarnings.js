module.exports = function defineInstructorEarnings(sequelize, DataTypes) {
  const InstructorEarnings = sequelize.define('InstructorEarnings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    instructorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    courseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Courses',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Orders',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Amount earned in paise (e.g., 99900 for 999 INR)',
    },
    platformFee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Platform fee deducted in paise',
    },
    netAmount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Net amount after platform fee in paise',
    },
    type: {
      type: DataTypes.ENUM('course_sale', 'project_sale', 'certificate_sale'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('earned', 'pending_payout', 'paid'),
      defaultValue: 'earned',
      allowNull: false,
    },
    payoutDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    payoutMethod: {
      type: DataTypes.ENUM('bank_transfer', 'upi', 'paypal'),
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'External payout transaction ID',
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
    tableName: 'InstructorEarnings',
    timestamps: true,
    indexes: [
      {
        fields: ['instructorId'],
        name: 'idx_earnings_instructor',
      },
      {
        fields: ['status'],
        name: 'idx_earnings_status',
      },
      {
        fields: ['createdAt'],
        name: 'idx_earnings_date',
      },
    ],
  });

  return InstructorEarnings;
};

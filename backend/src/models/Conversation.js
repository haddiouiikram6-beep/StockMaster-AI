import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'New Conversation'
    }
  },
  {
    sequelize,
    modelName: 'Conversation',
    tableName: 'conversations',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      }
    ]
  }
);

export { Conversation };
export default Conversation;

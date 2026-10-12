import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';

class RefreshToken extends Model {
  isExpired() {
    return new Date() >= this.expiresAt;
  }

  isValid() {
    return !this.revoked && !this.isExpired();
  }
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false
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
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
  {
    sequelize,
    modelName: 'RefreshToken',
    tableName: 'refresh_tokens',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['token']
      }
    ]
  }
);

export { RefreshToken };
export default RefreshToken;

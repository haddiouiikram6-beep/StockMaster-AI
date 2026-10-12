import { Sequelize } from 'sequelize';
import { sequelize } from '../config/database.js';

import User from './User.js';
import RefreshToken from './RefreshToken.js';
import Category from './Category.js';
import Supplier from './Supplier.js';
import Product from './Product.js';
import StockMovement from './StockMovement.js';
import Conversation from './Conversation.js';
import Message from './Message.js';

// User <-> RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Category <-> Product
Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products', onDelete: 'RESTRICT' });
Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Supplier <-> Product
Supplier.hasMany(Product, { foreignKey: 'supplierId', as: 'products', onDelete: 'SET NULL' });
Product.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

// Product <-> StockMovement
Product.hasMany(StockMovement, { foreignKey: 'productId', as: 'stockMovements', onDelete: 'RESTRICT' });
StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User <-> StockMovement
User.hasMany(StockMovement, { foreignKey: 'userId', as: 'stockMovements', onDelete: 'RESTRICT' });
StockMovement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> Conversation
User.hasMany(Conversation, { foreignKey: 'userId', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Conversation <-> Message
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

export {
  sequelize,
  Sequelize,
  User,
  RefreshToken,
  Category,
  Supplier,
  Product,
  StockMovement,
  Conversation,
  Message
};

export default {
  sequelize,
  Sequelize,
  User,
  RefreshToken,
  Category,
  Supplier,
  Product,
  StockMovement,
  Conversation,
  Message
};

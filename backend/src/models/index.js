const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Category = require('./Category');
const Supplier = require('./Supplier');
const Product = require('./Product');
const StockMovement = require('./StockMovement');
const Conversation = require('./Conversation');
const Message = require('./Message');

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

module.exports = {
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

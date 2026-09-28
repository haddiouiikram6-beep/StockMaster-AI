process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_stockmaster_123';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_stockmaster_123';

const { sequelize, User, Category, Supplier, Product } = require('../src/models');
const { generateAccessToken } = require('../src/utils/jwt');

/**
 * Initializes test database schema
 */
const initTestDb = async () => {
  await sequelize.sync({ force: true });
};

/**
 * Seed basic test records and return useful auth tokens
 */
const seedTestDb = async () => {
  await initTestDb();

  const admin = await User.create({
    fullName: 'Test Admin',
    email: 'admin@test.com',
    password: 'Password123!',
    role: 'admin'
  });

  const manager = await User.create({
    fullName: 'Test Manager',
    email: 'manager@test.com',
    password: 'Password123!',
    role: 'manager'
  });

  const employee = await User.create({
    fullName: 'Test Employee',
    email: 'employee@test.com',
    password: 'Password123!',
    role: 'employee'
  });

  const category = await Category.create({
    name: 'Test Electronics',
    description: 'Electronics for testing'
  });

  const supplier = await Supplier.create({
    name: 'Test Supplier',
    email: 'supplier@test.com',
    phone: '123456789'
  });

  const product = await Product.create({
    name: 'Test Keyboard',
    reference: 'TEST-KB-001',
    description: 'Mechanical keyboard for testing',
    price: 99.99,
    quantity: 20,
    minStock: 5,
    categoryId: category.id,
    supplierId: supplier.id
  });

  const lowStockProduct = await Product.create({
    name: 'Test Mouse',
    reference: 'TEST-MS-002',
    description: 'Low stock mouse for testing',
    price: 29.99,
    quantity: 2,
    minStock: 10,
    categoryId: category.id,
    supplierId: supplier.id
  });

  const adminToken = generateAccessToken({ id: admin.id, email: admin.email, role: admin.role });
  const managerToken = generateAccessToken({ id: manager.id, email: manager.email, role: manager.role });
  const employeeToken = generateAccessToken({ id: employee.id, email: employee.email, role: employee.role });

  return {
    admin,
    manager,
    employee,
    category,
    supplier,
    product,
    lowStockProduct,
    adminToken,
    managerToken,
    employeeToken
  };
};

module.exports = {
  initTestDb,
  seedTestDb,
  sequelize
};

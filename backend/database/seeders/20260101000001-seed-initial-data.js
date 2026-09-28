'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const salt = bcrypt.genSaltSync(10);
    const adminPassword = bcrypt.hashSync('Admin123!', salt);
    const managerPassword = bcrypt.hashSync('Manager123!', salt);
    const employeePassword = bcrypt.hashSync('Employee123!', salt);

    const now = new Date();

    // 1. Seed Users
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        fullName: 'Admin StockMaster',
        email: 'admin@stockmaster.com',
        password: adminPassword,
        role: 'admin',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        fullName: 'Jane Manager',
        email: 'manager@stockmaster.com',
        password: managerPassword,
        role: 'manager',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        fullName: 'John Employee',
        email: 'employee@stockmaster.com',
        password: employeePassword,
        role: 'employee',
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // 2. Seed Categories
    await queryInterface.bulkInsert('categories', [
      {
        id: 1,
        name: 'Electronics',
        description: 'Computer peripherals, displays, and electronic accessories',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: 'Office Supplies',
        description: 'Ergonomic furniture, desk organization, and stationery',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        name: 'Hardware & Tools',
        description: 'Maintenance equipment, precision tools, and testing kits',
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // 3. Seed Suppliers
    await queryInterface.bulkInsert('suppliers', [
      {
        id: 1,
        name: 'TechCorp Logistics',
        phone: '+1-555-0101',
        email: 'supply@techcorp.com',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: 'Global Office Essentials',
        phone: '+1-555-0102',
        email: 'orders@globaloffice.com',
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        name: 'Apex Tools & Parts',
        phone: '+1-555-0103',
        email: 'contact@apextools.com',
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // 4. Seed Products
    await queryInterface.bulkInsert('products', [
      {
        id: 1,
        name: 'Mechanical Gaming Keyboard',
        reference: 'PROD-KB-001',
        description: 'RGB mechanical keyboard with hot-swappable switches',
        price: 89.99,
        quantity: 45,
        minStock: 10,
        categoryId: 1,
        supplierId: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        name: 'Wireless Ergonomic Mouse',
        reference: 'PROD-MS-002',
        description: 'Rechargeable wireless ergonomic mouse with 4000 DPI sensor',
        price: 34.99,
        quantity: 3,
        minStock: 10, // LOW STOCK
        categoryId: 1,
        supplierId: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        name: 'USB-C Multi-port Hub 7-in-1',
        reference: 'PROD-HB-003',
        description: 'Aluminum hub with 4K HDMI, 100W PD, and USB 3.0 ports',
        price: 49.99,
        quantity: 2,
        minStock: 8, // LOW STOCK
        categoryId: 1,
        supplierId: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 4,
        name: 'Ergonomic Mesh Chair',
        reference: 'PROD-CH-004',
        description: 'High-back breathable mesh chair with lumbar support',
        price: 249.99,
        quantity: 15,
        minStock: 5,
        categoryId: 2,
        supplierId: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 5,
        name: 'Precision Screwdriver Kit 64-pc',
        reference: 'PROD-TL-005',
        description: 'Magnetic precision screwdriver set for electronics repair',
        price: 29.50,
        quantity: 4,
        minStock: 6, // LOW STOCK
        categoryId: 3,
        supplierId: 3,
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // 5. Seed Stock Movements
    await queryInterface.bulkInsert('stock_movements', [
      {
        id: 1,
        productId: 1,
        userId: 1,
        type: 'IN',
        quantity: 50,
        reason: 'Initial supplier delivery batch',
        date: new Date(Date.now() - 86400000 * 3),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 2,
        productId: 1,
        userId: 3,
        type: 'OUT',
        quantity: 5,
        reason: 'Customer order shipment #1042',
        date: new Date(Date.now() - 86400000 * 2),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 3,
        productId: 2,
        userId: 1,
        type: 'IN',
        quantity: 15,
        reason: 'Initial stock intake',
        date: new Date(Date.now() - 86400000 * 5),
        createdAt: now,
        updatedAt: now
      },
      {
        id: 4,
        productId: 2,
        userId: 3,
        type: 'OUT',
        quantity: 12,
        reason: 'Bulk team hardware deployment',
        date: new Date(Date.now() - 86400000),
        createdAt: now,
        updatedAt: now
      }
    ], {});

    // Synchronize PostgreSQL auto-increment sequences with MAX(id)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      const tables = ['users', 'categories', 'suppliers', 'products', 'stock_movements'];
      for (const table of tables) {
        await queryInterface.sequelize.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1),
            (SELECT MAX(id) IS NOT NULL FROM "${table}")
          );
        `);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('stock_movements', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('suppliers', null, {});
    await queryInterface.bulkDelete('categories', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};

import request from 'supertest';
import app from '../../src/app.js';
import { seedTestDb, sequelize } from '../setup.js';

describe('Products Integration Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await seedTestDb();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('POST /api/products - should create a product when authorized as manager/admin', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${fixtures.managerToken}`)
      .send({
        name: 'Ergonomic Desk Mat',
        reference: 'PROD-MAT-009',
        description: 'Waterproof non-slip desk pad',
        price: 24.99,
        quantity: 50,
        minStock: 10,
        categoryId: fixtures.category.id,
        supplierId: fixtures.supplier.id
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reference).toBe('PROD-MAT-009');
    expect(res.body.data.price).toBe(24.99);
  });

  it('POST /api/products - should reject creation by employee (role-based protection)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`)
      .send({
        name: 'Desk Mat',
        reference: 'PROD-MAT-010',
        price: 24.99,
        categoryId: fixtures.category.id
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/products - should fail on missing or invalid fields (validation)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${fixtures.managerToken}`)
      .send({
        name: '', // Empty name
        price: -10 // Negative price
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/products - should support pagination', async () => {
    const res = await request(app)
      .get('/api/products?page=1&limit=1')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('GET /api/products - should filter by minStock=true', async () => {
    const res = await request(app)
      .get('/api/products?minStock=true')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].reference).toBe('TEST-MS-002');
  });

  it('GET /api/products - should search by keyword', async () => {
    const res = await request(app)
      .get('/api/products?search=Keyboard')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].reference).toBe('TEST-KB-001');
  });

  it('GET /api/products - should sort by price descending', async () => {
    const res = await request(app)
      .get('/api/products?sortBy=price&order=desc')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data[0].reference).toBe('TEST-KB-001'); // 99.99 > 29.99
  });

  it('PUT /api/products/:id - should update product', async () => {
    const res = await request(app)
      .put(`/api/products/${fixtures.product.id}`)
      .set('Authorization', `Bearer ${fixtures.managerToken}`)
      .send({
        price: 119.99
      });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(119.99);
  });

  it('DELETE /api/products/:id - should delete product when admin and fail when employee', async () => {
    // Employee attempt
    const empRes = await request(app)
      .delete(`/api/products/${fixtures.product.id}`)
      .set('Authorization', `Bearer ${fixtures.employeeToken}`);

    expect(empRes.status).toBe(403);

    // Admin attempt
    const adminRes = await request(app)
      .delete(`/api/products/${fixtures.product.id}`)
      .set('Authorization', `Bearer ${fixtures.adminToken}`);

    expect(adminRes.status).toBe(200);
  });
});

import request from 'supertest';
import app from '../../src/app.js';
import { Product, StockMovement } from '../../src/models/index.js';
import { seedTestDb, sequelize } from '../setup.js';

describe('Stock Movement & Transaction Integration Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await seedTestDb();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('POST /api/stock-movements - should record stock IN and increase product quantity', async () => {
    const initialQty = fixtures.product.quantity; // 20
    const addQty = 15;

    const res = await request(app)
      .post('/api/stock-movements')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`)
      .send({
        productId: fixtures.product.id,
        type: 'IN',
        quantity: addQty,
        reason: 'Restock shipment'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.newQuantity).toBe(initialQty + addQty);

    // Verify database state
    const refreshed = await Product.findByPk(fixtures.product.id);
    expect(refreshed.quantity).toBe(initialQty + addQty);
  });

  it('POST /api/stock-movements - should record stock OUT and decrease product quantity', async () => {
    const initialQty = fixtures.product.quantity; // 20
    const outQty = 5;

    const res = await request(app)
      .post('/api/stock-movements')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`)
      .send({
        productId: fixtures.product.id,
        type: 'OUT',
        quantity: outQty,
        reason: 'Order fulfillment'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.product.newQuantity).toBe(initialQty - outQty);

    const refreshed = await Product.findByPk(fixtures.product.id);
    expect(refreshed.quantity).toBe(initialQty - outQty);
  });

  it('POST /api/stock-movements - should reject OUT movement on insufficient stock and rollback transaction', async () => {
    const initialQty = fixtures.product.quantity; // 20
    const excessiveQty = 999;

    const movementsBefore = await StockMovement.count();

    const res = await request(app)
      .post('/api/stock-movements')
      .set('Authorization', `Bearer ${fixtures.employeeToken}`)
      .send({
        productId: fixtures.product.id,
        type: 'OUT',
        quantity: excessiveQty,
        reason: 'Attempted excessive withdrawal'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');

    // Verify rollback: Product quantity unaltered
    const refreshed = await Product.findByPk(fixtures.product.id);
    expect(refreshed.quantity).toBe(initialQty);

    // Verify rollback: No stock movement created
    const movementsAfter = await StockMovement.count();
    expect(movementsAfter).toBe(movementsBefore);
  });
});

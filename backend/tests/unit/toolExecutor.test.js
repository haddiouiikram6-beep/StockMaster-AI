import ToolExecutor from '../../src/ai/toolExecutor.js';
import { seedTestDb, sequelize } from '../setup.js';

describe('ToolExecutor Unit Tests', () => {
  let fixtures;

  beforeAll(async () => {
    fixtures = await seedTestDb();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should successfully execute getProductStock by reference', async () => {
    const result = await ToolExecutor.execute('getProductStock', { reference: 'TEST-KB-001' }, { role: 'employee' });

    expect(result.found).toBe(true);
    expect(result.name).toBe('Test Keyboard');
    expect(result.quantity).toBe(20);
    expect(result.status).toBe('IN_STOCK');
  });

  it('should successfully execute getLowStockProducts', async () => {
    const result = await ToolExecutor.execute('getLowStockProducts', { limit: 10 }, { role: 'employee' });

    expect(result.count).toBeGreaterThan(0);
    const lowStockItem = result.products.find(p => p.reference === 'TEST-MS-002');
    expect(lowStockItem).toBeDefined();
    expect(lowStockItem.quantity).toBe(2);
  });

  it('should successfully execute recommendReorder with suggested quantities and supplier details', async () => {
    const result = await ToolExecutor.execute('recommendReorder', { limit: 10 }, { role: 'employee' });

    expect(result.totalItemsToReorder).toBeGreaterThan(0);
    expect(result.totalUnitsToOrder).toBeGreaterThan(0);
    expect(result.totalEstimatedCost).toBeGreaterThan(0);

    const rec = result.recommendations.find(r => r.reference === 'TEST-MS-002');
    expect(rec).toBeDefined();
    expect(rec.currentQuantity).toBe(2);
    expect(rec.minStock).toBe(10);
    expect(rec.suggestedQuantity).toBe(18); // 10 * 2 - 2 = 18
    expect(rec.priority).toBe('HIGH'); // 2 <= ceil(10/2) = 5
    expect(rec.supplier).toBeDefined();
    expect(rec.supplier.name).toBe('Test Supplier');
    expect(rec.estimatedCost).toBe(parseFloat((18 * 29.99).toFixed(2)));
  });

  it('should execute searchProducts with matching keywords', async () => {
    const result = await ToolExecutor.execute('searchProducts', { query: 'Keyboard' }, { role: 'employee' });

    expect(result.count).toBe(1);
    expect(result.products[0].name).toBe('Test Keyboard');
  });

  it('should reject execution when required parameters fail schema validation', async () => {
    const result = await ToolExecutor.execute('searchProducts', {}, { role: 'employee' });

    expect(result.error).toBe(true);
    expect(result.message).toContain('Invalid parameters');
  });

  it('should reject execution when role is unauthorized', async () => {
    const result = await ToolExecutor.execute('getProductStock', { reference: 'TEST-KB-001' }, { role: 'guest_unauthorized' });

    expect(result.error).toBe(true);
    expect(result.message).toContain('Access denied');
  });

  it('should return error for unrecognized tool', async () => {
    const result = await ToolExecutor.execute('nonExistentTool', {}, { role: 'admin' });

    expect(result.error).toBe(true);
    expect(result.message).toContain('not recognized');
  });
});

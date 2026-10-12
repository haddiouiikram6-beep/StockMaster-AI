import { StockMovement, Product, User, sequelize } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

class StockMovementService {
  /**
   * Get all stock movements with filtering and pagination
   */
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 20,
      productId,
      userId,
      type,
      sortBy = 'date',
      order = 'DESC'
    } = queryParams;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    const whereConditions = {};

    if (productId) whereConditions.productId = productId;
    if (userId) whereConditions.userId = userId;
    if (type) whereConditions.type = type;

    const allowedSort = ['date', 'createdAt', 'quantity'];
    const sortField = allowedSort.includes(sortBy) ? sortBy : 'date';
    const sortOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const { count, rows } = await StockMovement.findAndCountAll({
      where: whereConditions,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'reference', 'quantity', 'minStock'] },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ],
      order: [[sortField, sortOrder]],
      offset,
      limit: parsedLimit
    });

    return {
      rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: count
      }
    };
  }

  /**
   * Get stock movement by ID
   */
  async getById(id) {
    const movement = await StockMovement.findByPk(id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'reference', 'price', 'quantity'] },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!movement) {
      throw new AppError('Stock movement record not found.', 404);
    }

    return movement;
  }

  /**
   * Record a stock movement safely inside a Sequelize Transaction with row locking
   */
  async createMovement({ productId, userId, type, quantity, reason, date }) {
    const result = await sequelize.transaction(async (t) => {
      // 1. Fetch product with lock inside transaction
      const product = await Product.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!product) {
        throw new AppError('Product not found.', 404);
      }

      // 2. Calculate new stock quantity
      let newQuantity = product.quantity;

      if (type === 'IN') {
        newQuantity += quantity;
      } else if (type === 'OUT') {
        if (product.quantity < quantity) {
          throw new AppError(
            `Insufficient stock for product '${product.name}'. Current stock: ${product.quantity}, requested: ${quantity}.`,
            400
          );
        }
        newQuantity -= quantity;
      } else if (type === 'ADJUSTMENT') {
        newQuantity = quantity;
      }

      // 3. Create movement record
      const movement = await StockMovement.create(
        {
          productId,
          userId,
          type,
          quantity,
          reason,
          date: date || new Date()
        },
        { transaction: t }
      );

      // 4. Update product quantity
      product.quantity = newQuantity;
      await product.save({ transaction: t });

      return {
        movement,
        product: {
          id: product.id,
          name: product.name,
          reference: product.reference,
          previousQuantity: product.quantity,
          newQuantity: newQuantity
        }
      };
    });

    logger.info(`Stock movement recorded: [${type}] ${quantity} units for product ID ${productId} by user ${userId}`);
    return result;
  }
}

export const stockMovementService = new StockMovementService();
export default stockMovementService;

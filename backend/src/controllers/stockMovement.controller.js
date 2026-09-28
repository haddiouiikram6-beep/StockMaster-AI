const { StockMovement, Product, User, sequelize } = require('../models');
const { logger } = require('../utils/logger');

/**
 * Get all stock movements with pagination and filters
 * GET /api/stock-movements
 */
const getAllStockMovements = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      productId,
      userId,
      type,
      sortBy = 'date',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
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
      limit: parseInt(limit, 10)
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        totalPages: Math.ceil(count / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock movement by ID
 * GET /api/stock-movements/:id
 */
const getStockMovementById = async (req, res, next) => {
  try {
    const movement = await StockMovement.findByPk(req.params.id, {
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'reference', 'price', 'quantity'] },
        { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
      ]
    });

    if (!movement) {
      return res.status(404).json({
        success: false,
        message: 'Stock movement record not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: movement
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a stock movement safely inside a Sequelize Transaction
 * POST /api/stock-movements
 */
const createStockMovement = async (req, res, next) => {
  const { productId, type, quantity, reason, date } = req.body;
  const userId = req.user.id;

  try {
    const result = await sequelize.transaction(async (t) => {
      // 1. Fetch product with lock inside transaction
      const product = await Product.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });

      if (!product) {
        const error = new Error('Product not found.');
        error.statusCode = 404;
        throw error;
      }

      // 2. Calculate new stock quantity
      let newQuantity = product.quantity;

      if (type === 'IN') {
        newQuantity += quantity;
      } else if (type === 'OUT') {
        if (product.quantity < quantity) {
          const error = new Error(`Insufficient stock for product '${product.name}'. Current stock: ${product.quantity}, requested: ${quantity}.`);
          error.statusCode = 400;
          throw error;
        }
        newQuantity -= quantity;
      } else if (type === 'ADJUSTMENT') {
        // Direct inventory count adjustment
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

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStockMovements,
  getStockMovementById,
  createStockMovement
};

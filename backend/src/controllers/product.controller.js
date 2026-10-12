import { Op, col, where } from 'sequelize';
import { Product, Category, Supplier, StockMovement, sequelize } from '../models/index.js';

/**
 * Get all products with pagination, filtering, and sorting
 * GET /api/products
 */
const getAllProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      supplierId,
      minStock,
      search,
      sortBy = 'createdAt',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereConditions = [];

    // Filter by Category
    if (categoryId) {
      whereConditions.push({ categoryId });
    }

    // Filter by Supplier
    if (supplierId) {
      whereConditions.push({ supplierId });
    }

    // Filter by Low Stock
    if (minStock === true || minStock === 'true') {
      whereConditions.push(where(col('quantity'), '<=', col('minStock')));
    }

    // Search by Name, Reference, or Description
    if (search) {
      const isPostgres = sequelize.getDialect() === 'postgres';
      const likeOp = isPostgres ? Op.iLike : Op.like;
      whereConditions.push({
        [Op.or]: [
          { name: { [likeOp]: `%${search}%` } },
          { reference: { [likeOp]: `%${search}%` } },
          { description: { [likeOp]: `%${search}%` } }
        ]
      });
    }

    // Whitelisted sort fields to prevent SQL injection
    const allowedSortFields = ['name', 'price', 'quantity', 'reference', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const { count, rows } = await Product.findAndCountAll({
      where: whereConditions.length > 0 ? { [Op.and]: whereConditions } : {},
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone', 'email'] }
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
 * Get product by ID
 * GET /api/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'description'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone', 'email'] }
      ]
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new product
 * POST /api/products
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, reference, description, price, quantity, minStock, categoryId, supplierId } = req.body;

    // Check duplicate reference
    const existing = await Product.findOne({ where: { reference } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A product with this reference SKU already exists.'
      });
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Assigned category does not exist.'
      });
    }

    // Verify supplier exists if supplied
    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        return res.status(400).json({
          success: false,
          message: 'Assigned supplier does not exist.'
        });
      }
    }

    const product = await Product.create({
      name,
      reference,
      description,
      price,
      quantity: quantity || 0,
      minStock: minStock !== undefined ? minStock : 5,
      categoryId,
      supplierId
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a product
 * PUT /api/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const { name, reference, description, price, quantity, minStock, categoryId, supplierId } = req.body;

    if (reference && reference !== product.reference) {
      const existing = await Product.findOne({ where: { reference } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Another product with this reference already exists.'
        });
      }
    }

    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Assigned category does not exist.'
        });
      }
    }

    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        return res.status(400).json({
          success: false,
          message: 'Assigned supplier does not exist.'
        });
      }
    }

    await product.update({
      name: name !== undefined ? name : product.name,
      reference: reference !== undefined ? reference : product.reference,
      description: description !== undefined ? description : product.description,
      price: price !== undefined ? price : product.price,
      quantity: quantity !== undefined ? quantity : product.quantity,
      minStock: minStock !== undefined ? minStock : product.minStock,
      categoryId: categoryId !== undefined ? categoryId : product.categoryId,
      supplierId: supplierId !== undefined ? supplierId : product.supplierId
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a product
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    // Check if movements exist
    const movementCount = await StockMovement.count({ where: { productId: product.id } });
    if (movementCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete product. It has ${movementCount} existing stock movement historical records.`
      });
    }

    await product.destroy();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

export default {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

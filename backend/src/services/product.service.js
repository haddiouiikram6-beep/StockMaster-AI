import { Op, col, where } from 'sequelize';
import { Product, Category, Supplier, StockMovement, sequelize } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

class ProductService {
  /**
   * Get paginated products with filtering and sorting
   */
  async getAll(queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      categoryId,
      supplierId,
      minStock,
      status,
      search,
      sortBy = 'createdAt',
      order = 'DESC'
    } = queryParams;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    const whereConditions = [];

    if (categoryId) {
      whereConditions.push({ categoryId });
    }

    if (supplierId) {
      whereConditions.push({ supplierId });
    }

    if (status) {
      const upperStatus = String(status).toUpperCase();
      if (upperStatus === 'LOW') {
        whereConditions.push(where(col('quantity'), '<=', col('minStock')));
      } else if (upperStatus === 'OUT') {
        whereConditions.push({ quantity: 0 });
      }
    } else if (minStock === true || minStock === 'true') {
      whereConditions.push(where(col('quantity'), '<=', col('minStock')));
    }

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
   * Get a single product by primary key
   */
  async getById(id) {
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'description'] },
        { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'phone', 'email'] }
      ]
    });

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    return product;
  }

  /**
   * Create a new product
   */
  async create(data) {
    const { name, reference, description, price, quantity, minStock, categoryId, supplierId } = data;

    // Check duplicate reference
    const existing = await Product.findOne({ where: { reference } });
    if (existing) {
      throw new AppError('A product with this reference SKU already exists.', 409);
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new AppError('Assigned category does not exist.', 400);
    }

    // Verify supplier exists if supplied
    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        throw new AppError('Assigned supplier does not exist.', 400);
      }
    }

    return await Product.create({
      name,
      reference,
      description,
      price,
      quantity: quantity || 0,
      minStock: minStock !== undefined ? minStock : 5,
      categoryId,
      supplierId
    });
  }

  /**
   * Update an existing product
   */
  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const { name, reference, description, price, quantity, minStock, categoryId, supplierId } = data;

    if (reference && reference !== product.reference) {
      const existing = await Product.findOne({ where: { reference } });
      if (existing) {
        throw new AppError('Another product with this reference already exists.', 409);
      }
    }

    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new AppError('Assigned category does not exist.', 400);
      }
    }

    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (!supplier) {
        throw new AppError('Assigned supplier does not exist.', 400);
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

    return product;
  }

  /**
   * Delete a product
   */
  async delete(id) {
    const product = await Product.findByPk(id);
    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    const movementCount = await StockMovement.count({ where: { productId: product.id } });
    if (movementCount > 0) {
      throw new AppError(`Cannot delete product. It has ${movementCount} existing stock movement historical records.`, 409);
    }

    await product.destroy();
    return true;
  }

  /**
   * Calculate overall product & inventory statistics across all products (unlimited dataset)
   */
  async getStats() {
    const totalProducts = await Product.count();

    const totals = await Product.findAll({
      attributes: [
        [sequelize.fn('COALESCE', sequelize.fn('SUM', col('quantity')), 0), 'totalUnits'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.literal('price * quantity')), 0), 'totalValue']
      ],
      raw: true
    });

    const totalUnits = Number(totals[0]?.totalUnits || 0);
    const totalValue = Number(totals[0]?.totalValue || 0);

    const lowStock = await Product.count({
      where: where(col('quantity'), '<=', col('minStock'))
    });

    const outOfStock = await Product.count({
      where: { quantity: 0 }
    });

    return {
      totalProducts,
      totalUnits,
      totalValue,
      lowStock,
      outOfStock
    };
  }
}

export const productService = new ProductService();
export default productService;

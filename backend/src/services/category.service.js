import { Category, Product } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

class CategoryService {
  /**
   * Get all categories with pagination
   */
  async getAll(queryParams = {}) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = parseInt(queryParams.limit || '50', 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await Category.findAndCountAll({
      offset,
      limit,
      order: [['name', 'ASC']]
    });

    return {
      rows,
      pagination: {
        page,
        limit,
        total: count
      }
    };
  }

  /**
   * Get category by ID
   */
  async getById(id) {
    const category = await Category.findByPk(id, {
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'reference', 'price', 'quantity'] }]
    });

    if (!category) {
      throw new AppError('Category not found.', 404);
    }

    return category;
  }

  /**
   * Create category
   */
  async create(data) {
    const { name, description } = data;

    const existing = await Category.findOne({ where: { name } });
    if (existing) {
      throw new AppError('A category with this name already exists.', 409);
    }

    return await Category.create({ name, description });
  }

  /**
   * Update category
   */
  async update(id, data) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new AppError('Category not found.', 404);
    }

    const { name, description } = data;

    if (name && name !== category.name) {
      const existing = await Category.findOne({ where: { name } });
      if (existing) {
        throw new AppError('Another category with this name already exists.', 409);
      }
    }

    await category.update({
      name: name !== undefined ? name : category.name,
      description: description !== undefined ? description : category.description
    });

    return category;
  }

  /**
   * Delete category
   */
  async delete(id) {
    const category = await Category.findByPk(id);
    if (!category) {
      throw new AppError('Category not found.', 404);
    }

    const associatedProductsCount = await Product.count({ where: { categoryId: category.id } });
    if (associatedProductsCount > 0) {
      throw new AppError(`Cannot delete category. It has ${associatedProductsCount} associated product(s).`, 409);
    }

    await category.destroy();
    return true;
  }
}

export const categoryService = new CategoryService();
export default categoryService;

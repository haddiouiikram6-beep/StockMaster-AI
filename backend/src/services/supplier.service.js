import { Supplier, Product } from '../models/index.js';
import { AppError } from '../utils/AppError.js';

class SupplierService {
  /**
   * Get all suppliers with pagination
   */
  async getAll(queryParams = {}) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = parseInt(queryParams.limit || '50', 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await Supplier.findAndCountAll({
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
   * Get supplier by ID
   */
  async getById(id) {
    const supplier = await Supplier.findByPk(id, {
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'reference', 'price', 'quantity'] }]
    });

    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    return supplier;
  }

  /**
   * Create supplier
   */
  async create(data) {
    const { name, phone, email } = data;
    return await Supplier.create({ name, phone, email });
  }

  /**
   * Update supplier
   */
  async update(id, data) {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    const { name, phone, email } = data;

    await supplier.update({
      name: name !== undefined ? name : supplier.name,
      phone: phone !== undefined ? phone : supplier.phone,
      email: email !== undefined ? email : supplier.email
    });

    return supplier;
  }

  /**
   * Delete supplier
   */
  async delete(id) {
    const supplier = await Supplier.findByPk(id);
    if (!supplier) {
      throw new AppError('Supplier not found.', 404);
    }

    await supplier.destroy();
    return true;
  }
}

export const supplierService = new SupplierService();
export default supplierService;

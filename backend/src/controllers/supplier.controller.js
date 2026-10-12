import { Supplier, Product } from '../models/index.js';

/**
 * Get all suppliers
 * GET /api/suppliers
 */
const getAllSuppliers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await Supplier.findAndCountAll({
      offset,
      limit,
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get supplier by ID
 * GET /api/suppliers/:id
 */
const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'reference', 'price', 'quantity'] }]
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new supplier
 * POST /api/suppliers
 */
const createSupplier = async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;

    const supplier = await Supplier.create({ name, phone, email });

    res.status(201).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing supplier
 * PUT /api/suppliers/:id
 */
const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.'
      });
    }

    const { name, phone, email } = req.body;

    await supplier.update({
      name: name !== undefined ? name : supplier.name,
      phone: phone !== undefined ? phone : supplier.phone,
      email: email !== undefined ? email : supplier.email
    });

    res.status(200).json({
      success: true,
      data: supplier
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a supplier
 * DELETE /api/suppliers/:id
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found.'
      });
    }

    await supplier.destroy();

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

export default {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

import { col, where } from 'sequelize';
import { Product, Category, Supplier, StockMovement, User, sequelize } from '../../models/index.js';

const getLikeOp = () => {
  const { Op } = sequelize.Sequelize;
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
};

export const handleGetInventorySummary = async () => {
  const products = await Product.findAll();
  let totalValue = 0;
  let totalItems = 0;
  let lowStockCount = 0;

  for (const p of products) {
    totalItems += p.quantity;
    totalValue += parseFloat(p.price) * p.quantity;
    if (p.quantity <= p.minStock) lowStockCount++;
  }

  return {
    totalProducts: products.length,
    totalItems,
    totalValue: parseFloat(totalValue.toFixed(2)),
    lowStockCount
  };
};

export const handleGetCategories = async () => {
  const categories = await Category.findAll({ attributes: ['id', 'name', 'description'] });
  return { count: categories.length, categories };
};

export const handleGetSuppliers = async () => {
  const suppliers = await Supplier.findAll({ attributes: ['id', 'name', 'email', 'phone'] });
  return { count: suppliers.length, suppliers };
};

export const handleGetStockMovements = async (args) => {
  const whereClause = {};
  if (args.productId) whereClause.productId = args.productId;
  if (args.type) whereClause.type = args.type;

  const movements = await StockMovement.findAll({
    where: whereClause,
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name', 'reference'] },
      { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
    ],
    limit: args.limit || 10,
    order: [['date', 'DESC']]
  });

  return {
    count: movements.length,
    movements: movements.map(m => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      date: m.date,
      product: m.product ? `${m.product.name} (${m.product.reference})` : 'Unknown',
      performedBy: m.user ? m.user.fullName : 'System'
    }))
  };
};

export const handleGetSupplierInfo = async (args) => {
  const likeOp = getLikeOp();
  const condition = {};
  if (args.supplierId) condition.id = args.supplierId;
  else if (args.name) condition.name = { [likeOp]: `%${args.name}%` };

  const supplier = await Supplier.findOne({
    where: condition,
    include: [{ model: Product, as: 'products', attributes: ['id', 'name', 'reference', 'price', 'quantity'] }]
  });

  if (!supplier) return { found: false, message: 'Supplier not found.' };

  return {
    found: true,
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    email: supplier.email,
    productCount: supplier.products.length,
    products: supplier.products.map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference,
      price: parseFloat(p.price),
      quantity: p.quantity
    }))
  };
};

export const handleGetProductsByCategory = async (args) => {
  let category;
  if (args.categoryId) {
    category = await Category.findByPk(args.categoryId);
  } else if (args.categoryName) {
    category = await Category.findOne({
      where: { name: { [getLikeOp()]: `%${args.categoryName}%` } }
    });
  }

  if (!category) return { found: false, message: 'Category not found.' };

  const products = await Product.findAll({
    where: { categoryId: category.id },
    limit: args.limit || 20,
    attributes: ['id', 'name', 'reference', 'price', 'quantity', 'minStock']
  });

  return {
    found: true,
    category: { id: category.id, name: category.name, description: category.description },
    count: products.length,
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference,
      price: parseFloat(p.price),
      quantity: p.quantity,
      minStock: p.minStock
    }))
  };
};

export const handleAnalyzeStock = async () => {
  const products = await Product.findAll({
    where: where(col('quantity'), '<=', col('minStock')),
    order: [['quantity', 'ASC']],
    limit: 10
  });

  return {
    issuesCount: products.length,
    criticalProducts: products.map(p => ({
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      minStock: p.minStock,
      status: p.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    }))
  };
};

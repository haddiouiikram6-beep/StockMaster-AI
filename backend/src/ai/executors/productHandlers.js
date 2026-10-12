import { Op } from 'sequelize';
import { Product, Category, Supplier, sequelize } from '../../models/index.js';

const getLikeOp = () => {
  return sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
};

export const handleGetProductStock = async (args) => {
  const condition = {};
  if (args.productId) condition.id = args.productId;
  else if (args.reference) condition.reference = args.reference;

  const product = await Product.findOne({
    where: condition,
    attributes: ['id', 'name', 'reference', 'quantity', 'minStock']
  });

  if (!product) return { found: false, message: 'Product not found with provided criteria.' };

  const isLow = product.quantity <= product.minStock;
  const status = product.quantity === 0 ? 'OUT_OF_STOCK' : (isLow ? 'LOW_STOCK' : 'IN_STOCK');

  return {
    found: true,
    productId: product.id,
    name: product.name,
    reference: product.reference,
    quantity: product.quantity,
    minStock: product.minStock,
    status,
    isLowStock: isLow
  };
};

export const handleGetProductInfo = async (args) => {
  const likeOp = getLikeOp();
  const conditions = [];
  if (args.productId) conditions.push({ id: args.productId });
  if (args.reference) conditions.push({ reference: args.reference });
  if (args.name) conditions.push({ name: { [likeOp]: `%${args.name}%` } });

  const product = await Product.findOne({
    where: conditions.length > 0 ? { [Op.or]: conditions } : {},
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'email', 'phone'] }
    ]
  });

  if (!product) return { found: false, message: 'No matching product found.' };

  return {
    found: true,
    id: product.id,
    name: product.name,
    reference: product.reference,
    description: product.description,
    price: parseFloat(product.price),
    quantity: product.quantity,
    minStock: product.minStock,
    isLowStock: product.quantity <= product.minStock,
    category: product.category ? product.category.name : 'Unassigned',
    supplier: product.supplier ? product.supplier.name : 'Unassigned'
  };
};

export const handleSearchProducts = async (args) => {
  const q = args.query;
  const likeOp = getLikeOp();
  const products = await Product.findAll({
    where: {
      [Op.or]: [
        { name: { [likeOp]: `%${q}%` } },
        { reference: { [likeOp]: `%${q}%` } },
        { description: { [likeOp]: `%${q}%` } }
      ]
    },
    limit: args.limit || 10,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
  });

  return {
    query: q,
    count: products.length,
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference,
      price: parseFloat(p.price),
      quantity: p.quantity,
      category: p.category ? p.category.name : 'Unassigned'
    }))
  };
};

export const handleCreateProduct = async (args) => {
  const likeOp = getLikeOp();
  let categoryId = args.categoryId;
  let categoryName = args.categoryName;

  if (!categoryId && categoryName) {
    let cat = await Category.findOne({ where: { name: { [likeOp]: categoryName.trim() } } });
    if (!cat) {
      cat = await Category.create({
        name: categoryName.trim(),
        description: `Catégorie créée automatiquement pour ${args.name}`
      });
    }
    categoryId = cat.id;
    categoryName = cat.name;
  }

  if (!categoryId) {
    let defaultCat = await Category.findOne();
    if (!defaultCat) {
      defaultCat = await Category.create({ name: 'Général', description: 'Catégorie par défaut' });
    }
    categoryId = defaultCat.id;
    categoryName = defaultCat.name;
  }

  const reference = args.reference && args.reference.trim() !== ''
    ? args.reference.trim()
    : `PRD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

  const newProduct = await Product.create({
    name: args.name.trim(),
    reference,
    price: args.price,
    quantity: args.quantity ?? 0,
    minStock: args.minStock ?? 5,
    categoryId,
    description: args.description || null
  });

  return {
    success: true,
    created: true,
    product: {
      id: newProduct.id,
      name: newProduct.name,
      reference: newProduct.reference,
      price: parseFloat(newProduct.price),
      quantity: newProduct.quantity,
      minStock: newProduct.minStock,
      categoryId,
      category: categoryName,
      description: newProduct.description
    }
  };
};

export const handleVectorSearchProducts = async (args) => {
  const q = args.query;
  const likeOp = getLikeOp();
  const keywords = q.split(/\s+/).filter(w => w.length > 1);
  const orConditions = [
    { name: { [likeOp]: `%${q}%` } },
    { reference: { [likeOp]: `%${q}%` } },
    { description: { [likeOp]: `%${q}%` } }
  ];

  for (const kw of keywords) {
    orConditions.push({ name: { [likeOp]: `%${kw}%` } });
  }

  const products = await Product.findAll({
    where: { [Op.or]: orConditions },
    limit: args.limit || 10,
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }]
  });

  return {
    query: q,
    count: products.length,
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference,
      price: parseFloat(p.price),
      quantity: p.quantity,
      minStock: p.minStock,
      category: p.category ? p.category.name : 'Unassigned',
      description: p.description || ''
    }))
  };
};

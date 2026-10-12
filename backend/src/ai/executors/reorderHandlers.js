import { Op, col, where } from 'sequelize';
import { Product, Category, Supplier } from '../../models/index.js';

export const handleGetLowStockProducts = async (args) => {
  const limit = args.limit || 20;

  const products = await Product.findAll({
    where: where(col('quantity'), '<=', col('minStock')),
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    limit,
    order: [['quantity', 'ASC']]
  });

  return {
    count: products.length,
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      reference: p.reference,
      quantity: p.quantity,
      minStock: p.minStock,
      deficit: p.minStock - p.quantity,
      category: p.category ? p.category.name : 'Unassigned'
    }))
  };
};

export const handleRecommendReorder = async (args) => {
  const limit = args.limit || 20;
  const targetMultiplier = args.targetMultiplier || 2;
  const conditions = [];

  if (args.productId) conditions.push({ id: args.productId });
  else conditions.push(where(col('quantity'), '<=', col('minStock')));
  if (args.categoryId) conditions.push({ categoryId: args.categoryId });
  if (args.supplierId) conditions.push({ supplierId: args.supplierId });

  const whereClause = conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };

  const products = await Product.findAll({
    where: whereClause,
    include: [
      { model: Category, as: 'category', attributes: ['id', 'name'] },
      { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'email', 'phone'] }
    ],
    limit,
    order: [['quantity', 'ASC']]
  });

  let totalUnitsToOrder = 0;
  let totalEstimatedCost = 0;
  let criticalCount = 0;
  let highCount = 0;

  const recommendations = products.map(p => {
    const unitPrice = parseFloat(p.price) || 0;
    const targetStock = Math.ceil(p.minStock * targetMultiplier);
    const suggestedQuantity = Math.max(targetStock - p.quantity, p.minStock);
    const estimatedCost = parseFloat((suggestedQuantity * unitPrice).toFixed(2));

    let priority = 'MEDIUM';
    let urgencyReason = 'Stock is at or below minimum threshold';
    if (p.quantity === 0) {
      priority = 'CRITICAL';
      urgencyReason = 'Out of stock - immediate replenishment required';
      criticalCount++;
    } else if (p.quantity <= Math.ceil(p.minStock / 2)) {
      priority = 'HIGH';
      urgencyReason = 'Stock severely depleted below 50% of minimum threshold';
      highCount++;
    } else if (p.quantity > p.minStock) {
      priority = 'LOW';
      urgencyReason = 'Stock level is currently adequate; preventive reorder only';
    }

    totalUnitsToOrder += suggestedQuantity;
    totalEstimatedCost += estimatedCost;

    return {
      productId: p.id,
      name: p.name,
      reference: p.reference,
      currentQuantity: p.quantity,
      minStock: p.minStock,
      deficit: Math.max(0, p.minStock - p.quantity),
      targetStock,
      suggestedQuantity,
      unitPrice,
      estimatedCost,
      priority,
      urgencyReason,
      category: p.category ? p.category.name : 'Unassigned',
      supplier: p.supplier
        ? { id: p.supplier.id, name: p.supplier.name, email: p.supplier.email, phone: p.supplier.phone }
        : null
    };
  });

  const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  recommendations.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);

  return {
    totalItemsToReorder: recommendations.length,
    totalUnitsToOrder,
    totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2)),
    criticalCount,
    highCount,
    recommendations
  };
};

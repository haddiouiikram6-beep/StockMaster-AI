const { Op, col, where } = require('sequelize');
const { Product, Category, Supplier, StockMovement, User, sequelize } = require('../models');
const { tools } = require('./tools');
const { logger } = require('../utils/logger');

/**
 * Maps and executes authorized AI tools against Sequelize models
 */
class ToolExecutor {
  /**
   * Executes a requested tool by name with arguments and user context
   * @param {string} toolName 
   * @param {object} rawArgs 
   * @param {object} userContext 
   */
  static async execute(toolName, rawArgs = {}, userContext = {}) {
    const toolDef = tools.find(t => t.function.name === toolName);

    if (!toolDef) {
      return {
        error: true,
        message: `Tool '${toolName}' is not recognized or supported.`
      };
    }

    // Role-based authorization check for tool
    if (toolDef.allowedRoles && userContext.role) {
      if (!toolDef.allowedRoles.includes(userContext.role)) {
        return {
          error: true,
          message: `Access denied. Your role '${userContext.role}' is not authorized to use tool '${toolName}'.`
        };
      }
    }

    // Validate parameters schema using Zod
    let validatedArgs;
    try {
      validatedArgs = await toolDef.schema.parseAsync(rawArgs);
    } catch (valErr) {
      return {
        error: true,
        message: `Invalid parameters for tool '${toolName}': ${valErr.errors ? valErr.errors.map(e => e.message).join(', ') : valErr.message}`
      };
    }

    // Dialect-aware LIKE operator
    const isPostgres = sequelize.getDialect() === 'postgres';
    const likeOp = isPostgres ? Op.iLike : Op.like;

    try {
      switch (toolName) {
        case 'getProductStock': {
          const condition = {};
          if (validatedArgs.productId) {
            condition.id = validatedArgs.productId;
          } else if (validatedArgs.reference) {
            condition.reference = validatedArgs.reference;
          }

          const product = await Product.findOne({
            where: condition,
            attributes: ['id', 'name', 'reference', 'quantity', 'minStock']
          });

          if (!product) {
            return { found: false, message: 'Product not found with provided criteria.' };
          }

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
        }

        case 'getProductInfo': {
          const conditions = [];
          if (validatedArgs.productId) {
            conditions.push({ id: validatedArgs.productId });
          }
          if (validatedArgs.reference) {
            conditions.push({ reference: validatedArgs.reference });
          }
          if (validatedArgs.name) {
            conditions.push({ name: { [likeOp]: `%${validatedArgs.name}%` } });
          }

          const product = await Product.findOne({
            where: conditions.length > 0 ? { [Op.or]: conditions } : {},
            include: [
              { model: Category, as: 'category', attributes: ['id', 'name'] },
              { model: Supplier, as: 'supplier', attributes: ['id', 'name', 'email', 'phone'] }
            ]
          });

          if (!product) {
            return { found: false, message: 'No matching product found.' };
          }

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
        }

        case 'getLowStockProducts': {
          const limit = validatedArgs.limit || 20;

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
        }

        case 'recommendReorder': {
          const limit = validatedArgs.limit || 20;
          const targetMultiplier = validatedArgs.targetMultiplier || 2;
          const conditions = [];

          if (validatedArgs.productId) {
            conditions.push({ id: validatedArgs.productId });
          } else {
            conditions.push(where(col('quantity'), '<=', col('minStock')));
          }

          if (validatedArgs.categoryId) {
            conditions.push({ categoryId: validatedArgs.categoryId });
          }

          if (validatedArgs.supplierId) {
            conditions.push({ supplierId: validatedArgs.supplierId });
          }

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
                ? {
                    id: p.supplier.id,
                    name: p.supplier.name,
                    email: p.supplier.email,
                    phone: p.supplier.phone
                  }
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
        }

        case 'getStockMovements': {
          const whereClause = {};
          if (validatedArgs.productId) {
            whereClause.productId = validatedArgs.productId;
          }
          if (validatedArgs.type) {
            whereClause.type = validatedArgs.type;
          }

          const movements = await StockMovement.findAll({
            where: whereClause,
            include: [
              { model: Product, as: 'product', attributes: ['id', 'name', 'reference'] },
              { model: User, as: 'user', attributes: ['id', 'fullName', 'email'] }
            ],
            limit: validatedArgs.limit || 10,
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
        }

        case 'getSupplierInfo': {
          const condition = {};
          if (validatedArgs.supplierId) {
            condition.id = validatedArgs.supplierId;
          } else if (validatedArgs.name) {
            condition.name = { [likeOp]: `%${validatedArgs.name}%` };
          }

          const supplier = await Supplier.findOne({
            where: condition,
            include: [
              {
                model: Product,
                as: 'products',
                attributes: ['id', 'name', 'reference', 'price', 'quantity']
              }
            ]
          });

          if (!supplier) {
            return { found: false, message: 'Supplier not found.' };
          }

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
        }

        case 'getProductsByCategory': {
          let category;
          if (validatedArgs.categoryId) {
            category = await Category.findByPk(validatedArgs.categoryId);
          } else if (validatedArgs.categoryName) {
            category = await Category.findOne({
              where: { name: { [likeOp]: `%${validatedArgs.categoryName}%` } }
            });
          }

          if (!category) {
            return { found: false, message: 'Category not found.' };
          }

          const products = await Product.findAll({
            where: { categoryId: category.id },
            limit: validatedArgs.limit || 20,
            attributes: ['id', 'name', 'reference', 'price', 'quantity', 'minStock']
          });

          return {
            found: true,
            category: {
              id: category.id,
              name: category.name,
              description: category.description
            },
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
        }

        case 'searchProducts': {
          const q = validatedArgs.query;
          const products = await Product.findAll({
            where: {
              [Op.or]: [
                { name: { [likeOp]: `%${q}%` } },
                { reference: { [likeOp]: `%${q}%` } },
                { description: { [likeOp]: `%${q}%` } }
              ]
            },
            limit: validatedArgs.limit || 10,
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
        }

        default:
          return { error: true, message: `Tool execution handler not found for '${toolName}'.` };
      }
    } catch (err) {
      logger.error(`Error executing tool '${toolName}':`, err);
      return {
        error: true,
        message: `Database error while executing tool '${toolName}': ${err.message}`
      };
    }
  }
}

module.exports = ToolExecutor;

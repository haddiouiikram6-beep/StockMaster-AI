import { tools } from './tools.js';
import { logger } from '../utils/logger.js';
import {
  handleGetInventorySummary,
  handleGetCategories,
  handleGetSuppliers,
  handleGetStockMovements,
  handleGetSupplierInfo,
  handleGetProductsByCategory,
  handleAnalyzeStock
} from './executors/inventoryHandlers.js';
import {
  handleGetProductStock,
  handleGetProductInfo,
  handleSearchProducts,
  handleCreateProduct,
  handleVectorSearchProducts
} from './executors/productHandlers.js';
import {
  handleGetLowStockProducts,
  handleRecommendReorder
} from './executors/reorderHandlers.js';

const toolHandlers = {
  getInventorySummary: handleGetInventorySummary,
  getCategories: handleGetCategories,
  getSuppliers: handleGetSuppliers,
  getStockMovements: handleGetStockMovements,
  getSupplierInfo: handleGetSupplierInfo,
  getProductsByCategory: handleGetProductsByCategory,
  analyzeStock: handleAnalyzeStock,
  getProductStock: handleGetProductStock,
  getProductInfo: handleGetProductInfo,
  getLowStockProducts: handleGetLowStockProducts,
  recommendReorder: handleRecommendReorder,
  searchProducts: handleSearchProducts,
  createProduct: handleCreateProduct,
  vectorSearchProducts: handleVectorSearchProducts
};

class ToolExecutor {
  static async execute(toolName, rawArgs = {}, userContext = {}) {
    const toolDef = tools.find(t => t.function.name === toolName);

    if (!toolDef) {
      return { error: true, message: `Tool '${toolName}' is not recognized or supported.` };
    }

    if (toolDef.allowedRoles && userContext.role) {
      if (!toolDef.allowedRoles.includes(userContext.role)) {
        return {
          error: true,
          message: `Access denied. Your role '${userContext.role}' is not authorized to use tool '${toolName}'.`
        };
      }
    }

    let validatedArgs;
    try {
      validatedArgs = await toolDef.schema.parseAsync(rawArgs);
    } catch (valErr) {
      const details = valErr.errors ? valErr.errors.map(e => e.message).join(', ') : valErr.message;
      return { error: true, message: `Invalid parameters for tool '${toolName}': ${details}` };
    }

    const handler = toolHandlers[toolName];
    if (!handler) {
      return { error: true, message: `Tool execution handler not found for '${toolName}'.` };
    }

    try {
      return await handler(validatedArgs, userContext);
    } catch (err) {
      logger.error(`Error executing tool '${toolName}':`, err);
      return {
        error: true,
        message: `Database error while executing tool '${toolName}': ${err.message}`
      };
    }
  }
}

export { ToolExecutor };
export default ToolExecutor;

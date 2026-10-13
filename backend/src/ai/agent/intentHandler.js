import { tools } from '../tools.js';
import { logger } from '../../utils/logger.js';

/**
 * Resilient local heuristic intent recognition
 */
export const heuristicIntentAnalysis = (userMessage) => {
  const lower = userMessage.toLowerCase();
  const toolsRequired = [];
  let userIntent = 'General inquiry';

  // 1. Create product intent
  if (
    (lower.includes('créer') || lower.includes('crée') || lower.includes('create') || lower.includes('ajoute') || lower.includes('ajouter')) &&
    (lower.includes('produit') || lower.includes('product') || lower.includes('article') || lower.includes('item'))
  ) {
    userIntent = 'Create new product';
    const priceMatch = userMessage.match(/(?:prix|price|à|at)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
    const nameMatch = userMessage.match(/(?:produit|product|nom|name)\s*[:=]?\s*["']?([^"',\n]+)["']?/i);
    toolsRequired.push({
      name: 'createProduct',
      args: {
        name: nameMatch ? nameMatch[1].trim() : 'Nouveau Produit',
        price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 100,
        quantity: 10,
        minStock: 5,
        categoryName: 'Général',
        description: userMessage
      }
    });
  }
  // 2. Reorder intent
  else if (
    lower.includes('reorder') ||
    lower.includes('replenish') ||
    lower.includes('réapprovisionnement') ||
    lower.includes('reapprovisionnement') ||
    lower.includes('نكوموندي') ||
    (lower.includes('order') && (lower.includes('what') || lower.includes('should'))) ||
    (lower.includes('commander') && lower.includes('stock'))
  ) {
    userIntent = 'Inventory replenishment recommendation';
    toolsRequired.push({ name: 'recommendReorder', args: { limit: 10 } });
  }
  // 3. Low stock intent
  else if (
    (lower.includes('low') && (lower.includes('stock') || lower.includes('inventory'))) ||
    lower.includes('stock bas') ||
    lower.includes('bas stock') ||
    lower.includes('alert') ||
    lower.includes('alerte') ||
    lower.includes('deficit') ||
    lower.includes('rupture') ||
    lower.includes('ناقص') ||
    lower.includes('خصاص')
  ) {
    userIntent = 'Check low stock and stockouts';
    toolsRequired.push({ name: 'getLowStockProducts', args: { limit: 10 } });
  }
  // 4. Vector / Semantic search intent
  else if (
    ['cherche', 'trouve', 'search', 'find', 'vector', 'pinecone', 'câble', 'cable',
      'souris', 'mouse', 'keyboard', 'clavier', 'écran', 'screen'].some(w => lower.includes(w))
  ) {
    userIntent = 'Semantic vector search for products';
    toolsRequired.push({
      name: 'vectorSearchProducts',
      args: { query: userMessage, limit: 10 }
    });
  }
  // 5. Stock movements
  else if (lower.includes('mouvement') || lower.includes('movement') || lower.includes('historique')) {
    userIntent = 'View recent stock movements';
    toolsRequired.push({ name: 'getStockMovements', args: { limit: 5 } });
  }
  // 6. Specific product info or price
  else if (lower.includes('prix') || lower.includes('price') || lower.includes('combien')) {
    userIntent = 'Product price and stock query';
    toolsRequired.push({
      name: 'vectorSearchProducts',
      args: { query: userMessage, limit: 5 }
    });
  }

  return { userIntent, toolsRequired, reasoning: 'Heuristic pattern match' };
};

/**
 * LLM-based intent recognition with fallback to heuristics
 */
export const analyzeIntent = async ({ userMessage, history = [], client, model = 'deepseek-chat' }) => {
  if (!client) {
    return heuristicIntentAnalysis(userMessage);
  }

  const availableToolsSummary = tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');
  const intentPrompt = `You are the intent recognition and tool planning engine for StockMaster AI warehouse management.
Analyze the user's latest query along with conversation context to identify their exact intent and determine which tool(s) must be executed.

Available Tools:
${availableToolsSummary}

Rules:
1. For reorder advice, purchase quantities, or replenishment costs, plan 'recommendReorder'.
2. For stock deficits or low inventory alerts, plan 'getLowStockProducts'.
3. If the user wants to add, create, or insert a new product, plan 'createProduct'.
4. If the user searches for items semantically, describes use cases, or looks for products, plan 'vectorSearchProducts'.
5. For specific product details or SKU inquiries, plan 'getProductStock' or 'getProductInfo'.
6. If it's a general greeting or does not require database interaction, provide an empty toolsRequired list.

Respond ONLY with a valid JSON object matching: {"userIntent": "...", "toolsRequired": [{"name": "...", "args": {...}}], "reasoning": "..."}`;

  const messages = [
    { role: 'system', content: intentPrompt },
    ...history.slice(-6).map(m => ({
      role: m.role === 'tool' ? 'system' : m.role,
      content: m.textContent
    })),
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' }
    });
    logger.info("intent response" + JSON.stringify(response.choices[0].message))
    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    return {
      userIntent: parsed.userIntent || 'General query',
      toolsRequired: Array.isArray(parsed.toolsRequired) ? parsed.toolsRequired : [],
      reasoning: parsed.reasoning || ''
    };
  } catch (err) {
    logger.warn('LLM Intent pre-prompt parsing failed, using fallback heuristic:', err.message);
    return heuristicIntentAnalysis(userMessage);
  }
};

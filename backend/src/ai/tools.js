import { inventoryTools } from './tools/inventoryTools.js';
import { productTools } from './tools/productTools.js';

const tools = [...inventoryTools, ...productTools];
const deepSeekTools = tools.map(({ type, function: fn }) => ({ type, function: fn }));
const openAiTools = deepSeekTools;

export { tools, deepSeekTools, openAiTools };
export default tools;

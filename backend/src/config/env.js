import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'stockmaster',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_DIALECT: process.env.DB_DIALECT || (process.env.NODE_ENV === 'test' ? 'sqlite' : 'postgres'),
  DB_STORAGE: process.env.DB_STORAGE || ':memory:',

  // JWT Configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'stockmaster_ai_jwt_access_secret_key_super_secure_2026!',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'stockmaster_ai_jwt_refresh_secret_key_super_secure_2026!',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // DeepSeek / LLM Configuration
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
  DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || (process.env.OPENAI_BASE_URL && !process.env.OPENAI_BASE_URL.includes('groq.com') ? process.env.OPENAI_BASE_URL : 'https://api.deepseek.com'),
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || (process.env.OPENAI_MODEL && !process.env.OPENAI_MODEL.includes('gpt') && !process.env.OPENAI_MODEL.includes('llama') ? process.env.OPENAI_MODEL : 'deepseek-chat'),

  // Backwards compatibility aliases
  OPENAI_API_KEY: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
  OPENAI_BASE_URL: process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com',
  OPENAI_MODEL: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat',

  // Pinecone Vector DB Configuration
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || '',
  PINECONE_INDEX: process.env.PINECONE_INDEX || 'stockmaster-products',
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || '',
  PINECONE_EMBEDDING_MODEL: process.env.PINECONE_EMBEDDING_MODEL || 'llama-text-embed-v2',

  // CORS Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

export { env };
export default env;

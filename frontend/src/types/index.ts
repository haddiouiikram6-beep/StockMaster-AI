export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string;
  email?: string;
}

export interface Product {
  id: number;
  name: string;
  reference: string; // SKU
  description?: string;
  price: string | number;
  quantity: number;
  minStock: number;
  categoryId: number;
  supplierId?: number;
  category?: Category;
  supplier?: Supplier;
  imageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id: number;
  productId: number;
  userId: number;
  type: MovementType;
  quantity: number;
  reason?: string;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  product?: Product;
  user?: User;
}

export interface ProductStats {
  totalProducts: number;
  totalUnits: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
}

export interface Message {
  id?: number;
  conversationId?: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  textContent?: string;
  toolsExecuted?: string[];
  createdAt?: string;
  products?: any[];
  createdProduct?: any;
}

export interface Conversation {
  id: number;
  userId: number;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

export interface ReorderRecommendation {
  productId?: number;
  productName: string;
  currentStock: number;
  minStock: number;
  recommendedOrder: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedCost?: number | string;
  supplier?: string;
}

export interface AIResponse {
  conversationId: number;
  answer: string;
  toolsExecuted?: string[];
  recommendations?: ReorderRecommendation[];
  products?: any[];
  createdProduct?: any;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  updateTokens: (accessToken: string, refreshToken: string, user?: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  initAuth: () => Promise<void>;
}

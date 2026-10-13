import { api } from '../apiClient';
import { ApiResponse, Conversation, AIResponse } from '../../types';

export const aiApi = {
  chat: async (payload: { message: string; conversationId?: number; stream?: boolean }) => {
    const res = await api.post<ApiResponse<AIResponse>>('/ai/chat', payload);
    return res.data;
  },
  getConversations: async () => {
    const res = await api.get<ApiResponse<Conversation[]>>('/ai/conversations');
    return res.data;
  },
  getConversationById: async (id: number | string) => {
    const res = await api.get<ApiResponse<Conversation>>(`/ai/conversations/${id}`);
    return res.data;
  },
  deleteConversation: async (id: number | string) => {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/ai/conversations/${id}`);
    return res.data;
  },
};

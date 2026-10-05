import { API_BASE_URL } from './api';
import { useAuthStore } from '../store/useAuthStore';
import { AIResponse, ReorderRecommendation } from '../types';

export interface SendMessageOptions {
  message: string;
  conversationId?: number;
  onChunk: (chunk: string) => void;
  onToolsExecuted?: (tools: string[]) => void;
  onComplete: (data: {
    conversationId: number;
    fullAnswer: string;
    toolsExecuted?: string[];
    recommendations?: ReorderRecommendation[];
  }) => void;
  onError: (errorMsg: string) => void;
}

/**
 * Extracts structured reorder recommendations from markdown/text if present
 */
export const extractReorderRecommendations = (text: string): ReorderRecommendation[] => {
  const recommendations: ReorderRecommendation[] = [];

  // Look for structured recommendation patterns:
  // e.g. "Product Name: ..., Recommended Order: 50 units, Priority: High, Est. Cost: $450"
  // or markdown lists
  const lines = text.split('\n');
  let currentRec: Partial<ReorderRecommendation> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^\d+\.\s+\*\*?([^*]+)\*\*?/i) || trimmed.match(/^[•*-]\s+\*\*?([^*]+)\*\*?/i)) {
      if (currentRec && currentRec.productName) {
        recommendations.push(currentRec as ReorderRecommendation);
      }
      const nameMatch = trimmed.match(/^\d+\.\s+\*\*?([^*]+)\*\*?/i) || trimmed.match(/^[•*-]\s+\*\*?([^*]+)\*\*?/i);
      currentRec = {
        productName: nameMatch ? nameMatch[1].replace(/[:\-].*$/, '').trim() : 'Item',
        currentStock: 0,
        minStock: 10,
        recommendedOrder: 20,
        priority: 'HIGH',
      };
    }

    if (currentRec) {
      if (trimmed.toLowerCase().includes('priority')) {
        if (trimmed.toLowerCase().includes('critical')) currentRec.priority = 'CRITICAL';
        else if (trimmed.toLowerCase().includes('high')) currentRec.priority = 'HIGH';
        else if (trimmed.toLowerCase().includes('medium')) currentRec.priority = 'MEDIUM';
        else currentRec.priority = 'LOW';
      }
      const orderMatch = trimmed.match(/(?:reorder|order|quantity|suggested):\s*(\d+)/i);
      if (orderMatch) {
        currentRec.recommendedOrder = parseInt(orderMatch[1], 10);
      }
      const costMatch = trimmed.match(/(?:cost|est\.? cost|total):\s*\$?([\d,.]+)/i);
      if (costMatch) {
        currentRec.estimatedCost = parseFloat(costMatch[1].replace(/,/g, ''));
      }
      const stockMatch = trimmed.match(/(?:current|stock):\s*(\d+)/i);
      if (stockMatch) {
        currentRec.currentStock = parseInt(stockMatch[1], 10);
      }
      const minMatch = trimmed.match(/(?:min|minimum|threshold):\s*(\d+)/i);
      if (minMatch) {
        currentRec.minStock = parseInt(minMatch[1], 10);
      }
      const supMatch = trimmed.match(/(?:supplier):\s*([^,;]+)/i);
      if (supMatch) {
        currentRec.supplier = supMatch[1].trim();
      }
    }
  }

  if (currentRec && currentRec.productName) {
    recommendations.push(currentRec as ReorderRecommendation);
  }

  return recommendations;
};

/**
 * Send message with progressive SSE streaming via XHR onprogress,
 * with automatic fallback to standard JSON if SSE is unavailable.
 */
export const sendChatMessage = ({
  message,
  conversationId,
  onChunk,
  onToolsExecuted,
  onComplete,
  onError,
}: SendMessageOptions) => {
  const token = useAuthStore.getState().accessToken;

  // Try SSE streaming via XMLHttpRequest
  try {
    const xhr = new XMLHttpRequest();
    let accumulated = '';
    let seenIndex = 0;
    let finalTools: string[] = [];
    let convId = conversationId || 0;
    let isFinished = false;

    xhr.open('POST', `${API_BASE_URL}/ai/chat`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    let errorHandled = false;

    xhr.onprogress = () => {
      const responseText = xhr.responseText;
      const newChunk = responseText.substring(seenIndex);
      seenIndex = responseText.length;

      const lines = newChunk.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const raw = trimmed.substring(6).trim();
          if (raw === '[DONE]') {
            isFinished = true;
            continue;
          }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) {
              if (!errorHandled) {
                errorHandled = true;
                onError(parsed.error);
              }
              return;
            }
            if (parsed.chunk) {
              accumulated += parsed.chunk;
              onChunk(parsed.chunk);
            }
            if (parsed.toolsExecuted) {
              finalTools = parsed.toolsExecuted;
              onToolsExecuted?.(parsed.toolsExecuted);
            }
            if (parsed.conversationId) {
              convId = parsed.conversationId;
            }
          } catch {
            // Not valid JSON chunk, ignore
          }
        }
      }
    };

    xhr.onload = () => {
      if (errorHandled) return;

      if (xhr.status === 400 || xhr.status === 422) {
        try {
          const body = JSON.parse(xhr.responseText);
          console.log('AI XHR ERROR STATUS:', xhr.status);
          console.log('AI XHR ERROR BODY:', body);
          
          if (
            body.message?.includes('violates safety') ||
            body.message?.includes('security policies')
          ) {
            onError("Sorry, I can't process this request.");
            return;
          }
          
          if (body.errors) {
            console.log('VALIDATION ERRORS:', body.errors);
          }
          
          onError(body.message || "Sorry, I can't process this request.");
          return;
        } catch (e) {
          console.log('AI XHR PARSE ERROR:', e);
        }
        onError("Sorry, I can't process this request.");
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (!accumulated && xhr.responseText) {
          try {
            const jsonResp = JSON.parse(xhr.responseText);
            if (jsonResp.data?.answer) {
              accumulated = jsonResp.data.answer;
              convId = jsonResp.data.conversationId;
              finalTools = jsonResp.data.toolsExecuted || [];
            }
          } catch {}
        }

        const recommendations = finalTools.includes('recommendReorder')
          ? extractReorderRecommendations(accumulated)
          : [];

        onComplete({
          conversationId: convId,
          fullAnswer: accumulated,
          toolsExecuted: finalTools,
          recommendations,
        });
      } else {
        // Fallback to standard request
        fallbackStandardChat({
          message,
          conversationId,
          onComplete,
          onError,
        });
      }
    };

    xhr.onerror = () => {
      // Network failure, attempt standard JSON fallback
      fallbackStandardChat({
        message,
        conversationId,
        onComplete,
        onError,
      });
    };

    xhr.send(
      JSON.stringify({
        message,
        conversationId,
        stream: true,
      })
    );
  } catch {
    fallbackStandardChat({
      message,
      conversationId,
      onComplete,
      onError,
    });
  }
};

/**
 * Fallback to standard HTTP JSON response
 */
const fallbackStandardChat = async ({
  message,
  conversationId,
  onComplete,
  onError,
}: {
  message: string;
  conversationId?: number;
  onComplete: SendMessageOptions['onComplete'];
  onError: SendMessageOptions['onError'];
}) => {
  const token = useAuthStore.getState().accessToken;

  try {
    const res = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message,
        conversationId,
        stream: false,
      }),
    });

    if (res.status === 400) {
      onError("Sorry, I can't process this request.");
      return;
    }

    const json = await res.json();
    console.log("AI RAW RESPONSE:", json);
    console.log("AI RESPONSE TYPE:", typeof json);

    if (!res.ok) {
      console.log('AI API ERROR STATUS:', res.status);
      console.log('AI API ERROR DATA:', json);
    }

    if (json.success && json.data) {
      const recs = json.data.toolsExecuted?.includes('recommendReorder')
        ? extractReorderRecommendations(json.data.answer)
        : [];

      onComplete({
        conversationId: json.data.conversationId,
        fullAnswer: json.data.answer,
        toolsExecuted: json.data.toolsExecuted,
        recommendations: recs,
      });
    } else {
      onError(json.message || "Sorry, I can't process this request.");
    }
  } catch (err: any) {
    console.log('AI API FETCH ERROR:', err);
    onError('Network error. Please check your connection to the server.');
  }
};

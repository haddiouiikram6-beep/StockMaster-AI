import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message, ReorderRecommendation } from '../types';
import { COLORS, SHADOWS } from '../constants/theme';
import { ReorderCard } from './ReorderCard';
import { CreatedProductCard } from './CreatedProductCard';
import { FoundProductsCard } from './FoundProductsCard';

interface ChatBubbleProps {
  message: Message;
  recommendations?: ReorderRecommendation[];
  products?: any[];
  createdProduct?: any;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  recommendations,
  products = message.products,
  createdProduct = message.createdProduct,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View style={styles.userContainer}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  // Assistant bubble
  return (
    <View style={styles.botContainer}>
      <View style={styles.botRow}>
        <View style={styles.botAvatar}>
          <Ionicons name="sparkles" size={14} color={COLORS.lightCyan} />
        </View>

        <View style={styles.botContent}>
          {message.toolsExecuted && message.toolsExecuted.length > 0 && (
            <View style={styles.toolBadge}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
              <Text style={styles.toolBadgeText}>
                {message.toolsExecuted.join(', ')} executed
              </Text>
            </View>
          )}

          <View style={styles.botBubble}>
            <Text style={styles.botText}>{message.content}</Text>

            {/* Created Product Card */}
            {createdProduct && (
              <CreatedProductCard product={createdProduct} />
            )}

            {/* Found Products (Pinecone Vector Search) */}
            {products && products.length > 0 && (
              <FoundProductsCard products={products} />
            )}

            {/* Reorder Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <View style={styles.recommendationsList}>
                {recommendations.map((rec, idx) => (
                  <ReorderCard key={idx} item={rec} index={idx} />
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userContainer: {
    alignItems: 'flex-end',
    marginBottom: 14,
    marginLeft: 48,
  },
  userBubble: {
    backgroundColor: COLORS.aiBubbleUser,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    ...SHADOWS.sm,
  },
  userText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  botContainer: {
    marginBottom: 16,
    marginRight: 24,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryDarkNavy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  botContent: {
    flex: 1,
  },
  toolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  toolBadgeText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
    marginLeft: 4,
  },
  botBubble: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  botText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
  },
  recommendationsList: {
    marginTop: 6,
  },
});

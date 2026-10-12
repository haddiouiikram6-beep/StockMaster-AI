import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { COLORS, SHADOWS } from '../constants/theme';

interface ProductItem {
  id: number;
  name: string;
  reference?: string;
  price: number | string;
  quantity?: number;
  minStock?: number;
  category?: string;
  score?: number;
  vectorSource?: string;
}

interface FoundProductsCardProps {
  products: ProductItem[];
}

export const FoundProductsCard: React.FC<FoundProductsCardProps> = ({ products }) => {
  if (!products || products.length === 0) return null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="git-network-outline" size={14} color={COLORS.primaryBlue} />
          <Text style={styles.headerTitle}>Recherche Vectorielle Pinecone</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {products.length} résultat{products.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Products list */}
      <View style={styles.list}>
        {products.map((item, idx) => {
          const isOutOfStock = (item.quantity ?? 0) === 0;
          const isLowStock = !isOutOfStock && (item.quantity ?? 0) <= (item.minStock ?? 5);

          return (
            <View key={item.id || idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemSku}>{item.reference || 'SKU N/A'}</Text>
                  {item.category && (
                    <Text style={styles.itemCategory}> • {item.category}</Text>
                  )}
                  {item.score !== undefined && item.score > 0 && (
                    <Text style={styles.itemScore}> • {Math.round(item.score * 100)}% match</Text>
                  )}
                </View>
              </View>

              <View style={styles.itemRight}>
                <Text style={styles.itemPrice}>
                  {formatCurrency(Number(item.price) || 0)}
                </Text>
                <View
                  style={[
                    styles.stockPill,
                    isOutOfStock
                      ? styles.stockOut
                      : isLowStock
                      ? styles.stockLow
                      : styles.stockOk,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      isOutOfStock
                        ? styles.stockTextOut
                        : isLowStock
                        ? styles.stockTextLow
                        : styles.stockTextOk,
                    ]}
                  >
                    {isOutOfStock ? 'Épuisé' : `${item.quantity} en stock`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 111, 166, 0.3)', // subtle blue border
    marginTop: 10,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 111, 166, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.primaryBlue,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  countBadge: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countText: {
    color: COLORS.primaryBlue,
    fontSize: 10,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemSku: {
    color: COLORS.secondaryText,
    fontSize: 11,
    fontWeight: '500',
  },
  itemCategory: {
    color: COLORS.mutedText,
    fontSize: 11,
  },
  itemScore: {
    color: COLORS.primaryBlue,
    fontSize: 10,
    fontWeight: '600',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  stockPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockOk: {
    backgroundColor: COLORS.successBg,
  },
  stockLow: {
    backgroundColor: COLORS.warningBg,
  },
  stockOut: {
    backgroundColor: COLORS.dangerBg,
  },
  stockText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stockTextOk: {
    color: COLORS.success,
  },
  stockTextLow: {
    color: COLORS.warningText,
  },
  stockTextOut: {
    color: COLORS.dangerText,
  },
});

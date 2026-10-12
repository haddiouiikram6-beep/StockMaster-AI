import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/currency';
import { COLORS, SHADOWS } from '../constants/theme';

interface CreatedProductCardProps {
  product: {
    id?: number;
    name: string;
    reference: string;
    price: number | string;
    quantity?: number;
    minStock?: number;
    category?: string;
    description?: string;
    indexedInPinecone?: boolean;
  };
}

export const CreatedProductCard: React.FC<CreatedProductCardProps> = ({ product }) => {
  if (!product) return null;

  return (
    <View style={styles.card}>
      {/* Header status badge */}
      <View style={styles.headerBadge}>
        <View style={styles.badgeLeft}>
          <Ionicons name="sparkles" size={13} color={COLORS.success} />
          <Text style={styles.badgeText}>
            {product.indexedInPinecone !== false
              ? 'Nouveau Produit Indexé dans Pinecone'
              : 'Nouveau Produit Créé'}
          </Text>
        </View>
        <View style={styles.pineconePill}>
          <Ionicons name="git-network-outline" size={11} color={COLORS.info} />
          <Text style={styles.pineconePillText}>Pinecone</Text>
        </View>
      </View>

      {/* Main product title & SKU */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.priceHighlight}>
            {formatCurrency(Number(product.price) || 0)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.skuTag}>
            <Ionicons name="barcode-outline" size={12} color={COLORS.primaryBlue} />
            <Text style={styles.skuText}>{product.reference || 'SKU Auto'}</Text>
          </View>

          {product.category && (
            <View style={styles.categoryTag}>
              <Ionicons name="layers-outline" size={12} color={COLORS.secondaryText} />
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          )}
        </View>

        {/* Quantities grid */}
        <View style={styles.stockGrid}>
          <View style={styles.stockCol}>
            <Text style={styles.stockLabel}>Stock Initial</Text>
            <Text style={styles.stockValue}>{product.quantity ?? 0} unités</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stockCol}>
            <Text style={styles.stockLabel}>Seuil d'Alerte</Text>
            <Text style={styles.stockValue}>{product.minStock ?? 5} unités</Text>
          </View>
        </View>

        {product.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(25, 195, 125, 0.4)', // subtle emerald glow
    marginTop: 10,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  headerBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(25, 195, 125, 0.2)',
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  pineconePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pineconePillText: {
    color: COLORS.info,
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 3,
  },
  body: {
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productName: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
    lineHeight: 20,
  },
  priceHighlight: {
    color: COLORS.primaryBlue,
    fontSize: 16,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  skuTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skuText: {
    color: COLORS.primaryBlue,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeGrayBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: COLORS.secondaryText,
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  stockGrid: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  stockCol: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.border,
  },
  stockLabel: {
    color: COLORS.mutedText,
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '500',
  },
  stockValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    color: COLORS.secondaryText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

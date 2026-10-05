import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { COLORS, SHADOWS } from '../constants/theme';
import { StockBadge } from './StockBadge';

interface ProductRowProps {
  product: Product;
  onPress: () => void;
  variant?: 'compact' | 'full';
}

export const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onPress,
  variant = 'compact',
}) => {
  const getCategoryIcon = (categoryName?: string) => {
    const cat = categoryName?.toLowerCase() || '';
    if (cat.includes('electr')) return 'hardware-chip-outline';
    if (cat.includes('suppl') || cat.includes('office') || cat.includes('furn'))
      return 'cube-outline';
    if (cat.includes('tool') || cat.includes('hardw')) return 'construct-outline';
    return 'layers-outline';
  };

  const isCompact = variant === 'compact';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.container, isCompact ? styles.containerCompact : styles.containerFull]}
    >
      <View style={styles.iconBox}>
        <Ionicons
          name={getCategoryIcon(product.category?.name)}
          size={18}
          color={COLORS.primaryBlue}
        />
      </View>

      <View style={styles.infoCol}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {isCompact ? (
            `Qté: ${product.quantity}, Min: ${product.minStock}`
          ) : (
            `${product.reference} • ${product.category?.name || 'Général'}`
          )}
        </Text>
        {!isCompact && (
          <Text style={styles.stockDetails}>
            {product.quantity} unités {Number(product.quantity) <= Number(product.minStock) ? '• Recommander' : ''}
          </Text>
        )}
      </View>

      <View style={styles.badgeCol}>
        <StockBadge
          quantity={Number(product.quantity)}
          minStock={Number(product.minStock)}
          size="sm"
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  containerCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  containerFull: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.lightCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  stockDetails: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface StockBadgeProps {
  status?: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK' | string;
  quantity?: number;
  minStock?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export const StockBadge: React.FC<StockBadgeProps> = ({
  status,
  quantity,
  minStock,
  label,
  size = 'sm',
}) => {
  let resolvedStatus = status;

  if (!resolvedStatus && quantity !== undefined && minStock !== undefined) {
    if (quantity === 0) {
      resolvedStatus = 'OUT_OF_STOCK';
    } else if (quantity <= Math.ceil(minStock * 0.4)) {
      resolvedStatus = 'CRITICAL';
    } else if (quantity <= minStock) {
      resolvedStatus = 'LOW_STOCK';
    } else {
      resolvedStatus = 'IN_STOCK';
    }
  }

  let text = label;
  let bg = COLORS.successBg;
  let textColor = COLORS.success;

  switch (resolvedStatus?.toUpperCase()) {
    case 'OUT_OF_STOCK':
      text = text || 'Rupture de stock';
      bg = COLORS.dangerBg;
      textColor = COLORS.dangerText;
      break;
    case 'CRITICAL':
      text = text || 'Critique';
      bg = COLORS.dangerBg;
      textColor = COLORS.dangerText;
      break;
    case 'LOW_STOCK':
      text = text || 'Stock faible';
      bg = COLORS.warningBg;
      textColor = COLORS.warningText;
      break;
    case 'IN_STOCK':
    default:
      text = text || 'En stock';
      bg = COLORS.successBg;
      textColor = COLORS.success;
      break;
  }

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.text, { color: textColor }, isSmall && styles.textSm]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
    fontWeight: '600',
  },
});

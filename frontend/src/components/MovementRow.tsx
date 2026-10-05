import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StockMovement } from '../types';
import { COLORS, SHADOWS } from '../constants/theme';

interface MovementRowProps {
  movement: StockMovement;
}

export const MovementRow: React.FC<MovementRowProps> = ({ movement }) => {
  const isIncoming = movement.type === 'IN';
  const isAdjustment = movement.type === 'ADJUSTMENT';

  const iconName = isIncoming
    ? 'arrow-down'
    : isAdjustment
    ? 'swap-horizontal'
    : 'arrow-up';

  const iconBg = isIncoming
    ? COLORS.successBg
    : isAdjustment
    ? COLORS.infoBg
    : COLORS.dangerBg;

  const iconColor = isIncoming
    ? COLORS.success
    : isAdjustment
    ? COLORS.info
    : COLORS.dangerText;

  const prefix = isIncoming ? '+' : isAdjustment ? '~' : '-';

  // Format date or relative time
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);

      if (diffHrs < 1) return 'À l\'instant';
      if (diffHrs < 24) return `Il y a ${diffHrs}h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays}j`;
      return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={iconName} size={15} color={iconColor} />
      </View>

      <View style={styles.contentCol}>
        <Text style={styles.title} numberOfLines={1}>
          <Text style={[styles.qtyText, { color: iconColor }]}>
            {prefix}{movement.quantity} unités
          </Text>
          {movement.product?.name ? ` • ${movement.product.name}` : ''}
        </Text>
        <Text style={styles.reason} numberOfLines={1}>
          {movement.reason || (isIncoming ? 'Réapprovisionnement fournisseur' : 'Expédition de stock')}
        </Text>
      </View>

      <View style={styles.timeCol}>
        <Text style={styles.timeText}>{formatTime(movement.date || movement.createdAt)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
    ...SHADOWS.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentCol: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  qtyText: {
    fontWeight: '700',
  },
  reason: {
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  timeCol: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.mutedText,
    fontWeight: '500',
  },
});

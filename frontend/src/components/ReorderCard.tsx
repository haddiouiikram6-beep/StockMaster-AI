import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/currency';
import { ReorderRecommendation } from '../types';
import { COLORS, SHADOWS } from '../constants/theme';

interface ReorderCardProps {
  item: ReorderRecommendation;
  index: number;
}

export const ReorderCard: React.FC<ReorderCardProps> = ({ item, index }) => {
  const isHigh = item.priority === 'CRITICAL' || item.priority === 'HIGH';
  const badgeBg = isHigh ? COLORS.dangerBg : COLORS.warningBg;
  const badgeText = isHigh ? COLORS.dangerText : COLORS.warningText;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {index + 1}. {item.productName}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.priorityText, { color: badgeText }]}>
            {item.priority === 'CRITICAL' ? 'CRITIQUE' : item.priority === 'HIGH' ? 'HAUTE' : item.priority === 'MEDIUM' ? 'MOYENNE' : 'BASSE'}
          </Text>
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.gridItem}>
          <Text style={styles.detailLabel}>Recommande cible</Text>
          <Text style={styles.detailValueHighlight}>
            +{item.recommendedOrder} unités
          </Text>
        </View>

        <View style={styles.gridItem}>
          <Text style={styles.detailLabel}>Actuel / Min</Text>
          <Text style={styles.detailValue}>
            {item.currentStock} / {item.minStock}
          </Text>
        </View>

        {item.estimatedCost ? (
          <View style={styles.gridItem}>
            <Text style={styles.detailLabel}>Coût estimé</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(Number(item.estimatedCost))}
            </Text>
          </View>
        ) : null}

        {item.supplier ? (
          <View style={styles.gridItem}>
            <Text style={styles.detailLabel}>Fournisseur</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {item.supplier}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  gridItem: {
    width: '48%',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.secondaryText,
    marginBottom: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailValueHighlight: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryBlue,
  },
});

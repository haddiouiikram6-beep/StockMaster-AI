import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  trend,
  trendPositive = true,
  accentColor,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, accentColor ? { color: accentColor } : null]} numberOfLines={1}>
        {value}
      </Text>
      {trend ? (
        <Text
          style={[
            styles.trend,
            { color: trendPositive ? COLORS.success : COLORS.dangerText },
          ]}
          numberOfLines={1}
        >
          {trendPositive ? '↑ ' : '↓ '}
          {trend}
        </Text>
      ) : subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 88,
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.secondaryText,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.secondaryText,
    marginTop: 2,
  },
  trend: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});

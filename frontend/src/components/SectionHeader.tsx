import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  count?: number;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionText,
  onActionPress,
  count,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title}
        {count !== undefined ? (
          <Text style={styles.countText}> ({count})</Text>
        ) : null}
      </Text>
      {actionText && onActionPress ? (
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onActionPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.secondaryText,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
});

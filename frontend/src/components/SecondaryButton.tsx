import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  variant?: 'outline' | 'dangerOutline' | 'ghost';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  variant = 'outline',
}) => {
  const isDanger = variant === 'dangerOutline';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isDanger && styles.dangerButton,
        isGhost && styles.ghostButton,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDanger ? COLORS.dangerText : COLORS.primaryDarkNavy}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              isDanger && styles.dangerText,
              isGhost && styles.ghostText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dangerButton: {
    borderColor: COLORS.dangerBg,
    backgroundColor: COLORS.dangerBg,
  },
  ghostButton: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  text: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  dangerText: {
    color: COLORS.dangerText,
  },
  ghostText: {
    color: COLORS.primaryBlue,
  },
});

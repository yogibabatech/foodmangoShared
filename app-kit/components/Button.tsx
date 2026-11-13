import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { MIN_TOUCH, colors, fontSize, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  /** Shows a spinner and ignores taps, so a double tap cannot send twice. */
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const palette: Record<Variant, { bg: string; pressed: string; text: string; border: string }> = {
  primary: {
    bg: colors.primary,
    pressed: colors.primaryPressed,
    text: colors.onPrimary,
    border: colors.primary,
  },
  secondary: {
    bg: colors.surface,
    pressed: colors.primarySoft,
    text: colors.primary,
    border: colors.primary,
  },
  ghost: {
    bg: 'transparent',
    pressed: colors.primarySoft,
    text: colors.primary,
    border: 'transparent',
  },
  danger: {
    bg: colors.surface,
    pressed: colors.dangerSoft,
    text: colors.danger,
    border: colors.danger,
  },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const colour = palette[variant];

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor:
            disabled && variant === 'primary'
              ? colors.disabled
              : pressed
                ? colour.pressed
                : colour.bg,
          borderColor: disabled && variant === 'primary' ? colors.disabled : colour.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colour.text} />
      ) : (
        <Text
          style={[
            styles.label,
            { color: disabled && variant === 'primary' ? colors.disabledText : colour.text },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
});

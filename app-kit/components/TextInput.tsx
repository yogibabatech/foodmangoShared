import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from 'react-native';
import { MIN_TOUCH, colors, fontSize, radius, spacing } from '../theme';
import { AppText } from './AppText';

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label: string;
  /** Red message under the field. Also turns the border red. */
  error?: string | null;
  hint?: string;
  /** Shown inside the field on the left, for example "+91". */
  prefix?: ReactNode;
}

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(
  function TextInput({ label, error, hint, prefix, onFocus, onBlur, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

    return (
      <View style={styles.wrapper}>
        <AppText variant="label" style={styles.label}>
          {label}
        </AppText>
        <View style={[styles.field, { borderColor }]}>
          {prefix ? (
            <View style={styles.prefix}>
              {typeof prefix === 'string' ? <AppText variant="large">{prefix}</AppText> : prefix}
            </View>
          ) : null}
          <RNTextInput
            ref={ref}
            accessibilityLabel={label}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            {...rest}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
            style={styles.input}
          />
        </View>
        {error ? (
          <AppText variant="error" accessibilityRole="alert" style={styles.message}>
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="caption" style={styles.message}>
            {hint}
          </AppText>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { marginBottom: 2 },
  field: {
    minHeight: MIN_TOUCH + 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  prefix: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.large,
    color: colors.text,
    // On the web the browser draws its own outline. The field already shows its own focus border.
    outlineWidth: 0,
  },
  message: { marginTop: 2 },
});

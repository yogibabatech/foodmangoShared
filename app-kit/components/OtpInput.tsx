import { useEffect, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';
import { AppText } from './AppText';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Turns the boxes red. */
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six boxes for a one time code. One real (hidden) text input sits under them, so pasting,
 * the keyboard's SMS code suggestion and backspace all work the way people expect.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  hasError = false,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<ComponentRef<typeof RNTextInput>>(null);

  useEffect(() => {
    if (autoFocus) {
      // A short delay lets the screen finish its transition before the keyboard opens.
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoFocus]);

  const digits = value.split('');
  const activeIndex = Math.min(digits.length, length - 1);

  return (
    <View>
      <Pressable
        accessibilityRole="none"
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
      >
        {Array.from({ length }, (_, index) => {
          const filled = index < digits.length;
          const isActive = !disabled && index === activeIndex && digits.length < length;
          return (
            <View
              key={index}
              style={[
                styles.box,
                filled && styles.boxFilled,
                isActive && styles.boxActive,
                hasError && styles.boxError,
              ]}
            >
              <AppText style={styles.digit}>{digits[index] ?? ''}</AppText>
            </View>
          );
        })}
      </Pressable>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={length}
        // Lets iOS and Android offer the code from the SMS above the keyboard.
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel={`${length} digit code`}
        caretHidden
        style={styles.hiddenInput}
      />
    </View>
  );
}

const BOX = 48;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    maxWidth: 56,
    height: BOX + 8,
    minWidth: BOX - 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  boxFilled: { borderColor: colors.text },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  boxError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  digit: { fontSize: fontSize.title, fontWeight: '700' },
  // Invisible but still focusable. Covers the boxes so a tap anywhere opens the keyboard.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BOX + 8,
    opacity: 0.02,
    color: 'transparent',
  },
});

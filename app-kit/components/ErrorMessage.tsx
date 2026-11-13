import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorMessageProps {
  message: string;
  /** When given, a Try again button is shown. */
  onRetry?: () => void;
}

/** A friendly, readable error. Never shows codes or stack traces. */
export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <AppText style={styles.text}>{message}</AppText>
      {onRetry ? <Button title="Try again" variant="danger" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    gap: spacing.md,
  },
  text: { color: colors.danger },
});

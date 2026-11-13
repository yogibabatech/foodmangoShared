import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '../theme';
import { AppText } from './AppText';

/** A centred spinner with an optional line of text. */
export function Loader({ label }: { label?: string }) {
  return (
    <View
      style={styles.center}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Loading'}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <AppText variant="muted">{label}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

export interface NoticeBannerProps {
  message: string;
  onDismiss: () => void;
}

/** A friendly heads-up, for example "Chicken Biryani was removed from your cart". Can be closed. */
export function NoticeBanner({ message, onDismiss }: NoticeBannerProps) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Ionicons name="information-circle" size={20} color={colors.info} />
      <AppText variant="caption" style={styles.text}>
        {message}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        onPress={onDismiss}
        hitSlop={12}
      >
        <Ionicons name="close" size={20} color={colors.info} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  text: { flex: 1, color: colors.info, fontSize: 14 },
});

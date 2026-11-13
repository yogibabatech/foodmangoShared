import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_CONTENT_WIDTH, colors, spacing } from '../theme';

export interface ScreenProps {
  children: ReactNode;
  /** Make the content scroll. Use it for forms so the keyboard never hides a field. */
  scroll?: boolean;
  /** Which edges keep clear of the notch and bars. Tab screens drop the bottom edge. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  padded?: boolean;
}

/** The base of every screen: safe area, keyboard handling, cream background, phone-width content. */
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom', 'left', 'right'],
  padded = true,
}: ScreenProps) {
  const content = <View style={[styles.content, padded && styles.padded]}>{children}</View>;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  padded: { padding: spacing.xl },
});

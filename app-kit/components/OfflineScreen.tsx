import { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../theme';
import { useAuth } from '../store/auth';
import { AppText } from './AppText';
import { Button } from './Button';
import { Screen } from './Screen';

/** Shown when a saved login exists but the server cannot be reached. The login is kept. */
export function OfflineScreen() {
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await useAuth.getState().bootstrap();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <AppText variant="title">Can’t connect</AppText>
        <AppText variant="muted">
          We couldn’t reach the server. Check your internet connection and try again. You are still
          logged in.
        </AppText>
        <Button title="Try again" onPress={retry} loading={retrying} />
        <Button title="Log out" variant="ghost" onPress={() => void useAuth.getState().logout()} />
      </View>
    </Screen>
  );
}

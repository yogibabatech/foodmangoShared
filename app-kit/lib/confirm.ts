import { Alert, Platform } from 'react-native';

/** Asks "are you sure?". React Native's Alert does nothing on the web, so the browser's own box is used there. */
export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${options.title}\n\n${options.message}`)) options.onConfirm();
    return;
  }
  Alert.alert(options.title, options.message, [
    { text: 'Cancel', style: 'cancel' },
    { text: options.confirmLabel, style: 'destructive', onPress: options.onConfirm },
  ]);
}

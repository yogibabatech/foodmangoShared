import type { UserRole } from '../../src';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  getOtpMethods,
  loginWithPassword,
  logoutOnServer,
  registerWithPassword,
} from '../api/auth';
import { errorMessage } from '../api/client';
import { AppText, Button, ErrorMessage, Screen, TextInput } from '../components';
import { validateAccountForm, type FormErrors } from '../lib/passwordForm';
import { cleanPhoneInput, toE164 } from '../lib/phone';
import { useAuth } from '../store/auth';
import { colors, radius, spacing } from '../theme';

type Mode = 'login' | 'signup';

export interface AccountScreenProps {
  /** Only these roles may use this app. Anyone else is refused and is not logged in. */
  allowedRoles: UserRole[];
  /** Customers make their own account. Riders and vendors are given theirs, so they only log in. */
  allowSignup: boolean;
  /** Who this app is for, used in the refusal message: "This app is for riders." */
  audience: string;
  /** Customer only: the person arrived from the cart's Checkout button. */
  ordering?: boolean;
  /** Customer only: "Not now, keep browsing". */
  onNotNow?: () => void;
  /** Customer only: switch to the code login (shown only when a code method is on). */
  onUseCode?: () => void;
}

/**
 * Log in (and, for customers, create an account) with a mobile number and a password. The same
 * screen is used by every app; each app says who it is for.
 */
export function AccountScreen(props: AccountScreenProps) {
  const { allowedRoles, allowSignup, audience, ordering = false, onNotNow, onUseCode } = props;

  const [mode, setMode] = useState<Mode>(allowSignup && ordering ? 'signup' : 'login');
  const [digits, setDigits] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeLogin, setCodeLogin] = useState(false);

  // Offer the code login only when this app has one and it can actually send a code.
  useEffect(() => {
    if (!onUseCode) return;
    getOtpMethods()
      .then((m) => setCodeLogin(m.channels.length > 0))
      .catch(() => setCodeLogin(false));
  }, [onUseCode]);

  async function submit() {
    const found = validateAccountForm(mode, { digits, name, password });
    setErrors(found);
    setError(null);
    const phone = toE164(digits);
    if (Object.keys(found).length > 0 || !phone || busy) return;
    setBusy(true);
    try {
      const result =
        mode === 'login'
          ? await loginWithPassword(phone, password)
          : await registerWithPassword({ phone, name: name.trim(), password });
      if (!allowedRoles.includes(result.user.role)) {
        // A real account, but for a different app. Do not log in; end the session we just made.
        await logoutOnServer(result.refreshToken).catch(() => undefined);
        setError(`This app is for ${audience}. Please use the right app for your account.`);
        return;
      }
      // This logs in; the app then moves on by itself (see the root layout).
      await useAuth.getState().signIn(result);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const signup = allowSignup && mode === 'signup';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="headline">
          {ordering ? 'Almost there 🛵' : signup ? 'Create your account' : 'Welcome back 👋'}
        </AppText>
        <AppText variant="muted">
          {ordering
            ? 'To place your order, log in or create an account. Your cart is saved.'
            : signup
              ? 'Save your addresses and follow your orders.'
              : allowSignup
                ? 'Log in with your mobile number and password.'
                : `Log in with the mobile number and password the shop gave you.`}
        </AppText>
      </View>

      {allowSignup ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['login', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              onPress={() => {
                setMode(m);
                setErrors({});
                setError(null);
              }}
              style={[styles.tab, mode === m && styles.tabOn]}
            >
              <AppText variant="label" style={mode === m ? styles.tabTextOn : undefined}>
                {m === 'login' ? 'Log in' : 'Create account'}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.form}>
        {signup ? (
          <TextInput
            label="Your name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
            placeholder="For example, Asha"
            autoComplete="name"
            textContentType="name"
            maxLength={60}
            error={errors.name ?? null}
          />
        ) : null}

        <TextInput
          label="Mobile number"
          prefix="+91"
          value={digits}
          onChangeText={(text) => {
            setDigits(cleanPhoneInput(text));
            setError(null);
          }}
          placeholder="98765 43210"
          keyboardType="number-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          error={errors.phone ?? null}
        />

        <View>
          <TextInput
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            placeholder={signup ? 'At least 8 characters' : 'Your password'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={signup ? 'new-password' : 'current-password'}
            textContentType={signup ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={errors.password ?? null}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            style={styles.show}
          >
            <AppText variant="label" style={styles.showText}>
              {showPassword ? 'Hide password' : 'Show password'}
            </AppText>
          </Pressable>
        </View>

        {error ? <ErrorMessage message={error} /> : null}

        <Button
          title={signup ? 'Create account' : 'Log in'}
          onPress={() => void submit()}
          loading={busy}
        />

        {!signup ? (
          <AppText variant="caption" style={styles.center}>
            Forgot your password? Please ask the shop to set a new one for you.
          </AppText>
        ) : null}

        {codeLogin && onUseCode ? (
          <Button title="Use a code instead" variant="ghost" onPress={onUseCode} />
        ) : null}
        {ordering && onNotNow ? (
          <Button title="Not now, keep browsing" variant="ghost" onPress={onNotNow} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.lg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  tabOn: { backgroundColor: colors.primary },
  tabTextOn: { color: colors.onPrimary },
  form: { gap: spacing.lg },
  show: { alignSelf: 'flex-end', paddingTop: spacing.xs },
  showText: { color: colors.primary },
  center: { textAlign: 'center' },
});

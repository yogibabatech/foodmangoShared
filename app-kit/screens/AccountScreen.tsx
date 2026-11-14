import type { UserRole } from '../../src';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  getFirebaseStatus,
  getOtpMethods,
  loginWithFirebase,
  loginWithPassword,
  logoutOnServer,
  registerWithPassword,
  type LoginApp,
} from '../api/auth';
import { errorMessage } from '../api/client';
import type { VerifyOtpResult } from '../api/types';
import { AppText, Button, ErrorMessage, OtpInput, Screen, TextInput } from '../components';
import {
  confirmFirebaseCode,
  firebaseErrorMessage,
  firebaseOtpAvailable,
  sendFirebaseCode,
} from '../lib/firebaseOtp';
import { validateAccountForm, type FormErrors } from '../lib/passwordForm';
import { cleanPhoneInput, toE164 } from '../lib/phone';
import { useCountdown } from '../lib/useCountdown';
import { useAuth } from '../store/auth';
import { colors, radius, spacing } from '../theme';

type Mode = 'login' | 'signup';
type Method = 'otp' | 'password';
type OtpStep = 'phone' | 'code';

const RESEND_SECONDS = 30;

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

/** Which app this is, for the OTP login (only the Customer app may create accounts). */
function loginAppFor(roles: UserRole[]): LoginApp {
  if (roles.includes('CUSTOMER')) return 'customer';
  if (roles.includes('VENDOR')) return 'vendor';
  if (roles.includes('RIDER')) return 'rider';
  return 'admin';
}

/**
 * Log in (and, for customers, create an account). Two ways:
 * - OTP: a code by SMS through Firebase (websites for now), when it is set up;
 * - Password: mobile number and password.
 * The same screen is used by every app; each app says who it is for.
 */
export function AccountScreen(props: AccountScreenProps) {
  const { allowedRoles, allowSignup, audience, ordering = false, onNotNow, onUseCode } = props;

  const [method, setMethod] = useState<Method>('password');
  const [otpReady, setOtpReady] = useState(false);
  const [mode, setMode] = useState<Mode>(allowSignup && ordering ? 'signup' : 'login');
  const [digits, setDigits] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeLogin, setCodeLogin] = useState(false);
  const [step, setStep] = useState<OtpStep>('phone');
  const [code, setCode] = useState('');
  const resend = useCountdown(0);

  // OTP login: offered when this is a website with Firebase set up AND the API has it on.
  useEffect(() => {
    if (!firebaseOtpAvailable()) return;
    getFirebaseStatus()
      .then((s) => {
        setOtpReady(s.enabled);
        if (s.enabled) setMethod('otp');
      })
      .catch(() => setOtpReady(false));
  }, []);

  // The older code login (customer app), offered only when a code method is on.
  useEffect(() => {
    if (!onUseCode) return;
    getOtpMethods()
      .then((m) => setCodeLogin(m.channels.length > 0))
      .catch(() => setCodeLogin(false));
  }, [onUseCode]);

  /** Logs in with a result from the API, unless the account is for another app. */
  async function finish(result: VerifyOtpResult) {
    if (!allowedRoles.includes(result.user.role)) {
      // A real account, but for a different app. Do not log in; end the session we just made.
      await logoutOnServer(result.refreshToken).catch(() => undefined);
      setError(`This app is for ${audience}. Please use the right app for your account.`);
      return;
    }
    // This logs in; the app then moves on by itself (see the root layout). A new customer is
    // asked for their name there.
    await useAuth.getState().signIn(result);
  }

  async function submitPassword() {
    const found = validateAccountForm(mode, { digits, name, password });
    setErrors(found);
    setError(null);
    const phone = toE164(digits);
    if (Object.keys(found).length > 0 || !phone || busy) return;
    setBusy(true);
    try {
      await finish(
        mode === 'login'
          ? await loginWithPassword(phone, password)
          : await registerWithPassword({ phone, name: name.trim(), password }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendCode() {
    setError(null);
    const phone = toE164(digits);
    if (!phone) {
      setErrors({ phone: 'Enter your 10 digit mobile number' });
      return;
    }
    setErrors({});
    if (busy) return;
    setBusy(true);
    try {
      await sendFirebaseCode(phone);
      setCode('');
      setStep('code');
      resend.restart(RESEND_SECONDS);
    } catch (e) {
      setError(firebaseErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(value = code) {
    setError(null);
    if (value.length !== 6 || busy) return;
    setBusy(true);
    try {
      let idToken: string;
      try {
        idToken = await confirmFirebaseCode(value);
      } catch (e) {
        setError(firebaseErrorMessage(e));
        return;
      }
      await finish(await loginWithFirebase(idToken, loginAppFor(allowedRoles)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setStep('phone');
    setCode('');
    setErrors({});
    setError(null);
  }

  const otp = otpReady && method === 'otp';
  const signup = !otp && allowSignup && mode === 'signup';

  const subtitle = ordering
    ? 'To place your order, log in or create an account. Your cart is saved.'
    : otp
      ? step === 'code'
        ? `Enter the 6 digit code we sent to +91 ${digits}.`
        : allowSignup
          ? 'Enter your mobile number. We will send you a code by SMS. New here? Your account is made when you verify.'
          : 'Enter the mobile number the shop gave you. We will send you a code by SMS.'
      : signup
        ? 'Save your addresses and follow your orders.'
        : allowSignup
          ? 'Log in with your mobile number and password.'
          : 'Log in with the mobile number and password the shop gave you.';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <AppText variant="headline">
          {ordering ? 'Almost there 🛵' : signup ? 'Create your account' : 'Welcome 👋'}
        </AppText>
        <AppText variant="muted">{subtitle}</AppText>
      </View>

      {otpReady ? (
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['otp', 'password'] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={{ selected: method === m }}
              onPress={() => switchMethod(m)}
              style={[styles.tab, method === m && styles.tabOn]}
            >
              <AppText variant="label" style={method === m ? styles.tabTextOn : undefined}>
                {m === 'otp' ? 'OTP by SMS' : 'Password'}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {!otp && allowSignup ? (
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

        {!(otp && step === 'code') ? (
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
            returnKeyType={otp ? 'send' : 'next'}
            onSubmitEditing={otp ? () => void sendCode() : undefined}
            error={errors.phone ?? null}
          />
        ) : null}

        {otp && step === 'code' ? (
          <View style={styles.codeBox}>
            <OtpInput
              value={code}
              onChange={(value) => {
                setCode(value);
                setError(null);
                if (value.length === 6) void verifyCode(value);
              }}
              hasError={!!error}
              disabled={busy}
            />
          </View>
        ) : null}

        {!otp ? (
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
              onSubmitEditing={() => void submitPassword()}
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
        ) : null}

        {error ? <ErrorMessage message={error} /> : null}

        {otp ? (
          step === 'phone' ? (
            <>
              <Button title="Send code" onPress={() => void sendCode()} loading={busy} />
              <AppText variant="caption" style={styles.center}>
                This site is protected by reCAPTCHA and the Google{' '}
                <AppText
                  variant="caption"
                  style={styles.link}
                  onPress={() => void Linking.openURL('https://policies.google.com/privacy')}
                >
                  Privacy Policy
                </AppText>{' '}
                and{' '}
                <AppText
                  variant="caption"
                  style={styles.link}
                  onPress={() => void Linking.openURL('https://policies.google.com/terms')}
                >
                  Terms of Service
                </AppText>{' '}
                apply.
              </AppText>
            </>
          ) : (
            <>
              <Button
                title="Verify and continue"
                onPress={() => void verifyCode()}
                loading={busy}
                disabled={code.length !== 6}
              />
              <View style={styles.row}>
                <Button
                  title="Change number"
                  variant="ghost"
                  onPress={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                  }}
                />
                <Button
                  title={resend.seconds > 0 ? `Resend in ${resend.seconds}s` : 'Resend code'}
                  variant="ghost"
                  disabled={resend.seconds > 0 || busy}
                  onPress={() => void sendCode()}
                />
              </View>
            </>
          )
        ) : (
          <Button
            title={signup ? 'Create account' : 'Log in'}
            onPress={() => void submitPassword()}
            loading={busy}
          />
        )}

        {!otp && !signup ? (
          <AppText variant="caption" style={styles.center}>
            {otpReady
              ? 'Forgot your password? Log in with OTP instead.'
              : 'Forgot your password? Please ask the shop to set a new one for you.'}
          </AppText>
        ) : null}

        {codeLogin && onUseCode && !otpReady ? (
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
  codeBox: { alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  show: { alignSelf: 'flex-end', paddingTop: spacing.xs },
  showText: { color: colors.primary },
  center: { textAlign: 'center' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});

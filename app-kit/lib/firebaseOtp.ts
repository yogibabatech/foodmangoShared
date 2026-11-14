import { Platform } from 'react-native';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

/**
 * OTP login by SMS through Firebase Phone Auth, for the WEBSITES (for now).
 * Firebase sends and checks the SMS code; the app then gives the token Firebase returns to our
 * API (POST /auth/firebase), which logs the person in. Firebase is loaded only on the web, and
 * only when a code is sent, so the phone apps do not carry it yet.
 *
 * Each app calls setFirebaseConfig() once at startup with its Firebase web config. Those values
 * are public by design (they are in every website that uses Firebase).
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  storageBucket?: string;
  /**
   * Development only: skips Google's invisible robot check so Firebase TEST phone numbers work
   * in automated tests. Real numbers do not work while this is on. Never on in production.
   */
  testMode?: boolean;
}

let config: FirebaseWebConfig | null = null;
let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

export function setFirebaseConfig(next: FirebaseWebConfig | null): void {
  config = next && next.apiKey && next.projectId ? next : null;
}

/** OTP login can be offered here: a website with a Firebase config. */
export const firebaseOtpAvailable = () => Platform.OS === 'web' && config !== null;

async function auth() {
  if (!config) throw new Error('Firebase is not set up');
  const [{ initializeApp, getApps, getApp }, firebaseAuth] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const a = firebaseAuth.getAuth(app);
  a.useDeviceLanguage();
  if (config.testMode) a.settings.appVerificationDisabledForTesting = true;
  return { a, firebaseAuth };
}

/** Plain sentences for the Firebase errors people actually hit. */
export function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Please enter a valid 10 digit mobile number.';
    case 'auth/invalid-verification-code':
    case 'auth/missing-verification-code':
      return 'That code is not right. Please check the SMS and try again.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'That code has expired. Please send a new one.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many tries. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Cannot reach the internet. Check your connection and try again.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return 'We could not confirm you are not a robot. Please reload the page and try again.';
    case 'auth/unauthorized-domain':
      return 'This website is not allowed to send codes yet. Please use your password for now.';
    case 'auth/operation-not-allowed':
    case 'auth/billing-not-enabled':
      return 'Login with OTP is not switched on yet. Please use your password for now.';
    default:
      return 'Could not send or check the code. Please try again, or use your password.';
  }
}

/** Sends the SMS code to an Indian mobile number in E.164 form (+91...). */
export async function sendFirebaseCode(phoneE164: string): Promise<void> {
  const { a, firebaseAuth } = await auth();
  if (!verifier) {
    // An invisible check, in a box of its own at the end of the page.
    let box = document.getElementById('fm-recaptcha');
    if (!box) {
      box = document.createElement('div');
      box.id = 'fm-recaptcha';
      document.body.appendChild(box);
    }
    verifier = new firebaseAuth.RecaptchaVerifier(a, box, { size: 'invisible' });
  }
  try {
    confirmation = await firebaseAuth.signInWithPhoneNumber(a, phoneE164, verifier);
  } catch (error) {
    // A failed check cannot be reused: start a fresh one next time.
    verifier.clear();
    verifier = null;
    throw error;
  }
}

/** Checks the code the person typed and returns the Firebase ID token for our API. */
export async function confirmFirebaseCode(code: string): Promise<string> {
  if (!confirmation) throw Object.assign(new Error('No code sent'), { code: 'auth/session-expired' });
  const credential = await confirmation.confirm(code);
  const token = await credential.user.getIdToken();
  // Our API keeps the login from here; Firebase's own session is not needed.
  const { a, firebaseAuth } = await auth();
  await firebaseAuth.signOut(a).catch(() => undefined);
  confirmation = null;
  return token;
}

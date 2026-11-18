import { Platform } from 'react-native';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { puzzleScale } from './puzzleScale';

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
  // Loads the project's reCAPTCHA settings. It matters only once score-based reCAPTCHA is switched
  // on in the Firebase console (Authentication > Settings > Fraud prevention); until then it does nothing.
  await firebaseAuth.initializeRecaptchaConfig(a).catch(() => undefined);
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
      return 'We could not confirm you are not a robot. Please reload the page and try again. If you opened this from Instagram or another app, open the page in Chrome or Safari, or log in with your password.';
    case 'auth/timeout':
      return 'The robot check did not finish. Please tap Send code again.';
    case 'auth/unauthorized-domain':
      return 'This website is not allowed to send codes yet. Please use your password for now.';
    case 'auth/operation-not-allowed':
    case 'auth/billing-not-enabled':
      return 'Login with OTP is not switched on yet. Please use your password for now.';
    default:
      return 'Could not send or check the code. Please try again, or use your password.';
  }
}

/** How long to wait for Google's robot check (and the send) before giving up. */
const SEND_TIMEOUT_MS = 120_000;

/**
 * The box Google's robot check lives in. It is pinned to the screen: the websites do not scroll
 * the page itself, so a box at the end of the page put Google's picture puzzle off-screen, where
 * it could not be finished and the login waited forever. The puzzle Google opens is also pinned
 * to the middle of the screen, above everything.
 */
export function robotCheckBox(): HTMLElement {
  let box = document.getElementById('fm-recaptcha');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fm-recaptcha';
    box.style.cssText = 'position:fixed;left:0;bottom:0;z-index:2147483000;';
    document.body.appendChild(box);
  }
  if (!document.getElementById('fm-recaptcha-style')) {
    const style = document.createElement('style');
    style.id = 'fm-recaptcha-style';
    // The corner badge is hidden; Google allows that when the page shows its reCAPTCHA notice
    // instead (the login screen does, under Send code). The check itself still runs.
    style.textContent = `
      .grecaptcha-badge { visibility: hidden !important; }
      body > div:has(iframe[src*="recaptcha"][src*="bframe"]) {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) scale(var(--fm-puzzle-scale, 1));
        transform-origin: center center;
        z-index: 2147483647 !important;
        max-width: 100vw;
      }`;
    document.head.appendChild(style);
    // Shrink the puzzle on small screens so its Verify button is not cut off (the page cannot scroll).
    const fitPuzzle = () =>
      document.documentElement.style.setProperty(
        '--fm-puzzle-scale',
        String(puzzleScale(window.innerWidth, window.innerHeight)),
      );
    fitPuzzle();
    window.addEventListener('resize', fitPuzzle);
  }
  return box;
}

/** Sends the SMS code to an Indian mobile number in E.164 form (+91...). */
export async function sendFirebaseCode(phoneE164: string): Promise<void> {
  const { a, firebaseAuth } = await auth();
  const reset = () => {
    verifier?.clear();
    verifier = null;
  };
  if (!verifier) {
    verifier = new firebaseAuth.RecaptchaVerifier(a, robotCheckBox(), {
      size: 'invisible',
      badge: 'bottomleft',
      // An answered check expires after a while: start a fresh one next time.
      'expired-callback': reset,
    });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    confirmation = await Promise.race([
      firebaseAuth.signInWithPhoneNumber(a, phoneE164, verifier),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(Object.assign(new Error('Robot check timed out'), { code: 'auth/timeout' })),
          SEND_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (error) {
    // A failed or abandoned check cannot be reused: start a fresh one next time.
    reset();
    throw error;
  } finally {
    clearTimeout(timer);
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

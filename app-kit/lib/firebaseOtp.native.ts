/**
 * Phone apps: no Firebase here. The website's OTP login (firebaseOtp.ts) needs Google's robot check,
 * which cannot run inside a phone app, and the Firebase web SDK would add about half a megabyte to
 * every app. Metro picks this file instead of firebaseOtp.ts for Android and iOS builds. The phone
 * apps do OTP through a Chrome page instead (see the Rider app's src/lib/otpInBrowser.ts).
 */
export { firebaseErrorMessage } from './firebaseErrors';

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

export function setFirebaseConfig(_next: FirebaseWebConfig | null): void {
  // Nothing to set up in a phone app.
}

export const firebaseOtpAvailable = () => false;

export const ROBOT_CHECK_SLOT = 'fm-robot-check-slot';

const notHere = () => Object.assign(new Error('OTP by Firebase works on the website only'), { code: 'auth/operation-not-allowed' });

export function robotCheckBox(): HTMLElement {
  throw notHere();
}

export async function sendFirebaseCode(_phoneE164: string): Promise<void> {
  throw notHere();
}

export async function confirmFirebaseCode(_code: string): Promise<string> {
  throw notHere();
}

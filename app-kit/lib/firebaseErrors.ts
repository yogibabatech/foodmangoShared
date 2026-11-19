// Shared by the website version (firebaseOtp.ts) and the phone stub (firebaseOtp.native.ts).

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

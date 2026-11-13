import { toE164 } from './phone';

export const PASSWORD_MIN = 8;

export interface LoginFormValues {
  digits: string;
  name: string;
  password: string;
}

export type FormErrors = Partial<Record<'phone' | 'name' | 'password', string>>;

/**
 * Checks the login or sign up form before anything is sent, with a plain sentence for each field.
 * An empty object means the form is fine. (The server checks everything again.)
 */
export function validateAccountForm(mode: 'login' | 'signup', values: LoginFormValues): FormErrors {
  const errors: FormErrors = {};
  if (!toE164(values.digits)) errors.phone = 'Enter a valid 10 digit mobile number';
  if (mode === 'signup' && !values.name.trim()) errors.name = 'Enter your name';
  if (mode === 'login') {
    if (!values.password) errors.password = 'Enter your password';
  } else if (values.password.length < PASSWORD_MIN) {
    errors.password = `Use at least ${PASSWORD_MIN} characters`;
  }
  return errors;
}

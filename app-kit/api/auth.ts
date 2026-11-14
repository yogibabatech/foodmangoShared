import type { OtpChannel } from '../../src';
import { http } from './http';
import type { OtpMethods, SendOtpResult, User, VerifyOtpResult } from './types';

/** Which login methods are on right now (SMS, WhatsApp, Email, or Test). */
export const getOtpMethods = () => http.request<OtpMethods>('/auth/otp/methods', { auth: false });

export const sendOtp = (phone: string, channel?: OtpChannel) =>
  http.request<SendOtpResult>('/auth/otp/send', {
    method: 'POST',
    auth: false,
    body: { phone, ...(channel ? { channel } : {}) },
  });

export const verifyOtp = (phone: string, otp: string) =>
  http.request<VerifyOtpResult>('/auth/otp/verify', {
    method: 'POST',
    auth: false,
    body: { phone, otp },
  });

export const getMe = () => http.request<{ user: User }>('/me').then((r) => r.user);

export const updateName = (name: string) =>
  http.request<{ user: User }>('/me', { method: 'PATCH', body: { name } }).then((r) => r.user);

export const logoutOnServer = (refreshToken: string) =>
  http.request<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    auth: false,
    body: { refreshToken },
  });

/** Log in with a mobile number and password (no SMS code needed). */
export const loginWithPassword = (phone: string, password: string) =>
  http.request<VerifyOtpResult>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { phone, password },
  });

/** Create a customer account with a name, mobile number and password. Logs the person in. */
export const registerWithPassword = (input: { phone: string; name: string; password: string }) =>
  http.request<VerifyOtpResult>('/auth/register', {
    method: 'POST',
    auth: false,
    body: input,
  });

/** Whether the API has OTP login (Firebase) switched on. */
export const getFirebaseStatus = () =>
  http.request<{ enabled: boolean }>('/auth/firebase', { auth: false });

/** Which app is logging in: only the Customer app may create a new account with OTP. */
export type LoginApp = 'customer' | 'vendor' | 'rider' | 'admin';

/** Log in with the token Firebase gave after the SMS code was checked. */
export const loginWithFirebase = (idToken: string, app: LoginApp) =>
  http.request<VerifyOtpResult & { isNewUser: boolean }>('/auth/firebase', {
    method: 'POST',
    auth: false,
    body: { idToken, app },
  });

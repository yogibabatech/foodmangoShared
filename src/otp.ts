/**
 * Login OTP methods and the rules for switching them on and off.
 *
 *   SMS, EMAIL, WHATSAPP  real delivery channels, any mix may be on at once.
 *   TEST                  a fixed code for development. It is exclusive.
 *
 * Rules:
 *   1. Enabling TEST turns every other method off.
 *   2. Enabling any other method turns TEST off.
 *   3. At least one method must stay on, or nobody could log in.
 *   4. The default is TEST only.
 */
export const OtpChannel = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  TEST: 'TEST',
} as const;

export type OtpChannel = (typeof OtpChannel)[keyof typeof OtpChannel];

export const OTP_CHANNELS = Object.values(OtpChannel) as readonly OtpChannel[];

/** Channels that deliver to a real person, in the order the app should prefer them. */
export const REAL_OTP_CHANNELS = [
  OtpChannel.SMS,
  OtpChannel.WHATSAPP,
  OtpChannel.EMAIL,
] as const satisfies readonly OtpChannel[];

export type OtpSettings = Record<OtpChannel, boolean>;

export const DEFAULT_OTP_SETTINGS: OtpSettings = {
  SMS: false,
  EMAIL: false,
  WHATSAPP: false,
  TEST: true,
};

export type OtpSettingsPatch = Partial<OtpSettings>;

export type OtpSettingsResult =
  | { ok: true; settings: OtpSettings }
  | { ok: false; code: 'CONFLICTING_CHANGE' | 'NO_OTP_METHOD_ENABLED'; message: string };

/** Channels that are switched on, in a stable order. */
export function enabledOtpChannels(settings: OtpSettings): OtpChannel[] {
  return OTP_CHANNELS.filter((channel) => settings[channel]);
}

/**
 * Applies an admin change to the OTP settings and returns the result.
 * Only the channels named in the patch change on purpose; TEST and the real
 * channels switch each other off as described at the top of this file.
 */
export function applyOtpSettingsPatch(
  current: OtpSettings,
  patch: OtpSettingsPatch,
): OtpSettingsResult {
  const enablesTest = patch.TEST === true;
  const enablesReal = REAL_OTP_CHANNELS.some((channel) => patch[channel] === true);

  if (enablesTest && enablesReal) {
    return {
      ok: false,
      code: 'CONFLICTING_CHANGE',
      message: 'Test OTP cannot be enabled together with SMS, Email or WhatsApp OTP.',
    };
  }

  const next: OtpSettings = { ...current };
  for (const channel of OTP_CHANNELS) {
    const wanted = patch[channel];
    if (wanted !== undefined) next[channel] = wanted;
  }

  if (enablesTest) {
    for (const channel of REAL_OTP_CHANNELS) next[channel] = false;
  } else if (enablesReal) {
    next.TEST = false;
  }

  if (enabledOtpChannels(next).length === 0) {
    return {
      ok: false,
      code: 'NO_OTP_METHOD_ENABLED',
      message: 'At least one OTP method must stay enabled, or nobody could log in.',
    };
  }

  return { ok: true, settings: next };
}

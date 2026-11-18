/**
 * Detects the little browsers inside other apps (Instagram, Facebook, ...). Google's robot check
 * often fails there, so the login screen steers people to the password login and offers to open
 * the website in their real browser. Pure: give it the browser's user agent text.
 */
export type InAppBrowser = 'Instagram' | 'Facebook' | 'In-app browser';

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  if (/Instagram/i.test(userAgent)) return 'Instagram';
  // Facebook and Messenger: FBAN / FBAV (iPhone) and FB_IAB or FBAV (Android).
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(userAgent)) return 'Facebook';
  // Other apps' browsers: Snapchat, LinkedIn, Line, WeChat, TikTok.
  if (/Snapchat|LinkedInApp|\bLine\/|MicroMessenger|musical_ly|TikTok|BytedanceWebview/i.test(userAgent)) {
    return 'In-app browser';
  }
  return null;
}

/**
 * A link that asks Android to open this page in Chrome. (iPhones cannot be told to leave the
 * app's browser, so they are shown how to open it by hand instead.)
 */
export function chromeIntentUrl(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const scheme = url.protocol.replace(':', '');
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

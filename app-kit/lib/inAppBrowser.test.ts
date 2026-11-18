import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, detectInAppBrowser } from './inAppBrowser';

describe('in-app browsers', () => {
  it('spots Instagram and Facebook', () => {
    expect(
      detectInAppBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 300.0.0.1.1',
      ),
    ).toBe('Instagram');
    expect(
      detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]'),
    ).toBe('Facebook');
    expect(detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36 Instagram 310.0')).toBe(
      'Instagram',
    );
  });
  it('leaves normal browsers alone', () => {
    expect(
      detectInAppBrowser('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'),
    ).toBeNull();
    expect(detectInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Version/17.0 Mobile/15E148 Safari/604.1')).toBeNull();
    expect(detectInAppBrowser('')).toBeNull();
  });
  it('builds an Android link that opens the same page in Chrome', () => {
    expect(chromeIntentUrl('https://foodmango.in/phone?x=1')).toBe(
      'intent://foodmango.in/phone?x=1#Intent;scheme=https;package=com.android.chrome;end',
    );
    expect(chromeIntentUrl('javascript:alert(1)')).toBeNull();
    expect(chromeIntentUrl('not a url')).toBeNull();
  });
});

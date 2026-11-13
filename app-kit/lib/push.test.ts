import { describe, expect, it } from 'vitest';
import { pushProjectId } from './push';

describe('pushProjectId', () => {
  it('reads the app config first, then the EAS config', () => {
    expect(pushProjectId({ expoConfig: { extra: { eas: { projectId: 'p-1' } } } })).toBe('p-1');
    expect(pushProjectId({ easConfig: { projectId: 'p-2' } })).toBe('p-2');
    expect(
      pushProjectId({
        expoConfig: { extra: { eas: { projectId: 'p-1' } } },
        easConfig: { projectId: 'p-2' },
      }),
    ).toBe('p-1');
  });

  it('is null when no project is linked', () => {
    expect(pushProjectId({})).toBeNull();
    expect(pushProjectId({ expoConfig: { extra: {} }, easConfig: { projectId: ' ' } })).toBeNull();
    expect(pushProjectId({ expoConfig: { extra: { eas: { projectId: 7 } } } })).toBeNull();
  });
});

interface ProjectConfig {
  expoConfig?: { extra?: { eas?: { projectId?: unknown } } } | null;
  easConfig?: { projectId?: unknown } | null;
}

/**
 * The Expo project id that push tokens are issued for. It is set when the app is linked to an
 * EAS project. Without it (plain Expo Go development) there is no push token to ask for.
 */
export function pushProjectId(constants: ProjectConfig): string | null {
  const candidates = [constants.expoConfig?.extra?.eas?.projectId, constants.easConfig?.projectId];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

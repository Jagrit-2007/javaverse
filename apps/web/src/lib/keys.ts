import { getKeyHierarchy, type KeyHierarchy } from '@javaverse/security';
import { env } from '../env';

export function getServerKeys(): KeyHierarchy {
  const masterSecret = env.APP_MASTER_KEY || env.SESSION_SECRET;
  return getKeyHierarchy(masterSecret);
}

import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

// Crear cliente de base de datos
// En Cloudflare Pages, las env vars vienen del runtime context
export function createDb(runtimeEnv?: Record<string, string>) {
  // Obtener variables - priorizar runtime de Cloudflare
  const url = runtimeEnv?.TURSO_DATABASE_URL || import.meta.env.TURSO_DATABASE_URL || '';
  const authToken = runtimeEnv?.TURSO_AUTH_TOKEN || import.meta.env.TURSO_AUTH_TOKEN || '';

  if (!url) {
    throw new Error(`TURSO_DATABASE_URL not set. Runtime env keys: ${runtimeEnv ? Object.keys(runtimeEnv).join(', ') : 'none'}`);
  }

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

// Alias para compatibilidad
export const getDb = createDb;

// Para desarrollo local donde import.meta.env funciona
let _localDb: ReturnType<typeof drizzle> | null = null;
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    if (!_localDb) {
      const url = import.meta.env.TURSO_DATABASE_URL;
      const authToken = import.meta.env.TURSO_AUTH_TOKEN;
      if (url) {
        const client = createClient({ url, authToken: authToken || '' });
        _localDb = drizzle(client, { schema });
      } else {
        throw new Error('TURSO_DATABASE_URL not available in import.meta.env');
      }
    }
    return (_localDb as any)[prop];
  }
});

// Re-exportar esquema para conveniencia
export * from './schema';

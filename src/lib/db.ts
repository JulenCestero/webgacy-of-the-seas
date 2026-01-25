import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client/web';
import * as schema from './schema';

// Cache del cliente para reutilizar
let client: Client | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

// Función para obtener las variables de entorno
// En Cloudflare Pages runtime, se pasan via el contexto
function getEnvVars(runtimeEnv?: Record<string, string>) {
  // Primero intentar desde el runtime de Cloudflare (producción)
  if (runtimeEnv?.TURSO_DATABASE_URL) {
    return {
      url: runtimeEnv.TURSO_DATABASE_URL,
      authToken: runtimeEnv.TURSO_AUTH_TOKEN || '',
    };
  }
  // Fallback a import.meta.env (desarrollo local)
  return {
    url: import.meta.env.TURSO_DATABASE_URL || '',
    authToken: import.meta.env.TURSO_AUTH_TOKEN || '',
  };
}

// Crear cliente de forma lazy
export function getDb(runtimeEnv?: Record<string, string>) {
  const env = getEnvVars(runtimeEnv);

  if (!client || !dbInstance) {
    client = createClient({
      url: env.url,
      authToken: env.authToken,
    });
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

// Para compatibilidad con código existente (desarrollo local)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    const instance = getDb();
    return (instance as any)[prop];
  }
});

// Re-exportar esquema para conveniencia
export * from './schema';

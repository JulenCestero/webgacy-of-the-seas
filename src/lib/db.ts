import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Cliente de Turso
const client = createClient({
  url: import.meta.env.TURSO_DATABASE_URL,
  authToken: import.meta.env.TURSO_AUTH_TOKEN,
});

// Instancia de Drizzle con esquema tipado
export const db = drizzle(client, { schema });

// Re-exportar esquema para conveniencia
export * from './schema';

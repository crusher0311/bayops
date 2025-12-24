import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from './config';

type DrizzleInstance = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

let dbInstance: DrizzleInstance | null = null;
let poolInstance: any = null;
let initPromise: Promise<void> | null = null;

async function initializeDatabase(): Promise<void> {
  if (dbInstance && poolInstance) {
    return;
  }

  if (config.database.useNeonDriver) {
    const { Pool, neonConfig } = await import('@neondatabase/serverless');
    const ws = (await import('ws')).default;
    neonConfig.webSocketConstructor = ws;
    
    poolInstance = new Pool({ connectionString: config.database.url });
    dbInstance = drizzleNeon({ client: poolInstance, schema });
    console.log('[Database] Using Neon serverless driver');
  } else {
    const pg = await import('pg');
    poolInstance = new pg.Pool({ connectionString: config.database.url });
    dbInstance = drizzlePg({ client: poolInstance, schema });
    console.log('[Database] Using standard PostgreSQL driver');
  }
}

function ensureInit() {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  return initPromise;
}

export async function getDb(): Promise<DrizzleInstance> {
  await ensureInit();
  return dbInstance!;
}

export async function getPool(): Promise<any> {
  await ensureInit();
  return poolInstance!;
}

export { initializeDatabase };

export const db = new Proxy({} as DrizzleInstance, {
  get(_, prop) {
    if (!dbInstance) {
      throw new Error('Database not initialized. Ensure initializeDatabase() is called at startup.');
    }
    return (dbInstance as any)[prop];
  }
});

export const pool = new Proxy({} as any, {
  get(_, prop) {
    if (!poolInstance) {
      throw new Error('Pool not initialized. Ensure initializeDatabase() is called at startup.');
    }
    return poolInstance[prop];
  }
});

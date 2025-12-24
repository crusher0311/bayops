import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from './config';

type DrizzleInstance = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

let dbInstance: DrizzleInstance | null = null;
let poolInstance: any = null;
let initPromise: Promise<{ db: DrizzleInstance; pool: any }> | null = null;

async function initializeDatabase(): Promise<{ db: DrizzleInstance; pool: any }> {
  if (dbInstance && poolInstance) {
    return { db: dbInstance, pool: poolInstance };
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

  return { db: dbInstance, pool: poolInstance };
}

function getInitPromise() {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }
  return initPromise;
}

export async function getDb(): Promise<DrizzleInstance> {
  const { db } = await getInitPromise();
  return db;
}

export async function getPool(): Promise<any> {
  const { pool } = await getInitPromise();
  return pool;
}

const dbProxy = new Proxy({} as DrizzleInstance, {
  get(_, prop) {
    if (!dbInstance) {
      throw new Error('Database not initialized. Call initializeDatabase() first or use getDb().');
    }
    return (dbInstance as any)[prop];
  }
});

const poolProxy = new Proxy({} as any, {
  get(_, prop) {
    if (!poolInstance) {
      throw new Error('Pool not initialized. Call initializeDatabase() first or use getPool().');
    }
    return poolInstance[prop];
  }
});

export { poolProxy as pool, dbProxy as db, initializeDatabase };

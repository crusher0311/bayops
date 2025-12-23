import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { config } from './config';

type DrizzleInstance = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePg>;

let dbInstance: DrizzleInstance | null = null;
let poolInstance: any = null;

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

const { db, pool } = await initializeDatabase();

export { pool, db, initializeDatabase };

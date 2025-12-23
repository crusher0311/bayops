type HostingMode = 'replit' | 'supabase' | 'self-hosted';

interface HostingConfig {
  mode: HostingMode;
  database: {
    url: string;
    useNeonDriver: boolean;
  };
  storage: {
    type: 'replit' | 'supabase' | 'filesystem';
    supabaseUrl?: string;
    supabaseKey?: string;
    supabaseBucket?: string;
    localDir?: string;
  };
  auth: {
    sessionSecret: string;
  };
  appUrl: string;
}

function detectHostingMode(): HostingMode {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return 'supabase';
  }
  if (process.env.REPL_ID) {
    return 'replit';
  }
  return 'self-hosted';
}

function getConfig(): HostingConfig {
  const mode = detectHostingMode();
  
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or SUPABASE_DB_URL must be set');
  }
  
  const useNeonDriver = mode === 'replit' || databaseUrl.includes('neon.tech');
  
  let storageType: 'replit' | 'supabase' | 'filesystem';
  if (mode === 'replit' && process.env.REPL_ID) {
    storageType = 'replit';
  } else if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    storageType = 'supabase';
  } else {
    storageType = 'filesystem';
  }
  
  const sessionSecret = process.env.SESSION_SECRET 
    || process.env.REPL_ID 
    || 'bayops-dev-secret-change-in-production';
    
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('[Config] WARNING: SESSION_SECRET not set in production!');
  }
  
  const appUrl = process.env.APP_URL 
    || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null)
    || 'http://localhost:5000';
  
  console.log(`[Config] Hosting mode: ${mode}`);
  console.log(`[Config] Database driver: ${useNeonDriver ? 'Neon' : 'standard pg'}`);
  console.log(`[Config] Storage type: ${storageType}`);
  
  return {
    mode,
    database: {
      url: databaseUrl,
      useNeonDriver,
    },
    storage: {
      type: storageType,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseBucket: process.env.SUPABASE_STORAGE_BUCKET || 'uploads',
      localDir: process.env.PRIVATE_OBJECT_DIR || './uploads',
    },
    auth: {
      sessionSecret,
    },
    appUrl,
  };
}

export const config = getConfig();
export { HostingMode, HostingConfig };

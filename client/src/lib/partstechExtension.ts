// PartsTech Chrome Extension Integration
// This provides hooks and utilities for communicating with the BayOPS Parts Connector extension

declare global {
  interface Window {
    BayOPSExtension?: {
      isInstalled: boolean;
      version: string;
      openPartsTech: (jobId: string, repairOrderId: string, roNumber: string, vehicleInfo: string, vin: string, searchQuery?: string) => Promise<{ success: boolean; tabId?: number; reused?: boolean }>;
      getSession: (jobId: string) => Promise<{ success: boolean; session?: PartsSession }>;
      getAllSessions: () => Promise<{ success: boolean; sessions?: Record<string, PartsSession> }>;
      addPart: (jobId: string, part: PartItem) => Promise<{ success: boolean; session?: PartsSession }>;
      removePart: (jobId: string, partNumber: string) => Promise<{ success: boolean; session?: PartsSession }>;
      clearSession: (jobId: string) => Promise<{ success: boolean }>;
      markOrdered: (jobId: string) => Promise<{ success: boolean; session?: PartsSession }>;
      onSessionUpdate: (callback: (jobId: string, session: PartsSession) => void) => void;
    };
  }
}

export interface PartItem {
  partNumber: string;
  description?: string;
  brand?: string;
  supplier?: string;
  price?: number;
  quantity?: number;
}

export interface PartsSession {
  jobId: string;
  roNumber?: string;
  vehicleInfo?: string;
  tabId?: number | null;
  items: PartItem[];
  status: 'draft' | 'ordered';
  createdAt: number;
  updatedAt: number;
}

// Check if extension is installed - also looks for the extension-ready event flag
export function isExtensionInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if extension bridge is available
  if (window.BayOPSExtension?.isInstalled) return true;
  
  // Check if extension ready event was dispatched (stored on window)
  return !!(window as any).__bayopsExtensionReady;
}

// Wait for extension to be ready (useful on initial page load)
export function waitForExtension(timeoutMs: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isExtensionInstalled()) {
      resolve(true);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (isExtensionInstalled()) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve(true);
      }
    }, 100);
    
    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, timeoutMs);
    
    // Also listen for the ready event
    const handler = () => {
      (window as any).__bayopsExtensionReady = true;
      clearInterval(checkInterval);
      clearTimeout(timeout);
      window.removeEventListener('bayops-extension-ready', handler);
      resolve(true);
    };
    window.addEventListener('bayops-extension-ready', handler);
  });
}

export async function openPartsTech(
  jobId: string,
  repairOrderId: string,
  roNumber: string,
  vehicleInfo: string,
  vin: string,
  searchQuery?: string
): Promise<{ success: boolean; tabId?: number; reused?: boolean; error?: string }> {
  if (!isExtensionInstalled()) {
    return { success: false, error: 'Extension not installed' };
  }
  
  try {
    return await window.BayOPSExtension!.openPartsTech(jobId, repairOrderId, roNumber, vehicleInfo, vin, searchQuery);
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPartsSession(jobId: string): Promise<PartsSession | null> {
  if (!isExtensionInstalled()) return null;
  
  try {
    const result = await window.BayOPSExtension!.getSession(jobId);
    return result.success ? result.session || null : null;
  } catch {
    return null;
  }
}

export async function getAllPartsSessions(): Promise<Record<string, PartsSession>> {
  if (!isExtensionInstalled()) return {};
  
  try {
    const result = await window.BayOPSExtension!.getAllSessions();
    return result.success ? result.sessions || {} : {};
  } catch {
    return {};
  }
}

export function subscribeToSessionUpdates(callback: (jobId: string, session: PartsSession) => void): void {
  if (!isExtensionInstalled()) return;
  window.BayOPSExtension!.onSessionUpdate(callback);
}

export async function markSessionOrdered(jobId: string): Promise<boolean> {
  if (!isExtensionInstalled()) return false;
  
  try {
    const result = await window.BayOPSExtension!.markOrdered(jobId);
    return result.success;
  } catch {
    return false;
  }
}

export async function clearPartsSession(jobId: string): Promise<boolean> {
  if (!isExtensionInstalled()) return false;
  
  try {
    const result = await window.BayOPSExtension!.clearSession(jobId);
    return result.success;
  } catch {
    return false;
  }
}

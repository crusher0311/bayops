// PartsTech Chrome Extension Integration
// This provides hooks and utilities for communicating with the BayOPS Parts Connector extension

declare global {
  interface Window {
    BayOPSExtension?: {
      isInstalled: boolean;
      version: string;
      openPartsTech: (jobId: string, repairOrderId: string, roNumber: string, vehicleInfo: string, searchQuery?: string) => Promise<{ success: boolean; tabId?: number; reused?: boolean }>;
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

export function isExtensionInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.BayOPSExtension?.isInstalled;
}

export async function openPartsTech(
  jobId: string,
  repairOrderId: string,
  roNumber: string,
  vehicleInfo: string,
  searchQuery?: string
): Promise<{ success: boolean; tabId?: number; reused?: boolean; error?: string }> {
  if (!isExtensionInstalled()) {
    return { success: false, error: 'Extension not installed' };
  }
  
  try {
    return await window.BayOPSExtension!.openPartsTech(jobId, repairOrderId, roNumber, vehicleInfo, searchQuery);
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

// BayOPS Parts Connector - Background Service Worker
// Manages communication between BayOPS and PartsTech tabs

const SESSION_STORAGE_KEY = 'bayops_parts_sessions';

// Session structure:
// {
//   [jobId]: {
//     jobId: string,
//     roNumber: string,
//     vehicleInfo: string,
//     tabId: number | null,
//     items: [{
//       partNumber: string,
//       description: string,
//       brand: string,
//       supplier: string,
//       price: number,
//       quantity: number,
//       addedAt: timestamp
//     }],
//     status: 'draft' | 'ordered',
//     createdAt: timestamp,
//     updatedAt: timestamp
//   }
// }

async function getSessions() {
  const result = await chrome.storage.local.get(SESSION_STORAGE_KEY);
  return result[SESSION_STORAGE_KEY] || {};
}

async function saveSessions(sessions) {
  await chrome.storage.local.set({ [SESSION_STORAGE_KEY]: sessions });
}

async function getSession(jobId) {
  const sessions = await getSessions();
  return sessions[jobId] || null;
}

async function createOrUpdateSession(jobId, data) {
  const sessions = await getSessions();
  const existing = sessions[jobId];
  
  sessions[jobId] = {
    ...existing,
    ...data,
    jobId,
    updatedAt: Date.now(),
    createdAt: existing?.createdAt || Date.now(),
    items: data.items || existing?.items || [],
    status: data.status || existing?.status || 'draft'
  };
  
  await saveSessions(sessions);
  return sessions[jobId];
}

async function addItemToSession(jobId, item) {
  const sessions = await getSessions();
  const session = sessions[jobId];
  
  if (!session) {
    console.error('No session found for job:', jobId);
    return null;
  }
  
  // Check for duplicates by part number
  const existingIndex = session.items.findIndex(i => i.partNumber === item.partNumber);
  
  if (existingIndex >= 0) {
    // Update quantity if exists
    session.items[existingIndex].quantity += item.quantity || 1;
    session.items[existingIndex].updatedAt = Date.now();
  } else {
    // Add new item
    session.items.push({
      ...item,
      addedAt: Date.now()
    });
  }
  
  session.updatedAt = Date.now();
  await saveSessions(sessions);
  
  // Notify BayOPS of update
  notifyBayOPS(jobId, session);
  
  return session;
}

async function removeItemFromSession(jobId, partNumber) {
  const sessions = await getSessions();
  const session = sessions[jobId];
  
  if (!session) return null;
  
  session.items = session.items.filter(i => i.partNumber !== partNumber);
  session.updatedAt = Date.now();
  
  await saveSessions(sessions);
  notifyBayOPS(jobId, session);
  
  return session;
}

async function clearSession(jobId) {
  const sessions = await getSessions();
  delete sessions[jobId];
  await saveSessions(sessions);
}

// Find BayOPS tab and send update (also triggers API persistence)
async function notifyBayOPS(jobId, session, persistToServer = true) {
  try {
    const tabs = await chrome.tabs.query({
      url: ['http://localhost:5000/*', 'https://*.replit.app/*', 'https://*.replit.dev/*']
    });
    
    for (const tab of tabs) {
      // Send session update to BayOPS page
      chrome.tabs.sendMessage(tab.id, {
        type: 'BAYOPS_SESSION_UPDATE',
        jobId,
        session,
        persistToServer
      }).catch(() => {
        // Tab might not have content script loaded
      });
    }
  } catch (error) {
    console.error('Error notifying BayOPS:', error);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  console.log('Background received:', message.type, message);
  
  switch (message.type) {
    case 'OPEN_PARTSTECH': {
      // Open PartsTech in a new tab for a specific job
      const { jobId, repairOrderId, roNumber, vehicleInfo, vin, searchQuery } = message;
      
      // Create/update session with repairOrderId for API persistence
      await createOrUpdateSession(jobId, {
        repairOrderId,
        roNumber,
        vehicleInfo,
        vin,
        status: 'draft'
      });
      
      // Build PartsTech URL with VIN for vehicle auto-selection
      let url = 'https://app.partstech.com/';
      
      // Add VIN to URL if provided - PartsTech will auto-select the vehicle
      if (vin && vin.length === 17) {
        url = `https://app.partstech.com/searchresult?vin=${encodeURIComponent(vin)}`;
      }
      
      // Check if we already have a PartsTech tab for this job
      const sessions = await getSessions();
      const session = sessions[jobId];
      
      if (session?.tabId) {
        try {
          const existingTab = await chrome.tabs.get(session.tabId);
          if (existingTab) {
            // Focus existing tab
            await chrome.tabs.update(session.tabId, { active: true });
            await chrome.windows.update(existingTab.windowId, { focused: true });
            return { success: true, tabId: session.tabId, reused: true };
          }
        } catch (e) {
          // Tab no longer exists
        }
      }
      
      // Open new tab
      const tab = await chrome.tabs.create({ url, active: true });
      
      // Store tab ID in session
      await createOrUpdateSession(jobId, { tabId: tab.id });
      
      // Inject job context into the new tab
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SET_JOB_CONTEXT',
            jobId,
            roNumber,
            vehicleInfo
          });
        } catch (e) {
          // Content script might not be ready yet
        }
      }, 2000);
      
      return { success: true, tabId: tab.id, reused: false };
    }
    
    case 'GET_SESSION': {
      const session = await getSession(message.jobId);
      return { success: true, session };
    }
    
    case 'GET_ALL_SESSIONS': {
      const sessions = await getSessions();
      return { success: true, sessions };
    }
    
    case 'ADD_PART': {
      const { jobId, part } = message;
      const session = await addItemToSession(jobId, part);
      return { success: !!session, session };
    }
    
    case 'REMOVE_PART': {
      const { jobId, partNumber } = message;
      const session = await removeItemFromSession(jobId, partNumber);
      return { success: !!session, session };
    }
    
    case 'CART_UPDATE': {
      // PartsTech content script detected cart changes
      const { items } = message;
      
      // Find active job session by tab ID
      const sessions = await getSessions();
      let activeJobId = null;
      
      for (const [jobId, session] of Object.entries(sessions)) {
        if (session.tabId === sender.tab?.id) {
          activeJobId = jobId;
          break;
        }
      }
      
      if (!activeJobId) {
        console.warn('No active job session for tab:', sender.tab?.id);
        return { success: false, error: 'No active session' };
      }
      
      // Update session with cart items
      const session = await createOrUpdateSession(activeJobId, { items });
      notifyBayOPS(activeJobId, session);
      
      return { success: true, session };
    }
    
    case 'CLEAR_SESSION': {
      await clearSession(message.jobId);
      return { success: true };
    }
    
    case 'MARK_ORDERED': {
      const session = await createOrUpdateSession(message.jobId, { status: 'ordered' });
      notifyBayOPS(message.jobId, session);
      return { success: true, session };
    }
    
    case 'SYNC_TO_BAYOPS': {
      // Explicitly sync session to BayOPS app
      const session = await getSession(message.jobId);
      if (session) {
        notifyBayOPS(message.jobId, session, true);
        return { success: true, session };
      }
      return { success: false, error: 'No session found' };
    }
    
    case 'GET_TAB_CONTEXT': {
      // Content script asking for job context for current tab
      const sessions = await getSessions();
      for (const [jobId, session] of Object.entries(sessions)) {
        if (session.tabId === sender.tab?.id) {
          return { 
            success: true, 
            jobContext: {
              jobId,
              roNumber: session.roNumber,
              vehicleInfo: session.vehicleInfo
            }
          };
        }
      }
      return { success: false };
    }
    
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Track tab closures to update sessions
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const sessions = await getSessions();
  
  for (const [jobId, session] of Object.entries(sessions)) {
    if (session.tabId === tabId) {
      session.tabId = null;
      session.updatedAt = Date.now();
    }
  }
  
  await saveSessions(sessions);
});

console.log('BayOPS Parts Connector background service worker loaded');

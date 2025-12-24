// BayOPS Parts & Labor Connector - Background Service Worker
// Manages communication between BayOPS, PartsTech, and Labor Guide tabs

const SESSION_STORAGE_KEY = 'bayops_parts_sessions';
const LABOR_SESSION_STORAGE_KEY = 'bayops_labor_sessions';

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
  
  // For auto-sync mode, don't accumulate in session - just sync the part directly
  // Clear previous items and add the new one (session is just for current sync)
  session.items = [{
    ...item,
    addedAt: Date.now()
  }];
  
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
      url: ['http://localhost:5000/*', 'https://*.replit.app/*', 'https://*.replit.dev/*', 'https://bayoperations.com/*', 'https://*.bayoperations.com/*']
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
      
      // Build PartsTech URL with VIN and optional search query
      let url = 'https://app.partstech.com/';
      
      // Add VIN to URL if provided - PartsTech will auto-select the vehicle
      if (vin && vin.length === 17) {
        url = `https://app.partstech.com/searchresult?vin=${encodeURIComponent(vin)}`;
        // Add search query (job name) if provided
        if (searchQuery) {
          url += `&part_text=${encodeURIComponent(searchQuery)}`;
        }
      } else if (searchQuery) {
        // No VIN but have search query
        url = `https://app.partstech.com/searchresult?part_text=${encodeURIComponent(searchQuery)}`;
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
    
    // ==========================================
    // LABOR GUIDE HANDLERS
    // ==========================================
    
    case 'OPEN_LABOR_GUIDE': {
      const { sessionToken, provider, vin, year, make, model, engine, jobId } = message;
      
      // Store labor session
      const laborSessions = await getLaborSessions();
      laborSessions[sessionToken] = {
        sessionToken,
        jobId,
        vin,
        year,
        make,
        model,
        engine,
        provider,
        tabId: null,
        createdAt: Date.now()
      };
      await saveLaborSessions(laborSessions);
      
      // Build labor guide URL based on provider
      let url = '';
      switch (provider) {
        case 'PRODEMAND':
          url = 'https://prodemand.com/';
          break;
        case 'ALLDATA':
          url = 'https://my.alldata.com/';
          break;
        case 'IDENTIFIX':
          url = 'https://www.identifix.com/';
          break;
        default:
          url = 'https://prodemand.com/';
      }
      
      // Open tab
      const tab = await chrome.tabs.create({ url, active: true });
      
      // Update session with tab ID
      laborSessions[sessionToken].tabId = tab.id;
      await saveLaborSessions(laborSessions);
      
      // Set context in the tab after it loads
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SET_LABOR_CONTEXT',
            sessionToken,
            jobId,
            vin,
            year,
            make,
            model,
            engine
          });
        } catch (e) {
          // Content script might not be ready
        }
      }, 2000);
      
      return { success: true, tabId: tab.id };
    }
    
    case 'GET_LABOR_TAB_CONTEXT': {
      // Labor guide content script asking for context
      const laborSessions = await getLaborSessions();
      for (const [token, session] of Object.entries(laborSessions)) {
        if (session.tabId === sender.tab?.id) {
          return { 
            success: true, 
            session: {
              sessionToken: token,
              jobId: session.jobId,
              vin: session.vin,
              year: session.year,
              make: session.make,
              model: session.model,
              engine: session.engine
            }
          };
        }
      }
      return { success: false };
    }
    
    case 'SEND_LABOR_TO_BAYOPS': {
      const { sessionToken, laborItems } = message;
      
      // Find all BayOPS tabs and send labor data to them
      // The BayOPS content script will handle API persistence
      try {
        const tabs = await chrome.tabs.query({
          url: ['http://localhost:5000/*', 'https://*.replit.app/*', 'https://*.replit.dev/*']
        });
        
        if (tabs.length === 0) {
          console.warn('No BayOPS tabs found to receive labor data');
          return { success: false, error: 'No BayOPS tabs open' };
        }
        
        let sentSuccessfully = false;
        for (const tab of tabs) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'LABOR_CAPTURED',
              sessionToken,
              laborItems
            });
            sentSuccessfully = true;
            console.log('Labor data sent to BayOPS tab:', tab.id);
          } catch (e) {
            // Tab might not have content script loaded
            console.log('Could not send to tab', tab.id, e.message);
          }
        }
        
        if (sentSuccessfully) {
          return { success: true };
        } else {
          return { success: false, error: 'Failed to send to any BayOPS tab' };
        }
      } catch (error) {
        console.error('Error sending labor to BayOPS:', error);
        return { success: false, error: error.message };
      }
    }
    
    default:
      return { success: false, error: 'Unknown message type' };
  }
}

// Labor session helpers
async function getLaborSessions() {
  const result = await chrome.storage.local.get(LABOR_SESSION_STORAGE_KEY);
  return result[LABOR_SESSION_STORAGE_KEY] || {};
}

async function saveLaborSessions(sessions) {
  await chrome.storage.local.set({ [LABOR_SESSION_STORAGE_KEY]: sessions });
}

// Track tab closures to update sessions
chrome.tabs.onRemoved.addListener(async (tabId) => {
  // Update parts sessions
  const sessions = await getSessions();
  for (const [jobId, session] of Object.entries(sessions)) {
    if (session.tabId === tabId) {
      session.tabId = null;
      session.updatedAt = Date.now();
    }
  }
  await saveSessions(sessions);
  
  // Update labor sessions
  const laborSessions = await getLaborSessions();
  for (const [token, session] of Object.entries(laborSessions)) {
    if (session.tabId === tabId) {
      session.tabId = null;
    }
  }
  await saveLaborSessions(laborSessions);
});

console.log('BayOPS Parts & Labor Connector background service worker loaded');

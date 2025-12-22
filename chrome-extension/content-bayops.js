// BayOPS Parts Connector - BayOPS Content Script
// Enables communication between BayOPS web app and the extension

// Listen for messages from the web page
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;
  
  const message = event.data;
  if (!message || !message.type || !message.type.startsWith('BAYOPS_')) return;
  
  console.log('BayOPS Extension: Received message from page:', message.type);
  
  try {
    const response = await chrome.runtime.sendMessage(message);
    
    // Send response back to page
    window.postMessage({
      type: message.type + '_RESPONSE',
      requestId: message.requestId,
      ...response
    }, '*');
  } catch (error) {
    console.error('BayOPS Extension: Error handling message:', error);
    window.postMessage({
      type: message.type + '_RESPONSE',
      requestId: message.requestId,
      success: false,
      error: error.message
    }, '*');
  }
});

// Listen for session updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BAYOPS_SESSION_UPDATE') {
    // Forward to page
    window.postMessage({
      type: 'BAYOPS_SESSION_UPDATE',
      jobId: message.jobId,
      session: message.session
    }, '*');
    
    // Persist to server if requested
    if (message.persistToServer && message.session) {
      persistSessionToServer(message.jobId, message.session);
    }
    
    sendResponse({ success: true });
  }
  return true;
});

// Persist session to BayOPS server API
async function persistSessionToServer(jobId, session) {
  try {
    // Skip if no repair order context
    if (!session.repairOrderId) {
      console.log('BayOPS Extension: No repairOrderId, skipping API persistence');
      return;
    }
    
    const response = await fetch('/api/parts-sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        jobId: jobId,
        repairOrderId: session.repairOrderId,
        roNumber: session.roNumber,
        vehicleInfo: session.vehicleInfo,
        items: session.items || []
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'API error' }));
      console.error('BayOPS Extension: Failed to persist session:', error.message);
    } else {
      console.log('BayOPS Extension: Session persisted to server');
    }
  } catch (error) {
    console.error('BayOPS Extension: Error persisting session:', error);
  }
}

// Inject a helper function into the page context
const script = document.createElement('script');
script.textContent = `
  window.BayOPSExtension = {
    isInstalled: true,
    version: '1.0.0',
    
    // Generate unique request ID
    _requestId: 0,
    _pendingRequests: new Map(),
    _sessionUpdateCallbacks: [],
    
    // Send message to extension and wait for response
    async sendMessage(message) {
      return new Promise((resolve, reject) => {
        const requestId = ++this._requestId;
        const responseType = message.type + '_RESPONSE';
        
        // Set up response handler
        const handler = (event) => {
          if (event.data?.type === responseType && event.data?.requestId === requestId) {
            window.removeEventListener('message', handler);
            this._pendingRequests.delete(requestId);
            
            if (event.data.success) {
              resolve(event.data);
            } else {
              reject(new Error(event.data.error || 'Unknown error'));
            }
          }
        };
        
        window.addEventListener('message', handler);
        this._pendingRequests.set(requestId, handler);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (this._pendingRequests.has(requestId)) {
            window.removeEventListener('message', handler);
            this._pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 10000);
        
        // Send message
        window.postMessage({ ...message, requestId }, '*');
      });
    },
    
    // Open PartsTech for a job
    async openPartsTech(jobId, repairOrderId, roNumber, vehicleInfo, searchQuery) {
      return this.sendMessage({
        type: 'OPEN_PARTSTECH',
        jobId,
        repairOrderId,
        roNumber,
        vehicleInfo,
        searchQuery
      });
    },
    
    // Get session for a job
    async getSession(jobId) {
      return this.sendMessage({
        type: 'GET_SESSION',
        jobId
      });
    },
    
    // Get all sessions
    async getAllSessions() {
      return this.sendMessage({
        type: 'GET_ALL_SESSIONS'
      });
    },
    
    // Add a part manually
    async addPart(jobId, part) {
      return this.sendMessage({
        type: 'ADD_PART',
        jobId,
        part
      });
    },
    
    // Remove a part
    async removePart(jobId, partNumber) {
      return this.sendMessage({
        type: 'REMOVE_PART',
        jobId,
        partNumber
      });
    },
    
    // Clear session
    async clearSession(jobId) {
      return this.sendMessage({
        type: 'CLEAR_SESSION',
        jobId
      });
    },
    
    // Mark session as ordered
    async markOrdered(jobId) {
      return this.sendMessage({
        type: 'MARK_ORDERED',
        jobId
      });
    },
    
    // Listen for session updates
    onSessionUpdate(callback) {
      this._sessionUpdateCallbacks.push(callback);
    },
    
    // Internal: notify all callbacks of session update
    _notifySessionUpdate(jobId, session) {
      this._sessionUpdateCallbacks.forEach(cb => {
        try {
          cb(jobId, session);
        } catch (e) {
          console.error('Session update callback error:', e);
        }
      });
    }
  };
  
  // Listen for session updates from extension
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'BAYOPS_SESSION_UPDATE') {
      window.BayOPSExtension._notifySessionUpdate(event.data.jobId, event.data.session);
    }
  });
  
  // Dispatch event to let BayOPS know extension is ready
  window.dispatchEvent(new CustomEvent('bayops-extension-ready'));
  console.log('BayOPS Parts Connector: Extension bridge ready');
`;

document.documentElement.appendChild(script);
script.remove();

console.log('BayOPS Parts Connector: Content script loaded');

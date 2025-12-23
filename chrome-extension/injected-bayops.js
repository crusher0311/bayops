// BayOPS Parts Connector - Injected Bridge Script
// This runs in the page context to provide window.BayOPSExtension

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

// Set flag and dispatch event to let BayOPS know extension is ready
window.__bayopsExtensionReady = true;
window.dispatchEvent(new CustomEvent('bayops-extension-ready'));
console.log('BayOPS Parts Connector: Extension bridge ready');

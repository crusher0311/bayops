// BayOPS Parts Connector - BayOPS Content Script
// Enables communication between BayOPS web app and the extension

// Listen for messages from the web page
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin
  if (event.source !== window) return;
  
  const message = event.data;
  if (!message || !message.type) return;
  
  // Accept messages that start with BAYOPS_ OR are known extension commands
  const knownCommands = ['OPEN_PARTSTECH', 'GET_SESSION', 'GET_ALL_SESSIONS', 'ADD_PART', 'REMOVE_PART', 'CLEAR_SESSION', 'MARK_ORDERED'];
  if (!message.type.startsWith('BAYOPS_') && !knownCommands.includes(message.type)) return;
  
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

// Inject the bridge script from external file (CSP-compliant)
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected-bayops.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

console.log('BayOPS Parts Connector: Content script loaded');

// BayOPS Parts & Labor Connector - Popup Script

async function loadSessions() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_SESSIONS' });
    
    if (!response.success) {
      console.error('Failed to get sessions');
      return;
    }
    
    const sessions = response.sessions || {};
    const sessionsList = document.getElementById('sessionsList');
    
    const sessionEntries = Object.entries(sessions);
    
    if (sessionEntries.length === 0) {
      sessionsList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m7.5 4.27 9 5.15"/>
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
            <path d="m3.3 7 8.7 5 8.7-5"/>
            <path d="M12 22V12"/>
          </svg>
          <p>No active sessions.<br>Open a repair order in BayOPS to start.</p>
        </div>
      `;
      return;
    }
    
    sessionsList.innerHTML = sessionEntries.map(([jobId, session]) => `
      <div class="session-card">
        <div class="session-header">
          <div>
            <div class="session-ro">RO #${session.roNumber || jobId}</div>
            <div class="session-vehicle">${session.vehicleInfo || 'Vehicle info not set'}</div>
          </div>
          <span class="session-badge ${session.status}">${session.status || 'draft'}</span>
        </div>
        <div class="session-parts">
          ${session.items?.length || 0} parts in cart
          ${session.items?.length > 0 ? `• $${session.items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2)}` : ''}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading sessions:', error);
    document.getElementById('statusDot').classList.add('inactive');
    document.getElementById('statusText').textContent = 'Extension error';
  }
}

// Check if BayOPS tab is open
async function checkBayOPSConnection() {
  try {
    const tabs = await chrome.tabs.query({
      url: ['http://localhost:5000/*', 'https://*.replit.app/*', 'https://*.replit.dev/*']
    });
    
    if (tabs.length > 0) {
      document.getElementById('statusDot').classList.remove('inactive');
      document.getElementById('statusText').textContent = 'Connected to BayOPS';
    } else {
      document.getElementById('statusDot').classList.add('inactive');
      document.getElementById('statusText').textContent = 'BayOPS not open';
    }
  } catch (error) {
    console.error('Error checking connection:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkBayOPSConnection();
  loadSessions();
});

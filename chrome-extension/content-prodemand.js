// BayOPS Labor Guide Connector - ProDemand Content Script
// Detects login state, auto-fills VIN, captures labor times, and syncs to BayOPS

console.log('BayOPS Labor Guide: ProDemand content script loaded');

let currentSession = null;
let vinToFill = null;
let isLoggedIn = false;
let vinObserver = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('ProDemand content script received:', message.type);
  
  switch (message.type) {
    case 'SET_LABOR_CONTEXT':
      currentSession = {
        sessionToken: message.sessionToken,
        jobId: message.jobId,
        vin: message.vin,
        year: message.year,
        make: message.make,
        model: message.model,
        engine: message.engine
      };
      vinToFill = message.vin;
      
      // Start VIN fill with observer
      if (vinToFill) {
        startVinFillObserver();
      }
      
      // Show floating panel
      updateFloatingPanel();
      sendResponse({ success: true });
      break;
      
    case 'GET_LABOR_CONTEXT':
      sendResponse({ success: true, session: currentSession });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true;
});

// Detect if user is logged in to ProDemand
function detectLoginState() {
  const url = window.location.href;
  
  // Explicit login page patterns
  const isLoginPage = url.includes('/Login') || 
                      url.includes('/login') || 
                      url.includes('/Account/Login') ||
                      url.includes('/Account/LogOn');
  
  if (isLoginPage) {
    isLoggedIn = false;
    return 'login';
  }
  
  // Check for definitive app-only DOM markers that only exist when logged in
  const appMarkers = [
    '.module-selector',
    '.vehicle-selector', 
    '#vehicleInfo',
    '.main-navigation',
    '.user-menu',
    '.account-dropdown',
    '[class*="ModuleSelector"]',
    '[class*="VehicleInfo"]',
    '.prodemand-header'
  ];
  
  for (const selector of appMarkers) {
    if (document.querySelector(selector)) {
      isLoggedIn = true;
      return 'app';
    }
  }
  
  // Check for password field on page (indicates login form)
  const hasPasswordField = document.querySelector('input[type="password"]') !== null;
  const hasLoginForm = document.querySelector('form[action*="login" i], form[action*="logon" i], #loginForm, .login-form') !== null;
  
  if (hasPasswordField || hasLoginForm) {
    isLoggedIn = false;
    return 'login';
  }
  
  // If on prodemand domain but can't determine state, assume loading
  if (window.location.hostname.includes('prodemand')) {
    return 'loading';
  }
  
  return 'unknown';
}

// Start a MutationObserver to detect VIN input fields
function startVinFillObserver() {
  // Clean up existing observer
  if (vinObserver) {
    vinObserver.disconnect();
    vinObserver = null;
  }
  
  // First try immediate fill
  if (attemptVinFill()) {
    return;
  }
  
  // Set up observer for DOM changes
  vinObserver = new MutationObserver((mutations, observer) => {
    if (attemptVinFill()) {
      observer.disconnect();
      vinObserver = null;
    }
  });
  
  vinObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also retry periodically for 30 seconds
  let retries = 0;
  const maxRetries = 15;
  const retryInterval = setInterval(() => {
    retries++;
    if (attemptVinFill() || retries >= maxRetries) {
      clearInterval(retryInterval);
      if (vinObserver) {
        vinObserver.disconnect();
        vinObserver = null;
      }
    }
  }, 2000);
}

// Attempt to fill VIN in ProDemand's vehicle selection
function attemptVinFill() {
  if (!vinToFill) return false;
  
  const vinInputSelectors = [
    'input[name*="vin" i]',
    'input[placeholder*="vin" i]',
    'input[id*="vin" i]',
    'input[aria-label*="vin" i]',
    'input.vin-input',
    '#vinInput',
    '#VinInput',
    '.vehicle-vin input',
    '.vin-search input',
    '[data-vin-input]',
    'input[name="VIN"]',
    'input[name="Vin"]'
  ];
  
  for (const selector of vinInputSelectors) {
    const input = document.querySelector(selector);
    if (input && input.offsetParent !== null) { // Check visibility
      input.value = vinToFill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      console.log('BayOPS: Filled VIN in ProDemand:', vinToFill);
      showNotification('VIN auto-filled: ' + vinToFill, 'success');
      return true;
    }
  }
  
  // Also check generic text inputs with VIN-related labels
  const allInputs = document.querySelectorAll('input[type="text"]');
  for (const input of allInputs) {
    if (input.offsetParent === null) continue; // Skip hidden
    
    const label = input.getAttribute('aria-label') || 
                 input.getAttribute('placeholder') || 
                 input.closest('label')?.textContent || 
                 input.previousElementSibling?.textContent || '';
    
    if (label.toLowerCase().includes('vin')) {
      input.value = vinToFill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('BayOPS: Filled VIN (label match):', vinToFill);
      showNotification('VIN auto-filled: ' + vinToFill, 'success');
      return true;
    }
  }
  
  return false;
}

// Create and show floating panel based on login state
function updateFloatingPanel() {
  // Remove existing panel
  const existing = document.getElementById('bayops-panel');
  if (existing) existing.remove();
  
  const loginState = detectLoginState();
  
  const panel = document.createElement('div');
  panel.id = 'bayops-panel';
  
  if (loginState === 'login') {
    panel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 14px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-size: 13px;
          max-width: 300px;
        ">
          <div style="font-weight: 600; margin-bottom: 6px;">BayOPS - Login Required</div>
          <div style="opacity: 0.95; font-size: 12px; line-height: 1.4;">
            Please log in to ProDemand with your credentials.
            ${currentSession?.vin ? `<br><br><strong>VIN ready to paste:</strong><br><code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${currentSession.vin}</code>` : ''}
          </div>
        </div>
      </div>
    `;
  } else if (loginState === 'loading') {
    panel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-size: 13px;
        ">
          <div style="font-weight: 600;">BayOPS - Loading...</div>
          <div style="opacity: 0.9; font-size: 11px; margin-top: 4px;">
            Waiting for ProDemand to load
          </div>
        </div>
      </div>
    `;
    
    // Re-check state in a few seconds
    setTimeout(() => updateFloatingPanel(), 3000);
  } else {
    // Logged in - show full panel
    panel.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          font-size: 13px;
          max-width: 280px;
        ">
          <div style="font-weight: 600; margin-bottom: 4px;">BayOPS Connected</div>
          <div style="opacity: 0.9; font-size: 11px;">
            ${currentSession?.vin ? `VIN: ${currentSession.vin}` : 'Select labor times to capture'}
          </div>
        </div>
        ${currentSession?.vin ? `
        <button id="bayops-fill-vin" style="
          background: #3b82f6;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.2s, background 0.2s;
        ">
          Fill VIN
        </button>
        ` : ''}
        <button id="bayops-capture-labor" style="
          background: #10b981;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.2s, background 0.2s;
        ">
          Capture Labor Times
        </button>
      </div>
    `;
  }
  
  document.body.appendChild(panel);
  
  // Add click handlers
  const captureBtn = document.getElementById('bayops-capture-labor');
  if (captureBtn) {
    captureBtn.addEventListener('click', captureLaborTimes);
    captureBtn.addEventListener('mouseenter', (e) => {
      e.target.style.transform = 'scale(1.05)';
      e.target.style.background = '#059669';
    });
    captureBtn.addEventListener('mouseleave', (e) => {
      e.target.style.transform = 'scale(1)';
      e.target.style.background = '#10b981';
    });
  }
  
  const fillVinBtn = document.getElementById('bayops-fill-vin');
  if (fillVinBtn) {
    fillVinBtn.addEventListener('click', () => {
      if (vinToFill) {
        if (!attemptVinFill()) {
          // Copy to clipboard as fallback
          navigator.clipboard.writeText(vinToFill);
          showNotification('VIN copied to clipboard: ' + vinToFill, 'info');
        }
      }
    });
    fillVinBtn.addEventListener('mouseenter', (e) => {
      e.target.style.transform = 'scale(1.05)';
      e.target.style.background = '#2563eb';
    });
    fillVinBtn.addEventListener('mouseleave', (e) => {
      e.target.style.transform = 'scale(1)';
      e.target.style.background = '#3b82f6';
    });
  }
}

// Capture labor times from ProDemand page
function captureLaborTimes() {
  if (!currentSession?.sessionToken) {
    showNotification('No active BayOPS session. Open from repair order.', 'error');
    return;
  }
  
  const laborItems = [];
  
  // Try to find labor operation rows
  const laborRows = document.querySelectorAll(
    '.labor-item, .operation-row, tr[data-labor], .procedure-item, ' +
    '[class*="labor"], [class*="operation"], .estimate-row, ' +
    '.repair-time, .labor-time-row, .procedure-row'
  );
  
  laborRows.forEach(row => {
    const description = extractText(row, '.description, .operation-name, .title, td:first-child, .procedure-name');
    const hours = extractNumber(row, '.labor-time, .hours, .time, [class*="hour"], .repair-hours');
    const operationCode = extractText(row, '.op-code, .code, [class*="code"], .operation-code');
    
    if (description && hours) {
      laborItems.push({
        description,
        laborHours: hours.toString(),
        operationCode,
        laborType: 'STANDARD',
        source: 'PRODEMAND'
      });
    }
  });
  
  // Try selected/highlighted items
  if (laborItems.length === 0) {
    const selectedItems = document.querySelectorAll('.selected, [aria-selected="true"], .active-row, .highlighted');
    selectedItems.forEach(item => {
      const text = item.textContent.trim();
      const hoursMatch = text.match(/(\d+\.?\d*)\s*(hour|hr|hrs)/i);
      if (hoursMatch) {
        laborItems.push({
          description: text.replace(/\d+\.?\d*\s*(hour|hr|hrs)/gi, '').trim().substring(0, 100),
          laborHours: hoursMatch[1],
          laborType: 'STANDARD',
          source: 'PRODEMAND'
        });
      }
    });
  }
  
  if (laborItems.length === 0) {
    showNotification('No labor times found. Select labor operations first.', 'warning');
    return;
  }
  
  sendLaborToBayOPS(laborItems);
}

function extractText(container, selectors) {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    const el = container.querySelector(selector);
    if (el) return el.textContent.trim();
  }
  return container.textContent.trim().substring(0, 100);
}

function extractNumber(container, selectors) {
  const selectorList = selectors.split(',').map(s => s.trim());
  for (const selector of selectorList) {
    const el = container.querySelector(selector);
    if (el) {
      const match = el.textContent.match(/(\d+\.?\d*)/);
      if (match) return parseFloat(match[1]);
    }
  }
  return null;
}

async function sendLaborToBayOPS(laborItems) {
  if (!currentSession?.sessionToken) return;
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_LABOR_TO_BAYOPS',
      sessionToken: currentSession.sessionToken,
      laborItems
    });
    
    if (response.success) {
      showNotification(`Sent ${laborItems.length} labor item(s) to BayOPS!`, 'success');
    } else {
      showNotification('Failed to send labor. Try again.', 'error');
    }
  } catch (error) {
    console.error('Error sending labor:', error);
    showNotification('Connection error. Check BayOPS is open.', 'error');
  }
}

function showNotification(message, type = 'info') {
  const existing = document.getElementById('bayops-notification');
  if (existing) existing.remove();
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  const notification = document.createElement('div');
  notification.id = 'bayops-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: ${colors[type]};
      color: white;
      padding: 14px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    ">
      ${message}
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

// Initialize
function init() {
  console.log('BayOPS: ProDemand init, state:', detectLoginState());
  
  chrome.runtime.sendMessage({ type: 'GET_LABOR_TAB_CONTEXT' }).then(response => {
    if (response?.success && response.session) {
      currentSession = response.session;
      vinToFill = response.session.vin;
      
      if (vinToFill) {
        startVinFillObserver();
      }
      
      updateFloatingPanel();
    }
  }).catch(() => {});
  
  // Watch for login state changes
  const stateCheckInterval = setInterval(() => {
    const newState = detectLoginState();
    if (newState === 'app' && currentSession) {
      updateFloatingPanel();
      clearInterval(stateCheckInterval);
    }
  }, 2000);
  
  setTimeout(() => clearInterval(stateCheckInterval), 60000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

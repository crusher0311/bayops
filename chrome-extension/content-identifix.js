// BayOPS Labor Guide Connector - Identifix Content Script
// Injects VIN, captures labor times, and syncs to BayOPS

console.log('BayOPS Labor Guide: Identifix content script loaded');

let currentSession = null;
let vinToFill = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Identifix content script received:', message.type);
  
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
      
      if (vinToFill) {
        attemptVinFill();
      }
      
      showCaptureButton();
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

// Attempt to fill VIN in Identifix's vehicle selection
function attemptVinFill() {
  // Identifix VIN input patterns
  const vinInputs = document.querySelectorAll(
    'input[name*="vin" i], input[placeholder*="vin" i], input[id*="vin" i], ' +
    'input[aria-label*="vin" i], #txtVIN, .vin-field, [ng-model*="vin"]'
  );
  
  for (const input of vinInputs) {
    if (input && vinToFill) {
      input.value = vinToFill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      // Identifix may use Angular, trigger special events
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      console.log('BayOPS: Filled VIN in Identifix:', vinToFill);
      return true;
    }
  }
  
  // Retry after delay
  setTimeout(() => {
    const inputs = document.querySelectorAll('input[type="text"]');
    for (const input of inputs) {
      const label = input.getAttribute('aria-label') || 
                   input.getAttribute('placeholder') || 
                   input.closest('label')?.textContent || '';
      if (label.toLowerCase().includes('vin')) {
        input.value = vinToFill;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('BayOPS: Filled VIN (delayed):', vinToFill);
        return;
      }
    }
  }, 2000);
  
  return false;
}

// Create floating capture button
function showCaptureButton() {
  const existing = document.getElementById('bayops-capture-btn');
  if (existing) existing.remove();
  
  const button = document.createElement('div');
  button.id = 'bayops-capture-btn';
  button.innerHTML = `
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
        background: linear-gradient(135deg, #0369a1, #0e7490);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-size: 13px;
        max-width: 280px;
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">BayOPS Connected - Identifix</div>
        <div style="opacity: 0.9; font-size: 11px;">
          ${currentSession?.vin ? `VIN: ${currentSession.vin}` : 'Select labor times to capture'}
        </div>
      </div>
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
  
  document.body.appendChild(button);
  
  document.getElementById('bayops-capture-labor').addEventListener('click', captureLaborTimes);
  document.getElementById('bayops-capture-labor').addEventListener('mouseenter', (e) => {
    e.target.style.transform = 'scale(1.05)';
    e.target.style.background = '#059669';
  });
  document.getElementById('bayops-capture-labor').addEventListener('mouseleave', (e) => {
    e.target.style.transform = 'scale(1)';
    e.target.style.background = '#10b981';
  });
}

// Capture labor times from Identifix page
function captureLaborTimes() {
  if (!currentSession?.sessionToken) {
    showNotification('No active BayOPS session. Open from repair order.', 'error');
    return;
  }
  
  const laborItems = [];
  
  // Identifix labor patterns
  const laborRows = document.querySelectorAll(
    '.labor-row, .labor-item, tr.labor, .operation-row, ' +
    '[class*="labor"], .repair-time, .service-operation'
  );
  
  laborRows.forEach(row => {
    const description = extractText(row, '.description, .operation, .title, td:first-child');
    const hours = extractNumber(row, '.time, .hours, .labor, [class*="time"]');
    const operationCode = extractText(row, '.code, .operation-code, [class*="code"]');
    
    if (description && hours) {
      laborItems.push({
        description,
        laborHours: hours.toString(),
        operationCode,
        laborType: 'STANDARD',
        source: 'IDENTIFIX'
      });
    }
  });
  
  // Fallback: scan for patterns
  if (laborItems.length === 0) {
    const allText = document.body.innerText;
    const matches = allText.matchAll(/(.{10,60})\s+(\d+\.?\d*)\s*(hour|hr|hrs)/gi);
    for (const match of matches) {
      laborItems.push({
        description: match[1].trim(),
        laborHours: match[2],
        laborType: 'STANDARD',
        source: 'IDENTIFIX'
      });
      if (laborItems.length >= 10) break;
    }
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
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// Check for context on load
chrome.runtime.sendMessage({ type: 'GET_LABOR_TAB_CONTEXT' }).then(response => {
  if (response?.success && response.session) {
    currentSession = response.session;
    vinToFill = response.session.vin;
    if (vinToFill) attemptVinFill();
    showCaptureButton();
  }
}).catch(() => {});

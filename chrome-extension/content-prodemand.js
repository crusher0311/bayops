// BayOPS Labor Guide Connector - ProDemand Content Script
// Injects VIN, captures labor times, and syncs to BayOPS

console.log('BayOPS Labor Guide: ProDemand content script loaded');

let currentSession = null;
let vinToFill = null;

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
      
      // Auto-fill VIN if we have one
      if (vinToFill) {
        attemptVinFill();
      }
      
      // Show floating capture button
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

// Attempt to fill VIN in ProDemand's vehicle selection
function attemptVinFill() {
  // ProDemand uses various input methods for VIN
  // Try common selectors
  const vinInputs = document.querySelectorAll(
    'input[name*="vin" i], input[placeholder*="vin" i], input[id*="vin" i], ' +
    'input[aria-label*="vin" i], input.vin-input, #vinInput, .vehicle-vin input'
  );
  
  for (const input of vinInputs) {
    if (input && vinToFill) {
      input.value = vinToFill;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      console.log('BayOPS: Filled VIN in ProDemand:', vinToFill);
      return true;
    }
  }
  
  // Retry after a delay if not found immediately
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

// Create and show floating capture button
function showCaptureButton() {
  // Remove existing button if any
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
  
  // Add click handler
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

// Capture labor times from ProDemand page
function captureLaborTimes() {
  if (!currentSession?.sessionToken) {
    showNotification('No active BayOPS session. Open from repair order.', 'error');
    return;
  }
  
  // ProDemand labor times are typically shown in tables or lists
  // Common patterns: labor time tables, procedure tables
  const laborItems = [];
  
  // Try to find labor operation rows
  const laborRows = document.querySelectorAll(
    '.labor-item, .operation-row, tr[data-labor], .procedure-item, ' +
    '[class*="labor"], [class*="operation"], .estimate-row'
  );
  
  laborRows.forEach(row => {
    const description = extractText(row, '.description, .operation-name, .title, td:first-child');
    const hours = extractNumber(row, '.labor-time, .hours, .time, [class*="hour"]');
    const operationCode = extractText(row, '.op-code, .code, [class*="code"]');
    
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
  
  // If no structured data found, try to find selected/highlighted items
  if (laborItems.length === 0) {
    const selectedItems = document.querySelectorAll('.selected, [aria-selected="true"], .active-row');
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
  
  // Send to BayOPS
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

// Check for context when page loads
chrome.runtime.sendMessage({ type: 'GET_LABOR_TAB_CONTEXT' }).then(response => {
  if (response?.success && response.session) {
    currentSession = response.session;
    vinToFill = response.session.vin;
    if (vinToFill) attemptVinFill();
    showCaptureButton();
  }
}).catch(() => {});

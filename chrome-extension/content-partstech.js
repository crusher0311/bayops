// BayOPS Parts Connector - PartsTech Content Script
// Monitors cart on PartsTech and extracts part data

let currentJobContext = null;
let cartObserver = null;
let lastCartState = null;

// Listen for job context from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_JOB_CONTEXT') {
    currentJobContext = {
      jobId: message.jobId,
      roNumber: message.roNumber,
      vehicleInfo: message.vehicleInfo
    };
    
    console.log('BayOPS: Job context set:', currentJobContext);
    showJobBanner();
    sendResponse({ success: true });
  }
  return true;
});

// Show a banner indicating which job we're shopping for
function showJobBanner() {
  // Remove existing banner
  const existing = document.getElementById('bayops-job-banner');
  if (existing) existing.remove();
  
  if (!currentJobContext) return;
  
  const banner = document.createElement('div');
  banner.id = 'bayops-job-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-weight: 600;">BayOPS</span>
        <span style="opacity: 0.9;">Shopping for RO #${currentJobContext.roNumber}</span>
        <span style="opacity: 0.7; font-size: 12px;">${currentJobContext.vehicleInfo}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span id="bayops-cart-count" style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 12px;">
          0 parts
        </span>
        <button id="bayops-sync-btn" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Sync to BayOPS</button>
      </div>
    </div>
  `;
  
  document.body.style.marginTop = '44px';
  document.body.appendChild(banner);
  
  // Sync button handler
  document.getElementById('bayops-sync-btn').addEventListener('click', () => {
    parseAndSyncCart();
  });
}

// Parse cart items from PartsTech DOM
function parseCartItems() {
  const items = [];
  
  // PartsTech cart selectors - these may need adjustment based on actual DOM
  // Common patterns for cart items
  const cartSelectors = [
    '.cart-item',
    '[data-testid="cart-item"]',
    '.shopping-cart-item',
    '.cart-line-item',
    'tr[data-item-id]',
    '.order-item'
  ];
  
  let cartElements = [];
  for (const selector of cartSelectors) {
    cartElements = document.querySelectorAll(selector);
    if (cartElements.length > 0) break;
  }
  
  // If no standard selectors work, try to find cart by content patterns
  if (cartElements.length === 0) {
    // Look for elements containing part number patterns
    const allElements = document.querySelectorAll('[class*="cart"], [class*="Cart"], [class*="order"], [class*="Order"]');
    cartElements = allElements;
  }
  
  cartElements.forEach((element) => {
    try {
      const item = extractPartFromElement(element);
      if (item && item.partNumber) {
        items.push(item);
      }
    } catch (e) {
      console.error('BayOPS: Error parsing cart item:', e);
    }
  });
  
  return items;
}

function extractPartFromElement(element) {
  const text = element.textContent || '';
  
  // Try to extract part number (alphanumeric, often with dashes)
  const partNumberMatch = text.match(/\b([A-Z0-9]{2,}[-]?[A-Z0-9]+)\b/i);
  
  // Try to extract price
  const priceMatch = text.match(/\$[\d,]+\.?\d*/);
  
  // Try to extract quantity
  const qtyMatch = text.match(/(?:qty|quantity|x)\s*:?\s*(\d+)/i) || 
                   text.match(/(\d+)\s*(?:ea|each|pc|pcs)/i);
  
  // Try to find brand/manufacturer
  const knownBrands = ['AC Delco', 'ACDelco', 'Motorcraft', 'Bosch', 'Denso', 'NGK', 
                       'Gates', 'Dayco', 'Moog', 'TRW', 'Monroe', 'KYB', 'Bilstein',
                       'Wagner', 'Bendix', 'Raybestos', 'Centric', 'StopTech',
                       'Dorman', 'Standard', 'BWD', 'Cardone', 'Beck Arnley'];
  
  let brand = '';
  for (const b of knownBrands) {
    if (text.toLowerCase().includes(b.toLowerCase())) {
      brand = b;
      break;
    }
  }
  
  // Get description - usually the longest text segment
  const description = element.querySelector('[class*="description"], [class*="name"], [class*="title"]')?.textContent?.trim() || 
                     text.substring(0, 100).trim();
  
  return {
    partNumber: partNumberMatch ? partNumberMatch[1] : '',
    description: description,
    brand: brand,
    supplier: 'PartsTech',
    price: priceMatch ? parseFloat(priceMatch[0].replace(/[$,]/g, '')) : 0,
    quantity: qtyMatch ? parseInt(qtyMatch[1]) : 1
  };
}

// Sync current cart to BayOPS
async function parseAndSyncCart() {
  const items = parseCartItems();
  
  console.log('BayOPS: Parsed cart items:', items);
  
  // Update cart count in banner
  const countEl = document.getElementById('bayops-cart-count');
  if (countEl) {
    countEl.textContent = `${items.length} parts`;
  }
  
  // Send to background
  if (currentJobContext) {
    chrome.runtime.sendMessage({
      type: 'CART_UPDATE',
      jobId: currentJobContext.jobId,
      items
    });
  }
  
  return items;
}

// Set up MutationObserver to watch for cart changes
function setupCartObserver() {
  if (cartObserver) {
    cartObserver.disconnect();
  }
  
  // Debounced sync function
  let syncTimeout = null;
  const debouncedSync = () => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      const newState = JSON.stringify(parseCartItems());
      if (newState !== lastCartState) {
        lastCartState = newState;
        parseAndSyncCart();
      }
    }, 1000);
  };
  
  // Watch the entire body for changes (cart could be anywhere)
  cartObserver = new MutationObserver((mutations) => {
    // Check if mutations are relevant to cart
    const isCartMutation = mutations.some(m => {
      const target = m.target;
      const targetText = (target.className || '') + (target.id || '');
      return targetText.toLowerCase().includes('cart') ||
             targetText.toLowerCase().includes('order') ||
             targetText.toLowerCase().includes('item');
    });
    
    if (isCartMutation) {
      debouncedSync();
    }
  });
  
  cartObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  console.log('BayOPS: Cart observer set up');
}

// Initialize
function init() {
  console.log('BayOPS Parts Connector: PartsTech content script loaded');
  
  // Check if we have a stored job context for this tab
  chrome.runtime.sendMessage({ type: 'GET_TAB_CONTEXT' }, (response) => {
    if (response?.jobContext) {
      currentJobContext = response.jobContext;
      showJobBanner();
    }
  });
  
  // Set up cart monitoring after page settles
  setTimeout(() => {
    setupCartObserver();
    // Initial cart parse
    parseAndSyncCart();
  }, 3000);
}

// Wait for page to be ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

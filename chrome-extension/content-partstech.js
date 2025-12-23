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
          0 parts synced
        </span>
        <span style="opacity: 0.8; font-size: 11px;">Parts auto-sync when added to cart</span>
        <button id="bayops-add-btn" style="
          background: #22c55e;
          border: none;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        ">+ Manual Entry</button>
      </div>
    </div>
    <div id="bayops-add-form" style="
      display: none;
      position: fixed;
      top: 44px;
      right: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      padding: 16px;
      z-index: 999998;
      width: 320px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #1e293b;">Add Part to BayOPS</h3>
      <input id="bayops-part-number" placeholder="Part Number *" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
      <input id="bayops-description" placeholder="Description" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
      <input id="bayops-brand" placeholder="Brand" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <input id="bayops-price" placeholder="Price" type="number" step="0.01" style="flex: 1; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
        <input id="bayops-qty" placeholder="Qty" type="number" value="1" min="1" style="width: 60px; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px;">
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button id="bayops-cancel-btn" style="padding: 8px 16px; border: 1px solid #e2e8f0; background: white; border-radius: 4px; cursor: pointer; font-size: 13px;">Cancel</button>
        <button id="bayops-save-btn" style="padding: 8px 16px; border: none; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;">Add Part</button>
      </div>
    </div>
  `;
  
  document.body.style.marginTop = '44px';
  document.body.appendChild(banner);
  
  // Add part button handler
  document.getElementById('bayops-add-btn').addEventListener('click', () => {
    const form = document.getElementById('bayops-add-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });
  
  // Cancel button handler
  document.getElementById('bayops-cancel-btn').addEventListener('click', () => {
    document.getElementById('bayops-add-form').style.display = 'none';
  });
  
  // Save part handler
  document.getElementById('bayops-save-btn').addEventListener('click', () => {
    const partNumber = document.getElementById('bayops-part-number').value.trim();
    const description = document.getElementById('bayops-description').value.trim();
    const brand = document.getElementById('bayops-brand').value.trim();
    const price = parseFloat(document.getElementById('bayops-price').value) || 0;
    const quantity = parseInt(document.getElementById('bayops-qty').value) || 1;
    
    if (!partNumber) {
      alert('Part number is required');
      return;
    }
    
    const part = {
      partNumber,
      description: description || partNumber,
      brand,
      supplier: 'PartsTech',
      price,
      quantity
    };
    
    // Add to session
    chrome.runtime.sendMessage({
      type: 'ADD_PART',
      jobId: currentJobContext.jobId,
      part
    }, (response) => {
      if (response?.success) {
        // Clear form and close
        document.getElementById('bayops-part-number').value = '';
        document.getElementById('bayops-description').value = '';
        document.getElementById('bayops-brand').value = '';
        document.getElementById('bayops-price').value = '';
        document.getElementById('bayops-qty').value = '1';
        document.getElementById('bayops-add-form').style.display = 'none';
        
        // Update count
        updateCartCount();
        
        // Show confirmation
        showToast('Part added to BayOPS');
      }
    });
  });
  
}

// Show a toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #22c55e;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    z-index: 9999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Update cart count from session
async function updateCartCount() {
  if (!currentJobContext) return;
  
  const response = await chrome.runtime.sendMessage({
    type: 'GET_SESSION',
    jobId: currentJobContext.jobId
  });
  
  if (response?.session?.items) {
    const countEl = document.getElementById('bayops-cart-count');
    if (countEl) {
      const count = response.session.items.length;
      countEl.textContent = `${count} part${count !== 1 ? 's' : ''} synced`;
    }
  }
}

// Intercept fetch requests to capture AddItemToCart GraphQL mutations
function setupNetworkInterceptor() {
  // Wrap fetch to intercept PartsTech GraphQL requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Call original fetch first
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a GraphQL request with AddItemToCart
    if (options?.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        
        if (body.operationName === 'AddItemToCart' && body.variables?.item) {
          const item = body.variables.item;
          
          console.log('BayOPS: Intercepted AddItemToCart:', item);
          
          // Extract part data from the GraphQL mutation
          const partData = {
            partNumber: item.partNumber || '',
            description: item.partName || '',
            brand: extractBrandFromName(item.partName || ''),
            supplier: 'PartsTech',
            price: 0, // Price not in mutation, will need to get from DOM
            quantity: item.quantity || 1,
            vin: item.vin || '',
            partNumberId: item.partNumberId || ''
          };
          
          // Try to get price from the page
          const priceFromPage = findPriceForPart(item.partNumber);
          if (priceFromPage) {
            partData.price = priceFromPage;
          }
          
          if (partData.partNumber && currentJobContext) {
            // Send to background to add to session
            chrome.runtime.sendMessage({
              type: 'ADD_PART',
              jobId: currentJobContext.jobId,
              part: partData
            }, (resp) => {
              if (resp?.success) {
                updateCartCount();
                showToast(`Synced to BayOPS: ${partData.partNumber}`);
              }
            });
          }
        }
      } catch (e) {
        // Not JSON or parse error, ignore
      }
    }
    
    return response;
  };
  
  console.log('BayOPS: Network interceptor set up');
}

// Extract brand from part name
function extractBrandFromName(name) {
  const knownBrands = ['PowerStop', 'AC Delco', 'ACDelco', 'Motorcraft', 'Bosch', 'Denso', 'NGK', 
                       'Gates', 'Dayco', 'Moog', 'TRW', 'Monroe', 'KYB', 'Bilstein',
                       'Wagner', 'Bendix', 'Raybestos', 'Centric', 'StopTech',
                       'Dorman', 'Standard', 'BWD', 'Cardone', 'Beck Arnley', 'Duralast',
                       'AutoZone', 'O\'Reilly', 'NAPA', 'Carquest', 'FelPro', 'Fel-Pro'];
  
  for (const brand of knownBrands) {
    if (name.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  // Try to extract first word as brand
  const firstWord = name.split(/\s+/)[0];
  if (firstWord && firstWord.length > 2) {
    return firstWord;
  }
  
  return '';
}

// Find price for a part number on the current page
function findPriceForPart(partNumber) {
  // Look for price near the part number on the page
  const pageText = document.body.innerText;
  
  // Find the part number and look for nearby price
  const partIndex = pageText.indexOf(partNumber);
  if (partIndex >= 0) {
    // Get surrounding text (500 chars around part number)
    const surrounding = pageText.substring(Math.max(0, partIndex - 200), partIndex + 300);
    
    // Find all prices in surrounding text
    const priceMatches = surrounding.match(/\$\s*([\d,]+\.?\d*)/g);
    if (priceMatches && priceMatches.length > 0) {
      // Take the smallest price (usually wholesale/cost)
      const prices = priceMatches.map(p => parseFloat(p.replace(/[$,\s]/g, ''))).filter(p => p > 0);
      if (prices.length > 0) {
        return Math.min(...prices);
      }
    }
  }
  
  return 0;
}

// Fallback: Intercept "Add to cart" clicks to capture part data
function setupAddToCartInterceptor() {
  document.addEventListener('click', (e) => {
    const target = e.target;
    const button = target.closest('button');
    
    if (!button) return;
    
    const buttonText = button.textContent?.toLowerCase() || '';
    const isAddToCart = buttonText.includes('add to cart') || 
                        buttonText.includes('add to order') ||
                        button.getAttribute('aria-label')?.toLowerCase().includes('add');
    
    if (isAddToCart && currentJobContext) {
      // The network interceptor should handle this, but log for debugging
      console.log('BayOPS: Add to Cart button clicked');
    }
  }, true);
  
  console.log('BayOPS: Click interceptor set up');
}

// Extract part data from a product card/listing
function extractPartFromProductCard(element) {
  const text = element.textContent || '';
  const html = element.innerHTML || '';
  
  // Look for part number patterns - usually a short alphanumeric code
  // Common formats: CRK4233, KOE4233, 12345, ABC-123
  let partNumber = '';
  
  // Try specific selectors first
  const partNumEl = element.querySelector('[class*="part-number"], [class*="partNumber"], [class*="sku"], [data-part-number]');
  if (partNumEl) {
    partNumber = partNumEl.textContent?.trim() || '';
  }
  
  // Look for patterns like "CRK4233" or "KOE4233" in the text
  if (!partNumber) {
    const partPatterns = text.match(/\b([A-Z]{2,4}[0-9]{3,6}[A-Z]?)\b/g);
    if (partPatterns && partPatterns.length > 0) {
      partNumber = partPatterns[0];
    }
  }
  
  // Get price - look for dollar amounts
  let price = 0;
  const priceMatches = text.match(/\$\s*([\d,]+\.?\d*)/g);
  if (priceMatches) {
    // Usually the wholesale/net price is what we want - often the smaller number
    const prices = priceMatches.map(p => parseFloat(p.replace(/[$,\s]/g, ''))).filter(p => p > 0);
    if (prices.length > 0) {
      price = Math.min(...prices); // Take the lower price (usually cost)
    }
  }
  
  // Get brand from known brands or from DOM
  let brand = '';
  const brandEl = element.querySelector('[class*="brand"], [class*="manufacturer"], [class*="vendor"]');
  if (brandEl) {
    brand = brandEl.textContent?.trim() || '';
  }
  
  const knownBrands = ['PowerStop', 'AC Delco', 'ACDelco', 'Motorcraft', 'Bosch', 'Denso', 'NGK', 
                       'Gates', 'Dayco', 'Moog', 'TRW', 'Monroe', 'KYB', 'Bilstein',
                       'Wagner', 'Bendix', 'Raybestos', 'Centric', 'StopTech',
                       'Dorman', 'Standard', 'BWD', 'Cardone', 'Beck Arnley', 'Duralast',
                       'AutoZone', 'O\'Reilly', 'NAPA', 'Carquest', 'FelPro', 'Fel-Pro'];
  
  if (!brand) {
    for (const b of knownBrands) {
      if (text.includes(b)) {
        brand = b;
        break;
      }
    }
  }
  
  // Get description - look for product title/name
  let description = '';
  const titleEl = element.querySelector('h1, h2, h3, h4, [class*="title"], [class*="name"], [class*="description"]');
  if (titleEl) {
    description = titleEl.textContent?.trim().substring(0, 150) || '';
  }
  
  if (!description) {
    // Take first significant text chunk
    const textNodes = text.split('\n').map(t => t.trim()).filter(t => t.length > 10 && t.length < 200);
    description = textNodes[0] || partNumber;
  }
  
  // Get quantity from input field
  let quantity = 1;
  const qtyInput = element.querySelector('input[type="number"], input[class*="qty"], input[class*="quantity"]');
  if (qtyInput) {
    quantity = parseInt(qtyInput.value) || 1;
  }
  
  return {
    partNumber,
    description,
    brand,
    supplier: 'PartsTech',
    price,
    quantity
  };
}

// Parse cart items from PartsTech DOM (for cart page)
function parseCartItems() {
  const items = [];
  
  // On cart/review page, look for line items
  const cartPage = window.location.href.includes('cart') || window.location.href.includes('review');
  
  if (cartPage) {
    // Find all items in cart - look for rows/cards with part info
    const rows = document.querySelectorAll('[class*="cart"] [class*="item"], [class*="order"] [class*="line"], tr:has([class*="part"])');
    
    rows.forEach(row => {
      const part = extractPartFromProductCard(row);
      if (part.partNumber) {
        items.push(part);
      }
    });
  }
  
  return items;
}

// Sync current session to BayOPS (triggers API persistence)
async function syncToBayOPS() {
  if (!currentJobContext) {
    showToast('No active job context');
    return;
  }
  
  // Get current session from background
  const response = await chrome.runtime.sendMessage({
    type: 'GET_SESSION',
    jobId: currentJobContext.jobId
  });
  
  if (response?.session) {
    const session = response.session;
    console.log('BayOPS: Syncing session to BayOPS:', session);
    
    // Update cart count in banner
    const countEl = document.getElementById('bayops-cart-count');
    if (countEl) {
      countEl.textContent = `${session.items?.length || 0} parts`;
    }
    
    if (session.items?.length > 0) {
      // Notify BayOPS to persist - the background script handles this
      chrome.runtime.sendMessage({
        type: 'SYNC_TO_BAYOPS',
        jobId: currentJobContext.jobId
      });
      showToast(`Synced ${session.items.length} parts to BayOPS`);
    } else {
      showToast('No parts to sync - add parts to cart first');
    }
  }
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

// Inject page script to intercept fetch requests
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected-partstech.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
  console.log('BayOPS: Injected PartsTech page script');
}

// Listen for parts added via fetch interception
function setupPartAddedListener() {
  window.addEventListener('bayops-part-added', (event) => {
    const partData = event.detail;
    console.log('BayOPS: Received part from page:', partData);
    
    if (partData.partNumber && currentJobContext) {
      chrome.runtime.sendMessage({
        type: 'ADD_PART',
        jobId: currentJobContext.jobId,
        part: partData
      }, (response) => {
        if (response?.success) {
          updateCartCount();
          showToast(`Synced to BayOPS: ${partData.partNumber}`);
        }
      });
    }
  });
  
  console.log('BayOPS: Part added listener set up');
}

// Initialize
function init() {
  console.log('BayOPS Parts Connector: PartsTech content script loaded v1.9.1');
  
  // Inject page script for fetch interception
  injectPageScript();
  
  // Listen for parts added from page script
  setupPartAddedListener();
  
  // Check if we have a stored job context for this tab
  chrome.runtime.sendMessage({ type: 'GET_TAB_CONTEXT' }, (response) => {
    if (response?.jobContext) {
      currentJobContext = response.jobContext;
      showJobBanner();
    }
  });
  
  // Set up "Add to Cart" button interceptor as fallback
  setupAddToCartInterceptor();
  
  // Set up cart monitoring after page settles
  setTimeout(() => {
    setupCartObserver();
  }, 3000);
}

// Wait for page to be ready
if (document.readyState === 'complete') {
  init();
} else {
  window.addEventListener('load', init);
}

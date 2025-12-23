// BayOPS Parts Connector - Injected script for PartsTech
// This runs in the PAGE context to intercept fetch requests

(function() {
  'use strict';
  
  console.log('BayOPS: PartsTech page script injected');
  
  // Wrap fetch to intercept GraphQL requests
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    const [url, options] = args;
    
    // Call original fetch
    const response = await originalFetch.apply(this, args);
    
    // Check if this is a GraphQL request with AddItemToCart
    if (options?.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        
        if (body.operationName === 'AddItemToCart' && body.variables?.item) {
          const item = body.variables.item;
          
          console.log('BayOPS: Intercepted AddItemToCart - Full variables:', JSON.stringify(body.variables));
          console.log('BayOPS: Item quantity from request:', item.quantity);
          
          // Find price on page near this part number
          let price = 0;
          const pageText = document.body.innerText;
          const partIndex = pageText.indexOf(item.partNumber);
          if (partIndex >= 0) {
            const surrounding = pageText.substring(Math.max(0, partIndex - 200), partIndex + 300);
            const priceMatches = surrounding.match(/\$\s*([\d,]+\.?\d*)/g);
            if (priceMatches) {
              const prices = priceMatches.map(p => parseFloat(p.replace(/[$,\s]/g, ''))).filter(p => p > 0);
              if (prices.length > 0) {
                price = Math.min(...prices);
              }
            }
          }
          
          // Extract brand from name
          const knownBrands = ['PowerStop', 'ACDelco', 'Motorcraft', 'Bosch', 'Denso', 'NGK', 
                               'Gates', 'Dayco', 'Moog', 'Monroe', 'Wagner', 'Centric', 
                               'Dorman', 'Cardone', 'Duralast', 'FelPro'];
          let brand = '';
          for (const b of knownBrands) {
            if ((item.partName || '').includes(b)) {
              brand = b;
              break;
            }
          }
          if (!brand) {
            brand = (item.partName || '').split(/\s+/)[0] || '';
          }
          
          // Send to content script via custom event
          window.dispatchEvent(new CustomEvent('bayops-part-added', {
            detail: {
              partNumber: item.partNumber || '',
              description: item.partName || '',
              brand: brand,
              supplier: 'PartsTech',
              price: price,
              quantity: item.quantity || 1,
              vin: item.vin || ''
            }
          }));
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    return response;
  };
  
  console.log('BayOPS: Fetch interceptor installed');
})();

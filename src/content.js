/**
 * TrueCost — Content Script
 * Injects environmental impact cards into Amazon product pages.
 * Vanilla JS, no jQuery. Uses MutationObserver for dynamic page loads.
 */

(function TrueCostContent() {
  'use strict';

  // SVG icons (inline — no CDN dependency)
  const ICONS = {
    leaf: `<svg viewBox="0 0 24 24"><path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.72.36 1.5.57 2.34.57C14.28 19.86 19 15.14 19 10c0-4-2-6.5-2-6.5S18.67 6 17 8z"/></svg>`,
    carbon: `<svg viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>`,
    energy: `<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
    water: `<svg viewBox="0 0 24 24"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8C4 18.78 7.8 22 12 22s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/></svg>`,
    waste: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
    ozone: `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>`
  };

  const IMPACT_META = [
    { key: 'greenhouse_footprint', icon: 'carbon', label: 'Carbon',  color: 'carbon'  },
    { key: 'energy_footprint',     icon: 'energy', label: 'Energy',  color: 'energy'  },
    { key: 'water_footprint',      icon: 'water',  label: 'Water',   color: 'water'   },
    { key: 'waste_footprint',      icon: 'waste',  label: 'Waste',   color: 'waste'   },
    { key: 'ozone_footprint',      icon: 'ozone',  label: 'Ozone',   color: 'ozone'   }
  ];

  /* ---- Utility helpers ---- */

  /** Extract ASIN from URL or page. */
  function getASIN() {
    // Try URL patterns: /dp/ASIN or /gp/product/ASIN
    const urlMatch = location.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    // Fallback: hidden input
    const input = document.getElementById('ASIN');
    if (input) return input.value.toUpperCase();

    // Fallback: detail bullets
    const bulletSpans = document.querySelectorAll('#detailBullets_feature_div span');
    for (const span of bulletSpans) {
      if (span.textContent.includes('ASIN')) {
        const next = span.nextElementSibling;
        if (next) return next.textContent.trim().toUpperCase();
      }
    }

    return null;
  }

  /** Get product title from the page. */
  function getTitle() {
    const el = document.getElementById('productTitle') || document.getElementById('title');
    return el ? el.textContent.trim() : '';
  }

  /** Build one impact row element. */
  function buildImpactItem(meta, footprint) {
    if (!footprint) return null;

    const decimals = footprint.usage < 1 ? 2 : footprint.usage < 100 ? 1 : 0;

    const item = document.createElement('div');
    item.className = 'truecost-impact-item';
    item.innerHTML = `
      <div class="truecost-impact-icon truecost-impact-icon--${meta.color}">
        ${ICONS[meta.icon]}
      </div>
      <div>
        <div class="truecost-impact-value">${TrueCostData.fmt(footprint.usage, decimals)} ${footprint.unit}</div>
        <div class="truecost-impact-label">${meta.label}</div>
      </div>
    `;
    return item;
  }

  /** Build the full TrueCost card. */
  function buildCard(data, isEstimate, label) {
    const product = data;
    const card = document.createElement('div');
    card.className = 'truecost-card';

    // Header
    const header = document.createElement('div');
    header.className = 'truecost-header';
    header.innerHTML = `
      <div class="truecost-logo">${ICONS.leaf}</div>
      <div>
        <div class="truecost-title">TrueCost</div>
        <div class="truecost-subtitle">Environmental Impact</div>
      </div>
      ${isEstimate ? '<span class="truecost-estimate-badge">Estimate</span>' : ''}
    `;
    card.appendChild(header);

    // Impacts grid
    const grid = document.createElement('div');
    grid.className = 'truecost-impacts';

    let itemCount = 0;
    for (const meta of IMPACT_META) {
      const footprint = product[meta.key];
      const item = buildImpactItem(meta, footprint);
      if (item) {
        grid.appendChild(item);
        itemCount++;
      }
    }

    // If odd number of items, add a spacer for grid alignment
    if (itemCount % 2 !== 0) {
      const spacer = document.createElement('div');
      spacer.className = 'truecost-impact-item';
      spacer.style.visibility = 'hidden';
      grid.appendChild(spacer);
    }

    card.appendChild(grid);

    // Footer — Donate checkbox
    const cost = product.total_footprint_cost || 0;
    const footer = document.createElement('div');
    footer.className = 'truecost-footer';
    footer.innerHTML = `
      <label class="truecost-donate-row">
        <input type="checkbox" class="truecost-checkbox" checked />
        <span class="truecost-donate-text">
          Donate <span class="truecost-donate-amount">${TrueCostData.fmtMoney(cost)}</span>
          to offset your environmental impact
        </span>
      </label>
    `;

    const checkbox = footer.querySelector('.truecost-checkbox');
    checkbox.addEventListener('change', () => {
      const donation = checkbox.checked ? cost : 0;
      chrome.storage.local.set({ lastDonation: donation });
    });

    // Set initial donation value
    chrome.storage.local.set({ lastDonation: cost });

    card.appendChild(footer);

    // Powered-by
    const powered = document.createElement('div');
    powered.className = 'truecost-powered';
    powered.innerHTML = `Powered by <a href="https://github.com/truecost4env" target="_blank">TrueCost</a>`;
    card.appendChild(powered);

    return card;
  }

  /** Inject the card near the Add to Cart button. */
  function inject() {
    // Don't inject twice
    if (document.querySelector('.truecost-card')) return;

    // Are we on a product page?
    if (!/\/(?:dp|gp\/product)\//i.test(location.pathname)) return;

    const asin = getASIN();
    const title = getTitle();

    if (!asin && !title) return; // Can't identify product

    const { product, isEstimate, label } = TrueCostData.lookup(asin, title);
    if (!product) return;

    const card = buildCard(product, isEstimate, label);

    // Find the best insertion point
    const anchors = [
      '#addToCart',
      '#add-to-cart-button',
      '#buybox',
      '#desktop_buybox',
      '#rightCol'
    ];

    let target = null;
    for (const sel of anchors) {
      target = document.querySelector(sel);
      if (target) break;
    }

    if (target) {
      // Insert after the target container
      target.parentNode.insertBefore(card, target.nextSibling);
    }

    // Notify background about this product view
    chrome.runtime.sendMessage({
      type: 'PRODUCT_VIEWED',
      product: {
        name: isEstimate ? label : product.name,
        isEstimate,
        greenhouse: product.greenhouse_footprint?.usage || 0,
        water: product.water_footprint?.usage || 0,
        waste: product.waste_footprint?.usage || 0,
        energy: product.energy_footprint?.usage || 0,
        cost: product.total_footprint_cost || 0
      }
    });
  }

  /** Watch for Amazon's SPA-style navigation. */
  function observePageChanges() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Amazon navigated — remove old card and re-inject
        const old = document.querySelector('.truecost-card');
        if (old) old.remove();
        setTimeout(inject, 800);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Check extension enabled state, then run
  chrome.storage.local.get({ enabled: true }, (result) => {
    if (!result.enabled) return;
    inject();
    observePageChanges();
  });

})();

/**
 * TrueCost — Popup Script
 * Loads cumulative stats and handles user interactions.
 */

document.addEventListener('DOMContentLoaded', () => {

  const toggleEl    = document.getElementById('toggle-enabled');
  const carbonEl    = document.getElementById('stat-carbon');
  const waterEl     = document.getElementById('stat-water');
  const wasteEl     = document.getElementById('stat-waste');
  const energyEl    = document.getElementById('stat-energy');
  const productsEl  = document.getElementById('stat-products');
  const donationEl  = document.getElementById('stat-donation');
  const resetBtn    = document.getElementById('btn-reset');

  function fmt(n) {
    if (n == null) return '0';
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n >= 10)   return n.toFixed(1);
    return n.toFixed(2);
  }

  function refresh() {
    chrome.storage.local.get({ enabled: true, stats: {} }, (result) => {
      toggleEl.checked = result.enabled;
      const s = result.stats || {};
      carbonEl.textContent   = fmt(s.totalCarbon || 0);
      waterEl.textContent    = fmt(s.totalWater || 0);
      wasteEl.textContent    = fmt(s.totalWaste || 0);
      energyEl.textContent   = fmt(s.totalEnergy || 0);
      productsEl.textContent = (s.productsViewed || 0).toString();
      donationEl.textContent = '$' + (s.totalDonation || 0).toFixed(2);
    });
  }

  // Toggle enable/disable
  toggleEl.addEventListener('change', () => {
    chrome.storage.local.set({ enabled: toggleEl.checked });
  });

  // Reset stats
  resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_STATS' });
    setTimeout(refresh, 100);
  });

  refresh();
});

/**
 * TrueCost — Background Service Worker
 * Tracks cumulative impact stats across browsing sessions.
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    lastDonation: 0,
    stats: {
      productsViewed: 0,
      totalCarbon: 0,       // kgCO2e
      totalWater: 0,        // Liters
      totalWaste: 0,        // Kg
      totalEnergy: 0,       // MJ
      totalDonation: 0      // USD
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCT_VIEWED') {
    chrome.storage.local.get({ stats: {} }, (result) => {
      const stats = result.stats || {};
      stats.productsViewed = (stats.productsViewed || 0) + 1;
      stats.totalCarbon    = (stats.totalCarbon || 0) + (message.product.greenhouse || 0);
      stats.totalWater     = (stats.totalWater || 0) + (message.product.water || 0);
      stats.totalWaste     = (stats.totalWaste || 0) + (message.product.waste || 0);
      stats.totalEnergy    = (stats.totalEnergy || 0) + (message.product.energy || 0);
      stats.totalDonation  = (stats.totalDonation || 0) + (message.product.cost || 0);
      chrome.storage.local.set({ stats });
    });
  }

  if (message.type === 'RESET_STATS') {
    chrome.storage.local.set({
      stats: {
        productsViewed: 0,
        totalCarbon: 0,
        totalWater: 0,
        totalWaste: 0,
        totalEnergy: 0,
        totalDonation: 0
      }
    });
  }
});

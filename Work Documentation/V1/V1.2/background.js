// A storage object to hold the blocked count for each tab ID
const tabBlockedCounts = {};

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Check if the request should be blocked based on your rules/filters
    if (isAd(details.url)) {
      // 1. Get the tab ID for the request
      const tabId = details.tabId;

      if (tabId > 0) { // Check to ensure it's a valid tab
        // 2. Increment the count for that tab
        tabBlockedCounts[tabId] = (tabBlockedCounts[tabId] || 0) + 1;

        // 3. Update the badge
        updateBadge(tabId);
      }

      // Block the request
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] }, // Listen for all URLs
  ["blocking"] // Crucial permission for blocking
);


// Reset count when a tab navigates or is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // If the URL changed, reset the count for the new page
  if (changeInfo.url) {
    tabBlockedCounts[tabId] = 0;
    updateBadge(tabId); // Update the badge to reflect the reset
  }
});

// Clean up when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabBlockedCounts[tabId];
});

// When the active tab changes, update the badge to show the count for the new active tab
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateBadge(activeInfo.tabId);
});


function updateBadge(tabId) {
  const count = tabBlockedCounts[tabId] || 0;

  // Set the text on the badge
  chrome.action.setBadgeText({
    tabId: tabId,
    text: count > 0 ? count.toString() : "", // Display "" (empty string) for 0 or no count
  });

  // Optional: Set the badge color for visibility
  chrome.action.setBadgeBackgroundColor({
    tabId: tabId,
    color: [255, 0, 0, 255], // Red color (RGBA)
  });
}


function updatePopupStatus(blockedCount) {
  // Use runtime.sendMessage to broadcast a message.
  // The popup script must be listening for it.
  chrome.runtime.sendMessage({
    action: "UPDATE_STATUS",
    data: {
      count: blockedCount
    }
  }, (response) => {
    // Optional: Handle the response from the popup script
    if (response && response.status === "received") {
      console.log("Popup received the update.");
    }
  });
}
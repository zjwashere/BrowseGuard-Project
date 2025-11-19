// Use a persistent storage object to hold the blocked count for each tab ID
// We'll use chrome.storage.session for non-persistent, per-session data storage.
// A simple in-memory object (like tabBlockedCounts) can still be used, but
// chrome.storage.session is safer for a service worker that may be unloaded.
// For this example, we'll keep the in-memory object for simplicity,
// but be aware that the service worker may unload, resetting this object.
const tabBlockedCounts = {};

// The blocking logic itself must be moved to the Declarative Net Request API
// This service worker code ONLY handles the counting and badge update,
// as the service worker cannot use the 'blocking' webRequest capability.

/**
 * Updates the extension badge with the blocked count for the given tab ID.
 * @param {number} tabId
 */
function updateBadge(tabId) {
    const count = tabBlockedCounts[tabId] || 0;

    // MV3: Use chrome.action instead of chrome.browserAction
    chrome.action.setBadgeText({
        tabId: tabId,
        text: count > 0 ? count.toString() : ""
    });

    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: [255, 0, 0, 255]
    });
}

// --- Counting Logic (Modified for MV3) ---

// In MV3, the service worker cannot listen for the successful *block* event
// from the DNR API to increment the counter directly.
// Instead, a common approach for tracking is to have the content script
// or a different mechanism report the block, or to rely on a different
// metric, or even simplify and remove the counting feature if it's too complex.

// Since the original code had an `isAd(details.url)` function,
// if that function could be re-used, you *could* check it on *all*
// requests, but that's inefficient.

// For this MV3 conversion, we'll assume **counting is a simplified placeholder**
// since the primary blocking mechanism is now declarative.
// A real-world ad blocker would need a more complex system (e.g., using `webRequest`
// with a very broad non-blocking listener, checking all URLs, and applying a filter).

// --- Workaround for Counting in MV3 (Example using chrome.webRequest) ---

// A non-blocking webRequest listener *can* still run in the service worker.
// It can check the URL and increment the count *before* the DNR rules are applied.
// This is not a perfect count (it counts *potential* blocks, not guaranteed ones),
// but it is the closest in-service-worker way to maintain the original intent.

// NOTE: You must include the "webRequest" permission in manifest.json for this listener.
chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        // Assume 'isAd' is a defined function that returns true for an ad URL
        if (isAd(details.url)) { // Keep your blocking rule logic here
            const tabId = details.tabId;
            if (tabId > 0) {
                tabBlockedCounts[tabId] = (tabBlockedCounts[tabId] || 0) + 1;
                updateBadge(tabId);
            }
        }
        // IMPORTANT: DO NOT return { cancel: true }; in a service worker's non-blocking listener.
        // The *actual* blocking is handled by the Declarative Net Request rules.
    },
    { urls: ["<all_urls>"] } // Listen for all URLs
    // MV3: The 'blocking' option MUST BE OMITTED here for the service worker.
);

// Define a placeholder for the ad-checking function (must be implemented by you)
function isAd(url) {
    // Implement your ad-checking logic here (e.g., check against a blocklist)
    return url.includes("doubleclick") || url.includes("adserver");
}


// --- Tab State Management (Mostly MV2-compatible) ---

// Reset count when a tab navigates or is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // If the URL changed, reset the count for the new page
    if (changeInfo.url) {
        tabBlockedCounts[tabId] = 0;
        updateBadge(tabId);
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


// --- Popup Communication (MV3 Recommended Structure) ---

// MV3 Service Worker listens for messages from popup/content scripts
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.action === "GET_BLOCKED_COUNT" && sender.tab) {
            const count = tabBlockedCounts[sender.tab.id] || 0;
            sendResponse({ count: count });
            return true; // Keep the message channel open for sendResponse
        }
    }
);
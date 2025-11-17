document.addEventListener('DOMContentLoaded', () => {
  const adCountElement = document.getElementById('blockCounter');

  // Add a listener to receive messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "UPDATE_STATUS") {
      const newCount = request.data.count;

      // Update the DOM element in the popup
      adCountElement.textContent = newCount;

      // Optional: Send a confirmation back to the background script
      sendResponse({ status: "received" });
    }
    // Return true to indicate you want to send an async response
    return true; 
  });
});

// Detect browser type
declare const browser: any;
const isFirefox = typeof browser !== "undefined" && typeof browser.runtime !== "undefined";

// Open side panel/sidebar when extension icon is clicked
if (isFirefox) {
   if (browser.browserAction) {
      browser.browserAction.onClicked.addListener(() => {
         if (browser.sidebarAction) {
            browser.sidebarAction.toggle();
         }
      });
   }
} else {
   chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
      if (tab.id && chrome.sidePanel) {
         chrome.sidePanel.open({ tabId: tab.id });
      }
   });
}

export {};

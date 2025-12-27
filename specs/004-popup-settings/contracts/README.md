# Contracts: Popup Settings Entry and Centered Count

No new network or HTTP contracts are introduced. The feature relies on existing MV3 messaging and storage flows plus the standard options opener APIs:
- `chrome.runtime.openOptionsPage()` with fallback to `chrome.tabs.create({ url: chrome.runtime.getURL("options/options.html") })`.
- Existing messages for words and preferences remain unchanged.

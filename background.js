chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ botVisible: true, botActive: false });
  updateBadge(false);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const data = await chrome.storage.local.get(["botVisible"]);
  const nextVisible = !data.botVisible;
  await chrome.storage.local.set({ botVisible: nextVisible });

  chrome.tabs.sendMessage(tab.id, {
    action: "TOGGLE_PANEL_VISIBILITY",
    visible: nextVisible
  }).catch(() => {});
});

// Слушаем сообщения от страницы для синхронизации бейджа ON/OFF
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "UPDATE_STATUS") {
    updateBadge(request.active);
  }
});

function updateBadge(isActive) {
  if (isActive) {
    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
  }
}
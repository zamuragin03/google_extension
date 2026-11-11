const togglePanelBtn = document.getElementById('toggle-panel');
const openSettingsBtn = document.getElementById('open-settings');
const toggleActiveBtn = document.getElementById('toggle-active');
const statusNode = document.getElementById('status');

async function updateStatus() {
  const data = await chrome.storage.local.get(['botVisible', 'botActive']);
  statusNode.textContent = `Панель: ${data.botVisible === false ? 'скрыта' : 'видна'} · ${data.botActive ? 'бот активен' : 'бот выключен'}`;
}

togglePanelBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['botVisible']);
  const nextVisible = data.botVisible !== false;
  const finalVisible = !nextVisible;

  await chrome.storage.local.set({ botVisible: finalVisible });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_PANEL_VISIBILITY', visible: finalVisible }).catch(() => {});
    }
  });

  updateStatus();
});

openSettingsBtn.addEventListener('click', () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL('options.html'));
  }
});

toggleActiveBtn.addEventListener('click', async () => {
  const data = await chrome.storage.local.get(['botActive']);
  const nextActive = !data.botActive;

  await chrome.storage.local.set({ botActive: nextActive });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_BOT_ACTIVE', active: nextActive }).catch(() => {});
    }
  });

  updateStatus();
});

updateStatus();

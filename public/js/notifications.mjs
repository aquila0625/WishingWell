import { refreshIcons, showToast } from './ui.mjs';

export function notificationSummary(items) {
  return { total: items.length, unread: items.filter((item) => !item.read).length };
}

function toPlainText(markup) {
  const documentNode = new DOMParser().parseFromString(markup, 'text/html');
  return documentNode.body.textContent || '';
}

export function initNotifications({ api, store }) {
  const button = document.getElementById('notification-button');
  const badge = document.getElementById('notification-badge');
  const panel = document.getElementById('notification-panel');
  const list = document.getElementById('notification-list');
  const readAll = document.getElementById('read-all-button');
  let activeUserId = null;

  function render(items) {
    const summary = notificationSummary(items);
    badge.textContent = String(summary.unread);
    badge.hidden = summary.unread === 0;
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'notification-empty';
      empty.textContent = '暂无新消息';
      list.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement('article');
      row.className = `notification-row${item.read ? '' : ' unread'}`;
      const icon = document.createElement('i');
      icon.dataset.lucide = item.type === 'vote' ? 'heart' : item.type === 'comment' ? 'message-circle' : 'bell';
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('p');
      text.textContent = toPlainText(item.message);
      row.append(icon, text);
      list.append(row);
    }
    refreshIcons();
  }

  async function load() {
    if (!store.get().user) return;
    try {
      render(await api.request('/api/notifications'));
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    }
  }

  async function markAllRead() {
    if (!store.get().user) return;
    await api.request('/api/notifications/read-all', { method: 'POST' });
    await load();
  }

  button.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) await markAllRead();
  });
  readAll.addEventListener('click', markAllRead);

  store.subscribe((state) => {
    const userId = state.user?.id || null;
    if (userId === activeUserId) return;
    activeUserId = userId;
    if (!userId) {
      panel.hidden = true;
      badge.hidden = true;
      list.replaceChildren();
    } else {
      load();
    }
  });

  if (store.get().user) {
    activeUserId = store.get().user.id;
    load();
  }
  return { load, markAllRead };
}

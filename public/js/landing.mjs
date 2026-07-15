export function formatRemainingTime(deadline, now = Date.now()) {
  const remaining = Math.max(0, Date.parse(deadline) - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(days).padStart(2, '0')}天 ${String(hours).padStart(2, '0')}时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(2, '0')}秒`;
}

export function shouldCollapseDrawer({ expanded, userToggled }) {
  return expanded && !userToggled;
}

export function initLanding({ api, store }) {
  const drawer = document.getElementById('quick-drawer');
  const handle = document.getElementById('drawer-handle');
  const handleLabel = handle.querySelector('small');
  const banner = document.getElementById('campaign-banner');
  const countdown = document.getElementById('campaign-countdown');
  let expanded = true;
  let userToggled = false;
  let timer;

  function renderDrawer() {
    drawer.classList.toggle('collapsed', !expanded);
    handle.setAttribute('aria-expanded', String(expanded));
    handleLabel.textContent = expanded ? '收起快捷入口' : '展开快捷入口';
  }

  function setExpanded(next, manual = false) {
    expanded = next;
    if (manual) userToggled = true;
    renderDrawer();
  }

  handle.addEventListener('click', () => setExpanded(!expanded, true));
  window.addEventListener('scroll', () => {
    if (shouldCollapseDrawer({ expanded, userToggled })) setExpanded(false);
  }, { passive: true, once: true });

  function startCountdown(campaign) {
    clearInterval(timer);
    if (!campaign.enabled || !campaign.deadline) {
      banner.hidden = true;
      return;
    }
    banner.hidden = false;
    const update = () => {
      countdown.textContent = campaign.closed
        ? '本阶段征集已截止'
        : formatRemainingTime(campaign.deadline);
    };
    update();
    timer = setInterval(update, 1000);
  }

  async function loadCampaign() {
    const campaign = await api.request('/api/campaign');
    store.set({ campaign });
    startCountdown(campaign);
  }

  renderDrawer();
  return { loadCampaign, setExpanded };
}

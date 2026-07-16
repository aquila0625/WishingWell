import { getLocale, setLocale, translate } from './i18n.mjs';

export function formatRemainingTime(deadline, now = Date.now()) {
  const remaining = Math.max(0, Date.parse(deadline) - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return `${String(days).padStart(2, '0')}天 ${String(hours).padStart(2, '0')}时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(2, '0')}秒`;
}

export function initLanding({ api, store }) {
  const drawer = document.getElementById('quick-drawer');
  const handle = document.getElementById('drawer-handle');
  const handleLabel = handle.querySelector('small');
  const banner = document.getElementById('campaign-banner');
  const countdown = document.getElementById('campaign-countdown');
  let expanded = true;
  let timer;
  let renderedCampaign = null;

  function renderDrawer() {
    drawer.classList.toggle('collapsed', !expanded);
    handle.setAttribute('aria-expanded', String(expanded));
    handleLabel.textContent = expanded ? translate('drawer.collapse') : translate('drawer.expand');
  }

  function setExpanded(next) {
    expanded = next;
    renderDrawer();
  }

  handle.addEventListener('click', () => setExpanded(!expanded));

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

  function applyHomepage(homepage) {
    if (!homepage) return;
    const heroTitle = document.querySelector('.hero-copy h1');
    const heroTagline = document.querySelector('.hero-tagline');
    const finalTitle = document.getElementById('home-final-title');
    const shareButton = document.getElementById('home-final-share-button');
    if (heroTitle && homepage.hero_title) heroTitle.textContent = homepage.hero_title;
    if (heroTagline && homepage.hero_tagline) heroTagline.textContent = homepage.hero_tagline;
    if (finalTitle && homepage.final_cta_title) finalTitle.textContent = homepage.final_cta_title;
    if (shareButton) shareButton.hidden = homepage.show_share_button === false;
  }

  async function loadCampaign() {
    const campaign = await api.request('/api/campaign');
    store.set({ campaign });
    setLocale(getLocale());
    applyHomepage(campaign.homepage);
    startCountdown(campaign);
  }

  renderDrawer();
  store.subscribe((state) => {
    if (state.campaign !== renderedCampaign) {
      renderedCampaign = state.campaign;
      startCountdown(state.campaign);
    }
  });
  return { loadCampaign, setExpanded };
}

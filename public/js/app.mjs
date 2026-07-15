import { createApiClient } from './api-client.mjs';
import { createStore } from './store.mjs';
import { closeDialog, openDialog, refreshIcons } from './ui.mjs';
import { setLocale } from './i18n.mjs';
import { initLanding } from './landing.mjs';
import { initAuth } from './auth.mjs';

const store = createStore({
  view: 'home',
  user: null,
  token: localStorage.getItem('churchos.userId'),
  wishes: [],
  campaign: { enabled: false, deadline: null, closed: false }
});

const api = createApiClient({ getToken: () => store.get().token });

function showView(view) {
  store.set({ view });
  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  document.getElementById('back-home-button').hidden = view === 'home';
  document.getElementById('quick-drawer').hidden = view !== 'home';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindShell() {
  document.getElementById('brand-home-button').addEventListener('click', () => showView('home'));
  document.getElementById('back-home-button').addEventListener('click', () => showView('home'));
  document.getElementById('hero-wall-button').addEventListener('click', () => showView('wall'));
  document.getElementById('drawer-wall-button').addEventListener('click', () => showView('wall'));

  const authDialog = document.getElementById('auth-dialog');
  ['header-login-button', 'hero-join-button', 'drawer-auth-button'].forEach((id) => {
    document.getElementById(id).addEventListener('click', () => openDialog(authDialog));
  });

  document.querySelectorAll('[data-close-dialog]').forEach((button) => {
    button.addEventListener('click', () => closeDialog(button.closest('dialog')));
  });
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  });

  const languageButton = document.getElementById('language-button');
  const languageMenu = document.getElementById('language-menu');
  languageButton.addEventListener('click', () => {
    languageMenu.hidden = !languageMenu.hidden;
    languageButton.setAttribute('aria-expanded', String(!languageMenu.hidden));
  });
  languageMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-locale]');
    if (!option) return;
    setLocale(option.dataset.locale);
    languageButton.querySelector('span').textContent = option.textContent;
    languageMenu.hidden = true;
    languageButton.setAttribute('aria-expanded', 'false');
  });
}

async function bootstrapApp() {
  bindShell();
  refreshIcons();
  showView('home');
  const auth = initAuth({ api, store });
  await auth.restoreSession();

  try {
    const landing = initLanding({ api, store });
    await landing.loadCampaign();
  } catch (error) {
    console.warn('Campaign settings unavailable', error);
  }
}

bootstrapApp();

export { api, bootstrapApp, showView, store };

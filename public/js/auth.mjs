import { debounce, closeDialog, openDialog, refreshIcons, setBusy, showToast } from './ui.mjs';

export function createSession(storage = window.localStorage) {
  const key = 'churchos.sessionToken';
  return {
    load: () => storage.getItem(key),
    save: (token) => storage.setItem(key, String(token)),
    clear: () => storage.removeItem(key)
  };
}

export function validateRegistration(values) {
  const errors = {};
  if (!/^\S+@\S+\.\S+$/.test(values.email || '')) errors.email = '请输入有效邮箱';
  if ((values.password || '').length < 6) errors.password = '密码至少需要 6 位字符';
  if (!(values.nickname || '').trim()) errors.nickname = '请输入展示姓名';
  if (values.consent !== 'on') errors.consent = '请确认同意数据用于需求调研与产品规划';
  return errors;
}

export function initAuth({ api, store }) {
  const session = createSession();
  const dialog = document.getElementById('auth-dialog');
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const churchInput = document.getElementById('church-input');
  const churchResults = document.getElementById('church-results');
  let pendingAction = null;
  let activeChurchIndex = -1;
  let churchMatches = [];

  function switchTab(tab) {
    const loginActive = tab === 'login';
    loginTab.classList.toggle('active', loginActive);
    registerTab.classList.toggle('active', !loginActive);
    loginTab.setAttribute('aria-selected', String(loginActive));
    registerTab.setAttribute('aria-selected', String(!loginActive));
    dialog.setAttribute('aria-labelledby', loginActive ? 'auth-dialog-title' : 'register-dialog-title');
    loginPanel.hidden = !loginActive;
    registerPanel.hidden = loginActive;
    (loginActive ? loginForm.elements.email : registerForm.elements.email).focus();
  }

  function renderUser(user) {
    const loggedIn = Boolean(user);
    document.getElementById('header-login-button').hidden = loggedIn;
    document.getElementById('user-menu').hidden = !loggedIn;
    document.getElementById('notification-button').hidden = !loggedIn;
    document.getElementById('drawer-auth-button').hidden = loggedIn;
    document.querySelector('.quick-actions')?.setAttribute('data-action-count', loggedIn ? '3' : '4');
    document.getElementById('admin-open-button').hidden = !user?.is_admin;
    if (!user) return;
    document.getElementById('header-user-name').textContent = user.nickname;
    const avatar = document.getElementById('header-avatar');
    avatar.textContent = user.nickname.trim().slice(0, 1).toUpperCase();
    if (user.avatar_color) avatar.style.background = user.avatar_color;
  }

  function setUser(user, token = store.get().token) {
    if (user) {
      session.save(token);
      store.set({ user, token });
    } else {
      session.clear();
      store.set({ user: null, token: null });
    }
    renderUser(user);
  }

  async function restoreSession() {
    const token = session.load();
    if (!token) {
      renderUser(null);
      return null;
    }
    store.set({ token });
    try {
      const user = await api.request('/api/auth/me');
      setUser(user, token);
      return user;
    } catch (error) {
      setUser(null);
      return null;
    }
  }

  function requireAuth(action) {
    if (store.get().user) return action();
    pendingAction = action;
    switchTab('login');
    openDialog(dialog);
    showToast('请先登录同工账号');
    return undefined;
  }

  loginTab.addEventListener('click', () => switchTab('login'));
  registerTab.addEventListener('click', () => switchTab('register'));

  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.closest('.password-input').querySelector('input');
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      button.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
      button.innerHTML = `<i data-lucide="${showing ? 'eye' : 'eye-off'}" aria-hidden="true"></i>`;
      refreshIcons();
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('[type="submit"]');
    setBusy(submit, true, '登录中');
    try {
      const values = Object.fromEntries(new FormData(loginForm));
      const response = await api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values)
      });
      setUser(response.user, response.token);
      closeDialog(dialog);
      showToast(`欢迎回来，${response.user.nickname}`, { tone: 'success' });
      const action = pendingAction;
      pendingAction = null;
      action?.();
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    } finally {
      setBusy(submit, false);
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(registerForm);
    const values = Object.fromEntries(data);
    const errors = validateRegistration(values);
    if (Object.keys(errors).length) {
      showToast(Object.values(errors)[0], { tone: 'error' });
      registerForm.elements[Object.keys(errors)[0]]?.focus();
      return;
    }
    const submit = registerForm.querySelector('[type="submit"]');
    setBusy(submit, true, '注册中');
    try {
      await api.request('/api/auth/register', { method: 'POST', body: data });
      loginForm.elements.email.value = values.email;
      switchTab('login');
      loginForm.elements.password.focus();
      showToast('注册成功，请登录同工账号', { tone: 'success' });
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    } finally {
      setBusy(submit, false);
    }
  });

  function selectChurch(church) {
    churchInput.value = church.name;
    registerForm.elements.country.value = church.country;
    registerForm.elements.state.value = church.state;
    registerForm.elements.city.value = church.city;
    churchResults.hidden = true;
    activeChurchIndex = -1;
  }

  function renderChurches() {
    churchResults.replaceChildren();
    churchMatches.forEach((church, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === activeChurchIndex));
      button.innerHTML = `<strong>${church.name}</strong><small>${church.city} · ${church.address}</small>`;
      button.addEventListener('click', () => selectChurch(church));
      churchResults.append(button);
    });
    churchResults.hidden = churchMatches.length === 0;
  }

  const searchChurches = debounce(async () => {
    const query = churchInput.value.trim();
    if (query.length < 1) {
      churchMatches = [];
      renderChurches();
      return;
    }
    const params = new URLSearchParams({ query });
    const city = registerForm.elements.city.value.trim();
    const state = registerForm.elements.state.value.trim();
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    try {
      churchMatches = await api.request(`/api/churches/autocomplete?${params}`);
      activeChurchIndex = -1;
      renderChurches();
    } catch (error) {
      churchMatches = [];
      renderChurches();
    }
  }, 250);

  churchInput.addEventListener('input', searchChurches);
  churchInput.addEventListener('keydown', (event) => {
    if (!churchMatches.length) return;
    if (event.key === 'ArrowDown') activeChurchIndex = Math.min(churchMatches.length - 1, activeChurchIndex + 1);
    else if (event.key === 'ArrowUp') activeChurchIndex = Math.max(0, activeChurchIndex - 1);
    else if (event.key === 'Enter' && activeChurchIndex >= 0) {
      event.preventDefault();
      selectChurch(churchMatches[activeChurchIndex]);
      return;
    } else if (event.key === 'Escape') {
      churchResults.hidden = true;
      return;
    } else return;
    event.preventDefault();
    renderChurches();
  });

  document.getElementById('logout-button').addEventListener('click', () => {
    setUser(null);
    showToast('已退出登录');
  });

  document.getElementById('header-avatar').addEventListener('click', () => {
    requireAuth(() => window.dispatchEvent(new CustomEvent('churchos:open-my-wishes')));
  });

  switchTab('login');
  return { requireAuth, restoreSession, setUser, switchTab };
}

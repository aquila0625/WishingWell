import { downloadBlob, refreshIcons, showToast } from './ui.mjs';
import { wishStatusLabel } from './wishes.mjs';

const STATUSES = [
  ['voting', '共创中'],
  ['accepted', '已采纳'],
  ['planned', '已规划'],
  ['developing', '开发中'],
  ['testing', '内测中'],
  ['completed', '已完成'],
  ['rejected', '暂不采纳'],
  ['merged', '已合并'],
  ['hidden', '已隐藏']
];

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function field(label, input) {
  const wrapper = node('label', 'admin-field', label);
  wrapper.append(input);
  return wrapper;
}

function option(value, label, selectedValue) {
  const item = node('option', '', label);
  item.value = value;
  item.selected = value === selectedValue;
  return item;
}

function downloadText(filename, text) {
  downloadBlob(new Blob([text], { type: 'application/json;charset=utf-8' }), filename);
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  return value ? new Date(value).toISOString() : null;
}

export function initAdmin({ api, store }) {
  const view = document.getElementById('admin-view');
  const title = document.getElementById('admin-page-title');
  let currentWishes = [];
  let selectedWishIds = new Set();
  let currentFilters = { search: '', status: 'all', category: 'all' };

  function removeDraftPreviewBar() {
    document.getElementById('draft-preview-bar')?.remove();
  }

  function showDraftPreviewBar() {
    removeDraftPreviewBar();
    const bar = node('div', 'draft-preview-bar');
    bar.id = 'draft-preview-bar';
    bar.setAttribute('role', 'status');
    const label = node('span', '', '草稿预览中，刷新或退出预览后会恢复正式首页。');
    const back = node('button', 'primary-button', '返回后台继续编辑');
    back.type = 'button';
    const exit = node('button', 'secondary-button', '退出预览');
    exit.type = 'button';
    back.addEventListener('click', () => {
      open();
      switchTab('homepage');
    });
    exit.addEventListener('click', () => {
      window.location.reload();
    });
    bar.append(label, back, exit);
    document.body.append(bar);
    refreshIcons();
  }

  function switchTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === tab));
    document.querySelectorAll('[data-admin-panel]').forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== tab; });
    const titles = { requirements: '需求数据', users: '用户管理', homepage: '首页内容', emails: '进度邮件' };
    title.textContent = titles[tab];
    if (tab === 'requirements') loadRequirements();
    if (tab === 'users') loadUsers();
    if (tab === 'homepage') loadHomepage();
    if (tab === 'emails') loadEmails();
  }

  async function loadRequirements(filters = currentFilters) {
    currentFilters = filters;
    const container = document.getElementById('admin-requirements-content');
    container.textContent = '正在加载需求数据…';
    try {
      const query = new URLSearchParams(filters);
      const response = await api.request(`/api/admin/wishes?${query.toString()}`);
      currentWishes = response.items;
      renderRequirements(container);
    } catch (error) {
      container.textContent = error.message;
    }
  }

  function renderRequirements(container) {
    container.replaceChildren();
    const toolbar = node('form', 'admin-toolbar');
    const search = document.createElement('input');
    search.name = 'search';
    search.placeholder = '搜索标题、内容、同工、教会或邮箱';
    search.value = currentFilters.search;
    const status = document.createElement('select');
    status.name = 'status';
    status.append(option('all', '全部状态', currentFilters.status), ...STATUSES.map(([value, label]) => option(value, label, currentFilters.status)));
    const category = document.createElement('input');
    category.name = 'category';
    category.placeholder = '分类，留空为全部';
    category.value = currentFilters.category === 'all' ? '' : currentFilters.category;
    const apply = node('button', 'secondary-button', '筛选');
    apply.type = 'submit';
    toolbar.append(field('搜索', search), field('状态', status), field('分类', category), apply);
    toolbar.addEventListener('submit', (event) => {
      event.preventDefault();
      loadRequirements({
        search: search.value.trim(),
        status: status.value,
        category: category.value.trim() || 'all'
      });
    });

    const actions = node('div', 'admin-actions');
    const exportAll = node('button', 'secondary-button', '导出全部');
    const exportFiltered = node('button', 'secondary-button', '导出当前筛选');
    const exportSelected = node('button', 'primary-button', '导出选中');
    exportAll.type = exportFiltered.type = exportSelected.type = 'button';
    exportAll.addEventListener('click', () => exportWishes({ scope: 'all' }));
    exportFiltered.addEventListener('click', () => exportWishes({ scope: 'filtered', filters: currentFilters }));
    exportSelected.addEventListener('click', () => exportWishes({ scope: 'selected', ids: [...selectedWishIds] }));
    actions.append(exportAll, exportFiltered, exportSelected);

    const list = node('div', 'admin-list');
    if (!currentWishes.length) list.append(node('p', 'admin-empty', '当前没有匹配的需求。'));
    currentWishes.forEach((wish) => list.append(renderWishRow(wish)));
    container.append(toolbar, actions, list);
    refreshIcons();
  }

  function renderWishRow(wish) {
    const row = node('article', 'admin-record');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedWishIds.has(wish.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedWishIds.add(wish.id);
      else selectedWishIds.delete(wish.id);
    });

    const body = node('div', 'admin-record-body');
    const meta = node('div', 'wish-meta');
    meta.append(node('span', 'category-badge', wish.category), node('span', `status-badge status-${wish.status}`, wishStatusLabel(wish.status)));
    body.append(meta, node('h2', '', wish.title), node('p', '', wish.content), node('small', '', `${wish.author.nickname} · ${wish.author.church_name} · ${wish.author.email}`));

    const controls = node('form', 'admin-row-controls');
    const status = document.createElement('select');
    STATUSES.forEach(([value, label]) => status.append(option(value, label, wish.status)));
    const reply = document.createElement('textarea');
    reply.rows = 2;
    reply.placeholder = '官方回复';
    reply.value = wish.admin_reply || '';
    const save = node('button', 'primary-button', '保存');
    save.type = 'submit';
    controls.append(status, reply, save);
    controls.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const response = await api.request(`/api/admin/wishes/${wish.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: status.value, admin_reply: reply.value })
        });
        showToast(response.message, { tone: 'success' });
        window.dispatchEvent(new CustomEvent('churchos:wishes-changed'));
        loadRequirements();
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    });

    row.append(checkbox, body, controls);
    return row;
  }

  async function exportWishes(payload) {
    if (payload.scope === 'selected' && !payload.ids.length) {
      showToast('请先选择要导出的需求', { tone: 'error' });
      return;
    }
    try {
      const response = await api.request('/api/admin/wishes/export', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      downloadText('churchos-requirements-export.json', response.text);
      showToast('需求数据已导出', { tone: 'success' });
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    }
  }

  async function loadUsers() {
    const container = document.getElementById('admin-users-content');
    container.textContent = '正在加载用户…';
    try {
      const response = await api.request('/api/admin/users');
      container.replaceChildren();
      const list = node('div', 'admin-list');
      response.items.forEach((user) => {
        const row = node('article', 'admin-record');
        const body = node('div', 'admin-record-body');
        body.append(
          node('h2', '', user.nickname),
          node('p', '', `${user.role_category} · ${user.church_name}`),
          node('small', '', `${user.email} · ${user.country} ${user.state} ${user.city} · 需求 ${user.requirement_count} · 同感 ${user.vote_count} · 评论 ${user.comment_count}`)
        );
        const button = node('button', user.disabled ? 'primary-button' : 'secondary-button', user.disabled ? '恢复账号' : '停用账号');
        button.type = 'button';
        button.addEventListener('click', async () => {
          const result = await api.request(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ disabled: !user.disabled })
          });
          showToast(result.message, { tone: 'success' });
          loadUsers();
        });
        row.append(body, button);
        list.append(row);
      });
      container.append(list);
    } catch (error) {
      container.textContent = error.message;
    }
  }

  async function loadHomepage() {
    const container = document.getElementById('admin-homepage-content');
    container.textContent = '正在加载首页内容…';
    try {
      const response = await api.request('/api/admin/homepage');
      const cleanup = await api.request('/api/admin/launch-cleanup');
      const campaign = await api.request('/api/campaign');
      const homepage = response.draft || response.homepage;
      const form = node('form', 'settings-form');
      const heroTitle = document.createElement('input');
      heroTitle.value = homepage.hero_title || '';
      const tagline = document.createElement('textarea');
      tagline.rows = 2;
      tagline.value = homepage.hero_tagline || '';
      const finalTitle = document.createElement('input');
      finalTitle.value = homepage.final_cta_title || '';
      const share = document.createElement('input');
      share.type = 'checkbox';
      share.checked = Boolean(homepage.show_share_button);
      const save = node('button', 'primary-button', '保存草稿');
      save.type = 'submit';
      const preview = node('button', 'secondary-button', '预览草稿');
      preview.type = 'button';
      const publish = node('button', 'secondary-button', '发布到正式首页');
      publish.type = 'button';
      const status = node(
        'p',
        'field-hint',
        response.has_unpublished_changes
          ? '当前有尚未发布的草稿修改。正式首页仍显示上一次发布的内容。'
          : `草稿与正式首页一致${response.published_at ? ` · 上次发布：${new Date(response.published_at).toLocaleString()}` : ''}`
      );
      const actions = node('div', 'admin-actions');
      actions.append(save, preview, publish);
      form.append(
        status,
        field('首页主标题', heroTitle),
        field('首页副标题', tagline),
        field('底部行动标题', finalTitle),
        field('显示邀请同工按钮', share),
        actions
      );
      const currentDraft = () => ({
        hero_title: heroTitle.value,
        hero_tagline: tagline.value,
        final_cta_title: finalTitle.value,
        show_share_button: share.checked
      });
      const applyDraftPreview = () => {
        const draft = currentDraft();
        document.querySelector('.hero-copy h1').textContent = draft.hero_title;
        document.querySelector('.hero-tagline').textContent = draft.hero_tagline;
        document.getElementById('home-final-title').textContent = draft.final_cta_title;
        document.getElementById('home-final-share-button').hidden = draft.show_share_button === false;
        close();
        document.getElementById('brand-home-button').click();
        showDraftPreviewBar();
        showToast('正在预览草稿，刷新页面后会恢复正式内容', { tone: 'success' });
      };
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = await api.request('/api/admin/homepage', {
          method: 'PATCH',
          body: JSON.stringify(currentDraft())
        });
        showToast(result.message, { tone: 'success' });
        loadHomepage();
      });
      preview.addEventListener('click', applyDraftPreview);
      publish.addEventListener('click', async () => {
        await api.request('/api/admin/homepage', {
          method: 'PATCH',
          body: JSON.stringify(currentDraft())
        });
        const result = await api.request('/api/admin/homepage/publish', { method: 'POST' });
        showToast(result.message, { tone: 'success' });
        loadHomepage();
      });
      container.replaceChildren(form, renderCampaignSettings(campaign), renderLaunchCleanup(cleanup));
    } catch (error) {
      container.textContent = error.message;
    }
  }

  function renderCampaignSettings(campaign) {
    const panel = node('section', 'admin-list campaign-settings-panel');
    panel.append(node('h2', '', '需求征集截止时间'));
    const status = campaign.closed
      ? '当前状态：已截止，普通用户只能查看需求。'
      : campaign.enabled
        ? '当前状态：征集中，首页按截止时间显示倒计时。'
        : '当前状态：未开启截止时间。';
    panel.append(node('p', 'field-hint', `${status} 重新设置未来时间后，普通用户可再次提交、助力和评论。`));

    const form = node('form', 'settings-form');
    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = Boolean(campaign.enabled);
    const deadline = document.createElement('input');
    deadline.type = 'datetime-local';
    deadline.value = toDatetimeLocal(campaign.deadline);
    const save = node('button', 'primary-button', '保存截止时间');
    save.type = 'submit';
    const disable = node('button', 'secondary-button', '关闭截止限制');
    disable.type = 'button';
    form.append(
      field('开启本阶段需求征集截止时间', enabled),
      field('截止到哪天几点', deadline),
      node('p', 'field-hint', '到达截止时间后，普通用户仍可查看需求，但不能再提交需求、助力或评论。'),
      node('div', 'admin-actions')
    );
    form.querySelector('.admin-actions').append(save, disable);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api.request('/api/admin/campaign', {
          method: 'PATCH',
          body: JSON.stringify({
            enabled: enabled.checked,
            deadline: fromDatetimeLocal(deadline.value)
          })
        });
        store.set({ campaign: result });
        showToast(result.closed ? '已保存，当前为只读模式' : '截止时间已保存', { tone: 'success' });
        loadHomepage();
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    });
    disable.addEventListener('click', async () => {
      try {
        const result = await api.request('/api/admin/campaign', {
          method: 'PATCH',
          body: JSON.stringify({ enabled: false, deadline: null })
        });
        store.set({ campaign: result });
        showToast('已关闭截止限制，普通用户可继续参与', { tone: 'success' });
        loadHomepage();
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    });
    panel.append(form);
    return panel;
  }

  function renderLaunchCleanup(cleanup) {
    const panel = node('section', 'admin-list');
    panel.append(node('h2', '', '上线准备'));
    if (cleanup.initial_cleanup_done) {
      panel.append(node('p', 'admin-empty', '首次上线清空测试数据已完成，后续不能再次清空。'));
      return panel;
    }
    panel.append(node('p', 'field-hint', '首次正式发布前可清空测试数据。此操作只保留管理员账号、首页内容、活动设置、教会基础资料和系统配置。执行后将永久关闭此功能。'));
    const counts = cleanup.counts || {};
    panel.append(node('p', 'field-hint', `当前将清空：普通用户 ${counts.users || 0}、需求 ${counts.wishes || 0}、评论 ${counts.comments || 0}、通知 ${counts.notifications || 0}、邮件记录 ${counts.email_logs || 0}`));
    const button = node('button', 'secondary-button', '首次上线清空测试数据');
    button.type = 'button';
    button.addEventListener('click', async () => {
      const confirmation = cleanup.confirmation || '确认首次上线清空';
      const confirmText = window.prompt(`此操作只能执行一次。请输入“${confirmation}”确认。`);
      if (confirmText === null) return;
      try {
        const result = await api.request('/api/admin/launch-cleanup', {
          method: 'POST',
          body: JSON.stringify({ confirm: confirmText })
        });
        showToast(result.message, { tone: 'success' });
        loadHomepage();
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    });
    panel.append(button);
    return panel;
  }

  async function loadEmails() {
    const container = document.getElementById('admin-emails-content');
    container.textContent = '正在加载邮件记录…';
    try {
      const logs = await api.request('/api/admin/progress-emails/logs');
      container.replaceChildren(renderEmailForm(), renderEmailLogs(logs.items));
    } catch (error) {
      container.textContent = error.message;
    }
  }

  function renderEmailForm() {
    const form = node('form', 'settings-form');
    const subject = document.createElement('input');
    subject.placeholder = '例如：ChurchOS 第一阶段开发进度';
    const body = document.createElement('textarea');
    body.rows = 8;
    body.placeholder = '写给所有提交过建议的同工。当前为模拟发送，会记录历史。';
    const send = node('button', 'primary-button', '模拟发送给提过建议的邮箱');
    send.type = 'submit';
    form.append(field('邮件标题', subject), field('邮件正文', body), send);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const result = await api.request('/api/admin/progress-emails/send', {
          method: 'POST',
          body: JSON.stringify({ subject: subject.value, body: body.value })
        });
        showToast(result.message, { tone: 'success' });
        loadEmails();
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    });
    return form;
  }

  function renderEmailLogs(logs) {
    const list = node('div', 'admin-list');
    list.append(node('h2', '', '发送历史'));
    if (!logs.length) {
      list.append(node('p', 'admin-empty', '还没有发送记录。'));
      return list;
    }
    logs.forEach((log) => {
      const row = node('article', 'admin-record');
      const body = node('div', 'admin-record-body');
      body.append(node('h2', '', log.subject), node('p', '', log.body), node('small', '', `${log.status} · ${log.recipient_count} 位收件人`));
      row.append(body);
      list.append(row);
    });
    return list;
  }

  function open() {
    if (!store.get().user?.is_admin) return;
    view.hidden = false;
    document.body.classList.add('dialog-open');
    switchTab('requirements');
    refreshIcons();
  }

  function close() {
    view.hidden = true;
    document.body.classList.remove('dialog-open');
  }

  document.getElementById('admin-open-button').addEventListener('click', open);
  document.getElementById('admin-close-button').addEventListener('click', close);
  document.getElementById('admin-exit-button').addEventListener('click', close);
  document.querySelectorAll('[data-admin-tab]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.adminTab)));
  return { close, open, switchTab };
}

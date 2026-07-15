import { downloadBlob, refreshIcons, showToast } from './ui.mjs';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function initAdmin({ api, store, sharing }) {
  const view = document.getElementById('admin-view');
  const title = document.getElementById('admin-page-title');
  const campaignForm = document.getElementById('campaign-form');
  let reportData = null;

  function switchTab(tab) {
    document.querySelectorAll('[data-admin-tab]').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === tab));
    document.querySelectorAll('[data-admin-panel]').forEach((panel) => { panel.hidden = panel.dataset.adminPanel !== tab; });
    const titles = { overview: '需求智能分析', disputes: '申诉审批', campaign: '活动设置', distribution: '分发与反馈' };
    title.textContent = titles[tab];
    if (tab === 'overview') loadOverview();
    if (tab === 'disputes') loadDisputes();
    if (tab === 'campaign') loadCampaign();
    if (tab === 'distribution') renderDistribution();
  }

  async function loadOverview() {
    const container = document.getElementById('admin-overview-content');
    container.textContent = '正在生成共创分析…';
    try {
      reportData = await api.request('/api/admin/projects/ai-pre-export');
      container.replaceChildren();
      const demographic = node('section', 'analytics-summary');
      demographic.append(node('span', 'eyebrow', '参与者画像'), node('p', '', reportData.demographics));
      const layout = node('div', 'analytics-grid');
      const clusters = node('section', 'analytics-panel');
      clusters.append(node('h2', '', '核心痛点聚类'));
      reportData.clusters.forEach((cluster) => {
        const row = node('article', 'analysis-row');
        row.append(node('strong', '', cluster.topic), node('p', '', cluster.description), node('span', 'analysis-value', `${cluster.total_votes} 票`));
        clusters.append(row);
      });
      const recommendations = node('section', 'analytics-panel');
      recommendations.append(node('h2', '', '产品优先级建议'));
      reportData.recommendations.forEach((item) => {
        const row = node('article', 'analysis-row');
        row.append(node('span', 'status-badge', item.priority), node('strong', '', item.topic), node('p', '', item.value));
        recommendations.append(row);
      });
      layout.append(clusters, recommendations);
      const actions = node('div', 'admin-actions');
      const markdown = node('button', 'secondary-button', '导出 Markdown');
      const csv = node('button', 'primary-button', '导出 CSV');
      markdown.type = csv.type = 'button';
      markdown.addEventListener('click', () => exportReport('markdown'));
      csv.addEventListener('click', () => exportReport('csv'));
      actions.append(markdown, csv);
      container.append(demographic, layout, actions);
    } catch (error) {
      container.textContent = error.message;
    }
  }

  async function exportReport(format) {
    try {
      const result = await api.download('/api/admin/projects/export-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, reportData })
      });
      downloadBlob(result.blob, result.filename);
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    }
  }

  async function loadDisputes() {
    const container = document.getElementById('admin-disputes-list');
    container.textContent = '正在加载申诉…';
    try {
      const disputes = await api.request('/api/admin/disputes');
      container.replaceChildren();
      if (!disputes.length) {
        container.append(node('p', 'admin-empty', '当前没有待处理的拆分申诉。'));
        return;
      }
      for (const dispute of disputes) {
        const card = node('article', 'dispute-row');
        card.append(node('h2', '', dispute.title), node('p', '', dispute.dispute_reason), node('small', '', `${dispute.author_nickname} · 合并至 ${dispute.parent_title}`));
        const actions = node('div', 'admin-actions');
        for (const [action, label, className] of [['reject', '驳回', 'secondary-button'], ['approve', '同意拆分', 'primary-button']]) {
          const button = node('button', className, label);
          button.type = 'button';
          button.addEventListener('click', async () => {
            const response = await api.request(`/api/admin/wishes/${dispute.id}/resolve-dispute`, { method: 'POST', body: JSON.stringify({ action }) });
            showToast(response.message, { tone: 'success' });
            loadDisputes();
          });
          actions.append(button);
        }
        card.append(actions);
        container.append(card);
      }
    } catch (error) {
      container.textContent = error.message;
    }
  }

  async function loadCampaign() {
    const campaign = await api.request('/api/campaign');
    document.getElementById('campaign-enabled').checked = campaign.enabled;
    document.getElementById('campaign-deadline').value = campaign.deadline ? campaign.deadline.slice(0, 16) : '';
  }

  campaignForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await api.request('/api/admin/campaign', {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: document.getElementById('campaign-enabled').checked,
        deadline: document.getElementById('campaign-deadline').value
      })
    });
    store.set({ campaign: response });
    showToast('活动设置已保存', { tone: 'success' });
  });

  function renderDistribution() {
    const container = document.getElementById('admin-distribution-content');
    container.replaceChildren();
    const actions = node('div', 'admin-actions');
    const share = node('button', 'primary-button', '预览分享海报');
    const email = node('button', 'secondary-button', '模拟发送结案邮件');
    share.type = email.type = 'button';
    share.addEventListener('click', sharing.open);
    const log = node('pre', 'email-log', '等待发送');
    email.addEventListener('click', async () => {
      log.textContent = '正在开始模拟发送…\n';
      try {
        const response = await fetch('/api/admin/projects/send-emails', {
          headers: { Authorization: `Bearer ${store.get().token}` }
        });
        if (!response.ok) throw new Error('邮件模拟请求失败');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop();
          chunks.forEach((chunk) => {
            const payload = chunk.replace(/^data:\s*/, '');
            if (payload) log.textContent += `${JSON.parse(payload).log}\n`;
          });
        }
      } catch (error) {
        log.textContent += `${error.message}\n`;
      }
    });
    actions.append(share, email);
    container.append(actions, log);
  }

  function open() {
    if (!store.get().user?.is_admin) return;
    view.hidden = false;
    document.body.classList.add('dialog-open');
    switchTab('overview');
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

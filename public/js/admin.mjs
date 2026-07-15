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
    const titles = { overview: '需求智能分析', disputes: '申诉审批', campaign: '活动设置', prototypes: '原型验证', distribution: '分发与反馈' };
    title.textContent = titles[tab];
    if (tab === 'overview') loadOverview();
    if (tab === 'disputes') loadDisputes();
    if (tab === 'campaign') loadCampaign();
    if (tab === 'prototypes') renderPrototypes();
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
      const [disputes, wishes] = await Promise.all([
        api.request('/api/admin/disputes'),
        api.request('/api/wishes')
      ]);
      container.replaceChildren();
      const mergeForm = node('form', 'merge-form');
      const sourceLabel = node('label', '', '待合并需求');
      const sourceSelect = node('select');
      sourceSelect.name = 'source_wish_id';
      const targetLabel = node('label', '', '合并至');
      const targetSelect = node('select');
      targetSelect.name = 'target_wish_id';
      wishes.filter((wish) => wish.status !== 'merged').forEach((wish) => {
        const sourceOption = node('option', '', wish.title);
        sourceOption.value = wish.id;
        const targetOption = sourceOption.cloneNode(true);
        sourceSelect.append(sourceOption);
        targetSelect.append(targetOption);
      });
      sourceLabel.append(sourceSelect);
      targetLabel.append(targetSelect);
      const reasonLabel = node('label', '', '合并原因');
      const reason = node('textarea');
      reason.name = 'reason';
      reason.rows = 3;
      reason.required = true;
      reasonLabel.append(reason);
      const mergeButton = node('button', 'secondary-button', '执行合并');
      mergeButton.type = 'submit';
      mergeForm.append(node('h2', '', '需求合并管理'), sourceLabel, targetLabel, reasonLabel, mergeButton);
      mergeForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(mergeForm));
        if (values.source_wish_id === values.target_wish_id) {
          showToast('合并源和目标不能相同', { tone: 'error' });
          return;
        }
        const response = await api.request('/api/admin/wishes/merge', {
          method: 'POST',
          body: JSON.stringify(values)
        });
        showToast(response.message, { tone: 'success' });
        window.dispatchEvent(new CustomEvent('churchos:wishes-changed'));
        loadDisputes();
      });
      container.append(mergeForm);
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

  function renderPrototypes() {
    const container = document.getElementById('admin-prototypes-content');
    container.replaceChildren();
    const tabs = node('div', 'prototype-tabs');
    const stage = node('div', 'prototype-stage');
    const prototypes = {
      schedule: {
        label: '智能排班日历',
        render() {
          stage.innerHTML = '<div class="schedule-prototype"><div class="prototype-heading"><strong>7月主日服侍排班</strong><span class="status-badge">AI 冲突检测已开启</span></div><div class="schedule-grid"><span>服侍</span><span>第一堂</span><span>第二堂</span><strong>诗班</strong><span>Tim Zhang</span><span>Grace Li</span><strong>音控</strong><span class="conflict-cell">Tim Zhang · 冲突</span><span>David Chen</span><strong>接待</strong><span>Anna Wu</span><span>Michael Ho</span></div></div>';
        }
      },
      finance: {
        label: '奉献凭证批处理',
        render() {
          stage.innerHTML = '<div class="finance-prototype"><div class="prototype-heading"><strong>2026 年度奉献凭证</strong><span class="status-badge">CRA 合规检查通过</span></div><div class="finance-progress"><span>已核对 286 / 300</span><progress value="286" max="300"></progress></div><div class="finance-actions"><button class="secondary-button" type="button">预览 PDF</button><button class="primary-button" type="button">批量生成并寄送</button></div></div>';
        }
      }
    };
    Object.entries(prototypes).forEach(([key, prototype], index) => {
      const button = node('button', index === 0 ? 'active' : '', prototype.label);
      button.type = 'button';
      button.addEventListener('click', () => {
        tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
        prototype.render();
      });
      tabs.append(button);
    });
    container.append(tabs, stage);
    prototypes.schedule.render();
  }

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

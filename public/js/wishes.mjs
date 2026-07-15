import { refreshIcons, showToast } from './ui.mjs';

export function filterAndSortWishes(wishes, { category = 'all', sort = 'votes' } = {}) {
  const filtered = category === 'all'
    ? [...wishes]
    : wishes.filter((wish) => wish.category === category);
  return filtered.sort((left, right) => sort === 'date'
    ? Number(right.created_at || 0) - Number(left.created_at || 0)
    : Number(right.votes || 0) - Number(left.votes || 0));
}

export function wishStatusLabel(status) {
  return ({
    voting: '共创中',
    accepted: '已采纳',
    completed: '已完成',
    merged: '已合并'
  })[status] || '处理中';
}

export function updateVoteState(wish, userId) {
  const voters = [...(wish.voted_users || [])];
  const index = voters.indexOf(userId);
  if (index === -1) voters.push(userId);
  else voters.splice(index, 1);
  return { votes: voters.length, voted_users: voters };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initWishWall({ api, store, auth }) {
  const grid = document.getElementById('wish-grid');
  const empty = document.getElementById('wish-empty-state');
  const sortSelect = document.getElementById('wish-sort');
  const categoryTabs = document.getElementById('category-tabs');
  let category = 'all';
  let sort = 'votes';
  let loaded = false;

  function replaceWish(updated) {
    store.set({
      wishes: store.get().wishes.map((wish) => wish.id === updated.id ? updated : wish)
    });
  }

  function renderAvatars(wish) {
    const group = element('div', 'avatar-stack');
    for (const voter of wish.recent_voters || []) {
      const avatar = element('span', 'avatar mini-avatar', voter.nickname?.trim().slice(0, 1).toUpperCase() || '?');
      avatar.setAttribute('aria-label', `${voter.nickname} 已助力`);
      if (voter.avatar_color) avatar.style.background = voter.avatar_color;
      group.append(avatar);
    }
    return group;
  }

  function renderCard(wish) {
    const card = element('article', 'wish-card');
    card.dataset.wishId = String(wish.id);
    const content = element('div', 'wish-card-content');
    const meta = element('div', 'wish-meta');
    meta.append(
      element('span', 'category-badge', wish.category),
      element('span', `status-badge status-${wish.status}`, wishStatusLabel(wish.status))
    );

    const openButton = element('button', 'wish-open-button');
    openButton.type = 'button';
    const title = element('h2', '', wish.title);
    const description = element('p', '', wish.content);
    const author = wish.author
      ? `${wish.author.nickname} · ${wish.author.church_name}`
      : '匿名同工';
    const authorLine = element('span', 'wish-author', author);
    openButton.append(title, description, authorLine);
    openButton.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('churchos:open-wish', { detail: { wish } }));
    });

    const footer = element('div', 'wish-footer');
    const commentCount = element('span', 'wish-comments');
    commentCount.innerHTML = '<i data-lucide="message-circle" aria-hidden="true"></i>';
    commentCount.append(document.createTextNode(`${wish.comment_count || 0} 条评论`));
    footer.append(commentCount, renderAvatars(wish));
    content.append(meta, openButton, footer);

    const vote = element('button', 'vote-button');
    vote.type = 'button';
    vote.setAttribute('aria-label', `${wish.votes || 0} 位同工表示同感`);
    const voted = store.get().user && (wish.voted_users || []).includes(store.get().user.id);
    vote.classList.toggle('active', Boolean(voted));
    vote.innerHTML = `<i data-lucide="heart" aria-hidden="true"></i><strong>${wish.votes || 0}</strong><small>${voted ? '已同感' : '同感'}</small>`;
    vote.addEventListener('click', () => auth.requireAuth(async () => {
      const previous = wish;
      const optimistic = { ...wish, ...updateVoteState(wish, store.get().user.id) };
      replaceWish(optimistic);
      render();
      try {
        const response = await api.request(`/api/wishes/${wish.id}/vote`, { method: 'POST' });
        replaceWish(response.wish);
        render();
        showToast(response.message, { tone: 'success' });
      } catch (error) {
        replaceWish(previous);
        render();
        showToast(error.message, { tone: 'error' });
      }
    }));

    card.append(content, vote);
    return card;
  }

  function render() {
    const wishes = filterAndSortWishes(store.get().wishes, { category, sort });
    grid.replaceChildren(...wishes.map(renderCard));
    empty.hidden = wishes.length > 0;
    refreshIcons();
  }

  async function load({ force = false } = {}) {
    if (loaded && !force) {
      render();
      return;
    }
    grid.setAttribute('aria-busy', 'true');
    grid.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span>正在加载需求广场</div>';
    try {
      const wishes = await api.request('/api/wishes');
      store.set({ wishes });
      loaded = true;
      render();
    } catch (error) {
      const retry = element('button', 'secondary-button', '重新加载');
      retry.type = 'button';
      retry.addEventListener('click', () => load({ force: true }));
      const failure = element('div', 'error-state');
      failure.append(element('p', '', error.message), retry);
      grid.replaceChildren(failure);
    } finally {
      grid.setAttribute('aria-busy', 'false');
    }
  }

  categoryTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    categoryTabs.querySelectorAll('[data-category]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    render();
  });

  sortSelect.addEventListener('change', () => {
    sort = sortSelect.value;
    render();
  });

  window.addEventListener('churchos:wishes-changed', () => load({ force: true }));
  return { load, render, replaceWish };
}

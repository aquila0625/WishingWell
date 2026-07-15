import { debounce, closeDialog, openDialog, refreshIcons, setBusy, showToast } from './ui.mjs';
import { createCommentService } from './comments.mjs';

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

export function validateWish(values, files = []) {
  const errors = {};
  if (!values.category) errors.category = '请选择需求分类';
  if ((values.title || '').trim().length < 5) errors.title = '标题至少需要 5 个字';
  else if (values.title.trim().length > 30) errors.title = '标题最多 30 个字';
  if ((values.content || '').trim().length < 10) errors.content = '详细描述至少需要 10 个字';
  if (files.length > 3) errors.files = '最多上传 3 张图片';
  else if (files.some((file) => file.size > 5 * 1024 * 1024)) errors.files = '每张图片不能超过 5MB';
  return errors;
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
  const wishDialog = document.getElementById('wish-form-dialog');
  const wishForm = document.getElementById('wish-form');
  const wishTitleInput = document.getElementById('wish-title-input');
  const similarPanel = document.getElementById('similar-panel');
  const similarList = document.getElementById('similar-list');
  const audioInput = document.getElementById('audio-input');
  const audioResult = document.getElementById('audio-result');
  const detailDialog = document.getElementById('wish-detail-dialog');
  const detailContent = document.getElementById('wish-detail-content');
  const comments = createCommentService({ api });
  let category = 'all';
  let sort = 'votes';
  let loaded = false;
  let pendingAudioPath = null;

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

  function openWishForm() {
    auth.requireAuth(() => {
      wishForm.reset();
      similarPanel.hidden = true;
      audioResult.hidden = true;
      pendingAudioPath = null;
      openDialog(wishDialog);
    });
  }

  function renderSimilarWishes(matches) {
    similarList.replaceChildren();
    for (const match of matches) {
      const row = element('div', 'similar-row');
      const copy = element('span', '');
      copy.append(element('strong', '', match.title), element('small', '', `${match.votes} 位同工同感`));
      const view = element('button', 'text-button', '查看详情');
      view.type = 'button';
      view.addEventListener('click', () => openWishDetail(match));
      row.append(copy, view);
      similarList.append(row);
    }
    similarPanel.hidden = matches.length === 0;
  }

  const searchSimilar = debounce(async () => {
    const title = wishTitleInput.value.trim();
    if (title.length < 3) {
      renderSimilarWishes([]);
      return;
    }
    try {
      renderSimilarWishes(await api.request('/api/wishes/check-similar', {
        method: 'POST',
        body: JSON.stringify({ title })
      }));
    } catch (error) {
      renderSimilarWishes([]);
    }
  }, 300);

  wishTitleInput.addEventListener('input', searchSimilar);

  audioInput.addEventListener('change', () => auth.requireAuth(async () => {
    const file = audioInput.files[0];
    if (!file) return;
    const data = new FormData();
    data.append('audio', file);
    audioResult.hidden = false;
    audioResult.textContent = '正在转写录音…';
    try {
      const response = await api.request('/api/wishes/audio-transcribe', { method: 'POST', body: data });
      pendingAudioPath = response.audioUrl;
      audioResult.replaceChildren();
      const text = element('p', '', response.text);
      const confidence = element('small', response.confidence < 70 ? 'low-confidence' : '', `识别置信度 ${response.confidence}%`);
      const use = element('button', 'secondary-button', '使用这段转写');
      use.type = 'button';
      use.addEventListener('click', () => {
        const target = wishForm.elements.content;
        target.value = target.value ? `${target.value}\n${response.text}` : response.text;
        target.focus();
      });
      audioResult.append(text, confidence, use);
    } catch (error) {
      audioResult.textContent = error.message;
    }
  }));

  wishForm.addEventListener('submit', (event) => auth.requireAuth(async () => {
    event.preventDefault();
    const data = new FormData(wishForm);
    const files = [...wishForm.elements.images.files];
    const values = Object.fromEntries(data);
    const errors = validateWish(values, files);
    if (Object.keys(errors).length) {
      showToast(Object.values(errors)[0], { tone: 'error' });
      wishForm.elements[Object.keys(errors)[0]]?.focus();
      return;
    }
    data.delete('images');
    files.forEach((file) => data.append('images', file));
    if (pendingAudioPath) data.append('audio_path', pendingAudioPath);
    const submit = wishForm.querySelector('[type="submit"]');
    setBusy(submit, true, '提交中');
    try {
      const response = await api.request('/api/wishes', { method: 'POST', body: data });
      closeDialog(wishDialog);
      showToast(response.message, { tone: 'success' });
      await load({ force: true });
    } catch (error) {
      showToast(error.message, { tone: 'error' });
    } finally {
      setBusy(submit, false);
    }
  }));

  function renderComment(comment, wish, depth = 0) {
    const item = element('article', `comment-item depth-${depth}`);
    const heading = element('div', 'comment-heading');
    heading.append(
      element('strong', '', comment.nickname || '同工'),
      element('small', '', comment.reply_to_nickname ? `回复 ${comment.reply_to_nickname}` : '')
    );
    const body = element('p', 'comment-body', comment.content);
    const actions = element('div', 'comment-actions');
    const translate = element('button', 'text-button', '翻译');
    translate.type = 'button';
    translate.addEventListener('click', async () => {
      if (translate.dataset.translation) {
        body.textContent = translate.dataset.original;
        delete translate.dataset.translation;
        translate.textContent = '翻译';
        return;
      }
      translate.dataset.original = comment.content;
      const translated = await comments.translate(wish.id, comment.content, 'en');
      body.textContent = translated;
      translate.dataset.translation = translated;
      translate.textContent = '显示原文';
    });
    const reply = element('button', 'text-button', '回复');
    reply.type = 'button';
    reply.addEventListener('click', () => {
      const form = detailContent.querySelector('.comment-form');
      form.elements.parent_comment_id.value = comment.id;
      form.elements.reply_to_nickname.value = comment.nickname;
      form.querySelector('.reply-context').textContent = `回复 ${comment.nickname}`;
      form.elements.content.focus();
    });
    actions.append(translate, reply);
    item.append(heading, body, actions);
    for (const child of comment.replies || []) item.append(renderComment(child, wish, depth + 1));
    return item;
  }

  async function renderComments(wish, container) {
    const tree = await comments.load(wish.id);
    container.replaceChildren(...tree.map((comment) => renderComment(comment, wish)));
    if (!tree.length) container.append(element('p', 'muted-copy', '还没有评论，成为第一位回应的同工。'));
  }

  async function openWishDetail(wish) {
    detailContent.replaceChildren(element('div', 'loading-state', '正在加载需求详情…'));
    openDialog(detailDialog);
    const [voters, commentTree] = await Promise.all([
      api.request(`/api/wishes/${wish.id}/voters`),
      comments.load(wish.id)
    ]).catch((error) => {
      showToast(error.message, { tone: 'error' });
      return [[], []];
    });

    detailContent.replaceChildren();
    const header = element('header', 'detail-heading');
    const badges = element('div', 'wish-meta');
    badges.append(
      element('span', 'category-badge', wish.category),
      element('span', `status-badge status-${wish.status}`, wishStatusLabel(wish.status))
    );
    header.append(badges, element('h2', '', wish.title), element('p', 'detail-author', wish.author ? `${wish.author.nickname} · ${wish.author.church_name} · ${wish.author.role_category}` : '匿名同工'));

    const original = element('section', 'detail-section');
    original.append(element('h3', '', '原始需求'), element('p', 'detail-description', wish.content));
    const translateCard = element('button', 'text-button', '翻译需求内容');
    translateCard.type = 'button';
    translateCard.addEventListener('click', async () => {
      const description = original.querySelector('.detail-description');
      if (translateCard.dataset.translation) {
        description.textContent = wish.content;
        translateCard.textContent = '翻译需求内容';
        delete translateCard.dataset.translation;
      } else {
        const translated = await comments.translate(wish.id, wish.content, 'en');
        description.textContent = translated;
        translateCard.dataset.translation = translated;
        translateCard.textContent = '显示原文';
      }
    });
    original.append(translateCard);

    if ((wish.images || []).length) {
      const gallery = element('div', 'detail-gallery');
      for (const path of wish.images) {
        const image = document.createElement('img');
        image.src = path;
        image.alt = `${wish.title} 的参考图片`;
        gallery.append(image);
      }
      original.append(gallery);
    }

    detailContent.append(header, original);

    if (wish.admin_reply) {
      const reply = element('section', 'official-reply');
      reply.append(element('span', 'eyebrow', 'ChurchOS 官方答复'), element('p', '', wish.admin_reply));
      detailContent.append(reply);
    }

    if (wish.status === 'merged') {
      const merged = element('section', 'merged-section');
      merged.append(element('h3', '', '合并处理说明'), element('p', '', wish.merge_reason || '该需求已合并至主需求。'));
      if (store.get().user?.id === wish.user_id && wish.dispute_status !== 'pending') {
        const disputeForm = element('form', 'dispute-form');
        disputeForm.innerHTML = '<label>拆分申诉理由<textarea name="reason" rows="3" minlength="10" required></textarea></label><button class="secondary-button" type="submit">提交拆分申诉</button>';
        disputeForm.addEventListener('submit', async (event) => {
          event.preventDefault();
          try {
            const response = await api.request(`/api/wishes/${wish.id}/dispute`, {
              method: 'POST',
              body: JSON.stringify({ reason: disputeForm.elements.reason.value })
            });
            showToast(response.message, { tone: 'success' });
            closeDialog(detailDialog);
            await load({ force: true });
          } catch (error) {
            showToast(error.message, { tone: 'error' });
          }
        });
        merged.append(disputeForm);
      } else if (wish.dispute_status === 'pending') {
        merged.append(element('p', 'pending-label', '拆分申诉正在审核中'));
      }
      detailContent.append(merged);
    }

    const voterSection = element('section', 'detail-section');
    voterSection.append(element('h3', '', `同感共创同工（${wish.votes || 0}）`));
    const voterList = element('div', 'voter-list');
    for (const voter of voters) {
      const row = element('span', 'voter-chip');
      row.append(element('span', 'avatar mini-avatar', voter.nickname.slice(0, 1)), document.createTextNode(voter.nickname));
      voterList.append(row);
    }
    voterSection.append(voterList);
    detailContent.append(voterSection);

    const commentSection = element('section', 'detail-section');
    commentSection.append(element('h3', '', '同工评论交流'));
    const commentList = element('div', 'comment-list');
    commentList.append(...commentTree.map((comment) => renderComment(comment, wish)));
    if (!commentTree.length) commentList.append(element('p', 'muted-copy', '还没有评论，成为第一位回应的同工。'));
    const commentForm = element('form', 'comment-form');
    commentForm.innerHTML = '<span class="reply-context"></span><input name="parent_comment_id" type="hidden"><input name="reply_to_nickname" type="hidden"><label>发表评论<textarea name="content" rows="3" required></textarea></label><button class="primary-button" type="submit">发表评论</button>';
    commentForm.addEventListener('submit', (event) => auth.requireAuth(async () => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(commentForm));
      try {
        const response = await comments.add(wish.id, values);
        showToast(response.message, { tone: 'success' });
        commentForm.reset();
        await renderComments(wish, commentList);
        await load({ force: true });
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      }
    }));
    commentSection.append(commentList, commentForm);
    detailContent.append(commentSection);
    refreshIcons();
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

  ['wall-submit-button', 'drawer-submit-button'].forEach((id) => {
    document.getElementById(id).addEventListener('click', openWishForm);
  });
  document.querySelectorAll('[data-open-wish]').forEach((button) => button.addEventListener('click', openWishForm));
  window.addEventListener('churchos:open-wish', (event) => openWishDetail(event.detail.wish));
  window.addEventListener('churchos:wishes-changed', () => load({ force: true }));
  return { load, openWishDetail, openWishForm, render, replaceWish };
}

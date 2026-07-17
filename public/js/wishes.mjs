import { debounce, closeDialog, openDialog, refreshIcons, setBusy, showToast } from './ui.mjs';
import { createCommentService } from './comments.mjs';
import { translate } from './i18n.mjs';

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
    planned: '已规划',
    developing: '开发中',
    testing: '内测中',
    completed: '已完成',
    rejected: '暂不采纳',
    merged: '已合并',
    hidden: '已隐藏'
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
  if (!values.category) errors.category = '请选择问题分类';
  if ((values.title || '').trim().length < 5) errors.title = '简短标题至少需要 5 个字';
  else if (values.title.trim().length > 30) errors.title = '简短标题最多 30 个字';
  if ((values.content || '').trim().length < 10) errors.content = '问题描述至少需要 10 个字';
  if (files.length > 3) errors.files = '最多上传 3 张图片';
  else if (files.some((file) => file.size > 5 * 1024 * 1024)) errors.files = '每张图片不能超过 5MB';
  return errors;
}

function t(key) {
  return translate(key);
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
  const readonlyNotice = document.getElementById('readonly-campaign-notice');
  const sortControl = document.getElementById('wish-sort-control');
  const wishSortButton = document.getElementById('wish-sort-button');
  const wishSortMenu = document.getElementById('wish-sort-menu');
  const wishSortLabel = document.getElementById('wish-sort-label');
  const categoryTabs = document.getElementById('category-tabs');
  const wishDialog = document.getElementById('wish-form-dialog');
  const wishForm = document.getElementById('wish-form');
  const wishTitleInput = document.getElementById('wish-title-input');
  const similarPanel = document.getElementById('similar-panel');
  const similarList = document.getElementById('similar-list');
  const audioRecordStart = document.getElementById('audio-record-start');
  const audioRecordStop = document.getElementById('audio-record-stop');
  const audioResult = document.getElementById('audio-result');
  const detailDialog = document.getElementById('wish-detail-dialog');
  const detailContent = document.getElementById('wish-detail-content');
  const myWishesDialog = document.getElementById('my-wishes-dialog');
  const myWishList = document.getElementById('my-wish-list');
  const myWishEmpty = document.getElementById('my-wish-empty');
  const wishEditDialog = document.getElementById('wish-edit-dialog');
  const wishEditForm = document.getElementById('wish-edit-form');
  const comments = createCommentService({ api });
  let category = 'all';
  let sort = 'votes';
  let loaded = false;
  let pendingAudioPath = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let recordingStream = null;
  let discardRecording = false;

  function campaignIsClosed() {
    const campaign = store.get().campaign || {};
    return Boolean(campaign.closed || (
      campaign.enabled
      && campaign.deadline
      && Date.now() >= Date.parse(campaign.deadline)
    ));
  }

  function updateReadonlyMode() {
    const closed = campaignIsClosed();
    if (readonlyNotice) readonlyNotice.hidden = !closed;
    document.querySelectorAll('[data-open-wish], #wall-submit-button, #drawer-submit-button').forEach((button) => {
      button.disabled = closed;
      button.classList.toggle('is-disabled', closed);
      if (closed) button.setAttribute('aria-disabled', 'true');
      else button.removeAttribute('aria-disabled');
    });
  }

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
    vote.disabled = campaignIsClosed();
    vote.innerHTML = `<i data-lucide="heart" aria-hidden="true"></i><strong>${wish.votes || 0}</strong><small>${voted ? '已同感' : '同感'}</small>`;
    vote.addEventListener('click', () => auth.requireAuth(async () => {
      if (campaignIsClosed()) {
        showToast('本阶段需求征集已截止，您仍可查看已有需求', { tone: 'info' });
        return;
      }
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
    const wishes = filterAndSortWishes(
      store.get().wishes.filter((wish) => wish.status !== 'hidden'),
      { category, sort }
    );
    grid.replaceChildren(...wishes.map(renderCard));
    empty.hidden = wishes.length > 0;
    updateReadonlyMode();
    refreshIcons();
  }

  function canEditWish(wish) {
    return wish.user_id === store.get().user?.id && wish.status === 'voting';
  }

  function openWishEditor(wish) {
    const latestWish = store.get().wishes.find((item) => item.id === wish.id) || wish;
    if (!canEditWish(latestWish)) {
      showToast(t('wishEdit.lockedToast'), { tone: 'error' });
      return;
    }
    wishEditForm.elements.id.value = latestWish.id;
    wishEditForm.elements.category.value = latestWish.category;
    wishEditForm.elements.title.value = latestWish.title;
    wishEditForm.elements.content.value = latestWish.content;
    closeDialog(myWishesDialog);
    openDialog(wishEditDialog);
  }

  function renderMyWishItem(wish) {
    const item = element('article', 'my-wish-item');
    const meta = element('div', 'wish-meta');
    meta.append(
      element('span', 'category-badge', wish.category),
      element('span', `status-badge status-${wish.status}`, wishStatusLabel(wish.status))
    );

    const copy = element('div', 'my-wish-copy');
    copy.append(meta, element('h3', '', wish.title), element('p', '', wish.content));

    const actions = element('div', 'my-wish-actions');
    const view = element('button', 'secondary-button', t('myWishes.view'));
    view.type = 'button';
    view.innerHTML = `<i data-lucide="eye" aria-hidden="true"></i>${t('myWishes.view')}`;
    view.addEventListener('click', () => {
      closeDialog(myWishesDialog);
      openWishDetail(wish);
    });
    actions.append(view);

    if (canEditWish(wish)) {
      const edit = element('button', 'primary-button', t('myWishes.edit'));
      edit.type = 'button';
      edit.innerHTML = `<i data-lucide="pencil" aria-hidden="true"></i>${t('myWishes.edit')}`;
      edit.addEventListener('click', () => openWishEditor(wish));
      actions.append(edit);
    } else {
      const locked = element('span', 'wish-locked-label');
      locked.innerHTML = `<i data-lucide="lock-keyhole" aria-hidden="true"></i>${t('myWishes.locked')}`;
      actions.append(locked);
    }

    item.append(copy, actions);
    return item;
  }

  function renderMyWishes() {
    const userId = store.get().user?.id;
    const wishes = store.get().wishes
      .filter((wish) => wish.user_id === userId)
      .sort((left, right) => Number(right.created_at || right.id) - Number(left.created_at || left.id));
    myWishList.replaceChildren(...wishes.map(renderMyWishItem));
    myWishEmpty.hidden = wishes.length > 0;
    refreshIcons();
  }

  function openMyWishes() {
    auth.requireAuth(async () => {
      if (!loaded) await load();
      renderMyWishes();
      openDialog(myWishesDialog);
    });
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
      if (campaignIsClosed()) {
        showToast('本阶段需求征集已截止，您仍可查看已有需求', { tone: 'info' });
        return;
      }
      wishForm.reset();
      similarPanel.hidden = true;
      audioResult.hidden = true;
      audioResult.replaceChildren();
      audioRecordStart.hidden = false;
      audioRecordStop.hidden = true;
      pendingAudioPath = null;
      closeDialog(myWishesDialog);
      openDialog(wishDialog);
    });
  }

  function renderSimilarWishes(matches) {
    similarList.replaceChildren();
    for (const match of matches) {
      const row = element('div', 'similar-row');
      const copy = element('span', '');
      copy.append(element('strong', '', match.title), element('small', '', `${match.votes} 位用户有同感`));
      const view = element('button', 'text-button', '查看并补充');
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

  function appendTranscription(response) {
    pendingAudioPath = response.audioUrl;
    audioResult.replaceChildren();
    const text = element('p', '', response.text);
    const confidence = element('small', response.confidence < 70 ? 'low-confidence' : '', `${t('wishForm.transcriptionConfidence')} ${response.confidence}%`);
    const use = element('button', 'secondary-button', t('wishForm.useTranscription'));
    use.type = 'button';
    use.addEventListener('click', () => {
      const target = wishForm.elements.content;
      target.value = target.value ? `${target.value}\n${response.text}` : response.text;
      target.focus();
    });
    const redo = element('button', 'ghost-button', t('wishForm.recordAgain'));
    redo.type = 'button';
    redo.addEventListener('click', () => {
      pendingAudioPath = null;
      audioResult.hidden = true;
      audioResult.replaceChildren();
      audioRecordStart.hidden = false;
      audioRecordStop.hidden = true;
    });
    audioResult.append(text, confidence, use, redo);
  }

  async function uploadRecording(audioBlob) {
    const data = new FormData();
    data.append('audio', audioBlob, 'churchos-requirement-recording.webm');
    audioResult.hidden = false;
    audioResult.textContent = t('wishForm.transcribing');
    try {
      const response = await api.request('/api/wishes/audio-transcribe', { method: 'POST', body: data });
      appendTranscription(response);
    } catch (error) {
      audioResult.textContent = error.message;
    } finally {
      audioRecordStart.hidden = false;
      audioRecordStop.hidden = true;
      audioRecordStop.disabled = false;
      refreshIcons();
    }
  }

  function stopRecordingTracks() {
    if (!recordingStream) return;
    recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
  }

  audioRecordStart.addEventListener('click', () => auth.requireAuth(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast(t('wishForm.recordingUnsupported'), { tone: 'error' });
      return;
    }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      discardRecording = false;
      mediaRecorder = new MediaRecorder(recordingStream);
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) audioChunks.push(event.data);
      });
      mediaRecorder.addEventListener('stop', () => {
        stopRecordingTracks();
        if (discardRecording) {
          audioChunks = [];
          discardRecording = false;
          return;
        }
        const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        uploadRecording(audioBlob);
      }, { once: true });
      mediaRecorder.start();
      pendingAudioPath = null;
      audioResult.hidden = false;
      audioResult.textContent = t('wishForm.recording');
      audioRecordStart.hidden = true;
      audioRecordStop.hidden = false;
      refreshIcons();
    } catch (error) {
      stopRecordingTracks();
      showToast(t('wishForm.microphoneError'), { tone: 'error' });
    }
  }));

  audioRecordStop.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
      audioRecordStop.disabled = true;
      audioResult.textContent = t('wishForm.preparingTranscription');
      mediaRecorder.stop();
    }
  });

  wishDialog.addEventListener('close', () => {
    if (mediaRecorder?.state === 'recording') {
      discardRecording = true;
      mediaRecorder.stop();
    } else {
      stopRecordingTracks();
    }
    audioRecordStart.hidden = false;
    audioRecordStop.hidden = true;
    audioRecordStop.disabled = false;
  });

  wishForm.addEventListener('submit', (event) => {
    event.preventDefault();
    auth.requireAuth(async () => {
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
    setBusy(submit, true, t('wishForm.submitting'));
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
    });
  });

  wishEditForm.addEventListener('submit', (event) => {
    event.preventDefault();
    auth.requireAuth(async () => {
      const values = Object.fromEntries(new FormData(wishEditForm));
      const errors = validateWish(values);
      if (Object.keys(errors).length) {
        showToast(Object.values(errors)[0], { tone: 'error' });
        wishEditForm.elements[Object.keys(errors)[0]]?.focus();
        return;
      }

      const submit = wishEditForm.querySelector('[type="submit"]');
      setBusy(submit, true, t('wishEdit.saving'));
      try {
        const response = await api.request(`/api/wishes/${values.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            category: values.category,
            title: values.title,
            content: values.content
          })
        });
        replaceWish(response.wish);
        render();
        renderMyWishes();
        closeDialog(wishEditDialog);
        openDialog(myWishesDialog);
        showToast(response.message, { tone: 'success' });
      } catch (error) {
        showToast(error.message, { tone: 'error' });
      } finally {
        setBusy(submit, false);
      }
    });
  });

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
    if (campaignIsClosed()) {
      commentForm.innerHTML = '<p class="muted-copy">本阶段需求征集已截止，评论已暂时关闭。</p>';
    } else {
      commentForm.innerHTML = '<span class="reply-context"></span><input name="parent_comment_id" type="hidden"><input name="reply_to_nickname" type="hidden"><label>发表评论<textarea name="content" rows="3" required></textarea></label><button class="primary-button" type="submit">发表评论</button>';
      commentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        auth.requireAuth(async () => {
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
        });
      });
    }
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

  function closeSortMenu() {
    wishSortMenu.hidden = true;
    wishSortButton.setAttribute('aria-expanded', 'false');
  }

  wishSortButton.addEventListener('click', () => {
    wishSortMenu.hidden = !wishSortMenu.hidden;
    wishSortButton.setAttribute('aria-expanded', String(!wishSortMenu.hidden));
  });

  wishSortMenu.addEventListener('click', (event) => {
    const option = event.target.closest('[data-sort]');
    if (!option) return;
    sort = option.dataset.sort;
    wishSortLabel.textContent = option.textContent;
    wishSortMenu.querySelectorAll('[data-sort]').forEach((button) => {
      button.setAttribute('aria-selected', String(button === option));
    });
    closeSortMenu();
    render();
  });

  document.addEventListener('click', (event) => {
    if (sortControl.contains(event.target)) return;
    closeSortMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSortMenu();
  });

  ['wall-submit-button', 'drawer-submit-button'].forEach((id) => {
    document.getElementById(id).addEventListener('click', openWishForm);
  });
  document.querySelectorAll('[data-open-wish]').forEach((button) => button.addEventListener('click', openWishForm));
  window.addEventListener('churchos:open-wish', (event) => openWishDetail(event.detail.wish));
  window.addEventListener('churchos:open-my-wishes', openMyWishes);
  window.addEventListener('churchos:wishes-changed', () => load({ force: true }));
  store.subscribe(() => updateReadonlyMode());
  updateReadonlyMode();
  return { load, openMyWishes, openWishDetail, openWishForm, render, replaceWish };
}

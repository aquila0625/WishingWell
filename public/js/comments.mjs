export function buildCommentTree(comments) {
  if (comments.some((comment) => Array.isArray(comment.replies))) return comments;
  const roots = comments.filter((comment) => !comment.parent_comment_id);
  return roots.map((comment) => ({
    ...comment,
    replies: comments.filter((reply) => reply.parent_comment_id === comment.id)
  }));
}

export function translationCacheKey({ wishId, locale, text }) {
  return `${wishId}:${locale}:${text}`;
}

export function createCommentService({ api }) {
  const translations = new Map();

  async function load(wishId) {
    return buildCommentTree(await api.request(`/api/wishes/${wishId}/comments`));
  }

  async function add(wishId, values) {
    return api.request(`/api/wishes/${wishId}/comment`, {
      method: 'POST',
      body: JSON.stringify(values)
    });
  }

  async function translate(wishId, text, locale = 'en') {
    const key = translationCacheKey({ wishId, locale, text });
    if (!translations.has(key)) {
      const response = await api.request(`/api/wishes/${wishId}/translate`, {
        method: 'POST',
        body: JSON.stringify({ text, locale })
      });
      translations.set(key, response.translation);
    }
    return translations.get(key);
  }

  return { add, load, translate };
}

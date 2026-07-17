export function buildCommentTree(comments) {
  const rows = [];
  const flatten = (comment) => {
    const { replies = [], ...rest } = comment;
    rows.push(rest);
    replies.forEach(flatten);
  };
  comments.forEach(flatten);

  const nodes = new Map(rows.map((comment) => [comment.id, { ...comment, replies: [] }]));
  const roots = [];
  for (const comment of nodes.values()) {
    const parent = comment.parent_comment_id ? nodes.get(comment.parent_comment_id) : null;
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  }
  return roots;
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

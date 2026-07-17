import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWish } from '../public/js/wishes.mjs';
import { buildCommentTree, translationCacheKey } from '../public/js/comments.mjs';

test('wish validation enforces category, title, description, and file limits', () => {
  assert.deepEqual(validateWish({ title: '短', content: '不足', category: '' }, []), {
    category: '请选择问题分类',
    title: '简短标题至少需要 5 个字',
    content: '问题描述至少需要 10 个字'
  });
  assert.equal(
    validateWish(
      { title: '主日排班冲突提醒', content: '这是超过十个字的完整需求描述。', category: '排班事工' },
      [{ size: 1 }, { size: 1 }, { size: 1 }, { size: 1 }]
    ).files,
    '最多上传 3 张图片'
  );
  assert.equal(
    validateWish(
      { title: '主日排班冲突提醒', content: '这是超过十个字的完整需求描述。', category: '排班事工' },
      [{ size: 6 * 1024 * 1024 }]
    ).files,
    '每张图片不能超过 5MB'
  );
});

test('buildCommentTree arranges replies below their parent comment', () => {
  const tree = buildCommentTree([
    { id: 1, content: '主评论', parent_comment_id: null },
    { id: 2, content: '回复', parent_comment_id: 1 }
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].replies[0].id, 2);
});

test('translation cache keys distinguish wish, locale, and text', () => {
  assert.notEqual(
    translationCacheKey({ wishId: 1, locale: 'en', text: '排班' }),
    translationCacheKey({ wishId: 1, locale: 'zh-CN', text: '排班' })
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPosterModel } from '../public/js/sharing.mjs';
import { notificationSummary } from '../public/js/notifications.mjs';

test('poster model uses the current URL and campaign title', () => {
  assert.deepEqual(
    buildPosterModel({ url: 'https://example.test/well', title: 'ChurchOS 共创计划' }),
    {
      url: 'https://example.test/well',
      title: 'ChurchOS 共创计划',
      subtitle: '连接全球，共建数字化教会未来'
    }
  );
});

test('notification summary counts unread items only', () => {
  assert.deepEqual(
    notificationSummary([{ read: false }, { read: true }, { read: false }]),
    { total: 3, unread: 2 }
  );
});

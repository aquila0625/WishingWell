import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, validateRegistration } from '../public/js/auth.mjs';

class MapStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('session persists only the numeric user token', () => {
  const storage = new MapStorage();
  const session = createSession(storage);

  session.save({ id: 3, nickname: 'Sarah', password: 'never-store-this' });

  assert.equal(storage.getItem('churchos.userId'), '3');
  assert.equal(storage.getItem('churchos.password'), null);
  session.clear();
  assert.equal(session.load(), null);
});

test('registration validates email, password, and display name', () => {
  assert.deepEqual(validateRegistration({ email: 'bad', password: '123', nickname: '' }), {
    email: '请输入有效邮箱',
    password: '密码至少需要 6 位字符',
    nickname: '请输入展示姓名'
  });
});

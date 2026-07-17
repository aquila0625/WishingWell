import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('session persists only the server session token', () => {
  const storage = new MapStorage();
  const session = createSession(storage);

  session.save('signed.session-token');

  assert.equal(storage.getItem('churchos.sessionToken'), 'signed.session-token');
  assert.equal(storage.getItem('churchos.userId'), null);
  assert.equal(storage.getItem('churchos.password'), null);
  session.clear();
  assert.equal(session.load(), null);
});

test('registration validates email, password, and display name', () => {
  assert.deepEqual(validateRegistration({ email: 'bad', password: '123', nickname: '' }), {
    email: '请输入有效邮箱',
    password: '密码至少需要 6 位字符',
    nickname: '请输入展示姓名',
    consent: '请确认同意数据用于需求调研与产品规划'
  });
});

test('authentication tabs use direct login and registration labels', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const auth = fs.readFileSync(new URL('../public/js/auth.mjs', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/styles/components.css', import.meta.url), 'utf8');

  assert.match(html, /id="login-tab"[^>]*>登录<\/button>/);
  assert.match(html, /id="register-tab"[^>]*>注册<\/button>/);
  assert.match(html, /id="register-dialog-title"/);
  assert.match(html, /class="auth-dialog-toolbar"[\s\S]*class="auth-tabs"[\s\S]*class="dialog-close icon-button"/);
  assert.match(css, /\.auth-dialog-toolbar \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto/s);
  assert.match(css, /\.auth-dialog-toolbar \.dialog-close \{[^}]*position:\s*static/s);
  assert.match(auth, /dialog\.setAttribute\('aria-labelledby', loginActive \? 'auth-dialog-title' : 'register-dialog-title'\)/);
});

test('registration explains required fields and identity usage', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const requiredMarks = html.match(/class="required-mark"/g) || [];

  assert.match(html, /class="form-required-note"[^>]*><span[^>]*>\*<\/span> 为必填项目/);
  assert.ok(requiredMarks.length >= 8);
  assert.match(html, /id="register-email-hint"[^>]*>[^<]*开发进度[^<]*需求采纳通知/);
  assert.match(html, /aria-describedby="register-email-hint"/);
  assert.match(html, /id="register-name-hint"[^>]*>[^<]*真实姓名[^<]*共创致谢墙/);
  assert.match(html, /aria-describedby="register-name-hint"/);
});

test('registration location fields avoid inaccurate default city and church can be typed manually', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.doesNotMatch(html, /name="country"[^>]*value="加拿大 \(Canada\)"/);
  assert.doesNotMatch(html, /name="state"[^>]*value="Ontario"/);
  assert.doesNotMatch(html, /name="city"[^>]*value="Toronto"/);
  assert.match(html, /id="register-church-hint"[^>]*>[^<]*搜索不到[^<]*手动填写/);
  assert.match(html, /name="church_name"[^>]*placeholder="[^"]*教会全称[^"]*"/);
});

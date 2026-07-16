import test from 'node:test';
import assert from 'node:assert/strict';
import { setLocale } from '../public/js/i18n.mjs';

function createElement(text, key) {
  return {
    textContent: text,
    dataset: { i18n: key },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
}

test('setLocale translates launch-page copy across built-in locales', () => {
  const title = createElement('ChurchOS 教会通 APP', 'hero.title');
  const description = createElement('', 'hero.description');
  const submit = createElement('提交我的需求', 'action.submitNeed');
  const elements = [title, description, submit];

  globalThis.document = {
    documentElement: {},
    title: '',
    querySelectorAll(selector) {
      return selector === '[data-i18n]' ? elements : [];
    }
  };

  assert.equal(setLocale('en'), 'en');
  assert.equal(title.textContent, 'ChurchOS Church Connect App');
  assert.match(description.textContent, /digital church management/);
  assert.equal(submit.textContent, 'Submit My Need');
  assert.equal(document.documentElement.lang, 'en');

  assert.equal(setLocale('es'), 'es');
  assert.equal(title.textContent, 'ChurchOS App Iglesia Conectada');
  assert.match(description.textContent, /gestión digital/);
  assert.equal(submit.textContent, 'Enviar mi necesidad');

  assert.equal(setLocale('ko'), 'ko');
  assert.equal(title.textContent, 'ChurchOS 교회통 앱');
  assert.match(description.textContent, /디지털 교회 관리/);
  assert.equal(submit.textContent, '내 필요 제출');

  assert.equal(setLocale('fr'), 'fr');
  assert.equal(title.textContent, 'ChurchOS App Église Connectée');
  assert.match(description.textContent, /gestion numérique/);
  assert.equal(submit.textContent, 'Soumettre mon besoin');

  assert.equal(setLocale('zh-TW'), 'zh-TW');
  assert.equal(title.textContent, 'ChurchOS 教會通 APP');

  assert.equal(setLocale('zh-CN'), 'zh-CN');
  assert.equal(title.textContent, 'ChurchOS 教会通 APP');

  delete globalThis.document;
});

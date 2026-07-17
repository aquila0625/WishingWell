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
  const title = createElement('ChurchOS（教会通）APP', 'hero.title');
  const description = createElement('', 'hero.description');
  const wallTitle = createElement('真实需求共创墙', 'wall.title');
  const submit = createElement('提交我的需求', 'action.submitNeed');
  const elements = [title, description, wallTitle, submit];

  globalThis.document = {
    documentElement: {},
    title: '',
    querySelectorAll(selector) {
      return selector === '[data-i18n]' ? elements : [];
    }
  };

  assert.equal(setLocale('en'), 'en');
  assert.equal(title.textContent, 'ChurchOS App');
  assert.match(description.textContent, /grows out of real church-life problems/);
  assert.equal(wallTitle.textContent, 'Real Needs Co-creation Wall');
  assert.equal(submit.textContent, 'Submit My Need');
  assert.equal(document.documentElement.lang, 'en');

  assert.equal(setLocale('es'), 'es');
  assert.equal(title.textContent, 'ChurchOS App');
  assert.match(description.textContent, /problemas reales de la vida de iglesia/);
  assert.equal(wallTitle.textContent, 'Muro de necesidades reales');
  assert.equal(submit.textContent, 'Enviar mi necesidad');

  assert.equal(setLocale('ko'), 'ko');
  assert.equal(title.textContent, 'ChurchOS 앱');
  assert.match(description.textContent, /교회 현장의 문제/);
  assert.equal(wallTitle.textContent, '실제 필요 공동 창작 게시판');
  assert.equal(submit.textContent, '내 필요 제출');

  assert.equal(setLocale('fr'), 'fr');
  assert.equal(title.textContent, 'ChurchOS App');
  assert.match(description.textContent, /problèmes concrets de la vie d’église/);
  assert.equal(wallTitle.textContent, 'Mur de co-création des besoins réels');
  assert.equal(submit.textContent, 'Soumettre mon besoin');

  assert.equal(setLocale('zh-TW'), 'zh-TW');
  assert.equal(title.textContent, 'ChurchOS（教會通）APP');
  assert.match(description.textContent, /不是憑想像設計/);
  assert.match(description.textContent, /教會現場的問題/);
  assert.equal(wallTitle.textContent, '真實需要共創牆');
  assert.equal(submit.textContent, '提出我的需要');

  assert.equal(setLocale('zh-CN'), 'zh-CN');
  assert.equal(title.textContent, 'ChurchOS（教会通）APP');
  assert.equal(wallTitle.textContent, '真实需求共创墙');

  delete globalThis.document;
});

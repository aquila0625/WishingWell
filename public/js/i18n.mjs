const dictionaries = {
  'zh-CN': {
    home: '首页',
    wall: '需求广场',
    login: '登录',
    submit: '我要提需求'
  },
  en: {
    home: 'Home',
    wall: 'Wish Wall',
    login: 'Sign in',
    submit: 'Submit a need'
  }
};

let activeLocale = 'zh-CN';

export function setLocale(locale) {
  activeLocale = dictionaries[locale] ? locale : 'zh-CN';
  document.documentElement.lang = activeLocale;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = dictionaries[activeLocale][element.dataset.i18n];
    if (value) element.textContent = value;
  });
  return activeLocale;
}

export function getLocale() {
  return activeLocale;
}

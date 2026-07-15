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
  },
  'zh-TW': { home: '首頁', wall: '需求廣場', login: '登入', submit: '我要提需求' },
  es: { home: 'Inicio', wall: 'Muro de necesidades', login: 'Ingresar', submit: 'Enviar necesidad' },
  pt: { home: 'Início', wall: 'Mural de necessidades', login: 'Entrar', submit: 'Enviar necessidade' },
  fr: { home: 'Accueil', wall: 'Mur des besoins', login: 'Connexion', submit: 'Proposer un besoin' },
  de: { home: 'Start', wall: 'Bedarfswand', login: 'Anmelden', submit: 'Bedarf einreichen' },
  ja: { home: 'ホーム', wall: 'ニーズ広場', login: 'ログイン', submit: '要望を投稿' },
  ko: { home: '홈', wall: '요청 광장', login: '로그인', submit: '요청 제출' },
  tl: { home: 'Home', wall: 'Pader ng pangangailangan', login: 'Mag-sign in', submit: 'Magsumite ng pangangailangan' }
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

export function getSupportedLocales() {
  return ['zh-CN', 'zh-TW', 'en', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'tl'];
}

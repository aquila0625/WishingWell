const DEFAULT_HOMEPAGE = {
  hero_title: 'ChurchOS（教会通）APP',
  hero_tagline: '在 ChurchOS（教会通）APP 正式开发前，我们邀请教会领袖、服侍同工、弟兄姊妹与慕道朋友一起参与调研，共同决定第一版要优先解决哪些真实问题。',
  final_cta_title: '您的一个真实问题，可能成为 ChurchOS 第一版的重要功能',
  show_share_button: true
};

const LEGACY_DEFAULT_HOMEPAGE = {
  hero_title: 'ChurchOS 教会通 APP',
  hero_tagline: '与全球教会同工一起，定义未来的全场景数字化服侍平台',
  final_cta_title: '共同定义 ChurchOS 教会通 APP 的第一版'
};

function isLegacyDefaultHomepage(homepage = {}) {
  return Object.entries(LEGACY_DEFAULT_HOMEPAGE)
    .every(([key, value]) => homepage[key] === value);
}

function normalizeHomepage(homepage) {
  const source = homepage || {};
  if (isLegacyDefaultHomepage(source)) {
    return { ...DEFAULT_HOMEPAGE, show_share_button: source.show_share_button ?? DEFAULT_HOMEPAGE.show_share_button };
  }
  return { ...DEFAULT_HOMEPAGE, ...source };
}

module.exports = {
  DEFAULT_HOMEPAGE,
  LEGACY_DEFAULT_HOMEPAGE,
  isLegacyDefaultHomepage,
  normalizeHomepage
};

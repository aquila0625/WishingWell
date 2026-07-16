const { verifySessionToken } = require('./session-tokens');

function authenticate(database, { sessionSecret } = {}) {
  return async (req, res, next) => {
    const match = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
    const session = match ? verifySessionToken(match[1], sessionSecret) : null;
    const user = session ? await database.findById('users', session.user_id) : null;

    if (!user) {
      return res.status(401).json({ error: '请先登录同工账号' });
    }

    if (user.disabled) {
      return res.status(403).json({ error: '该账号已被暂停使用' });
    }

    req.user = user;
    next();
  };
}

function adminAuthenticate(database, options = {}) {
  const requireUser = authenticate(database, options);

  return (req, res, next) => requireUser(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: '仅管理员可执行此操作' });
    }

    next();
  });
}

module.exports = { authenticate, adminAuthenticate };

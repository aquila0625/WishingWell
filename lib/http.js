function authenticate(database) {
  return (req, res, next) => {
    const match = /^Bearer\s+(\d+)$/.exec(req.headers.authorization || '');
    const user = match ? database.findById('users', Number(match[1])) : null;

    if (!user) {
      return res.status(401).json({ error: '请先登录同工账号' });
    }

    req.user = user;
    next();
  };
}

function adminAuthenticate(database) {
  const requireUser = authenticate(database);

  return (req, res, next) => requireUser(req, res, () => {
    if (!req.user.is_admin) {
      return res.status(403).json({ error: '仅管理员可执行此操作' });
    }

    next();
  });
}

module.exports = { authenticate, adminAuthenticate };

const express = require('express');
const QRCode = require('qrcode');
const { normalizeHomepage } = require('../lib/homepage');

function createShareRouter({ database }) {
  const router = express.Router();

  router.get('/campaign', async (req, res) => {
    const settings = (await database.read('settings'))[0] || { enabled: false, deadline: null };
    const closed = Boolean(
      settings.enabled
      && settings.deadline
      && Date.now() >= Date.parse(settings.deadline)
    );
    res.json({
      enabled: Boolean(settings.enabled),
      deadline: settings.deadline || null,
      homepage: normalizeHomepage(settings.homepage_published || settings.homepage),
      closed
    });
  });

  router.get('/share/qr', async (req, res, next) => {
    try {
      const url = String(req.query.url || '').trim();
      if (!/^https?:\/\//i.test(url)) {
        return res.status(400).json({ error: '分享链接格式无效' });
      }
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#10212b', light: '#ffffff' }
      });
      res.json({ dataUrl });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createShareRouter };

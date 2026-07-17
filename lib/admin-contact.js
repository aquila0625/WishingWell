const DEFAULT_ADMIN_CONTACT = {
  whatsapp: 'https://wa.me/qr/KOJJUK7PYZ6LG1',
  wechat: 'aquila_wang',
  email: 'aquilawang0625@gmail.com'
};

function normalizeAdminContact(contact = {}) {
  return {
    whatsapp: String(contact.whatsapp || DEFAULT_ADMIN_CONTACT.whatsapp).trim(),
    wechat: String(contact.wechat || DEFAULT_ADMIN_CONTACT.wechat).trim(),
    email: String(contact.email || DEFAULT_ADMIN_CONTACT.email).trim()
  };
}

module.exports = { DEFAULT_ADMIN_CONTACT, normalizeAdminContact };

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    church_name: user.church_name,
    country: user.country,
    state: user.state,
    city: user.city,
    role_category: user.role_category,
    role_detail: user.role_detail || '',
    avatar_color: user.avatar_color,
    avatar_path: user.avatar_path || null,
    is_admin: Boolean(user.is_admin)
  };
}

module.exports = { publicUser };

const AuthHelper = {
  sanitizeUserPayload: (user) => {
    if (!user) return null;
    const { password, ...safeUser } = user._doc || user;
    return safeUser;
  },
};

module.exports = AuthHelper;

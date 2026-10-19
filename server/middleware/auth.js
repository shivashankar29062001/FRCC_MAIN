const jwt = require('jsonwebtoken');

// JWT secret - in production, use a strong secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'frcc-conventions-dev-secret';

// Auth modes: 'mock' | 'external'
// - mock: accepts the mock token 'mock-token-test-user-1' as valid
// - external: TODO - verify token with team's auth service
const AUTH_MODE = process.env.AUTH_MODE || 'mock';

/**
 * Authentication middleware.
 * Extracts user from Bearer token.
 * In mock mode, accepts the fixed mock token.
 * In external mode, TODO: verify with team's auth service.
 */
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    if (AUTH_MODE === 'mock' && token === 'mock-token-test-user-1') {
      // Mock mode: fixed test user
      req.user = { id: 'test-user-1', name: 'Test User', email: 'test@frcc.example', mobile: '9999999999' };
      return next();
    }

    // External mode: verify JWT with shared secret
    // TODO: Replace with team's token verification (JWT with their public key, or call their /api/verify)
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    console.error('Auth error:', e.message);
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = auth;
module.exports.JWT_SECRET = JWT_SECRET;
module.exports.AUTH_MODE = AUTH_MODE;
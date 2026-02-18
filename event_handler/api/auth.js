/**
 * Authentication API routes
 */
const crypto = require('crypto');

const { DASHBOARD_PASSWORD } = process.env;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Simple JWT implementation (no external dependencies)
function createToken(payload, expiresInHours = 24) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const data = { ...payload, iat: now, exp: now + expiresInHours * 3600 };
  const payloadB64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadB64}`).digest('base64url');
  return `${header}.${payloadB64}.${signature}`;
}

function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
    if (signature !== expectedSig) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch {
    return null;
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
}

// Setup routes
function setupAuthRoutes(app) {
  // Login
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;

    if (!DASHBOARD_PASSWORD) {
      return res.status(500).json({ error: 'Dashboard password not configured' });
    }

    if (password !== DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = createToken({ authenticated: true });
    res.json({ token });
  });

  // Verify token
  app.get('/api/auth/verify', authMiddleware, (req, res) => {
    res.json({ valid: true });
  });
}

module.exports = { setupAuthRoutes, authMiddleware };

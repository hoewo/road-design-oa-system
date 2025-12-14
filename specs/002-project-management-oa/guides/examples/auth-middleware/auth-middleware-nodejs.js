// middleware/auth.js
// Node.js实现的统一认证中间件
const axios = require('axios');
const config = require('../config/env');

function authMiddleware(req, res, next) {
  if (config.authMode === 'self_validate') {
    return selfValidateAuth(req, res, next);
  }
  return gatewayAuth(req, res, next);
}

function gatewayAuth(req, res, next) {
  const userID = req.headers['x-user-id'];
  if (!userID) {
    return res.status(401).json({ error: '未认证', code: 'UNAUTHORIZED' });
  }
  
  req.user = {
    id: userID,
    username: req.headers['x-user-username'],
    isAdmin: req.headers['x-user-isadmin'] === 'true',
    appID: req.headers['x-user-appid'],
    sessionID: req.headers['x-user-sessionid'],
  };
  
  next();
}

async function selfValidateAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '缺少 Token', code: 'TOKEN_MISSING' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const response = await axios.post(
      `${config.nebulaAuthURL}/auth-server/v1/internal/validate_token`,
      { token }
    );
    
    if (!response.data.success || !response.data.data.valid) {
      return res.status(401).json({ 
        error: response.data.data.error || 'Token 无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    req.user = {
      id: response.data.data.user_id,
      username: response.data.data.username,
      isAdmin: response.data.data.is_admin,
      appID: response.data.data.app_id,
      sessionID: response.data.data.session_id,
    };
    
    next();
  } catch (error) {
    return res.status(500).json({ error: '验证 Token 失败', code: 'VALIDATION_ERROR' });
  }
}

module.exports = authMiddleware;


// config/api.js
// API配置示例
const config = {
  development: {
    apiBaseURL: 'http://business-server:port',  // 开发环境：直接调用本地业务服务器
    nebulaAuthURL: 'http://nebula-auth-server:port',  // NebulaAuth 服务地址
  },
  production: {
    apiBaseURL: 'http://nebula-auth-server:port',  // 生产环境：通过网关调用
    nebulaAuthURL: 'http://nebula-auth-server:port',  // 网关地址
  }
};

const env = process.env.NODE_ENV || 'development';
const currentConfig = config[env];

export default currentConfig;


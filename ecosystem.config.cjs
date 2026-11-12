const fs = require('fs');
const path = require('path');
function loadEnv(file) {
  const out = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i <= 0) continue;
      let k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  } catch (_) {}
  return out;
}
const env = loadEnv(path.join(__dirname, '.env'));
// Bar API on CF-style alt HTTPS port — never VPS :443 (VPN/xray), never Render
env.PUBLIC_BASE_URL = 'https://asafievbar.duckdns.org:2083';
env.TELEGRAM_WEBHOOK_BASE_URL = env.TELEGRAM_WEBHOOK_BASE_URL || 'https://asafievbar.duckdns.org:8443';
// Prefer .env FORCE_TELEGRAM_POLLING when set (NL uses 1 while Telegram sticky-DNS caches old RU IP)
if (env.FORCE_TELEGRAM_POLLING == null || env.FORCE_TELEGRAM_POLLING === '') {
  env.FORCE_TELEGRAM_POLLING = '0';
}
env.HOST = env.HOST || '127.0.0.1';
env.PORT = env.PORT || '3000';
delete env.HTTPS_PROXY;
delete env.HTTP_PROXY;
delete env.ALL_PROXY;
module.exports = {
  apps: [{
    name: 'bar-firebase',
    cwd: __dirname,
    script: 'webhook-server.js',
    env
  }]
};

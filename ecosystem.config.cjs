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
env.PUBLIC_BASE_URL = 'https://asafievbar.duckdns.org';
env.FORCE_TELEGRAM_POLLING = '0';
module.exports = {
  apps: [{
    name: 'bar-firebase',
    cwd: __dirname,
    script: 'webhook-server.js',
    env
  }]
};

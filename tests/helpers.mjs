// Shared test helpers: a static server for the portal and Playwright routing that keeps tests offline.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.env.PORTAL_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FB = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', 'firebase');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.json': 'application/json' };

export function serve() {
  const srv = http.createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(ROOT, p === '/' ? 'index.html' : p);
    if (!f.startsWith(ROOT) || f.includes(path.join(ROOT, 'tests')) || !existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(await readFile(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ url: `http://localhost:${srv.address().port}`, close: () => srv.close() })));
}

export async function browser() {
  const opts = {};
  if (process.env.CHROMIUM_PATH) opts.executablePath = process.env.CHROMIUM_PATH;
  else if (existsSync('/opt/pw-browsers/chromium')) opts.executablePath = '/opt/pw-browsers/chromium';
  return chromium.launch(opts);
}

/** config.js used by the tests. mode 'demo' = sample data; 'emulator' = Firebase emulators, project demo-silah. */
export const testConfig = (mode, appCheck = process.env.SILAH_APPCHECK ? "{ siteKey: 'test-site-key', provider: 'enterprise' }" : '') => `export const CONFIG = { academy: 'أكاديمية صلة', ownerEmail: 'owner@test.local', ${appCheck ? `appCheck: ${appCheck}, ` : ''}firebase: ${mode === 'demo' ? "{ apiKey: '' }" : "{ apiKey: 'fake-api-key', authDomain: 'demo-silah.firebaseapp.com', projectId: 'demo-silah', appId: '1:1:web:1' }"} };`;

export async function route(ctx, mode = 'demo', appCheck = '', fake) {
  await ctx.route(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/, async r => {
    const name = r.request().url().split('/').pop();
    r.fulfill({ contentType: 'text/javascript', body: await readFile(path.join(FB, name), 'utf8') });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route(/\/config\.js$/, r => r.fulfill({ contentType: 'text/javascript', body: testConfig(mode, appCheck || undefined) }));
  if ((appCheck || process.env.SILAH_APPCHECK) && fake !== false) await fakeAppCheck(ctx, fake || {});
}

/** App Check without Google: a stand-in reCAPTCHA script and token exchange. Counts calls in ctx.appCheck. */
export async function fakeAppCheck(ctx, { ttl = '3600s', recaptcha = 'ok', exchange = 200 } = {}) {
  const st = ctx.appCheck = { scripts: 0, exchanges: 0, tokens: [] };
  const fake = `(function(){var g={ready:function(cb){setTimeout(cb,0)},render:function(c,o){g._o=o;return 1},execute:function(){g._o&&g._o.callback&&g._o.callback('fake-recaptcha-token');return Promise.resolve('fake-recaptcha-token')}};window.grecaptcha=Object.assign({enterprise:g},g);})();`;
  await ctx.route(/google\.com\/recaptcha\//, r => { st.scripts++; if (recaptcha === 'hang') return; return recaptcha === 'blocked' ? r.abort() : r.fulfill({ contentType: 'text/javascript', body: fake }); });
  await ctx.route(/content-firebaseappcheck\.googleapis\.com/, r => {
    st.exchanges++; st.lastUrl = r.request().url();
    if (exchange !== 200) return r.fulfill({ status: exchange, contentType: 'application/json', body: '{"error":{"code":403,"status":"PERMISSION_DENIED"}}' });
    const token = 'fake-appcheck-token-' + st.exchanges; st.tokens.push(token);
    return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ token, ttl }) });
  });
  return st;
}

export function watch(page) {
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  return { errors, warnings };
}

export const ROLE_TABS = {
  admin: ['لوحة الإدارة', 'طلبات التسجيل', 'الإشراف', 'التقارير الشهرية', 'الحسابات', 'الطلاب', 'المعلمون', 'الصلاحيات والنقل'],
  supervisor: ['الإشراف', 'التقارير الشهرية', 'طلبات التسجيل', 'الطلاب'],
  accountant: ['الحسابات'],
  teacher: ['حلقاتي', 'شهري ومستحقاتي'],
  parent: ['متابعة أبنائي'],
};
export const tabNames = page => page.$$eval('#tabs [role="tab"]', bs => bs.map(b => b.childNodes[0].textContent.trim()));

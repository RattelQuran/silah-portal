// Shared test helpers: a static server for the portal and Playwright routing that keeps tests offline.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FB = path.join(ROOT, 'tests', 'node_modules', 'firebase');
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
export const testConfig = mode => `export const CONFIG = { academy: 'أكاديمية صلة', ownerEmail: 'owner@test.local', firebase: ${mode === 'demo' ? "{ apiKey: '' }" : "{ apiKey: 'fake-api-key', authDomain: 'demo-silah.firebaseapp.com', projectId: 'demo-silah', appId: '1:1:web:1' }"} };`;

export async function route(ctx, mode = 'demo') {
  await ctx.route(/gstatic\.com\/firebasejs\/[\d.]+\/(firebase-[a-z]+\.js)$/, async r => {
    const name = r.request().url().split('/').pop();
    r.fulfill({ contentType: 'text/javascript', body: await readFile(path.join(FB, name), 'utf8') });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route(/\/config\.js$/, r => r.fulfill({ contentType: 'text/javascript', body: testConfig(mode) }));
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

const { chromium } = require('playwright');

async function dumpVisible(page, label) {
  const state = await page.evaluate(() => {
    const pick = (selector) => Array.from(document.querySelectorAll(selector)).map((el) => {
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        cls: el.className || '',
        id: el.id || '',
        text,
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }).filter((x) => x.width > 0 && x.height > 0).slice(0, 80);
    return {
      title: document.title,
      buttons: pick('button, .desktop-app, .app-icon, .chat-item, .contact-item, .menu-item, .option-item, [onclick], [role=\"button\"]'),
      textNodes: pick('h1, h2, h3, .title, .nav-title, .chat-title, .page-title, .contact-name, .wechat-title, .modal-title, .menu-text, .action-text, span, div')
        .filter((x) => x.text)
        .slice(0, 120)
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(state, null, 2));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (msg) => {
    const text = msg.text();
    if (text) console.log(`[console:${msg.type()}] ${text}`);
  });
  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dumpVisible(page, 'home');
  const wechatTarget = page.locator('text=微信').first();
  await wechatTarget.click();
  await page.waitForTimeout(1500);
  await dumpVisible(page, 'wechat');
  await page.screenshot({ path: 'tools/playwright-group-flow-debug.png', fullPage: true });
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

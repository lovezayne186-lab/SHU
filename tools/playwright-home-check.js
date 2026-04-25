const path = require('path');
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 }
  });

  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleMessages.push(`[pageerror] ${err.message}`);
  });

  await page.goto('http://127.0.0.1:4173/index.html', { waitUntil: 'networkidle' });

  const title = await page.title();
  const screenshotPath = path.join(__dirname, 'playwright-home-check.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log('title=' + title);
  console.log('screenshot=' + screenshotPath);
  if (consoleMessages.length) {
    console.log('console=');
    consoleMessages.forEach((line) => console.log(line));
  } else {
    console.log('console=<clean>');
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
});

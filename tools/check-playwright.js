try {
  const path = require.resolve('playwright');
  const playwright = require('playwright');
  console.log('playwright-resolve=' + path);
  console.log('chromium-launch=' + typeof playwright.chromium.launch);
} catch (err) {
  console.error(err && err.stack ? err.stack : String(err));
  process.exit(1);
}

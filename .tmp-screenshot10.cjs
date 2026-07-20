const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 700, height: 700 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:5193/', { waitUntil: 'networkidle' });

  const getStarted = page.getByText('Get Started', { exact: true });
  if (await getStarted.isVisible().catch(() => false)) {
    await getStarted.click();
    await page.waitForTimeout(300);
  }

  const base = 'C:/Users/nahla/AppData/Local/Temp/claude/c--Users-nahla-Documents-ClientsAndProjects-Nahlania-Playground-BracketWise/9acc7dc5-1142-4237-bc20-1ab367d3b486/scratchpad/';

  const gains = page.getByRole('button', { name: /Realized Capital Gains/ });
  await gains.click();
  await page.waitForTimeout(300);

  const card = page.locator('text=SELF-EMPLOYMENT & OTHER INCOME').locator('..').locator('..');
  await card.screenshot({ path: base + 'v10-x-icon.png' });

  console.log('CONSOLE ERRORS:', errors);
  await browser.close();
})();

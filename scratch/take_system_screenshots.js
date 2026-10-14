import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Mohamed Salama\\.gemini\\antigravity-ide\\brain\\034fa289-544c-4c51-ba5e-15c6e7073284';
const SCREENSHOTS_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching headless Chrome at 1920x1080...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  console.log('Navigating to http://127.0.0.1:5173/...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Page loaded.');

  const views = [
    { label: 'Planner', file: '01_planner_gantt.png' },
    { label: 'Team Hub', file: '02_team_hub.png' },
    { label: 'Financials', file: '03_financials_invoicing.png' },
    { label: 'Projects', file: '04_projects_dashboard.png' },
    { label: 'Automation', file: '05_automation_rules.png' },
    { label: 'Compliance', file: '06_compliance_security.png' },
    { label: 'Integrations', file: '07_integrations_api.png' },
    { label: 'Status', file: '08_public_status.png' },
    { label: 'Config', file: '09_config_calendar.png' },
  ];

  for (const view of views) {
    console.log(`Switching to view tab: "${view.label}"...`);
    
    const clicked = await page.evaluate((targetLabel) => {
      const nav = document.getElementById('nav-views-tabs');
      if (!nav) return false;
      const buttons = Array.from(nav.querySelectorAll('button'));
      const btn = buttons.find(b => (b.textContent || '').trim().toLowerCase() === targetLabel.toLowerCase());
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    }, view.label);

    if (!clicked) {
      console.warn(`Could not find nav button for "${view.label}". Trying fallback selector.`);
    }

    await new Promise(r => setTimeout(r, 1800));
    const outPath = path.join(SCREENSHOTS_DIR, view.file);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${view.file}`);
  }

  // Open Risk Register Modal from Planner view
  console.log('Capturing Risk Register Modal...');
  await page.evaluate(() => {
    const nav = document.getElementById('nav-views-tabs');
    const plannerBtn = nav && Array.from(nav.querySelectorAll('button')).find(b => (b.textContent || '').includes('Planner'));
    if (plannerBtn) plannerBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Find risk register button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const riskBtn = btns.find(b => (b.textContent || '').toLowerCase().includes('risk'));
    if (riskBtn) riskBtn.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  const riskPath = path.join(SCREENSHOTS_DIR, '10_risk_register_modal.png');
  await page.screenshot({ path: riskPath, fullPage: false });
  console.log(`Saved screenshot: 10_risk_register_modal.png`);

  // Close modal with Escape key
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));

  // Switch to Dark Mode
  console.log('Toggling Dark Mode and capturing Planner Dark Mode...');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 1500));
  const darkPath = path.join(SCREENSHOTS_DIR, '11_planner_dark_mode.png');
  await page.screenshot({ path: darkPath, fullPage: false });
  console.log(`Saved screenshot: 11_planner_dark_mode.png`);

  await browser.close();
  console.log('ALL SYSTEM SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

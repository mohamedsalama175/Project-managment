import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureAll() {
  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching Chrome for DeliverOps Master Screenshot Capture...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. Planner View (Light Mode)
    // ----------------------------------------------------
    console.log('[1/12] Capturing Planner View (Light Mode)...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await sleep(500);
    const shot1 = path.join(screenshotsDir, '01_planner_view_light.png');
    await page.screenshot({ path: shot1 });
    console.log('✓ Saved:', shot1);

    // ----------------------------------------------------
    // 2. Planner View (Dark Mode)
    // ----------------------------------------------------
    console.log('[2/12] Capturing Planner View (Dark Mode)...');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await sleep(600);
    const shot2 = path.join(screenshotsDir, '02_planner_view_dark.png');
    await page.screenshot({ path: shot2 });
    console.log('✓ Saved:', shot2);

    // Revert back to light mode for standard captures
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await sleep(500);

    // ----------------------------------------------------
    // 3. Task Detail Drawer
    // ----------------------------------------------------
    console.log('[3/12] Capturing Task Detail Drawer...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="details drawer"]');
      if (btn) btn.click();
    });
    await sleep(1200);
    const shot3 = path.join(screenshotsDir, '03_task_detail_drawer.png');
    await page.screenshot({ path: shot3 });
    console.log('✓ Saved:', shot3);

    // Close task drawer
    await page.evaluate(() => {
      const closeBtn = document.querySelector('aside button, .drawer button');
      if (closeBtn) closeBtn.click();
    });
    await sleep(600);

    // ----------------------------------------------------
    // 4. People View (Team Hub)
    // ----------------------------------------------------
    console.log('[4/12] Capturing People View (Team Hub)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const teamBtn = btns.find((b) => b.innerText.includes('Team Hub'));
      if (teamBtn) teamBtn.click();
    });
    await sleep(1500);
    const shot4 = path.join(screenshotsDir, '04_people_view_team_hub.png');
    await page.screenshot({ path: shot4 });
    console.log('✓ Saved:', shot4);

    // ----------------------------------------------------
    // 5. Dashboard View (Executive Projects)
    // ----------------------------------------------------
    console.log('[5/12] Capturing Executive Dashboard View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const dashBtn = btns.find((b) => b.innerText.includes('Projects'));
      if (dashBtn) dashBtn.click();
    });
    await sleep(1500);
    const shot5 = path.join(screenshotsDir, '05_dashboard_view_executive.png');
    await page.screenshot({ path: shot5 });
    console.log('✓ Saved:', shot5);

    // ----------------------------------------------------
    // 6. Project Configuration View
    // ----------------------------------------------------
    console.log('[6/12] Capturing Project Configuration View...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const cfgBtn = btns.find((b) => b.innerText.includes('Config'));
      if (cfgBtn) cfgBtn.click();
    });
    await sleep(1500);
    const shot6 = path.join(screenshotsDir, '06_config_view_settings.png');
    await page.screenshot({ path: shot6 });
    console.log('✓ Saved:', shot6);

    // Return to Planner View for modal triggers
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      const planBtn = btns.find((b) => b.innerText.includes('Planner'));
      if (planBtn) planBtn.click();
    });
    await sleep(1000);

    // ----------------------------------------------------
    // 7. Risk Register Modal (RIB)
    // ----------------------------------------------------
    console.log('[7/12] Capturing Risk Register Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button, div button'));
      const rBtn = btns.find((b) => b.innerText.trim() === 'Risks');
      if (rBtn) rBtn.click();
    });
    await sleep(1200);
    const shot7 = path.join(screenshotsDir, '07_risk_register_modal.png');
    await page.screenshot({ path: shot7 });
    console.log('✓ Saved:', shot7);

    // Close Risk modal
    await page.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('.clay-card button'));
      const xBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x') || b.querySelector('svg'));
      if (xBtn) xBtn.click();
    });
    await sleep(800);

    // ----------------------------------------------------
    // 8. Weekly Delivery Report Modal
    // ----------------------------------------------------
    console.log('[8/12] Capturing Weekly Delivery Report Modal...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button, div button'));
      const repBtn = btns.find((b) => b.innerText.trim() === 'Report');
      if (repBtn) repBtn.click();
    });
    await sleep(1200);
    const shot8 = path.join(screenshotsDir, '08_weekly_delivery_report_modal.png');
    await page.screenshot({ path: shot8 });
    console.log('✓ Saved:', shot8);

    // Close Report modal
    await page.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('.clay-card button'));
      const xBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x') || b.querySelector('svg'));
      if (xBtn) xBtn.click();
    });
    await sleep(800);

    // ----------------------------------------------------
    // 9. Auth & Live Identity Console Modal
    // ----------------------------------------------------
    console.log('[9/12] Capturing Auth & Live Identity Console...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="view credentials"]');
      if (btn) btn.click();
    });
    await sleep(1200);
    const shot9 = path.join(screenshotsDir, '09_auth_identity_console_modal.png');
    await page.screenshot({ path: shot9 });
    console.log('✓ Saved:', shot9);

    // Close Auth modal
    await page.evaluate(() => {
      const closeButtons = Array.from(document.querySelectorAll('.clay-card button'));
      const xBtn = closeButtons.find((b) => b.querySelector('svg.lucide-x') || b.querySelector('svg'));
      if (xBtn) xBtn.click();
    });
    await sleep(800);

    // ----------------------------------------------------
    // 10. New Project Provisioning Modal
    // ----------------------------------------------------
    console.log('[10/12] Capturing New Project Provisioning Modal...');
    await page.evaluate(() => {
      const switcher = document.querySelector('header button.clay-card-flat');
      if (switcher) switcher.click();
    });
    await sleep(600);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const createBtn = btns.find((b) => b.innerText.includes('Create New Project'));
      if (createBtn) createBtn.click();
    });
    await sleep(1200);
    const shot10 = path.join(screenshotsDir, '10_new_project_modal.png');
    await page.screenshot({ path: shot10 });
    console.log('✓ Saved:', shot10);

    // Close New Project modal
    await page.evaluate(() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find((b) => b.innerText.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    });
    await sleep(800);

    // ----------------------------------------------------
    // 11. Export & Backup Menu
    // ----------------------------------------------------
    console.log('[11/12] Capturing Export & Backup Options...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button, div button'));
      const expBtn = btns.find((b) => b.innerText.trim() === 'Export');
      if (expBtn) expBtn.click();
    });
    await sleep(600);
    const shot11 = path.join(screenshotsDir, '11_export_backup_menu.png');
    await page.screenshot({ path: shot11 });
    console.log('✓ Saved:', shot11);

    // Close export menu by clicking away
    await page.evaluate(() => {
      const body = document.querySelector('body');
      if (body) body.click();
    });
    await sleep(500);

    // ----------------------------------------------------
    // 12. Persona Switcher & Role Simulator
    // ----------------------------------------------------
    console.log('[12/12] Capturing Persona Switcher Dropdown...');
    await page.evaluate(() => {
      const personaBtn = document.querySelector('button[title*="Switch persona"]');
      if (personaBtn) personaBtn.click();
    });
    await sleep(600);
    const shot12 = path.join(screenshotsDir, '12_persona_switcher_dropdown.png');
    await page.screenshot({ path: shot12 });
    console.log('✓ Saved:', shot12);

    console.log('\n=============================================');
    console.log('All 12 system screenshots captured successfully!');
    console.log('=============================================');
  } finally {
    await browser.close();
  }
}

captureAll().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});

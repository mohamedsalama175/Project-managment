import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capture() {
  const screenshotsDir = path.resolve('screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Starting DeliverOps comprehensive screenshot automation...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  try {
    // ----------------------------------------------------
    // 1. Planner View (Light Mode)
    // ----------------------------------------------------
    console.log('Navigating to http://localhost:5173 (Planner View)...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    // Ensure light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await sleep(500);

    const shot1 = path.join(screenshotsDir, '01_planner_view_light.png');
    await page.screenshot({ path: shot1 });
    console.log(`[1/10] Captured: ${shot1}`);

    // ----------------------------------------------------
    // 2. Planner View (Dark Mode)
    // ----------------------------------------------------
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await sleep(500);

    const shot2 = path.join(screenshotsDir, '02_planner_view_dark.png');
    await page.screenshot({ path: shot2 });
    console.log(`[2/10] Captured: ${shot2}`);

    // Revert to light for subsequent screenshots
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });
    await sleep(500);

    // ----------------------------------------------------
    // 3. Task Detail Drawer
    // ----------------------------------------------------
    console.log('Opening Task Detail Drawer...');
    const detailsBtn = await page.$('button[title*="details drawer"]');
    if (detailsBtn) {
      await detailsBtn.click();
      await sleep(1000);
      const shot3 = path.join(screenshotsDir, '03_task_detail_drawer.png');
      await page.screenshot({ path: shot3 });
      console.log(`[3/10] Captured: ${shot3}`);

      // Close drawer by pressing Escape or clicking backdrop
      await page.keyboard.press('Escape');
      await sleep(500);
    } else {
      console.warn('Could not find task details button');
    }

    // ----------------------------------------------------
    // 4. Team Hub (People View)
    // ----------------------------------------------------
    console.log('Navigating to Team Hub View...');
    const teamTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.find(b => b.textContent.includes('Team Hub'));
    });
    if (teamTab) {
      await teamTab.click();
      await sleep(1500);
      const shot4 = path.join(screenshotsDir, '04_people_view_team_hub.png');
      await page.screenshot({ path: shot4 });
      console.log(`[4/10] Captured: ${shot4}`);
    }

    // ----------------------------------------------------
    // 5. Executive Dashboard (Projects View)
    // ----------------------------------------------------
    console.log('Navigating to Dashboard View...');
    const dashTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.find(b => b.textContent.includes('Projects'));
    });
    if (dashTab) {
      await dashTab.click();
      await sleep(1500);
      const shot5 = path.join(screenshotsDir, '05_dashboard_view_executive.png');
      await page.screenshot({ path: shot5 });
      console.log(`[5/10] Captured: ${shot5}`);
    }

    // ----------------------------------------------------
    // 6. Project Configuration View
    // ----------------------------------------------------
    console.log('Navigating to Config View...');
    const configTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.find(b => b.textContent.includes('Config') || b.textContent.includes('Settings'));
    });
    if (configTab) {
      await configTab.click();
      await sleep(1500);
      const shot6 = path.join(screenshotsDir, '06_config_view_settings.png');
      await page.screenshot({ path: shot6 });
      console.log(`[6/10] Captured: ${shot6}`);
    }

    // Return to Planner
    const plannerTab = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.find(b => b.textContent.includes('Planner'));
    });
    if (plannerTab) {
      await plannerTab.click();
      await sleep(1000);
    }

    // ----------------------------------------------------
    // 7. Risk Register Modal
    // ----------------------------------------------------
    console.log('Opening Risk Register Modal...');
    const risksBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.trim() === 'Risks');
    });
    if (risksBtn) {
      await risksBtn.click();
      await sleep(1000);
      const shot7 = path.join(screenshotsDir, '07_risk_register_modal.png');
      await page.screenshot({ path: shot7 });
      console.log(`[7/10] Captured: ${shot7}`);

      // Close modal
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // ----------------------------------------------------
    // 8. Weekly Delivery Report Modal
    // ----------------------------------------------------
    console.log('Opening Weekly Report Modal...');
    const reportBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent.trim() === 'Report');
    });
    if (reportBtn) {
      await reportBtn.click();
      await sleep(1000);
      const shot8 = path.join(screenshotsDir, '08_weekly_delivery_report_modal.png');
      await page.screenshot({ path: shot8 });
      console.log(`[8/10] Captured: ${shot8}`);

      // Close modal
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // ----------------------------------------------------
    // 9. Auth & Live Credentials Modal
    // ----------------------------------------------------
    console.log('Opening Auth & Identity Console...');
    const authBtn = await page.$('button[title*="view credentials"]');
    if (authBtn) {
      await authBtn.click();
      await sleep(1000);
      const shot9 = path.join(screenshotsDir, '09_auth_login_console_modal.png');
      await page.screenshot({ path: shot9 });
      console.log(`[9/10] Captured: ${shot9}`);

      // Close modal
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // ----------------------------------------------------
    // 10. New Project Provisioning Modal
    // ----------------------------------------------------
    console.log('Opening New Project Modal...');
    // Click project switcher dropdown
    const switcherBtn = await page.evaluateHandle(() => {
      const headerBtns = Array.from(document.querySelectorAll('header button, .navbar button, div button'));
      return headerBtns.find(b => b.textContent.includes('tasks') || b.textContent.includes('EAS') || b.textContent.includes('Project'));
    });
    if (switcherBtn) {
      await switcherBtn.click();
      await sleep(500);
      const newProjBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.find(b => b.textContent.includes('Create New Project'));
      });
      if (newProjBtn) {
        await newProjBtn.click();
        await sleep(1000);
        const shot10 = path.join(screenshotsDir, '10_new_project_modal.png');
        await page.screenshot({ path: shot10 });
        console.log(`[10/10] Captured: ${shot10}`);
      }
    }

    console.log('All screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

capture().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});

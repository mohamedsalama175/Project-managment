const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Clean old screenshots in directory (keeping old_archive intact)
const existingFiles = fs.readdirSync(SCREENSHOTS_DIR);
for (const file of existingFiles) {
  const fullPath = path.join(SCREENSHOTS_DIR, file);
  if (fs.statSync(fullPath).isFile() && file.endsWith('.png')) {
    fs.unlinkSync(fullPath);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('Launching Chrome for Full System Screenshot Suite...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // -------------------------------------------------------------
  // Screenshot 1: Auth Sign-In Gateway (Unauthenticated State)
  // -------------------------------------------------------------
  console.log('Capturing: 01_auth_signin_gateway.png');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_auth_signin_gateway.png') });

  // -------------------------------------------------------------
  // Authenticate and Hydrate Demo Data
  // -------------------------------------------------------------
  console.log('Logging in and hydrating system state...');
  await page.evaluate(async () => {
    if (window.useAuthStore) {
      await window.useAuthStore.getState().login('mohamed.salama@bitwise-solutions.com', '12345678');
    }
    if (window.useProjectStore && window.DEMO_PROJECTS) {
      window.useProjectStore.setState({
        projects: window.DEMO_PROJECTS,
        activeProjectId: window.DEMO_PROJECTS[0].id,
        theme: 'light',
        activeView: 'planner',
      });
    }
  });
  await sleep(1000);

  // -------------------------------------------------------------
  // Screenshot 2: Planner WBS & Gantt Split View (Default 46/54)
  // -------------------------------------------------------------
  console.log('Capturing: 02_planner_wbs_gantt_split.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'planner', theme: 'light' });
  });
  await sleep(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_planner_wbs_gantt_split.png') });

  // -------------------------------------------------------------
  // Screenshot 3: Planner Full WBS Data Grid (Grid preset)
  // -------------------------------------------------------------
  console.log('Capturing: 03_planner_wbs_full_grid.png');
  await page.evaluate(() => {
    const gridBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Grid');
    if (gridBtn) gridBtn.click();
  });
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_planner_wbs_full_grid.png') });

  // -------------------------------------------------------------
  // Screenshot 4: Planner Full Gantt Canvas (Gantt preset)
  // -------------------------------------------------------------
  console.log('Capturing: 04_planner_gantt_full_timeline.png');
  await page.evaluate(() => {
    const ganttBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Gantt');
    if (ganttBtn) ganttBtn.click();
  });
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_planner_gantt_full_timeline.png') });

  // Restore split preset
  await page.evaluate(() => {
    const splitBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === '50:50');
    if (splitBtn) splitBtn.click();
  });
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 5: Planner Gantt Bar Hover Card (Glassmorphic)
  // -------------------------------------------------------------
  console.log('Capturing: 05_planner_gantt_bar_hover_card.png');
  const barSelector = '#planner-gantt-container .group, #planner-gantt-container [class*="cursor-grab"], #planner-gantt-container [class*="rounded-md"]';
  const barEl = await page.$(barSelector);
  if (barEl) {
    await barEl.hover();
    await sleep(400); // 200ms delay + animation
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_planner_gantt_bar_hover_card.png') });

  // -------------------------------------------------------------
  // Screenshot 6: Planner Task Details & Comments Drawer
  // -------------------------------------------------------------
  console.log('Capturing: 06_planner_task_detail_drawer.png');
  await page.evaluate(() => {
    const detailsBtn = document.querySelector('button[title*="Details & Comments"]');
    if (detailsBtn) {
      detailsBtn.click();
    } else {
      const allRows = document.querySelectorAll('#planner-wbs-container button');
      if (allRows.length > 0) allRows[0].click();
    }
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_planner_task_detail_drawer.png') });
  
  // Close drawer cleanly by clicking X button
  await page.evaluate(() => {
    const xBtn = Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
    if (xBtn) xBtn.click();
  });
  await page.keyboard.press('Escape');
  await sleep(500);

  // -------------------------------------------------------------
  // Screenshot 7: Planner Dark Mode Theme
  // -------------------------------------------------------------
  console.log('Capturing: 07_planner_dark_mode.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ theme: 'dark' });
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_planner_dark_mode.png') });

  // Restore light mode for remaining views
  await page.evaluate(() => {
    window.useProjectStore.setState({ theme: 'light' });
  });
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 8: Team's Hub - Capacity Matrix & Heatmap
  // -------------------------------------------------------------
  console.log('Capturing: 08_team_hub_capacity_matrix.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'team' });
  });
  await sleep(600);
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Capacity') || b.textContent?.includes('Heatmap'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_team_hub_capacity_matrix.png') });

  // -------------------------------------------------------------
  // Screenshot 9: Team's Hub - Members Directory
  // -------------------------------------------------------------
  console.log('Capturing: 09_team_hub_members_directory.png');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Directory') || b.textContent?.includes('Members'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_team_hub_members_directory.png') });

  // -------------------------------------------------------------
  // Screenshot 10: Team's Hub - Skills Matrix Table
  // -------------------------------------------------------------
  console.log('Capturing: 10_team_hub_skills_matrix.png');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Skills'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_team_hub_skills_matrix.png') });

  // -------------------------------------------------------------
  // Screenshot 11: Team's Hub - Capacity Forecast Chart
  // -------------------------------------------------------------
  console.log('Capturing: 11_team_hub_capacity_forecast.png');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Forecast'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_team_hub_capacity_forecast.png') });

  // -------------------------------------------------------------
  // Screenshot 12: Team's Hub - Live Timesheets Grid
  // -------------------------------------------------------------
  console.log('Capturing: 12_team_hub_live_timesheets.png');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Timesheet'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_team_hub_live_timesheets.png') });

  // -------------------------------------------------------------
  // Screenshot 13: Team's Hub - Time Off & Leave Calendar
  // -------------------------------------------------------------
  console.log('Capturing: 13_team_hub_time_off_calendar.png');
  await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Time Off') || b.textContent?.includes('Leave'));
    if (tab) tab.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_team_hub_time_off_calendar.png') });

  // -------------------------------------------------------------
  // Screenshot 14: Users Management Directory
  // -------------------------------------------------------------
  console.log('Capturing: 14_users_management_directory.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'users' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_users_management_directory.png') });

  // -------------------------------------------------------------
  // Screenshot 15: Users Management - Invite User Drawer
  // -------------------------------------------------------------
  console.log('Capturing: 15_users_invite_drawer.png');
  await page.evaluate(() => {
    const inviteBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Invite User') || b.textContent?.includes('Add User'));
    if (inviteBtn) inviteBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_users_invite_drawer.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 16: Roles Management Overview Table
  // -------------------------------------------------------------
  console.log('Capturing: 16_roles_management_overview.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'roles' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_roles_management_overview.png') });

  // -------------------------------------------------------------
  // Screenshot 17: Create New Role with Granular Permissions Matrix
  // -------------------------------------------------------------
  console.log('Capturing: 17_roles_create_new_role_matrix.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'create-role' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '17_roles_create_new_role_matrix.png') });

  // -------------------------------------------------------------
  // Screenshot 18: Financials & Budget Invoicing Dashboard
  // -------------------------------------------------------------
  console.log('Capturing: 18_financials_budget_invoicing.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'financials' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '18_financials_budget_invoicing.png') });

  // -------------------------------------------------------------
  // Screenshot 19: Projects Portfolio Dashboard
  // -------------------------------------------------------------
  console.log('Capturing: 19_projects_portfolio_dashboard.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'dashboard' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '19_projects_portfolio_dashboard.png') });

  // -------------------------------------------------------------
  // Screenshot 20: Config View - Working Days & Holiday Calendar
  // -------------------------------------------------------------
  console.log('Capturing: 20_config_general_and_calendar.png');
  await page.evaluate(() => {
    window.useProjectStore.setState({ activeView: 'config' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '20_config_general_and_calendar.png') });

  // -------------------------------------------------------------
  // Screenshot 21: Config View - WBS Categories & Color Defs
  // -------------------------------------------------------------
  console.log('Capturing: 21_config_wbs_categories.png');
  await page.evaluate(() => {
    window.scrollTo({ top: 380, behavior: 'instant' });
  });
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '21_config_wbs_categories.png') });

  // -------------------------------------------------------------
  // Screenshot 22: Config View - Baseline Management & Variance Audit
  // -------------------------------------------------------------
  console.log('Capturing: 22_config_baseline_management.png');
  await page.evaluate(() => {
    window.scrollTo({ top: 760, behavior: 'instant' });
  });
  await sleep(400);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '22_config_baseline_management.png') });

  // Return to top and switch to planner for modals
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    window.useProjectStore.setState({ activeView: 'planner' });
  });
  await sleep(500);

  // -------------------------------------------------------------
  // Screenshot 23: Risk Register & Issues (RIB) Modal
  // -------------------------------------------------------------
  console.log('Capturing: 23_risk_register_rib_modal.png');
  await page.evaluate(() => {
    const btn = document.querySelector('#nav-risks-btn');
    if (btn) btn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '23_risk_register_rib_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 24: Weekly Delivery Executive Status Report Modal
  // -------------------------------------------------------------
  console.log('Capturing: 24_weekly_delivery_report_modal.png');
  await page.evaluate(() => {
    const btn = document.querySelector('#nav-report-btn');
    if (btn) btn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '24_weekly_delivery_report_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 25: Organization Tenant Settings Modal - General Tab
  // -------------------------------------------------------------
  console.log('Capturing: 25_org_settings_general_modal.png');
  await page.evaluate(() => {
    // Open org profile menu
    const profileBtn = document.querySelector('header button[title*="Mohamed Salama"]');
    if (profileBtn) profileBtn.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const orgSettingsBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Organization Settings'));
    if (orgSettingsBtn) orgSettingsBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '25_org_settings_general_modal.png') });

  // -------------------------------------------------------------
  // Screenshot 26: Organization Tenant Settings Modal - Members & Roles Tab
  // -------------------------------------------------------------
  console.log('Capturing: 26_org_settings_members_modal.png');
  await page.evaluate(() => {
    const membersTab = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Members & Roles'));
    if (membersTab) membersTab.click();
  });
  await sleep(500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '26_org_settings_members_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 27: Project Templates Gallery Modal
  // -------------------------------------------------------------
  console.log('Capturing: 27_template_picker_modal.png');
  await page.evaluate(() => {
    const switcher = document.querySelector('#nav-project-switcher button');
    if (switcher) switcher.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const tmplBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Browse Templates'));
    if (tmplBtn) tmplBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '27_template_picker_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 28: Bulk Task Import (Dry-Run) Modal
  // -------------------------------------------------------------
  console.log('Capturing: 28_task_bulk_import_modal.png');
  await page.evaluate(() => {
    const importExportBtn = document.querySelector('button[title*="Import / Export Data"]');
    if (importExportBtn) importExportBtn.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const bulkBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Bulk Task Import'));
    if (bulkBtn) bulkBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '28_task_bulk_import_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 29: Create Blank Project Modal
  // -------------------------------------------------------------
  console.log('Capturing: 29_new_project_creation_modal.png');
  await page.evaluate(() => {
    const switcher = document.querySelector('#nav-project-switcher button');
    if (switcher) switcher.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const newProjBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Create Blank Project'));
    if (newProjBtn) newProjBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '29_new_project_creation_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 30: AI Project Copilot Assistant Drawer
  // -------------------------------------------------------------
  console.log('Capturing: 30_ai_copilot_assistant_drawer.png');
  await page.evaluate(() => {
    const aiBtn = document.querySelector('button[title*="Open AI Project Copilot"]');
    if (aiBtn) aiBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '30_ai_copilot_assistant_drawer.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 31: Command Palette Modal (Ctrl+K / Cmd+K)
  // -------------------------------------------------------------
  console.log('Capturing: 31_command_palette_modal.png');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '31_command_palette_modal.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 32: Notification Center Inbox Drawer
  // -------------------------------------------------------------
  console.log('Capturing: 32_notifications_inbox_drawer.png');
  await page.evaluate(() => {
    const bellBtn = document.querySelector('button[aria-label*="Notification"]') || document.querySelector('button[title*="Notification"]');
    if (bellBtn) bellBtn.click();
  });
  await sleep(600);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '32_notifications_inbox_drawer.png') });
  await page.keyboard.press('Escape');
  await sleep(400);

  // -------------------------------------------------------------
  // Screenshot 33: System Installation & First-Run Setup View (/install)
  // -------------------------------------------------------------
  console.log('Capturing: 33_first_run_install_view.png');
  await page.goto('http://localhost:4173/install', { waitUntil: 'networkidle0' });
  await sleep(800);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '33_first_run_install_view.png') });

  await browser.close();
  console.log('\n==========================================================');
  console.log('ALL 33 SYSTEM SCREENSHOTS CAPTURED SUCCESSFULLY!');
  console.log(`Directory: ${SCREENSHOTS_DIR}`);
  console.log('==========================================================');
}

capture().catch((err) => {
  console.error('Capture failed with error:', err);
  process.exit(1);
});

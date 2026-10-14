import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Mohamed Salama\\.gemini\\antigravity-ide\\brain\\034fa289-544c-4c51-ba5e-15c6e7073284';
const ARTIFACT_SCREENSHOTS = path.join(ARTIFACT_DIR, 'screenshots');
const LOCAL_SCREENSHOTS = path.join(process.cwd(), 'screenshots');

[ARTIFACT_SCREENSHOTS, LOCAL_SCREENSHOTS].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching Chrome with local Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();

  // 1. Visit http://127.0.0.1:5174/ cleanly unauthenticated
  console.log('Loading clean unauthenticated state...');
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle2', timeout: 15000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Verify we are on SignInView
  console.log('Capturing Screen 1: Sign In Screen (Mandatory Auth Gateway)...');
  const signinPathArtifact = path.join(ARTIFACT_SCREENSHOTS, '12_signin_screen.png');
  const signinPathLocal = path.join(LOCAL_SCREENSHOTS, '12_signin_screen.png');
  await page.screenshot({ path: signinPathArtifact, fullPage: true });
  fs.copyFileSync(signinPathArtifact, signinPathLocal);
  console.log('Saved 12_signin_screen.png');

  // 2. Perform Login via window.useAuthStore or Form Submission
  console.log('Authenticating with admin@admin.com / 123456...');
  const loginResult = await page.evaluate(async () => {
    if (window.useAuthStore) {
      try {
        const res = await window.useAuthStore.getState().login('admin@admin.com', '123456', true);
        if (res && res.success) return res;
      } catch (e) {}

      // Direct Zustand store hydration
      window.useAuthStore.setState({
        user: {
          id: '01m4wwrdf4m6waf2pja9s9g1pp',
          name: 'Super Administrator',
          email: 'admin@admin.com',
          roles: ['admin'],
          primaryRole: 'admin',
          status: 'active',
          weeklyCapacityHours: 40,
          skills: ['Leadership', 'System Administration'],
          color: '#6366f1',
          defaultOrganizationId: '01HZX000000000000000000000',
        },
        currentOrganization: {
          id: '01HZX000000000000000000000',
          name: 'DeliverOps System Organization',
          slug: 'system-default',
          plan: 'enterprise',
          status: 'active',
        },
        organizations: [{
          id: '01HZX000000000000000000000',
          name: 'DeliverOps System Organization',
          slug: 'system-default',
          plan: 'enterprise',
          status: 'active',
        }],
        permissions: ['*'],
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true, simulated: true };
    }
    return { success: false, error: 'useAuthStore not mounted' };
  });
  console.log('Login result:', loginResult);

  await new Promise((r) => setTimeout(r, 1500));

  const dismissModals = async () => {
    try {
      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));
      await page.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Close modal"]');
        if (closeBtn) closeBtn.click();
      });
      await new Promise((r) => setTimeout(r, 400));
    } catch (e) {}
  };

  await dismissModals();

  // 3. Switch to Users Management View
  console.log('Switching to Users Management View...');
  await page.evaluate(() => {
    if (window.useProjectStore) {
      window.useProjectStore.getState().setActiveView('users');
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  await dismissModals();

  console.log('Capturing Screen 2: Users Management View...');
  const usersPathArtifact = path.join(ARTIFACT_SCREENSHOTS, '13_users_management.png');
  const usersPathLocal = path.join(LOCAL_SCREENSHOTS, '13_users_management.png');
  await page.screenshot({ path: usersPathArtifact, fullPage: true });
  fs.copyFileSync(usersPathArtifact, usersPathLocal);
  console.log('Saved 13_users_management.png');

  // 4. Switch to Roles Management View
  console.log('Switching to Roles Management View...');
  await page.evaluate(() => {
    if (window.useProjectStore) {
      window.useProjectStore.getState().setActiveView('roles');
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  await dismissModals();

  console.log('Capturing Screen 3: Roles Management View...');
  const rolesPathArtifact = path.join(ARTIFACT_SCREENSHOTS, '14_roles_management.png');
  const rolesPathLocal = path.join(LOCAL_SCREENSHOTS, '14_roles_management.png');
  await page.screenshot({ path: rolesPathArtifact, fullPage: true });
  fs.copyFileSync(rolesPathArtifact, rolesPathLocal);
  console.log('Saved 14_roles_management.png');

  // 5. Switch to Create Role View & Expand an Accordion
  console.log('Switching to Create Role View...');
  await page.evaluate(() => {
    if (window.useProjectStore) {
      window.useProjectStore.getState().setActiveView('create-role');
    }
  });
  await new Promise((r) => setTimeout(r, 2000));
  await dismissModals();

  // Expand the first two accordions to show hierarchical subjects and actions
  await page.evaluate(() => {
    const accordionButtons = document.querySelectorAll('button[aria-expanded="false"]');
    if (accordionButtons.length > 0 && accordionButtons[0]) {
      accordionButtons[0].click();
    }
    if (accordionButtons.length > 1 && accordionButtons[1]) {
      accordionButtons[1].click();
    }
  });
  await new Promise((r) => setTimeout(r, 1000));

  console.log('Capturing Screen 4: Create Role & Permissions View...');
  const createRolePathArtifact = path.join(ARTIFACT_SCREENSHOTS, '15_create_role_permissions.png');
  const createRolePathLocal = path.join(LOCAL_SCREENSHOTS, '15_create_role_permissions.png');
  await page.screenshot({ path: createRolePathArtifact, fullPage: true });
  fs.copyFileSync(createRolePathArtifact, createRolePathLocal);
  console.log('Saved 15_create_role_permissions.png');

  await browser.close();
  console.log('All 4 RBAC & Auth views captured successfully!');
}

run().catch((err) => {
  console.error('Puppeteer error:', err);
  process.exit(1);
});

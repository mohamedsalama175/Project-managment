const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

  console.log('Logging in...');
  await page.evaluate(async () => {
    await window.useAuthStore.getState().login('mohamed.salama@bitwise-solutions.com', '12345678');
  });

  await new Promise(r => setTimeout(r, 1200));

  // If projects is empty or needs loading, trigger project load or fetch
  await page.evaluate(async () => {
    const store = window.useProjectStore.getState();
    if (!store.projects || store.projects.length === 0) {
      // Fetch projects from backend or load active project
      try {
        const res = await fetch('/api/projects', {
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('deliverops_auth_token'),
            'Accept': 'application/json'
          }
        });
        const data = await res.json();
        if (data && data.data && data.data.length > 0) {
          window.useProjectStore.setState({
            projects: data.data,
            activeProjectId: data.data[0].id
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
  });

  await new Promise(r => setTimeout(r, 1200));

  const state = await page.evaluate(() => {
    const pStore = window.useProjectStore.getState();
    return {
      activeProjectId: pStore.activeProjectId,
      projectsCount: pStore.projects?.length,
      firstProject: pStore.projects?.[0]?.name,
      tasksCount: pStore.projects?.[0]?.tasks?.length,
    };
  });

  console.log('State after fetch:', state);
  await page.screenshot({ path: 'scratch/logged_in_populated.png' });
  console.log('Saved scratch/logged_in_populated.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

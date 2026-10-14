const puppeteer = require('puppeteer-core');

async function test() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  console.log('Browser launched successfully!');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  console.log('Navigated to http://localhost:4173! Title:', await page.title());
  await browser.close();
  console.log('Browser closed cleanly.');
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

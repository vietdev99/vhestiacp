const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreHTTPSErrors: true,
    args: [
        '--ignore-certificate-errors',
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--window-size=1366,768'
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  const targetUrl = 'https://192.168.0.125:8083';

  console.log('Navigating to login page...');
  await page.goto(targetUrl + '/login/', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Login
  console.log('Logging in...');
  try {
      await page.waitForSelector('input[name="user"]', { visible: true, timeout: 5000 });
      await page.type('input[name="user"]', 'admin');
      
      await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 });
      await page.type('input[type="password"]', '123123');
      
      const submitSelector = 'input[type="submit"], button[type="submit"]';
      await page.waitForSelector(submitSelector, { visible: true, timeout: 5000 });
      
      await Promise.all([
        page.click(submitSelector),
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Navigation timeout/error ignorable')),
      ]);
  } catch (e) {
      console.error("Login failed:", e);
  }

  console.log('Login successful?');
  
  // Navigate directly to HAProxy if possible to save time, or click through
  // Trying to click 'HAProxy' then 'Visualize' (or 'Stats' if Visualize is a sub-tab)
  
  // Navigate to Server Services list directly
  console.log('Navigating to Server Services list...');
  await page.goto(targetUrl + '/list/server/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Find HAProxy row and look for graph/stats icon
  // Usually in Hestia, there is a graph icon for stats.
  try {
      // Look for a row containing "haproxy" and then a link with a graph icon or class 'fa-area-chart' or similar
      // Or just look for the text "haproxy" and the stats button relative to it?
      // Let's try to just capture the screen if we are here, at least we see the service.
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'present_html/assets/haproxy_service_row.png' });
      
      console.log('Searching for HAProxy visualization link...');
      // Try clicking valid stats/graph buttons.
      // In VHestia/Hestia, stats might be a button "v-open-stats" or similar.
      // Let's try navigating to the stats page directly if we know it?
      // Usually: /list/stats/ or /list/server/?stats=haproxy? 
      // User said "Visualize". Use xpath to find icon?
      
      const [statsLink] = await page.$x("//div[contains(., 'haproxy')]//a[contains(@class, 'stats') or contains(@class, 'graph') or contains(@href, 'stats')]");
      
      if (statsLink) {
          await Promise.all([
             statsLink.click(),
             page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 })
          ]);
          await new Promise(r => setTimeout(r, 3000)); // Wait for graph render
          await page.screenshot({ path: 'present_html/assets/haproxy_visualize.png' });
          console.log('Captured haproxy_visualize.png from icon click');
      } else {
           console.log('Specific stats icon not found. Trying direct URL to /list/stats/');
           // Fallback
           await page.goto(targetUrl + '/list/stats/', { waitUntil: 'domcontentloaded' });
            await new Promise(r => setTimeout(r, 3000));
           await page.screenshot({ path: 'present_html/assets/haproxy_visualize_fallback.png' });
      }

  } catch (e) {
      console.error("Error in HAProxy steps:", e);
  }

  console.log('Done.');
  await browser.close();
})();

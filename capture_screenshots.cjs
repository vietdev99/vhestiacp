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
      await page.screenshot({ path: 'present_html/assets/login_error.png' });
  }

  console.log('Login successful? Capturing dashboard...');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'present_html/assets/dashboard.png', fullPage: false });
  
  const title = await page.title();
  const content = await page.content();
  console.log(`Page Title: ${title}`);
  console.log(`Page Content Preview: ${content.substring(0, 500)}...`);

  // Function to click and capture
  const clickAndCapture = async (text, filename) => {
      try {
          console.log(`Navigating to ${text}...`);
          // Try to reset to dashboard first to ensure consistent state/selectors? 
          // Actually, tabs are usually always visible.
          // page.$x removed in newer puppeteer, use waitForSelector with xpath prefix or evaluate
          let link;
          try {
             // Try standard selector first if it's simple text 
             // Puppeteer text selector
             link = await page.waitForSelector(`::-p-text(${text})`, { timeout: 5000 });
          } catch(e) {
             console.log(`Text selector failed for ${text}, trying xpath evaluation...`);
             const links = await page.$$('a');
             for (const l of links) {
                 const t = await l.evaluate(el => el.textContent);
                 if (t && t.includes(text)) {
                     link = l;
                     break;
                 }
             }
          }
          
          if (link) {
              await Promise.all([
                  page.evaluate(el => el.click(), link), // Bypass visibility check/overlays
                  page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => console.log('Nav wait timeout (ignorable if SPA)'))
              ]);
              await new Promise(r => setTimeout(r, 2000)); // Wait for render
              await page.screenshot({ path: `present_html/assets/${filename}.png` });
              console.log(`Captured ${filename}`);
          } else {
              console.log(`Link '${text}' not found. Available links:`);
              // Debug: print top level links
              const linkTexts = await page.$$eval('a', as => as.map(a => a.textContent.trim()).filter(t => t.length > 2 && t.length < 20).slice(0, 20));
              console.log(linkTexts.join(', '));
          }
      } catch (e) {
          console.error(`Error capturing ${text}:`, e);
      }
  };

  // Capture Tabs (Navigation)
  await clickAndCapture('Server', 'service_list'); 

  // Based on logs, we see HAProxy is available directly or under Configure?
  // Log showed: "Configure... HAProxy"
  await clickAndCapture('HAProxy', 'tab_haproxy');

  // User specifically requested the "Visualize" view for HAProxy.
  // It is likely a sub-link inside the HAProxy page.
  await clickAndCapture('Visualize', 'haproxy_visualize');
  // Fallback if it's named "Stats" or "Graph"
  if (!fs.existsSync('present_html/assets/haproxy_visualize.png')) {
       await clickAndCapture('Stats', 'haproxy_stats');
  }

  // Node/Python are likely under WEB or their specific domains.
  // Let's try to capture 'WEB' to show the list which might indicate Node apps.
  // Or look for "Add Web Domain" if strictly testing.
  // But for presentation, let's capture the main lists.
  await clickAndCapture('WEB', 'tab_node'); // Mapping WEB to Node slide for now, or use the real name if found
  await clickAndCapture('DB', 'tab_mongo'); // Mapping DB to Mongo slide
  
  // Also found "Configure" which might have the integrations
  await clickAndCapture('Configure', 'configure_page');

  console.log('Done.');
  await browser.close();
})();

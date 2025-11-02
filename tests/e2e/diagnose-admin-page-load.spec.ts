import { test, expect } from '@playwright/test';

test.describe('Admin Page Load Performance Diagnosis', () => {
  test('measure admin page load time and identify bottlenecks', async ({ page }) => {
    // Set console message listener to catch any errors
    const consoleMessages: string[] = [];
    const errorMessages: string[] = [];
    
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });

    // Record network requests
    const networkRequests: Array<{
      url: string;
      method: string;
      status?: number;
      duration?: number;
    }> = [];

    page.on('response', async (response) => {
      const request = response.request();
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
      });
    });

    // Measure navigation time
    console.log('🚀 Starting navigation to /admin...');
    const startTime = Date.now();
    
    try {
      const navigationPromise = page.goto('http://localhost:3000/admin', {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      const response = await navigationPromise;
      const navigationTime = Date.now() - startTime;
      
      console.log(`⏱️ Navigation time: ${navigationTime}ms`);
      console.log(`📊 HTTP Status: ${response?.status()}`);
      
      // Wait a bit for any additional loading
      await page.waitForTimeout(2000);
      
      // Check for redirects (auth issues)
      const currentUrl = page.url();
      console.log(`📍 Current URL: ${currentUrl}`);
      
      // Collect performance metrics
      const metrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as any;
        return {
          domContentLoaded: perfData?.domContentLoadedEventEnd - perfData?.domContentLoadedEventStart,
          loadComplete: perfData?.loadEventEnd - perfData?.loadEventStart,
          domInteractive: perfData?.domInteractive - perfData?.fetchStart,
          resourcesCount: performance.getEntriesByType('resource').length,
        };
      });
      
      console.log('\n📈 Performance Metrics:');
      console.log(`   DOM Content Loaded: ${metrics.domContentLoaded}ms`);
      console.log(`   Load Complete: ${metrics.loadComplete}ms`);
      console.log(`   DOM Interactive: ${metrics.domInteractive}ms`);
      console.log(`   Total Resources: ${metrics.resourcesCount}`);
      
      // List slow network requests
      console.log('\n🐢 Slowest Network Requests:');
      const slowRequests = networkRequests
        .filter(r => r.url.includes('localhost'))
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 10);
      
      slowRequests.forEach((req, idx) => {
        console.log(`   ${idx + 1}. ${req.method} ${req.url}`);
        console.log(`      Status: ${req.status}`);
      });
      
      // Check API calls
      console.log('\n🔗 API Calls Made:');
      const apiCalls = networkRequests.filter(r => r.url.includes('/api/'));
      apiCalls.forEach((call) => {
        console.log(`   ${call.method} ${call.url} -> ${call.status}`);
      });
      
      // Console errors
      if (errorMessages.length > 0) {
        console.log('\n❌ Console Errors:');
        errorMessages.forEach(err => {
          console.log(`   - ${err}`);
        });
      }
      
      // Check page content
      const pageTitle = await page.title();
      const hasAdminContent = await page.locator('[data-testid="admin-dashboard"], .admin-container, [class*="admin"]').count();
      
      console.log(`\n📄 Page Title: ${pageTitle}`);
      console.log(`   Admin elements found: ${hasAdminContent}`);
      
      // Take screenshot
      await page.screenshot({ path: 'admin-page-diagnosis.png' });
      console.log('\n📸 Screenshot saved as admin-page-diagnosis.png');
      
    } catch (error) {
      console.error(`❌ Error navigating to admin page: ${error}`);
      throw error;
    }
  });
});
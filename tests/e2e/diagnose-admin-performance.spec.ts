import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard Performance Analysis', () => {
  // Helper to login as admin
  async function loginAsAdmin(page) {
    // Try to login with a test admin account
    // First, let's check what auth method is used
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Look for email input and try to login
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      // Try with test admin credentials
      await emailInput.fill('admin@example.com');
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    }
  }

  test('measure admin dashboard data fetching performance', async ({ page }) => {
    // Record all API calls and their timings
    const apiMetrics: Array<{
      url: string;
      method: string;
      startTime: number;
      endTime?: number;
      duration?: number;
      status?: number;
    }> = [];

    const requestStartTimes = new Map();

    // Track request start
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        requestStartTimes.set(url, Date.now());
      }
    });

    // Track request completion
    page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();
      
      if (url.includes('/api/')) {
        const startTime = requestStartTimes.get(url);
        const duration = startTime ? Date.now() - startTime : 0;
        
        apiMetrics.push({
          url,
          method: request.method(),
          startTime,
          endTime: Date.now(),
          duration,
          status: response.status(),
        });
      }
    });

    // Check if we're already logged in by checking cookies or local storage
    await page.goto('http://localhost:3000/admin');
    const initialUrl = page.url();
    
    console.log(`📍 Initial URL: ${initialUrl}`);

    // If redirected to home or login, we need to login first
    if (initialUrl.includes('/') && !initialUrl.includes('/admin')) {
      console.log('🔐 Not logged in as admin, attempting login...');
      
      // Navigate to login
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // For testing purposes, we'll check what's on the page
      const pageContent = await page.content();
      console.log('📄 Login page loaded');
      
      // Try to extract test credentials info from page or use default test account
      // If the app uses OTP/email verification:
      const emailInput = page.locator('input[type="email"], input[placeholder*="mail" i]');
      if (await emailInput.count() > 0) {
        console.log('📧 Found email input, filling with test admin email...');
        await emailInput.first().fill('admin@test.com');
        
        // Look for submit button
        const submitBtn = page.locator('button:has-text("Send"), button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Try to get the page back to admin
      await page.goto('http://localhost:3000/admin');
    }

    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    const finalUrl = page.url();
    
    console.log(`✅ Final URL: ${finalUrl}`);
    console.log(`📊 Admin page ${finalUrl.includes('/admin') ? 'LOADED' : 'FAILED'}`);

    // Collect performance data
    const performanceData = await page.evaluate(() => {
      const navTiming = performance.getEntriesByType('navigation')[0] as any;
      const resources = performance.getEntriesByType('resource');
      
      return {
        navigationStart: navTiming?.fetchStart || 0,
        domContentLoaded: navTiming?.domContentLoadedEventEnd - navTiming?.domContentLoadedEventStart,
        loadComplete: navTiming?.loadEventEnd - navTiming?.loadEventStart,
        domInteractive: navTiming?.domInteractive - navTiming?.fetchStart,
        resourceCount: resources.length,
        slowestResources: resources
          .sort((a: any, b: any) => (b.duration || 0) - (a.duration || 0))
          .slice(0, 10)
          .map((r: any) => ({
            name: r.name.split('/').pop(),
            duration: Math.round(r.duration),
            transferSize: (r as any).transferSize,
          })),
      };
    });

    console.log('\n⏱️ Performance Metrics:');
    console.log(`   DOM Content Loaded: ${performanceData.domContentLoaded}ms`);
    console.log(`   Load Complete: ${performanceData.loadComplete}ms`);
    console.log(`   DOM Interactive: ${performanceData.domInteractive}ms`);
    console.log(`   Total Resources: ${performanceData.resourceCount}`);

    // Show slowest resources
    console.log('\n🐢 Slowest Resources:');
    performanceData.slowestResources.forEach((res, idx) => {
      console.log(`   ${idx + 1}. ${res.name}: ${res.duration}ms (${res.transferSize || 'N/A'} bytes)`);
    });

    // Show API calls
    console.log('\n📡 API Calls:');
    const sortedApiCalls = apiMetrics
      .filter(m => m.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0));

    if (sortedApiCalls.length === 0) {
      console.log('   No API calls made');
    } else {
      sortedApiCalls.forEach((call, idx) => {
        const endpoint = call.url.split('/api/')[1] || call.url;
        console.log(`   ${idx + 1}. ${call.method} /${endpoint}`);
        console.log(`      Duration: ${call.duration}ms | Status: ${call.status}`);
      });
    }

    // Check what's rendered on the page
    console.log('\n🎨 Rendered Content:');
    const hasCharts = await page.locator('svg').count();
    const hasStats = await page.locator('[class*="stat"], [class*="card"]').count();
    const hasOrderTable = await page.locator('table, [class*="order"]').count();
    
    console.log(`   Chart SVG elements: ${hasCharts}`);
    console.log(`   Stats/Card elements: ${hasStats}`);
    console.log(`   Order-related elements: ${hasOrderTable}`);

    // Check for loading indicators
    const hasSpinner = await page.locator('[class*="spinner"], [class*="loading"]').count();
    console.log(`   Loading indicators: ${hasSpinner}`);

    // Summary
    console.log('\n📋 Summary:');
    const totalApiTime = sortedApiCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    console.log(`   Total API call time: ${totalApiTime}ms`);
    console.log(`   API calls count: ${sortedApiCalls.length}`);
    
    const totalLoadTime = Math.max(
      performanceData.domContentLoaded || 0,
      performanceData.loadComplete || 0,
      performanceData.domInteractive || 0
    );
    console.log(`   Total load time: ${totalLoadTime}ms`);

    // Take screenshot
    await page.screenshot({ 
      path: 'admin-dashboard-performance.png',
      fullPage: true 
    });
    console.log('\n📸 Full page screenshot saved');
  });

  test('check API response times separately', async ({ page }) => {
    // This test focuses on the API endpoints directly
    console.log('\n🔍 Testing API Endpoints Directly:');

    // Test stats endpoint with different filters
    const statsTests = [
      { filter: 'today', url: '/api/admin/stats?filter=today&lang=en' },
      { filter: 'all', url: '/api/admin/stats?filter=all&lang=en' },
    ];

    for (const test of statsTests) {
      console.log(`\n📊 Testing ${test.filter} stats...`);
      const startTime = Date.now();
      const response = await page.request.get(`http://localhost:3000${test.url}`);
      const duration = Date.now() - startTime;
      
      console.log(`   Status: ${response.status()}`);
      console.log(`   Duration: ${duration}ms`);
      
      if (response.ok()) {
        const data = await response.json();
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
        if (data.productStats) {
          console.log(`   Product stats items: ${data.productStats.length}`);
        }
      }
    }

    // Test orders endpoint
    console.log(`\n📋 Testing orders endpoint...`);
    const ordersStart = Date.now();
    const ordersResponse = await page.request.get('http://localhost:3000/api/admin/orders?limit=10');
    const ordersDuration = Date.now() - ordersStart;
    
    console.log(`   Status: ${ordersResponse.status()}`);
    console.log(`   Duration: ${ordersDuration}ms`);
    
    if (ordersResponse.ok()) {
      const data = await ordersResponse.json();
      console.log(`   Orders returned: ${data.orders?.length || 0}`);
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
    }
  });
});
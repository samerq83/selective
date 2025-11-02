import { test, expect } from '@playwright/test';

test('check server error logs', async ({ page, request }) => {
  console.log('\n🔍 Checking API endpoints without authentication...\n');

  // Test admin stats
  console.log('📊 Testing /api/admin/stats...');
  const statsRes = await request.get('http://localhost:3000/api/admin/stats?filter=today&lang=en');
  console.log(`   Status: ${statsRes.status()}`);
  if (!statsRes.ok()) {
    const text = await statsRes.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
  }

  // Test admin orders
  console.log('\n📋 Testing /api/admin/orders...');
  const ordersRes = await request.get('http://localhost:3000/api/admin/orders?limit=10');
  console.log(`   Status: ${ordersRes.status()}`);
  if (!ordersRes.ok()) {
    const text = await ordersRes.text();
    console.log(`   Response: ${text.substring(0, 200)}`);
  }

  // Now test with valid auth
  console.log('\n🔐 Navigating to admin page...');
  await page.goto('http://localhost:3000/admin');
  await page.waitForTimeout(3000);
  
  // Check if redirected
  const url = page.url();
  console.log(`   Final URL: ${url}`);
  
  // Check for error messages in page
  const errorElements = await page.locator('[class*="error"], [role="alert"]').count();
  console.log(`   Error elements on page: ${errorElements}`);
  
  // Check console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'log') {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  
  await page.waitForTimeout(2000);
  
  if (consoleMessages.length > 0) {
    console.log('\n📝 Console messages:');
    consoleMessages.slice(0, 10).forEach(msg => {
      console.log(`   ${msg}`);
    });
  }
});
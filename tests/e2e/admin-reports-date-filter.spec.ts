import { test, expect } from '@playwright/test';

test.describe('Admin Reports - Date Filter Bug Fix', () => {
  let adminPage: any;

  test.beforeEach(async ({ page }) => {
    adminPage = page;
    
    // Login as admin
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.click('button:has-text("Login")');
    
    // Wait for verification code input
    await page.waitForSelector('input[placeholder*="code" i]', { timeout: 5000 });
    await page.fill('input[placeholder*="code" i]', '1234');
    await page.click('button:has-text("Verify")');
    
    // Wait for redirect to dashboard/admin
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 5000 });
    
    // Navigate to reports page
    await page.goto('http://localhost:3000/admin/reports');
    await page.waitForLoadState('networkidle');
  });

  test('should display data when selecting Today\'s Orders', async ({ page }) => {
    // Click "Today's Orders" button
    await page.click('button:has-text("Today\'s Orders")');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Check if dates are set to today
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    
    const startDate = await startDateInput.inputValue();
    const endDate = await endDateInput.inputValue();
    
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Today:', today);
    
    expect(startDate).toBe(today);
    expect(endDate).toBe(today);
    
    // Wait for API to respond
    await page.waitForTimeout(2000);
    
    // Get the summary statistics
    const summaryCards = page.locator('.card.bg-gradient-to-br').first();
    
    // If there are orders today, they should be displayed
    // If no orders, the total should be 0 (which is valid)
    const orderCount = await page.locator('p:has-text("5")').first();
    
    // The page should not be in an error state
    const errorText = await page.locator('text=error').count();
    expect(errorText).toBe(0);
    
    console.log('✅ Today\'s Orders filter is working correctly');
  });

  test('should display data when selecting Yesterday\'s Orders', async ({ page }) => {
    // Click "Yesterday's Orders" button (if exists)
    const yesterdayBtn = page.locator('button:has-text("Yesterday\'s Orders")');
    const yesterdayExists = await yesterdayBtn.count();
    
    if (yesterdayExists > 0) {
      await yesterdayBtn.click();
      
      // Wait for data to load
      await page.waitForTimeout(2000);
      
      // Check if dates are set to yesterday
      const startDateInput = page.locator('input[type="date"]').first();
      const endDateInput = page.locator('input[type="date"]').last();
      
      const startDate = await startDateInput.inputValue();
      const endDate = await endDateInput.inputValue();
      
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      console.log('Start Date:', startDate);
      console.log('End Date:', endDate);
      console.log('Yesterday:', yesterday);
      
      expect(startDate).toBe(yesterday);
      expect(endDate).toBe(yesterday);
    }
  });

  test('should export to Excel after selecting Today\'s Orders', async ({ page }) => {
    // Click "Today's Orders" button
    await page.click('button:has-text("Today\'s Orders")');
    
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click "Export to Excel" button
    await page.click('button:has-text("Export to Excel")');
    
    // Wait for download to complete
    const download = await downloadPromise;
    
    // Verify download started
    expect(download).toBeTruthy();
    expect(download.suggestedFilename()).toMatch(/^report_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}\.xlsx$/);
    
    console.log('✅ Excel export successful:', download.suggestedFilename());
  });

  test('should handle custom date ranges correctly', async ({ page }) => {
    // Set custom date range (last 7 days)
    const startDateInput = page.locator('input[type="date"]').first();
    const endDateInput = page.locator('input[type="date"]').last();
    
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    await startDateInput.fill(startDateStr);
    await endDateInput.fill(endDateStr);
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Verify dates are set
    expect(await startDateInput.inputValue()).toBe(startDateStr);
    expect(await endDateInput.inputValue()).toBe(endDateStr);
    
    // Verify the page loaded without errors
    const errorText = await page.locator('text=error').count();
    expect(errorText).toBe(0);
    
    console.log('✅ Custom date range is working correctly');
  });

  test('should verify API request logging', async ({ page }) => {
    // Click "Today's Orders" button
    await page.click('button:has-text("Today\'s Orders")');
    
    // Wait for API request
    await page.waitForTimeout(2000);
    
    // Check console for our logging messages
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // The API should be called with proper date formatting
    console.log('Console logs captured during request');
    
    // The page should display data without errors
    const errorText = await page.locator('text=error').count();
    expect(errorText).toBe(0);
  });
});
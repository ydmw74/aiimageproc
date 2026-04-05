import { test, expect } from '@playwright/test';

test.describe('AI ImageProc App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (in dev mode)
    await page.goto('http://localhost:5173');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle(/AI ImageProc/);
  });

  test('should display canvas editor', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should display control panel tabs', async ({ page }) => {
    const tabs = page.locator('.tabs');
    await expect(tabs).toBeVisible();
    
    // Check for tab buttons
    const promptTab = page.getByText('Prompt');
    const settingsTab = page.getByText('Settings');
    const filtersTab = page.getByText('Filters');
    const usageTab = page.getByText('Usage');
    
    await expect(promptTab).toBeVisible();
    await expect(settingsTab).toBeVisible();
    await expect(filtersTab).toBeVisible();
    await expect(usageTab).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Click on Settings tab
    await page.getByText('Settings').click();
    
    // Check if provider selector is visible
    const providerSelect = page.locator('select').first();
    await expect(providerSelect).toBeVisible();
    
    // Click on Filters tab
    await page.getByText('Filters').click();
    
    // Check if brightness slider is visible
    const brightnessLabel = page.getByText('Brightness');
    await expect(brightnessLabel).toBeVisible();
  });

  test('should display before/after slider placeholder', async ({ page }) => {
    const beforeAfterSection = page.locator('text=Load an image');
    await expect(beforeAfterSection).toBeVisible();
  });

  test('should display toolbar buttons', async ({ page }) => {
    const openButton = page.getByText('Open');
    const saveButton = page.getByText('Save');
    
    await expect(openButton).toBeVisible();
    await expect(saveButton).toBeVisible();
  });
});

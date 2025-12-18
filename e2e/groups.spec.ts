import { test, expect } from '@playwright/test';
import { login, register } from './helpers/auth';
import { generateTestUser, generateTestGroup } from './helpers/data';

test.describe('Group Management', () => {
  let user: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    user = generateTestUser();
    await register(page, user.username, user.displayName, user.password);
  });

  test('should create a new group', async ({ page }) => {
    const group = generateTestGroup();
    
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Group Name" i]', group.name);
    await page.fill('textarea[placeholder*="Description" i]', group.description);
    await page.click('button:has-text("Create Group")');
    
    await expect(page.locator(`text=${group.name}`)).toBeVisible();
  });

  test('should view group list', async ({ page }) => {
    const group = generateTestGroup();
    
    // Create a group
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Group Name" i]', group.name);
    await page.click('button:has-text("Create Group")');
    
    // Should see the group in the list
    await expect(page.locator(`text=${group.name}`)).toBeVisible();
  });

  test('should navigate to group details', async ({ page }) => {
    const group = generateTestGroup();
    
    // Create a group
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Group Name" i]', group.name);
    await page.click('button:has-text("Create Group")');
    
    // Click on the group
    await page.click(`text=${group.name}`);
    
    // Should see group details
    await expect(page.locator(`h1:has-text("${group.name}")`)).toBeVisible();
  });
});


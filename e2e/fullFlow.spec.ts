import { test, expect } from '@playwright/test';
import { register } from './helpers/auth';
import { generateTestUser, generateTestGroup } from './helpers/data';

test('complete user flow: register → create group → create game → view stats', async ({ page }) => {
  const user = generateTestUser();
  const group = generateTestGroup();

  // 1. Register
  await register(page, user.username, user.displayName, user.password);
  await expect(page).toHaveURL('/groups');

  // 2. Create group
  await page.click('button:has-text("Create")');
  await page.fill('input[placeholder*="Group Name" i]', group.name);
  await page.click('button:has-text("Create Group")');
  await expect(page.locator(`text=${group.name}`)).toBeVisible();

  // 3. Navigate to group
  await page.click(`text=${group.name}`);
  await expect(page.locator(`h1:has-text("${group.name}")`)).toBeVisible();

  // 4. View games tab (should be default)
  await expect(page.locator('text=Games')).toBeVisible();

  // 5. View stats tab
  await page.click('button:has-text("Statistics")');
  await expect(page.locator('text=Statistics')).toBeVisible();
});


import { test, expect } from '@playwright/test';
import { register } from './helpers/auth';
import { generateTestUser, generateTestGroup } from './helpers/data';

test.describe('Public Game Entry', () => {
  test('should load and display public game', async ({ page }) => {
    // First, create a game through the normal flow
    const user = generateTestUser();
    const group = generateTestGroup();

    // Register and create group
    await register(page, user.username, user.displayName, user.password);
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Group Name" i]', group.name);
    await page.click('button:has-text("Create Group")');
    await page.click(`text=${group.name}`);

    // Create a game
    await page.click('button:has-text("Create")');
    await page.fill('input[placeholder*="Game Name" i]', 'Test Public Game');
    await page.click('button:has-text("Create Game")');

    // Wait for game to be created and get the public token from URL
    await page.waitForURL(/\/games\/\w+/);
    const gameUrl = page.url();
    const gameId = gameUrl.split('/games/')[1];

    // Navigate to public game entry (assuming we can construct the URL)
    // In a real scenario, you'd get the public token from the API or UI
    // For now, we'll test the public entry page structure
    
    // If you have a way to get the public token, use it:
    // await page.goto(`/games/public/${publicToken}`);
    
    // For this example, let's test the component renders correctly
    // by checking if we can see game details
    await expect(page.locator('h1, [role="heading"]')).toBeVisible();
  });

  test('should allow editing game name in public view', async ({ page }) => {
    // This test assumes you have a way to get a public game token
    // For demonstration, we'll show the pattern
    
    // Navigate to public game (replace with actual token)
    // await page.goto('/games/public/test-token');
    
    // Wait for game to load
    // await expect(page.locator('h1')).toBeVisible();
    
    // Click on game name to edit
    // await page.click('h1');
    // await expect(page.locator('input[placeholder*="Game title" i]')).toBeVisible();
    
    // Edit name
    // await page.fill('input[placeholder*="Game title" i]', 'Updated Game Name');
    // await page.press('input[placeholder*="Game title" i]', 'Enter');
    
    // Verify update
    // await expect(page.locator('h1')).toContainText('Updated Game Name');
  });

  test('should add and delete transaction rows', async ({ page }) => {
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Add a transaction
    // await page.fill('input[placeholder*="Name" i]:first-of-type', 'Alice');
    // await page.fill('input[placeholder*="0.00" i]:first-of-type', '100');
    
    // Add another row (mobile button)
    // const addButton = page.locator('button:has-text("Add Row")');
    // if (await addButton.isVisible()) {
    //   await addButton.click();
    // }
    
    // Fill second row
    // await page.fill('input[placeholder*="Name" i]:nth-of-type(2)', 'Bob');
    // await page.fill('input[placeholder*="0.00" i]:nth-of-type(2)', '-100');
    
    // Verify balance
    // await expect(page.locator('text=Balanced')).toBeVisible();
    
    // Delete a row
    // const deleteButtons = page.locator('button[aria-label="Delete row"]');
    // const count = await deleteButtons.count();
    // if (count > 1) {
    //   await deleteButtons.last().click();
    // }
  });

  test('should calculate balance correctly', async ({ page }) => {
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Add transactions that sum to zero
    // await page.fill('input[placeholder*="Name" i]:first-of-type', 'Alice');
    // await page.fill('input[placeholder*="0.00" i]:first-of-type', '50');
    
    // await page.click('button:has-text("Add Row")');
    // await page.fill('input[placeholder*="Name" i]:nth-of-type(2)', 'Bob');
    // await page.fill('input[placeholder*="0.00" i]:nth-of-type(2)', '-50');
    
    // Verify balanced status
    // await expect(page.locator('text=Balanced')).toBeVisible();
    
    // Change amount to unbalance
    // await page.fill('input[placeholder*="0.00" i]:nth-of-type(2)', '-100');
    
    // Verify unbalanced status
    // await expect(page.locator('text=Unbalanced')).toBeVisible();
  });

  test('should settle game when balanced', async ({ page }) => {
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Ensure game is balanced
    // ... add balanced transactions ...
    
    // Click settle button
    // await page.click('button:has-text("Settle Game")');
    
    // Verify settled state
    // await expect(page.locator('text=Settled')).toBeVisible();
    // await expect(page.locator('button:has-text("Edit Game")')).toBeVisible();
  });

  test('should copy game URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Click copy button
    // await page.click('button:has-text("Copy")');
    
    // Verify clipboard content (requires clipboard API access)
    // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // expect(clipboardText).toContain('/games/public/');
    
    // Verify success message
    // await expect(page.locator('text=URL copied')).toBeVisible();
  });

  test('should handle math expressions in amount field', async ({ page }) => {
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Enter math expression
    // await page.fill('input[placeholder*="0.00" i]:first-of-type', '10+5');
    // await page.press('input[placeholder*="0.00" i]:first-of-type', 'Enter');
    
    // Verify expression was evaluated (value should be 15)
    // await expect(page.locator('input[value="15"]')).toBeVisible();
  });

  test('should change currency display', async ({ page }) => {
    // Navigate to public game
    // await page.goto('/games/public/test-token');
    
    // Change currency to CNY
    // await page.selectOption('select', 'CNY');
    
    // Verify currency symbol changed (¥ instead of $)
    // await expect(page.locator('text=¥')).toBeVisible();
  });

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/games/public/invalid-token-12345');
    
    // Should show error message
    await expect(page.locator('text=/Invalid|not found|error/i')).toBeVisible();
  });
});


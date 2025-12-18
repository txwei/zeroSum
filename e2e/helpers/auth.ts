import { Page } from '@playwright/test';

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.fill('input[placeholder*="Username" i]', username);
  await page.fill('input[placeholder*="Password" i]', password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('/groups');
}

export async function register(page: Page, username: string, displayName: string, password: string) {
  await page.goto('/signup');
  await page.fill('input[placeholder*="Username" i]', username);
  await page.fill('input[placeholder*="Display Name" i]', displayName);
  await page.fill('input[placeholder*="Password" i]', password);
  await page.click('button:has-text("Sign up")');
  await page.waitForURL('/groups');
}


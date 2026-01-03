# UI Testing Guide: Industry Standards & Best Practices

This guide covers industry-standard approaches to testing UI components, from unit tests to E2E tests, including AI-assisted testing tools.

## Testing Pyramid

The industry follows a **testing pyramid** approach:

```
        /\
       /E2E\        ← Few, slow, expensive (full user flows)
      /------\
     /Integration\  ← Some, medium speed (component interactions)
    /------------\
   /   Unit Tests  \ ← Many, fast, cheap (isolated components)
  /------------------\
```

### 1. Unit/Component Tests (Jest + React Testing Library)

**What to test:**
- Component rendering
- User interactions (clicks, typing, form submissions)
- State changes
- Conditional rendering
- Edge cases and error states

**When to use:**
- Testing individual components in isolation
- Fast feedback during development
- Testing business logic and calculations
- Testing accessibility (ARIA labels, roles)

**Example:** See `web/src/__tests__/pages/PublicGameEntry.test.tsx`

**Best Practices:**
- Test user behavior, not implementation details
- Use `screen.getByRole()` and `screen.getByLabelText()` for accessibility
- Mock external dependencies (API, WebSockets, etc.)
- Use `waitFor()` for async operations
- Keep tests focused and independent

## 2. Integration Tests

**What to test:**
- Multiple components working together
- Context providers and hooks
- API integration (with mocks)
- Routing and navigation

**When to use:**
- Testing component interactions
- Testing data flow through the app
- Testing context providers

**Example:** See `web/src/__tests__/integration/gameFlow.test.tsx`

## 3. End-to-End (E2E) Tests (Playwright)

**What to test:**
- Complete user workflows
- Real browser interactions
- Network requests and responses
- Cross-browser compatibility
- Visual regression

**When to use:**
- Testing critical user paths
- Pre-deployment validation
- Regression testing
- Testing real API integration

**Example:** See `e2e/fullFlow.spec.ts`

**Best Practices:**
- Test happy paths and critical flows
- Use page object models for maintainability
- Keep tests independent and idempotent
- Use data-testid sparingly (prefer semantic selectors)

## 4. Visual Regression Testing

**Tools:**
- **Playwright** (built-in screenshot comparison)
- **Percy** (cloud-based visual testing)
- **Chromatic** (for Storybook components)

**When to use:**
- Catching unintended visual changes
- Testing responsive design
- Testing across browsers

## AI-Assisted Testing Tools

### 1. **Playwright Codegen** (Recommended)
Generate tests by recording your actions:

```bash
npx playwright codegen http://localhost:3000
```

This opens a browser where you interact with your app, and Playwright generates test code automatically.

### 2. **Cursor AI Testing Features**
- Ask Cursor to generate tests: "Write tests for PublicGameEntry component"
- Use AI to fix flaky tests
- Generate test data and mocks

### 3. **GitHub Copilot / Cursor Composer**
- Auto-complete test code
- Generate test cases from component code
- Suggest edge cases to test

### 4. **Test.ai / TestCraft** (Commercial)
- AI-powered test generation
- Self-healing tests
- Natural language test creation

## Testing Your PublicGameEntry Component

### Unit Tests (Already Created)
See `web/src/__tests__/pages/PublicGameEntry.test.tsx` for comprehensive unit tests covering:
- Loading and error states
- Game display
- Name/date editing
- Transaction management
- WebSocket integration
- Settle game functionality

### E2E Test Example

Create `e2e/publicGameEntry.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('complete public game entry flow', async ({ page }) => {
  // 1. Navigate to public game
  await page.goto('/games/public/test-token');
  
  // 2. Wait for game to load
  await expect(page.locator('h1')).toContainText('Test Game');
  
  // 3. Edit game name
  await page.click('h1');
  await page.fill('input[placeholder="Game title"]', 'Updated Name');
  await page.press('input[placeholder="Game title"]', 'Enter');
  
  // 4. Add transaction
  await page.fill('input[placeholder*="Name"]', 'Alice');
  await page.fill('input[placeholder*="0.00"]', '100');
  
  // 5. Verify balance updates
  await expect(page.locator('text=Unbalanced')).toBeVisible();
  
  // 6. Add balancing transaction
  await page.click('button:has-text("Add Row")');
  await page.fill('input[placeholder*="Name"]:nth-of-type(2)', 'Bob');
  await page.fill('input[placeholder*="0.00"]:nth-of-type(2)', '-100');
  
  // 7. Verify balanced
  await expect(page.locator('text=Balanced')).toBeVisible();
  
  // 8. Settle game
  await page.click('button:has-text("Settle Game")');
  await expect(page.locator('text=Settled')).toBeVisible();
});
```

## Running Tests

### Unit Tests
```bash
cd web
npm test                    # Run once
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### E2E Tests
```bash
npx playwright test         # Run all E2E tests
npx playwright test --ui   # Interactive UI mode
npx playwright test --debug # Debug mode
npx playwright codegen      # Generate tests by recording
```

## Test Coverage Goals

Industry standards:
- **Unit tests:** 70-80% code coverage
- **E2E tests:** Cover all critical user paths
- **Integration tests:** Cover major feature flows

## Common Testing Patterns

### 1. Mocking API Calls
```typescript
jest.mock('../../api/client');
(apiClient.get as jest.Mock).mockResolvedValue({ data: mockData });
```

### 2. Mocking WebSockets
```typescript
jest.mock('socket.io-client');
const mockSocket = { on: jest.fn(), emit: jest.fn(), disconnect: jest.fn() };
(io as jest.Mock).mockReturnValue(mockSocket);
```

### 3. Testing Async Operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### 4. Testing User Interactions
```typescript
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
await user.keyboard('{Enter}');
```

## Debugging Tests

### Jest
```bash
npm test -- --verbose      # More output
npm test -- --no-coverage  # Faster runs
```

### Playwright
```bash
npx playwright test --debug              # Step through test
npx playwright show-report              # View HTML report
npx playwright test --headed            # See browser
```

## CI/CD Integration

Add to your CI pipeline:
```yaml
# .github/workflows/test.yml
- name: Run unit tests
  run: cd web && npm test

- name: Run E2E tests
  run: npx playwright test
```

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev)
- [Jest Docs](https://jestjs.io)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Next Steps

1. ✅ Unit tests for PublicGameEntry (created)
2. ⬜ E2E test for public game entry flow
3. ⬜ Visual regression tests for critical pages
4. ⬜ Add test coverage reporting to CI
5. ⬜ Set up Playwright Codegen for generating more E2E tests


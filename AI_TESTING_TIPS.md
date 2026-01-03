# AI-Assisted Testing Tips

## Using Cursor AI to Generate Tests

### 1. Generate Tests from Component Code

**Prompt examples:**
```
"Write comprehensive unit tests for PublicGameEntry component using React Testing Library"
"Create E2E tests for the game entry flow using Playwright"
"Generate test cases for edge cases in the transaction input component"
```

### 2. Fix Flaky Tests

**Prompt examples:**
```
"This test is flaky - it sometimes fails with timeout errors. Fix it."
"Make this test more reliable by adding proper wait conditions"
```

### 3. Generate Test Data

**Prompt examples:**
```
"Create mock data for a game with 5 transactions that sum to zero"
"Generate test fixtures for different game states (settled, unbalanced, etc.)"
```

### 4. Improve Test Coverage

**Prompt examples:**
```
"What edge cases should I test for the PublicGameEntry component?"
"Add tests for error handling in the WebSocket connection"
"Write tests for mobile-specific behavior (keyboard, touch events)"
```

### 5. Convert Manual Tests to Automated

**Prompt examples:**
```
"I manually test this flow: [describe your manual test]. Convert this to an automated Playwright test"
"Create a test that simulates two users editing the same game simultaneously"
```

## Using Playwright Codegen (AI-Powered Test Generation)

### Step 1: Record Your Actions
```bash
npx playwright codegen http://localhost:3000
```

This opens:
- A browser window (interact with your app)
- A Playwright Inspector (shows generated code in real-time)

### Step 2: Interact with Your App
- Click buttons
- Fill forms
- Navigate pages
- All actions are recorded as test code

### Step 3: Copy Generated Code
- Copy the generated test code
- Paste into your test file
- Refine and add assertions

### Step 4: Enhance with AI
Ask Cursor:
```
"Add assertions to verify the game was saved correctly"
"Make this test more robust by adding wait conditions"
"Add error handling for network failures"
```

## Best Practices for AI-Generated Tests

### ✅ DO:
- Review AI-generated tests before committing
- Add meaningful test descriptions
- Use semantic selectors (getByRole, getByLabelText)
- Test user behavior, not implementation
- Keep tests focused and independent

### ❌ DON'T:
- Blindly accept all AI suggestions
- Use brittle selectors (CSS classes, IDs)
- Test implementation details
- Create tests that depend on each other
- Ignore flaky test warnings

## Example: Generating Tests with Cursor

1. **Open your component file** (e.g., `PublicGameEntry.tsx`)

2. **Select the component code** (or the whole file)

3. **Ask Cursor:**
   ```
   "Write unit tests for this component covering:
   - Loading and error states
   - User interactions (editing, adding rows)
   - WebSocket updates
   - Form validation
   - Settle game functionality"
   ```

4. **Review and refine:**
   - Check that mocks are correct
   - Verify test descriptions are clear
   - Ensure tests are independent
   - Add any missing edge cases

5. **Run tests:**
   ```bash
   npm test PublicGameEntry
   ```

6. **Fix any issues:**
   - If tests fail, ask Cursor: "Fix the failing tests in PublicGameEntry.test.tsx"
   - If coverage is low, ask: "Add tests to increase coverage for PublicGameEntry"

## Continuous Improvement

### Weekly Review
- Run all tests and check for flaky tests
- Ask AI: "Which tests are flaky and how can I fix them?"
- Review test coverage reports
- Ask AI: "What areas need more test coverage?"

### When Adding New Features
1. Write tests first (TDD) or alongside code
2. Ask AI: "What tests should I write for this new feature?"
3. Run tests before committing
4. Ask AI: "Are there edge cases I'm missing?"

### When Fixing Bugs
1. Reproduce the bug
2. Write a failing test that reproduces it
3. Fix the bug
4. Verify test passes
5. Ask AI: "Are there similar bugs I should test for?"

## Tools Integration

### VS Code / Cursor Extensions
- **Jest Runner**: Run individual tests
- **Playwright Test for VSCode**: Run and debug Playwright tests
- **Coverage Gutters**: See test coverage inline

### CI/CD Integration
Ask Cursor:
```
"Add a GitHub Actions workflow that runs tests on every PR"
"Set up test coverage reporting in CI"
"Configure Playwright to run in CI with proper browser setup"
```

## Resources

- [Playwright Codegen Docs](https://playwright.dev/docs/codegen)
- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)


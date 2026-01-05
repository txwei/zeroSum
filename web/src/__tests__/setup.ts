import '@testing-library/jest-dom';

// Track if tests are still running
let testsRunning = true;

// Suppress React Router v7 deprecation warnings in tests
const originalWarn = console.warn;
const originalError = console.error;
beforeAll(() => {
  testsRunning = true;
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('React Router Future Flag Warning') ||
       args[0].includes('v7_startTransition') ||
       args[0].includes('v7_relativeSplatPath'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
  
  // Suppress expected errors in tests
  console.error = (...args: any[]) => {
    // Don't log if tests have finished
    if (!testsRunning) {
      return;
    }
    const message = typeof args[0] === 'string' ? args[0] : '';
    const fullMessage = args.join(' ');
    const errorObj = args[0];
    
    // Check if it's an AggregateError from jsdom XHR (expected when API calls are mocked)
    if (
      errorObj &&
      typeof errorObj === 'object' &&
      (errorObj.constructor?.name === 'AggregateError' ||
       (errorObj as any).type === 'XMLHttpRequest' ||
       fullMessage.includes('AggregateError') ||
       fullMessage.includes('XMLHttpRequest') ||
       fullMessage.includes('xhr-utils.js') ||
       fullMessage.includes('XMLHttpRequest-impl.js'))
    ) {
      return;
    }
    
    if (
      message.includes('Failed to fetch groups') ||
      fullMessage.includes('Failed to fetch groups') ||
      message.includes('Encountered two children with the same key') ||
      message.includes('An update to GroupProvider inside a test was not wrapped in act') ||
      (message.includes('An update to') && message.includes('was not wrapped in act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  // Mark tests as complete before restoring console
  testsRunning = false;
  // Wait a bit for any pending async operations
  return new Promise(resolve => setTimeout(() => {
    console.warn = originalWarn;
    console.error = originalError;
    resolve(undefined);
  }, 100));
});

// Ensure all async operations complete before tests finish
afterEach(async () => {
  // Wait for any pending promises to resolve
  // Use queueMicrotask to avoid fake timer issues
  await new Promise<void>(resolve => queueMicrotask(() => resolve()));
});

// Mock API URL for tests
(globalThis as any).__VITE_API_URL__ = '/api';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver (needed for recharts)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location
delete (window as any).location;
(window as any).location = {
  href: 'http://localhost:3000',
  replace: jest.fn(),
};

// Mock window.alert (jsdom doesn't implement it)
window.alert = jest.fn();


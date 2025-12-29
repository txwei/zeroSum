// Mock implementation of env.ts for Jest tests
// This prevents Jest from encountering import.meta syntax

export function getBasePath(): string {
  return '/';
}

export function getApiUrl(): string | undefined {
  return undefined;
}

export function isDev(): boolean {
  return false;
}


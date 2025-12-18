export function generateTestUser() {
  const timestamp = Date.now();
  return {
    username: `testuser${timestamp}`,
    displayName: `Test User ${timestamp}`,
    password: 'password123',
  };
}

export function generateTestGroup() {
  const timestamp = Date.now();
  return {
    name: `Test Group ${timestamp}`,
    description: `Test description ${timestamp}`,
  };
}


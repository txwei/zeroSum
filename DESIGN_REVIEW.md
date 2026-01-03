# Codebase Design Review

## Critical Issues

### 1. **Massive Component: PublicGameEntry.tsx (1286 lines)**
**Location:** `web/src/pages/PublicGameEntry.tsx`

**Problem:**
- Single component with 1286 lines violates Single Responsibility Principle
- Contains complex real-time collaboration logic, WebSocket management, form handling, keyboard management, and UI rendering
- Extremely difficult to test, maintain, and understand

**Recommendation:**
- Extract WebSocket logic into a custom hook: `useGameSocket.ts`
- Extract form state management into: `useGameForm.ts`
- Extract keyboard logic into: `useMathKeyboard.ts`
- Break UI into smaller components:
  - `GameHeader.tsx` (name, date, copy link)
  - `GameStatusBar.tsx` (balance status, currency, settle button)
  - `TransactionTable.tsx` (table with rows)
  - `TransactionRow.tsx` (individual row)
- Move business logic to a service or hook

**Impact:** High - Affects maintainability, testability, and developer experience

---

### 2. **Service Layer Violates Encapsulation**
**Location:** `api/src/services/GameService.ts`, `api/src/services/StatsService.ts`

**Problem:**
Services access other services' private repositories using bracket notation:
```typescript
const group = await this.groupService['groupRepository'].findById(groupId);
const allUsers = await this.userService['userRepository'].searchUsers(query, 10);
```

**Issues:**
- Bypasses encapsulation (private members accessed via bracket notation)
- Creates tight coupling between services
- Makes refactoring dangerous (TypeScript won't catch breaking changes)
- Indicates architectural problem: services need direct repository access

**Recommendation:**
- Option A: Make repositories public methods on services (e.g., `groupService.getGroupRepository()`)
- Option B: Inject repositories directly into services that need them
- Option C: Create proper service methods instead of exposing repositories
- Option D: Use dependency injection container

**Impact:** High - Affects code quality, maintainability, and type safety

---

### 3. **Duplicate Cache Implementations**
**Location:** 
- `web/src/pages/Dashboard.tsx` (line 38)
- `web/src/hooks/useGameDetails.ts` (line 5)

**Problem:**
Two separate `Map<string, Game>` caches for game details:
- `gameDetailsCache` exported from Dashboard.tsx
- `gameDetailsCache` in useGameDetails.ts

**Issues:**
- Code duplication
- Inconsistent cache management
- Potential for stale data if both are used
- Cache not shared across components properly

**Recommendation:**
- Create a single cache module: `web/src/utils/gameCache.ts`
- Export a singleton cache instance
- Use it consistently across Dashboard, GameDetails, and useGameDetails
- Consider using React Query or SWR for proper cache management

**Impact:** Medium - Affects consistency and data freshness

---

### 4. **Complex State Management with Multiple Refs**
**Location:** `web/src/pages/PublicGameEntry.tsx`

**Problem:**
Component uses 10+ refs to manage complex state:
```typescript
const socketRef = useRef<Socket | null>(null);
const updatingFieldsRef = useRef<Set<string>>(new Set());
const saveTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
const rowsRef = useRef<TransactionRow[]>([]);
const addingRowRef = useRef<boolean>(false);
const deletingRowRef = useRef<boolean>(false);
const expectedRowCountRef = useRef<number | null>(null);
const focusingInputRef = useRef<boolean>(false);
const keyboardClosingRef = useRef<boolean>(false);
const amountInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
```

**Issues:**
- Over-reliance on refs indicates state management complexity
- Difficult to reason about state updates
- Race conditions and synchronization issues
- Hard to test

**Recommendation:**
- Extract to custom hooks: `useGameCollaboration.ts`, `useDebouncedSave.ts`
- Use state management library (Zustand, Jotai) for complex shared state
- Consider using React Query for server state management
- Simplify optimistic updates pattern

**Impact:** High - Affects code quality and bug potential

---

### 5. **Inconsistent API Client Usage**
**Location:** Multiple components

**Problem:**
- Some components use service layer (`authService`, `gameService`)
- Others make direct `apiClient` calls (`PublicGameEntry.tsx`, `Dashboard.tsx`)
- Inconsistent error handling patterns

**Recommendation:**
- Standardize on service layer for all API calls
- Create `publicGameService.ts` for public game endpoints
- Ensure all components use services, not direct API client

**Impact:** Medium - Affects consistency and maintainability

---

### 6. **Type Duplication**
**Location:** Multiple files

**Problem:**
`Game` interface defined in multiple places with slight variations:
- `PublicGameEntry.tsx` (lines 8-28)
- `Dashboard.tsx` (lines 8-31)
- `GameDetails.tsx` (lines 12-37)
- `useGameDetails.ts` (likely)
- `types/api.ts` (should be the source of truth)

**Issues:**
- Type drift (interfaces diverge over time)
- Maintenance burden
- Potential runtime errors from type mismatches

**Recommendation:**
- Consolidate all Game types in `web/src/types/api.ts`
- Import from single source
- Use TypeScript utility types for variations (e.g., `Partial<Game>`, `Pick<Game, 'id' | 'name'>`)

**Impact:** Medium - Affects type safety and maintainability

---

### 7. **Magic Numbers and Strings**
**Location:** Throughout codebase

**Examples:**
- `setTimeout(..., 200)` - debounce delay
- `setTimeout(..., 100)` - delay for state updates
- `setTimeout(..., 300)` - blur delay
- `Math.abs(sum) < 0.01` - zero-sum tolerance
- `window.innerWidth < 640` - mobile breakpoint

**Recommendation:**
- Create constants file: `web/src/utils/constants.ts`
- Define all magic values as named constants
- Use constants consistently

**Impact:** Low-Medium - Affects maintainability

---

### 8. **WebSocket Logic Embedded in Component**
**Location:** `web/src/pages/PublicGameEntry.tsx` (lines 130-288)

**Problem:**
- 150+ lines of WebSocket connection, event handling, and state synchronization logic
- Mixed with component lifecycle and UI concerns
- Difficult to test in isolation
- Cannot be reused

**Recommendation:**
- Extract to `useGameSocket.ts` hook
- Handle all socket connection, events, and reconnection logic
- Return clean interface for component to use
- Make it testable

**Impact:** Medium - Affects testability and reusability

---

### 9. **No Dependency Injection**
**Location:** `api/src/services/*.ts`

**Problem:**
Services instantiate dependencies directly:
```typescript
constructor() {
  this.gameRepository = new GameRepository();
  this.groupService = new GroupService();
  // ...
}
```

**Issues:**
- Hard to test (can't mock dependencies easily)
- Tight coupling
- Difficult to swap implementations
- Services create their own dependencies (violates Dependency Inversion Principle)

**Recommendation:**
- Use dependency injection (constructor injection)
- Create a service container or use a DI library
- Make dependencies injectable for testing

**Impact:** Medium - Affects testability

---

### 10. **Inconsistent Error Handling**
**Location:** Throughout codebase

**Problem:**
Multiple error handling patterns:
- Some use `try-catch` with `console.error`
- Some use `setError` state
- Some show alerts
- Some silently fail
- No consistent error boundary strategy

**Recommendation:**
- Standardize error handling pattern
- Use error boundaries for React errors
- Create error service/utility for consistent error display
- Log errors to monitoring service in production

**Impact:** Medium - Affects user experience and debugging

---

### 11. **Date Handling Inconsistencies**
**Location:** Multiple files

**Problem:**
- Different date formatting functions in different components
- UTC vs local timezone handling varies
- Date parsing logic duplicated

**Recommendation:**
- Centralize date utilities in `web/src/utils/date.ts`
- Use consistent date formatting functions
- Document timezone handling strategy

**Impact:** Low - Affects consistency

---

### 12. **Missing Abstractions for Complex Operations**
**Location:** `web/src/pages/PublicGameEntry.tsx`

**Problem:**
Complex operations like `updateField` (120+ lines) mix:
- Optimistic updates
- WebSocket broadcasting
- Debounced server saves
- Validation
- Error handling and retries

**Recommendation:**
- Extract to separate functions/hooks
- Use command pattern for complex operations
- Separate concerns: validation, network, state updates

**Impact:** Medium - Affects maintainability

---

## Summary

### Priority Fixes (High Impact)
1. **Break down PublicGameEntry.tsx** - Extract hooks and components
2. **Fix service layer encapsulation** - Remove bracket notation access
3. **Consolidate cache implementations** - Single source of truth
4. **Simplify state management** - Extract complex ref logic to hooks

### Medium Priority
5. Standardize API client usage
6. Consolidate type definitions
7. Extract WebSocket logic
8. Implement dependency injection
9. Standardize error handling

### Low Priority
10. Extract magic numbers to constants
11. Centralize date utilities
12. Add missing abstractions

---

## Positive Aspects

✅ Good separation of concerns in backend (services, repositories, routes)
✅ Comprehensive test coverage
✅ TypeScript usage throughout
✅ Clean architecture documentation
✅ Proper middleware usage
✅ Good use of custom hooks in some places (useGames, useGroups)

---

## Recommendations for Next Steps

1. **Start with PublicGameEntry refactoring** - Biggest impact on maintainability
2. **Fix service layer access patterns** - Critical for code quality
3. **Implement proper caching solution** - Use React Query or SWR
4. **Create design system for components** - Reusable UI components
5. **Add E2E tests** - Already have Playwright setup, expand coverage


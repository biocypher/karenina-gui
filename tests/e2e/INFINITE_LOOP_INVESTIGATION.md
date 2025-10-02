# Infinite Loop Bug Investigation

**Date:** 2025-10-01
**Status:** CRITICAL - UNRESOLVED
**Severity:** HIGH - Blocks manual question addition feature

## Summary

After adding a manual question via the "Add Question" modal, React enters an infinite loop causing "Maximum update depth exceeded" errors and rendering the app unresponsive.

## Investigation Timeline

### Attempt 1: Fix useEffect with selection tracking

- **Hypothesis:** The useEffect at line 292-392 was causing loops by responding to selection changes
- **Approach:** Added `prevSelectedQuestionIdRef` to prevent navigation on selection changes
- **Result:** ❌ FAILED - Loop persisted

### Attempt 2: Move ref updates to end of useEffect

- **Hypothesis:** Refs were being updated conditionally, causing stale comparisons
- **Approach:** Moved all ref updates to end of useEffect unconditionally
- **Result:** ❌ FAILED - Loop persisted

### Attempt 3: Track only specific finished status

- **Hypothesis:** The entire `checkpoint` object reference was changing on every render
- **Approach:** Changed dependency from `checkpoint` to `selectedQuestionFinishedStatus`
- **Result:** ❌ FAILED - Loop persisted

### Attempt 4: Remove useEffect entirely

- **Hypothesis:** The useEffect itself was fundamentally flawed
- **Approach:** Completely removed the auto-navigation useEffect (lines 288-389)
- **Result:** ❌ FAILED - Loop STILL persisted!

## Key Discovery

**The infinite loop is NOT caused by the useEffect at lines 288-392.**

Even after completely removing this useEffect, the infinite loop still occurs when adding a question. This indicates the root cause is elsewhere in the codebase.

## Evidence

### Console Output Pattern

```
✅ Added new question with ID: [uuid]
✅ Successfully added new question: [uuid]
🔍 Filter Debug: {questionFilter: all, allQuestionIds: 1, filteredQuestionIds: 1, ...}
🔍 Filter Debug: {questionFilter: all, allQuestionIds: 1, filteredQuestionIds: 1, ...}
🔍 Filter Debug: {questionFilter: all, allQuestionIds: 1, filteredQuestionIds: 1, ...}
🔍 Filter Debug: {questionFilter: all, allQuestionIds: 1, filteredQuestionIds: 1, ...}
⚠️ Warning: Maximum update depth exceeded... (150+ times)
```

### Observations

1. The "🔍 Filter Debug" message at `App.tsx:277` runs on EVERY render (not in useEffect)
2. It appears 4 times rapidly before the infinite loop warnings start
3. The loop begins immediately after `addNewQuestion` completes
4. The pattern is identical whether the useEffect exists or not

## Potential Root Causes

Since the useEffect wasn't the issue, the infinite loop must be caused by one of:

### 1. **Store Update Cascades**

- `addNewQuestion` in `useQuestionStore.ts:305-373` updates both `questionData` and `checkpoint`
- These updates might trigger cascading re-renders in consuming components
- Need to investigate if stores are causing unnecessary re-renders

### 2. **Computed Values Re-calculating**

- `questionIds` at `App.tsx:249-274` is recomputed on every render
- Uses `allQuestionIds`, `questionSearchTerm`, `questionFilter`, `checkpoint`, `questionData`
- If any of these get new object references on every render, it could contribute to issues

### 3. **Hidden useEffect Hooks**

- There might be other useEffect hooks in App.tsx that are causing loops
- Need to search for ALL useEffect calls in the file

### 4. **Child Component Effects**

- A child component might have a useEffect that's causing the loop
- The template editor, form editor, or other components might be the culprit

### 5. **Store Subscription Issues**

- Zustand store subscriptions might be triggering unnecessary updates
- The way components subscribe to store changes could be flawed

## Files to Investigate

1. **`src/App.tsx`**
   - Search for ALL useEffect hooks
   - Check how stores are being consumed
   - Look for any state updates during render

2. **`src/stores/useQuestionStore.ts`**
   - Line 305-373: `addNewQuestion` implementation
   - Check if setting multiple states triggers multiple renders

3. **Template/Form Editor Components**
   - These render after a question is added
   - Might have effects that depend on question data

## Next Steps

1. **Search for all useEffect hooks** in App.tsx
2. **Add React.StrictMode checks** to identify unsafe lifecycle usage
3. **Use React DevTools Profiler** to see what's causing re-renders
4. **Add strategic console.logs** to track render cycles
5. **Check if wrapping store selectors in useMemo helps**

## Workaround

Until fixed, users cannot:

- Add manual questions
- Test the complete benchmark creation workflow
- Use the manual question feature in production

## Impact

- **Feature:** Manual question addition (BLOCKED)
- **E2E Tests:** Cannot complete full workflow tests
- **User Experience:** App becomes unresponsive, requires page reload
- **Production Readiness:** Feature cannot be released

## Recommendations

1. **Immediate:** Add error boundary to prevent app crash
2. **Short-term:** Use React DevTools to identify exact render cause
3. **Long-term:** Consider refactoring state management or using React Query
4. **Testing:** Add render count tracking to unit tests

### Attempt 5: Optimize Zustand selectors with shallow comparison

- **Hypothesis:** Multiple separate subscriptions were causing unnecessary re-renders
- **Approach:** Used multiple selective subscriptions with shallow comparison
- **Result:** ❌ FAILED - Caused infinite loop on initial page load!

### Attempt 6: Single subscription with shallow comparison

- **Hypothesis:** Combining all selectors into one with shallow comparison would work better
- **Approach:** Single useQuestionStore call with selector object and shallow comparison
- **Result:** ❌ FAILED - Loop persisted on question addition

### Attempt 7: Reverted to normal destructuring + useMemo with object dependencies

- **Hypothesis:** Original pattern but with useMemo for computed values
- **Approach:** Normal Zustand destructuring + useMemo(lambda, [questionData, checkpoint, ...])
- **Result:** ❌ FAILED - Loop persisted

### Attempt 8: Stable dependencies (counts instead of objects)

- **Hypothesis:** Using primitive values (counts) instead of object references would prevent re-renders
- **Approach:**
  - `questionDataKeysCount = Object.keys(questionData).length`
  - `checkpointKeysCount = Object.keys(checkpoint).length`
  - useMemo depends on counts instead of objects
  - Removed useMemo from simple computed values
- **Result:** ❌ FAILED - Loop still occurs on question addition
- **Code Changes:**
  ```javascript
  const questionDataKeysCount = Object.keys(questionData).length;
  const checkpointKeysCount = Object.keys(checkpoint).length;
  const allQuestionIds = useMemo(() => Object.keys(questionData), [questionDataKeysCount]);
  const questionIds = useMemo(() => { /* filter logic */ }, [questionDataKeysCount, checkpointKeysCount, ...]);
  ```

## Critical Discovery

**None of the memoization or selector approaches fix the issue.**

The infinite loop is triggered specifically when `addNewQuestion` is called and persists regardless of:

- How we subscribe to Zustand store
- How we memoize computed values
- Whether we use object or primitive dependencies
- Whether we use shallow comparison or not

This strongly suggests the root cause is **NOT in App.tsx's render dependencies**, but rather:

1. **A child component effect** that responds to props changes and triggers state updates
2. **A hidden effect in App.tsx** that we haven't identified yet
3. **Zustand store internal behavior** when multiple state pieces are updated simultaneously
4. **A callback or handler** that gets recreated and triggers effects in child components

---

**Status:** BLOCKED - Requires runtime debugging with React DevTools Profiler to identify exact render cause

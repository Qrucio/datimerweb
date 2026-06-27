## 2024-03-24 - Memoize Timer Digits
**Learning:** In a countdown timer component (`CountdownTimer.jsx`) that updates every second, re-rendering all digits (even those that haven't changed, like minutes or tens of seconds) is inefficient. Specifically, recalculating Framer Motion states for static digits in a hot path causes unnecessary overhead.
**Action:** Use `React.memo` on the individual `Digit` and `Separator` sub-components. This ensures that only the digits that actually change (typically the units of seconds) trigger a re-render and animation recalculation, significantly reducing React's render workload on every tick.

## 2023-10-27 - Remove mathjs dependency and replace with native Function evaluator
**Learning:** Using `new Function` with strict regex validation can safely replace large math evaluation libraries like `mathjs` for simple math operations, significantly improving bundle size and loading times.
**Action:** When evaluating simple math expressions, check if the input is strictly sanitized and use native JS functionality instead of bringing in heavy third-party dependencies.

## 2024-05-18 - Memoize Expensive Array Operations in Hot Paths
**Learning:** In highly interactive components that re-render frequently (e.g., due to a 100ms timer tick in `MainApp` or frequent keystrokes in `NoteSystemModals`), calculating derived arrays (like filtering lists, creating tag sets, or filtering command arrays) on every render creates significant performance overhead.
**Action:** Always wrap array filtering, mapping, and deduplication operations with `useMemo` when they are inside components that exist on hot rendering paths. Provide accurate dependency arrays so the computations only run when their source data actually changes.

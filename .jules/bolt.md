## 2024-03-24 - Memoize Timer Digits
**Learning:** In a countdown timer component (`CountdownTimer.jsx`) that updates every second, re-rendering all digits (even those that haven't changed, like minutes or tens of seconds) is inefficient. Specifically, recalculating Framer Motion states for static digits in a hot path causes unnecessary overhead.
**Action:** Use `React.memo` on the individual `Digit` and `Separator` sub-components. This ensures that only the digits that actually change (typically the units of seconds) trigger a re-render and animation recalculation, significantly reducing React's render workload on every tick.

## 2023-10-27 - Remove mathjs dependency and replace with native Function evaluator
**Learning:** Using `new Function` with strict regex validation can safely replace large math evaluation libraries like `mathjs` for simple math operations, significantly improving bundle size and loading times.
**Action:** When evaluating simple math expressions, check if the input is strictly sanitized and use native JS functionality instead of bringing in heavy third-party dependencies.
## 2024-11-20 - [React Interval Re-renders]
**Learning:** [When using setInterval to map over complex state arrays (like friends' presence) in React, blindly returning new object references every tick forces full app re-renders, even when visual properties haven't changed.]
**Action:** [Always compare primitive status properties before mutating object references in interval-driven state updates to allow React to bailout of unnecessary re-renders.]

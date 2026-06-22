## 2024-03-24 - Memoize Timer Digits
**Learning:** In a countdown timer component (`CountdownTimer.jsx`) that updates every second, re-rendering all digits (even those that haven't changed, like minutes or tens of seconds) is inefficient. Specifically, recalculating Framer Motion states for static digits in a hot path causes unnecessary overhead.
**Action:** Use `React.memo` on the individual `Digit` and `Separator` sub-components. This ensures that only the digits that actually change (typically the units of seconds) trigger a re-render and animation recalculation, significantly reducing React's render workload on every tick.

## 2023-10-27 - Remove mathjs dependency and replace with native Function evaluator
**Learning:** Using `new Function` with strict regex validation can safely replace large math evaluation libraries like `mathjs` for simple math operations, significantly improving bundle size and loading times.
**Action:** When evaluating simple math expressions, check if the input is strictly sanitized and use native JS functionality instead of bringing in heavy third-party dependencies.

## 2024-06-22 - Memoize Avatar Component (Leaf Node Optimization vs Parent)
**Learning:** When trying to prevent re-renders in a list like `ChatArea` rendering `MessageBubble`s, it is tempting to memoize the parent item (`MessageBubble`) with a custom `areEqual` that ignores inline function callbacks (like `onDelete`). However, doing this creates stale closures: the child component will hold references to the very first version of those callbacks, leading to bugs if those callbacks rely on updated state.
**Action:** Instead of memoizing the parent wrapper and writing risky custom equality functions that ignore callbacks, memoize the expensive, pure "leaf" components (like `Avatar`). `Avatar` is used extensively in lists (chat, friends, servers) and takes mostly primitive data or simple objects without relying on complex callback functions. This provides a safe performance gain without risking state-related bugs.

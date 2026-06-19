## 2023-10-27 - Remove mathjs dependency and replace with native Function evaluator
**Learning:** Using `new Function` with strict regex validation can safely replace large math evaluation libraries like `mathjs` for simple math operations, significantly improving bundle size and loading times.
**Action:** When evaluating simple math expressions, check if the input is strictly sanitized and use native JS functionality instead of bringing in heavy third-party dependencies.

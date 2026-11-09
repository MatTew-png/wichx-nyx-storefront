# Work Order: WO-02-BENTO-SIGNATURE-CRAFT

## 1. Objective
Break predictable, repetitive 4-card AI template symmetry by implementing Bento Asymmetric Grid rhythm for flagship products, 3-tier spatial surface depths, and Emil Kowalski spring physics for tactile micro-interactions.

## 2. Target Files
- Modify: `styles.css`
- Modify: `js/components/CatalogView.js`

## 3. Implementation Contract
1. In `styles.css`:
   - Add `.bento-spotlight` styling with radial accent glow and top specular highlight.
   - Add `.btn-spring` with Emil Kowalski curve `cubic-bezier(0.34, 1.56, 0.64, 1)` and tactile active state.
   - Update `.btn-cyber-primary` to use the spring physics curve.
2. In `js/components/CatalogView.js`:
   - Support Bento Spotlight rendering:
     When iterating products, if `idx === 0 && prods.length >= 3`, render the first product as a Featured Bento Spotlight Card (`col-span-1 sm:col-span-2 md:col-span-2`) with horizontal layout on larger screens, "🔥 BEST SELLER • สินค้ายอดนิยม" badge, and detailed perks.
     Render the subsequent products as standard sleek cards.

## 4. Verification Command
`node build.js && npm test`

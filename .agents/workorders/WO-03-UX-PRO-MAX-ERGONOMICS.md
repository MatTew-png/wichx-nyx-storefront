# Work Order: WO-03-UX-PRO-MAX-ERGONOMICS

## 1. Objective
Ensure full compliance with UI/UX Pro Max 192 industry rules: fix low contrast ratios (WCAG AA 4.5:1+), enforce 44px+ mobile touch targets, and equip mobile drawers/sheets with tactile drag handles.

## 2. Target Files
- Modify: `styles.css`
- Modify: `js/components/CartDrawer.js`

## 3. Implementation Contract
1. In `styles.css`:
   - Enhance text contrast for subtexts, labels, and small badges so they pass WCAG AA standards against dark background `#06080C`.
   - Add `.mobile-drag-handle` styling.
   - Enforce `min-height: 44px` on mobile CTA buttons.
2. In `js/components/CartDrawer.js`:
   - Add a mobile drag handle bar at the top of the drawer when viewed on mobile devices.
   - Improve touch-friendly spacing and tap target heights.

## 4. Verification Command
`node build.js && npm test`

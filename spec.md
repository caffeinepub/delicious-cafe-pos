# Delicious Cafe POS

## Current State
- Full POS with auth, cashier ordering, kitchen display, inventory, billing, and sales history
- Kitchen display polls every 5 seconds, plays beep on new orders, 3-column layout (Pending/Preparing/Ready)
- Cashier page shows active orders with live status updates every 6 seconds
- main.tsx incorrectly wraps app with InternetIdentityProvider instead of EmailAuthProvider (root cause of blank screens)
- Backend statuses: pending → inprogress → done → paid
- Kitchen currently marks 'done' orders as 'paid' (incorrect - cashier should do that)
- No notification badge on cashier screen for ready/completed orders from kitchen
- No 30-second fade-out for completed orders on kitchen display

## Requested Changes (Diff)

### Add
- Notification badge on Cashier active orders strip showing count of orders that are Ready (done status from kitchen)
- 30-second countdown then auto-remove for orders marked as Ready (done) on Kitchen Display
- Visual highlight on cashier order cards when kitchen marks order as Ready

### Modify
- Fix main.tsx: replace InternetIdentityProvider with EmailAuthProvider so auth works correctly
- Kitchen Display: "Mark Complete" on Ready column should NOT set status to paid — it should trigger the 30-second fade-out UI only (status stays as 'done' until cashier marks paid)
- OR: add a distinct completed visual state via local tracking in KitchenDisplay
- Cashier order status badge: show 'Ready' label prominently (already exists as ORDER_STATUS_LABEL[done] = 'Ready') with a colored highlight/notification indicator
- CashierPage notification badge: show count of active orders where kitchen has marked as Ready

### Remove
- Nothing removed

## Implementation Plan
1. Fix main.tsx to use EmailAuthProvider instead of InternetIdentityProvider
2. KitchenDisplay: when user clicks "Mark Complete" on a Ready order, keep status as 'done' but track in local state as 'completing'; show 30s countdown, then remove from view
3. KitchenDisplay: ensure beep only on genuinely new (pending) orders arriving
4. CashierPage: add notification badge (red count bubble) above/on the Active Orders section showing number of 'done' (Ready) orders
5. CashierPage: highlight order cards that are in 'done' state with a distinct color (e.g., amber/orange border) so cashier sees them instantly

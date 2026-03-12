# Delicious Cafe POS

## Current State
CashierPage exists with: single order cart, category filter bar, menu grid, payment selection, printable receipt, and active orders strip. Backend supports createOrder, updateOrderStatus, getAllOrders, etc.

## Requested Changes (Diff)

### Add
- Multiple simultaneous open orders with tab switcher (e.g. Order #1, Order #2, + New)
- Per-item note field in cart rows (e.g. "No sugar")
- Order number badge (#001 style) visible on each order tab
- Edit active order: cashier can reopen a Pending order back into the cart to modify it

### Modify
- CashierPage: replace single-cart state with multi-tab order state
- Cart panel: add per-item note input below each cart row
- Active orders strip: allow clicking a Pending order to re-edit it in a tab
- Place Order button: sends order and keeps tab open showing live status

### Remove
- Nothing removed

## Implementation Plan
1. Refactor CashierPage to use a `tabs` state: array of draft orders, each with id, items[], orderNote, and optional backend orderId + status
2. Add tab bar above category filter: shows each open draft as a clickable tab + New Order button
3. Add per-item note input in cart rows (small text field below item name/price)
4. When Place Order is clicked: submit to backend, update tab state with returned orderId and poll status
5. Allow switching between tabs without losing cart state
6. Active orders section: clicking a Pending order loads it into a new editable tab
7. Cancel clears tab; Mark Paid opens receipt dialog

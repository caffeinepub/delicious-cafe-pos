# Delicious Cafe POS

## Current State
The app has all major modules built: Login/Register, Admin Dashboard, Item Management, Category Management, Inventory Management, Sales Reports, User Management, Cashier POS, and Kitchen Display. However there is a critical auth bug causing a blank screen: `useActor.ts` reads identity from `useInternetIdentity` while the app authenticates via `useEmailAuth`. This means all authenticated backend calls use an anonymous identity, breaking the entire app.

Additional gaps:
- AdminLayout, CashierPage, KitchenDisplay call `useInternetIdentity().clear` for logout instead of `useEmailAuth().logout`
- `main.tsx` is missing `EmailAuthProvider` wrapping
- Kitchen Display only shows `pending` and `inprogress` orders; `done` (Ready) orders are invisible
- Cashier has no way to cancel a pending order or mark an order as paid (complete the transaction)
- No printable receipt
- Sales Reports lacks quick date-range shortcuts (Today, This Week, This Month)
- Order status labels don't match user requirements: pending/inprogress/done/paid should display as Pending/Preparing/Ready/Completed

## Requested Changes (Diff)

### Add
- `EmailAuthProvider` wrapping in `main.tsx`
- Quick filter buttons in SalesReports: Today, This Week, This Month
- Cancel order button in CashierPage (only visible when order status = pending)
- "Mark as Paid" flow in CashierPage: when order status = done (Ready), cashier can select payment method and confirm payment → updates status to `paid`
- Printable receipt dialog triggered after marking as paid
- Kitchen Display column for `done` (Ready) status orders with a "Served" button to mark `paid`
- Status label mapping everywhere: pending→Pending, inprogress→Preparing, done→Ready, paid→Completed

### Modify
- `useActor.ts`: replace `useInternetIdentity` with `useEmailAuth` for identity
- `main.tsx`: add `EmailAuthProvider` around app
- `AdminLayout.tsx`: replace `useInternetIdentity().clear` with `useEmailAuth().logout`
- `CashierPage.tsx`: replace `useInternetIdentity().clear` with `useEmailAuth().logout`; add active orders panel showing orders placed by this session with cancel and pay options
- `KitchenDisplay.tsx`: replace `useInternetIdentity().clear` with `useEmailAuth().logout`; add Ready column
- `SalesReports.tsx`: add quick filter buttons

### Remove
- Nothing

## Implementation Plan
1. Fix `main.tsx`: wrap with `EmailAuthProvider`
2. Fix `useActor.ts`: use `useEmailAuth().identity` instead of `useInternetIdentity().identity`
3. Fix all logout calls in AdminLayout, CashierPage, KitchenDisplay to use `useEmailAuth().logout`
4. Update CashierPage: add active orders list with cancel (pending only) and pay (done/ready only) actions; add receipt print dialog
5. Update KitchenDisplay: show Pending/Preparing/Ready columns; Ready orders have "Served" button
6. Update SalesReports: add Today/This Week/This Month quick filter buttons
7. Apply consistent status label display across all pages

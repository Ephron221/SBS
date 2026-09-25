# POS Final Fixes & Customer Integration Plan

The goal is to fix the non-functional quantity buttons, resolve the remaining horizontal overflow issues, and provide a more intuitive "Search or Add" workflow for customers.

## User Review Required

> [!IMPORTANT]
> **Quantity Logic**: I will restore the `updateQty` function which was accidentally removed during a previous update. This will fix the "plus" and "minus" buttons in the cart.

> [!TIP]
> **Integrated Customer Workflow**: I will update the main POS search bar so that if a customer name is typed and NOT found, a "Create New Customer" option appears directly in the results list.

## Proposed Changes

### 1. Functional Fixes
- [MODIFY] [POSCart.tsx](file:///D:/SBS/frontend/src/features/POSCart.tsx):
    - Re-add the `updateQty` function.
    - Connect the `Minus` and `Plus` buttons to `updateQty`.

### 2. Responsiveness & Overflow
- [MODIFY] [App.css](file:///D:/SBS/frontend/src/App.css):
    - Use `box-sizing: border-box` globally if not already set (re-verifying).
    - Ensure `.main-panel` has `max-width: 100vw`.
    - Update `.pos-container` to use `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` on medium screens to force stacking better.
    - Fix the `.cart-card` width on medium desktops.

### 3. Customer Integration
- [MODIFY] [POSCart.tsx](file:///D:/SBS/frontend/src/features/POSCart.tsx):
    - Update the search logic to include a "Add '[Name]' as New Customer" result if no direct customer matches are found.
    - Improve the layout of the customer search results.

- [MODIFY] [CustomerSelector.tsx](file:///D:/SBS/frontend/src/features/CustomerSelector.tsx):
    - Refine the "New Customer" form UI to be more prominent and easier to use.

## Verification Plan

### Manual Verification
1.  **Quantity Test**: Click `+` and `-` on items in the cart. Verify the quantity and totals update correctly.
2.  **Responsiveness Test**: Resize the browser to laptop, tablet, and mobile widths. Verify no horizontal scroll appears and the layout stacks correctly.
3.  **Customer Search**: Type an existing customer name in the search bar. Verify they appear.
4.  **Add New Customer**: Type a non-existent name. Verify an "Add as new customer" option appears or use the `+ New Customer` button in the checkout panel.

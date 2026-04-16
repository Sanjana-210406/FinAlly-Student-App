# Implement Interactive Merchant Mapping for OCR Bulk Uploads

## Goal Description
The backend already supports classifying merchants and saving user mappings (`MerchantLearnedMapping`) for single expenses. The single-add form triggers a popup for unknown merchants. However, the OCR Bulk Upload feature (`ocr-scanner.js`) does not currently prompt the user to map unrecognized merchants found during bulk processing. This plan will queue up unrecognized merchants from screenshots and sequentially prompt the user to map them, teaching the AI for future use.

## Proposed Changes

### 1. `frontend/js/modules/add-expense.js`
- Expose the `openOverrideModal` directly or create a `processUnknownMerchants` queue method exposed to `window.AddExpenseModule`.
- Modify the `overrideConfirmBtn` and `overrideCancelBtn` handlers. They currently resolve a single interaction. We need them to cleanly resolve a Promise so `ocr-scanner.js` can `await` the user's choice and then present the next unknown merchant without overlapping modals.

### 2. `frontend/js/modules/ocr-scanner.js`
- Capture the returned array from `ApiUtil.Expenses.bulk(payload)`.
- Filter the array for expenses that have `classificationConfidence === 'LOW'` or `categoryName === 'Other'`.
- Pass this list of unmapped transactions to the newly exposed `processUnknownMerchants` method in `AddExpenseModule`.
- Show a Toast notification when all mappings are complete.

### 3. `frontend/pages/add-expense.html`
- Make minor text updates to the `overrideModal` to dynamically show the name of the merchant being mapped instead of just "Unknown Merchant Detected", allowing the user to know *which* screenshot item they are mapping (e.g. "Banking name: VASHISHTA HOMC O...").

## Verification Plan
- Run the python backend/frontend integration via `browser_subagent`.
- Upload `img5.png` which contains known anomalies and unknown merchants (`40302299`, `VASHISHTA HOMC`).
- Verify the bulk API returns them as `Other`/`LOW`.
- Verify the modal pops up asking the user to manually map them.

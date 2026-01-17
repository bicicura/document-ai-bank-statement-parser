# Google Document AI - Bank Statement Parser Entities

Summary of entities returned by Google Document AI's `bank-statement-parser` processor.

## Top-Level Entities

| Entity Type | Description | Normalized Value | Multiple |
|-------------|-------------|------------------|----------|
| `bank_name` | Bank name | ✅ Enrichment (e.g., "Citizens" → "Citizens Bank") | No |
| `bank_address` | Bank address | ❌ | No |
| `account_number` | Account number | ❌ | Yes (multiple mentions) |
| `account_type` | Account type (e.g., "Checking", "Savings") | ❌ | Yes |
| `client_name` | Account holder name | ❌ | Yes (multiple mentions) |
| `client_address` | Account holder address | ❌ | No |
| `statement_start_date` | Statement period start date | ✅ `dateValue` | No |
| `statement_end_date` | Statement period end date | ✅ `dateValue` | No |
| `statement_date` | Statement date | ✅ `dateValue` | Yes |
| `starting_balance` | Opening balance | ✅ `moneyValue` | Yes |
| `ending_balance` | Closing balance | ✅ `moneyValue` | No |
| `table_item` | Transaction (has child properties) | ❌ | Yes |

## `table_item` Properties (Transactions)

Each `table_item` has a `properties` array containing:

| Property Type | Description | Normalized Value | Confidence |
|---------------|-------------|------------------|------------|
| `table_item/transaction_withdrawal_date` | Withdrawal date | ❌ | ~0.99 |
| `table_item/transaction_withdrawal` | Withdrawal amount | ✅ `moneyValue` | ~0.99 |
| `table_item/transaction_withdrawal_description` | Withdrawal description | ❌ | ~0.94 |
| `table_item/transaction_deposit_date` | Deposit date | ❌ | ~0.99 |
| `table_item/transaction_deposit` | Deposit amount | ✅ `moneyValue` | ~0.98 |
| `table_item/transaction_deposit_description` | Deposit description | ❌ | ⚠️ Variable (can be very low ~0.0003) |

## `normalizedValue` Structure

### For amounts (`moneyValue`)
```json
{
  "text": "119.55",
  "moneyValue": {
    "currencyCode": "USD",
    "units": "119",
    "nanos": 550000000
  },
  "structuredValue": "moneyValue"
}
```
- `units`: Integer part
- `nanos`: Decimal part (divide by 1e9)
- `currencyCode`: May be empty

### For dates (`dateValue`)
```json
{
  "text": "2025-03-13",
  "dateValue": {
    "year": 2025,
    "month": 3,
    "day": 13
  },
  "structuredValue": "dateValue"
}
```

### For enrichment (bank_name)
```json
{
  "text": "Citizens Bank"
}
```
Google uses Enterprise Knowledge Graph to normalize bank names.

## Common Fields in Each Entity

```json
{
  "type": "account_number",
  "mentionText": "XXXXXX-257-5",
  "confidence": 0.9234,
  "pageAnchor": {
    "pageRefs": [{
      "page": "0",
      "boundingPoly": { "normalizedVertices": [...] }
    }]
  },
  "textAnchor": {
    "textSegments": [{ "startIndex": "123", "endIndex": "135" }]
  },
  "normalizedValue": { ... },
  "properties": [ ... ]
}
```

## Important Notes

1. **Confidence**: Use to filter garbage. Properties with `confidence < 0.1` are usually OCR errors.

2. **Multiple mentions**: Some fields appear multiple times. Use the one with highest `confidence`.

3. **bank_name enrichment**: Doesn't always work well (e.g., "ink" → "mink" for Chase Ink).

4. **Transactions without amount**: Those with `amount === 0` are usually secondary lines or garbage.

5. **Page limits**:
   - Normal mode: 15 pages
   - Imageless mode: 30 pages

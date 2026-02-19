# Guide to Perfect Billing in Restaurant POS

## Table of Contents
1. [Best Practices](#best-practices)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Accuracy Tips](#accuracy-tips)
4. [Efficiency Tips](#efficiency-tips)
5. [Workflow Optimization](#workflow-optimization)
6. [Advanced Features](#advanced-features)

---

## Best Practices

### 1. **Pre-Sale Preparation**
- ✅ **Verify Stock**: Always check product availability before adding to cart
- ✅ **Update Prices**: Ensure product prices are current and accurate
- ✅ **Check VAT Settings**: Verify VAT percentages are correctly configured
- ✅ **Prepare Payment Methods**: Ensure cash drawer, card machine, and online payment systems are ready

### 2. **During Sale**
- ✅ **Scan Barcodes**: Use barcode scanning for faster, error-free product entry
- ✅ **Verify Quantities**: Double-check quantities, especially for weighted items
- ✅ **Confirm Prices**: Review unit prices before finalizing
- ✅ **Customer Selection**: Always select customer for better tracking and reports
- ✅ **Apply Discounts Carefully**: Verify discount amounts before applying

### 3. **Payment Processing**
- ✅ **Calculate Change Accurately**: Always verify change amount
- ✅ **Confirm Payment Method**: Select correct payment method before processing
- ✅ **Handle Split Payments**: Use split payment feature for multiple payment methods
- ✅ **Verify Receipt**: Review receipt before printing

### 4. **Post-Sale**
- ✅ **Print Receipt**: Always print receipt for customer records
- ✅ **Update Stock**: Verify stock quantities are updated correctly
- ✅ **Record Cash**: Ensure cash transactions are recorded properly
- ✅ **Save Sale**: Confirm sale is saved in system

---

## Common Issues & Solutions

### Issue 1: Stock Mismatch
**Problem**: Product shows in stock but sale fails due to insufficient stock

**Solution**:
- The system validates stock twice (client-side and server-side)
- Always refresh products list before starting a new sale
- Check stock quantities in real-time during cart operations

**Prevention**:
```javascript
// System automatically checks stock before:
- Adding product to cart
- Updating quantity
- Completing payment
```

### Issue 2: Calculation Errors
**Problem**: Totals don't match expected amounts

**Solution**:
- **Subtotal**: Sum of (unit_price × quantity) for all items
- **Item VAT**: Calculated per item: (unit_price × quantity) × (vat_percentage / 100)
- **Sale VAT**: Applied on subtotal after discount: (subtotal - discount) × (sale_vat_percentage / 100)
- **Total**: subtotal - discount + item_vat + sale_vat

**Formula Breakdown**:
```
Subtotal = Σ(item.unit_price × item.quantity)
Item VAT = Σ(item.unit_price × item.quantity × item.vat_percentage / 100)
Sale VAT = (Subtotal - Discount) × sale_vat_percentage / 100
Total = Subtotal - Discount + Item VAT + Sale VAT
```

### Issue 3: Unit Conversion Errors
**Problem**: Wrong quantities displayed for products with unit conversions

**Solution**:
- System stores quantities in base unit internally
- Display quantity shows converted unit
- Always verify conversion rates are correct
- Example: If base unit is "gram" and display unit is "kg", 1000g = 1kg

### Issue 4: Payment Method Confusion
**Problem**: Wrong payment method selected

**Solution**:
- **Cash**: Physical cash payment (records in cash management)
- **Card**: Credit/debit card payment
- **Online**: Digital payment (PayPal, Stripe, etc.)
- **Pay After Delivery**: For delivery orders (requires delivery boy selection)

### Issue 5: Receipt Printing Issues
**Problem**: Receipt doesn't print or prints incorrectly

**Solution**:
- Check printer connection and paper
- Verify receipt paper size settings (80mm thermal or A4)
- Test print before processing sale
- Use "View Receipt" to preview before printing

---

## Accuracy Tips

### 1. **Decimal Precision**
- System uses 4 decimal places for quantities
- Prices rounded to 2 decimal places
- Always verify calculations match expected values

### 2. **VAT Handling**
- **Item-level VAT**: Applied per product (if product has VAT)
- **Sale-level VAT**: Applied on entire sale (after discount)
- **No VAT Option**: Can exclude VAT for specific sales
- Both VAT types can be applied simultaneously

### 3. **Discount Application**
- **Fixed Amount**: Deducts exact amount from subtotal
- **Percentage**: Calculates percentage of subtotal
- Discount applied before sale-level VAT calculation
- Maximum discount cannot exceed subtotal

### 4. **Stock Tracking**
- Only products with `stock_tracking_enabled = 1` are tracked
- Stock decreases automatically when sale completes
- Stock restored if sale is deleted
- Real-time validation prevents overselling

---

## Efficiency Tips

### 1. **Keyboard Shortcuts** (Recommended Implementation)
- `Ctrl + F`: Focus search bar
- `Ctrl + B`: Focus barcode scanner
- `Enter`: Add selected product to cart
- `Ctrl + Enter`: Checkout
- `Esc`: Close modals

### 2. **Quick Actions**
- Use barcode scanner for fast product entry
- Use quick amount buttons in checkout (10, 20, 50, 100, 200, 500)
- Hold sales for incomplete transactions
- Split payment for complex transactions

### 3. **Workflow Optimization**
```
1. Scan/Select Products → 2. Review Cart → 3. Apply Discount/VAT → 
4. Select Customer → 5. Process Payment → 6. Print Receipt
```

### 4. **Bulk Operations**
- Use category filters to find products faster
- Search by product name or barcode
- Hold multiple sales for later processing

---

## Workflow Optimization

### Standard Sale Flow
1. **Start Sale**
   - Select sale date (if backdating)
   - Clear previous cart (if any)

2. **Add Products**
   - Scan barcode OR click product
   - Verify quantity and price
   - Check stock availability

3. **Modify Cart**
   - Adjust quantities as needed
   - Update prices if required
   - Remove items if necessary

4. **Apply Adjustments**
   - Add discount (if applicable)
   - Apply VAT (if required)
   - Select customer (optional but recommended)

5. **Process Payment**
   - Select payment method
   - Enter payment amount
   - Verify change amount
   - Confirm sale

6. **Complete Sale**
   - Review receipt
   - Print receipt
   - Confirm stock updated

### Delivery Order Flow
1. Follow standard sale flow (steps 1-4)
2. Select "Pay After Delivery" payment method
3. **Required**: Select delivery boy
4. Complete sale (payment collected later)
5. Delivery boy collects payment on delivery

### Split Payment Flow
1. Follow standard sale flow (steps 1-4)
2. Click "Split Payment"
3. Add multiple payment methods
4. Enter amounts for each method
5. Verify total matches sale total
6. Complete sale

---

## Advanced Features

### 1. **Hold Sales**
- Save incomplete sales for later
- Add notes to identify held sales
- Retrieve and complete later
- Useful for:
  - Customer needs to get payment method
  - Waiting for product availability
  - Complex orders requiring approval

### 2. **Unit Conversions**
- Support for multiple units (kg, gram, liter, etc.)
- Automatic conversion calculations
- Display in preferred unit
- Stock tracked in base unit

### 3. **Customer Management**
- Link sales to customers
- Track customer purchase history
- Enable customer-specific pricing (future feature)
- Better reporting and analytics

### 4. **Sale Date Selection**
- Backdate sales for previous days
- Useful for:
  - Correcting errors
  - Recording missed sales
  - Historical data entry

### 5. **Receipt Customization**
- Thermal receipt (80mm) for quick printing
- A4 invoice for formal documentation
- Includes:
  - Company logo and details
  - Tax invoice information
  - TRN (Tax Registration Number)
  - Itemized breakdown
  - VAT details
  - Payment information

---

## Quality Checklist

Before completing a sale, verify:

- [ ] All items in cart are correct
- [ ] Quantities are accurate
- [ ] Prices are correct
- [ ] Discount (if any) is correct
- [ ] VAT is applied correctly
- [ ] Customer is selected (if applicable)
- [ ] Payment method is correct
- [ ] Payment amount matches total
- [ ] Change amount is correct (for cash)
- [ ] Stock quantities are sufficient
- [ ] Receipt information is accurate

---

## Troubleshooting

### Sale Fails to Complete
1. Check stock availability
2. Verify all required fields are filled
3. Check network connection
4. Review error message for details
5. Try again or contact support

### Receipt Not Printing
1. Check printer connection
2. Verify paper is loaded
3. Check printer settings
4. Try manual print from receipt view
5. Verify print permissions

### Stock Not Updating
1. Verify product has stock tracking enabled
2. Check stock quantity before sale
3. Refresh products list
4. Verify sale completed successfully
5. Check server logs for errors

### Calculation Mismatch
1. Verify discount type (fixed vs percentage)
2. Check VAT percentages
3. Review item-level vs sale-level VAT
4. Verify quantities are correct
5. Check for rounding errors

---

## Best Practices Summary

1. **Always verify stock** before adding products
2. **Double-check calculations** before payment
3. **Select customers** for better tracking
4. **Use barcode scanning** for accuracy
5. **Review receipts** before printing
6. **Keep cash drawer balanced**
7. **Hold incomplete sales** instead of losing them
8. **Use split payment** for complex transactions
9. **Verify unit conversions** for weighted items
10. **Test print** before processing sale

---

## Future Enhancements (Recommendations)

1. **Keyboard Shortcuts**: Add keyboard navigation for faster operation
2. **Voice Commands**: Voice-activated product search
3. **Mobile App**: Mobile POS for table-side ordering
4. **Loyalty Program**: Customer loyalty points integration
5. **Multi-language Receipts**: Receipts in customer's language
6. **Email Receipts**: Send receipts via email
7. **SMS Notifications**: Send order updates via SMS
8. **Advanced Reporting**: Real-time sales analytics
9. **Inventory Alerts**: Low stock notifications
10. **Price History**: Track price changes over time

---

## Support & Resources

- **Documentation**: Check component files for detailed implementation
- **Error Logs**: Review browser console and server logs
- **Testing**: Use test mode for practice sales
- **Backup**: Regular database backups recommended

---

*Last Updated: February 2026*
*Version: 1.0*

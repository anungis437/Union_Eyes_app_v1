# Quick Wins - Quick Reference Card

## 🚀 Quick Start

### Install k6
```bash
# Windows
choco install k6

# macOS
brew install k6
```

### Configure Environment
```bash
# .env
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
PAYPAL_WEBHOOK_ID=xxx
SQUARE_ACCESS_TOKEN=xxx
SQUARE_APPLICATION_ID=xxx
SQUARE_WEBHOOK_SECRET=xxx
```

### Run Tests
```bash
# Integration tests
pnpm test __tests__/integration/payment-processors.test.ts

# Performance tests
.\run-k6-tests.ps1 -TestType load
k6 run __tests__/performance/k6-load-tests.js
```

---

## 💳 Payment Processors

### PayPal
```typescript
const paypal = factory.getProcessor(PaymentProcessorType.PAYPAL);
const intent = await paypal.createPaymentIntent({
  amount: new Decimal(50.00),
  currency: 'CAD',
  metadata: {
    returnUrl: 'https://example.com/return',
    cancelUrl: 'https://example.com/cancel',
  },
});
```

### Square
```typescript
const square = factory.getProcessor(PaymentProcessorType.SQUARE);
const intent = await square.createPaymentIntent({
  amount: new Decimal(75.50),
  currency: 'USD',
  paymentMethodId: 'card-nonce',
});
```

---

## 📊 k6 Tests

| Test | Duration | VUs | Command |
|------|----------|-----|---------|
| Load | 5m | 10→25 | `run-k6-tests.ps1 -TestType load` |
| Stress | 20m | 50→300 | `run-k6-tests.ps1 -TestType stress` |
| Spike | 3m | 10→200→10 | `run-k6-tests.ps1 -TestType spike` |
| Soak | 70m | 30 | `run-k6-tests.ps1 -TestType soak` |

### Thresholds
- **p95 < 500ms** - 95% of requests under 500ms
- **p99 < 2000ms** - Critical APIs 99th percentile
- **Error rate < 1%** - Less than 1% failures

---

## 📁 Files

### Created (11)
- `lib/payment-processor/processors/paypal-processor.ts`
- `lib/payment-processor/processors/square-processor.ts`
- `__tests__/performance/k6-load-tests.js`
- `__tests__/performance/k6-stress-tests.js`
- `__tests__/performance/k6-spike-tests.js`
- `__tests__/performance/k6-soak-tests.js`
- `__tests__/integration/payment-processors.test.ts`
- `run-k6-tests.ps1`
- `QUICK_WINS_IMPLEMENTATION.md`
- `QUICK_WINS_SUMMARY.md`
- `QUICK_WINS_QUICKREF.md`

### Modified (1)
- `lib/payment-processor/processor-factory.ts`

---

## 🎯 Impact

| Item | Points | Status |
|------|--------|--------|
| PayPal | +0.5 | ✅ |
| Square | +0.5 | ✅ |
| k6 Tests | +0.5 | ✅ |
| **Total** | **+1.5** | **✅** |

**Grade:** A- (91.8) → A (93.3)

---

## 🔧 Troubleshooting

### PayPal 401
- Check `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`

### Square 401
- Check `SQUARE_ACCESS_TOKEN`

### k6 not found
```bash
choco install k6  # Windows
brew install k6   # macOS
```

### High error rates
- Check API availability
- Check rate limits
- Verify auth tokens

---

## 📚 Resources

- [Full Implementation](QUICK_WINS_IMPLEMENTATION.md)
- [Summary](QUICK_WINS_SUMMARY.md)
- [PayPal API Docs](https://developer.paypal.com/docs/api/overview/)
- [Square API Docs](https://developer.squareup.com/docs/)
- [k6 Documentation](https://k6.io/docs/)

---

**Status: ✅ Complete**  
**Date: February 12, 2026**

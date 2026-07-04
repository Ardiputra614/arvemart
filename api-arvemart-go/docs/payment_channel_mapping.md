# Payment Channel Code Mapping

## iPaymu (ipaymu_controller.go - mapPaymentChannel)

| Code (input) | Channel (output) | Payment Type |
|---|---|---|
| `bca` | `bca` | bank_transfer |
| `bni` | `bni` | bank_transfer |
| `bri` | `bri` | bank_transfer |
| `mandiri` | `mandiri` | bank_transfer |
| `permata` | `permata` | bank_transfer |
| `cimb` | `cimb` | bank_transfer |
| `danamon` | `danamon` | bank_transfer |
| `qris` | `qris` | qris |
| `gopay` | `gopay` | ewallet (redirect) |
| `shopeepay` | `shopeepay` | ewallet (redirect) |
| `dana` | `dana` | ewallet (redirect) |
| `ovo` | `ovo` | ewallet (redirect) |
| `alfamart` | `alfamart` | cstore |
| `indomaret` | `indomaret` | cstore |
| `kredivo` | `kredivo` | paylater (redirect) |
| `akulaku` | `akulaku` | paylater (redirect) |

### iPaymu Response Fields per Payment Type

| Payment Type | VA Number | QR String | Payment Code | Payment URL |
|---|---|---|---|---|
| `bank_transfer` | `PaymentNo` | - | - | - |
| `qris` | - | `QrString` | - | - |
| `cstore` | - | - | `PaymentNo` | - |
| default (redirect) | - | - | - | `Url` |

---

## Midtrans (midtrans_controller.go - mapPaymentMethod)

| Code (input) | Channel (output) | Payment Type |
|---|---|---|
| `bca` | `bca_va` | bank_transfer |
| `bni` | `bni_va` | bank_transfer |
| `bri` | `bri_va` | bank_transfer |
| `permata` | `permata_va` | bank_transfer |
| `cimb` | `cimb_va` | bank_transfer |
| `mandiri` | `echannel` | bank_transfer |
| `other_va` | `other_va` | bank_transfer |
| `gopay` | `gopay` | ewallet |
| `shopeepay` | `shopeepay` | ewallet |
| `dana` | `dana` | ewallet |
| `uob` | `uob_ezpay` | ewallet |
| `qris` | `qris` | qris |
| `credit_card` | `credit_card` | credit_card |
| `indomaret` | `indomaret` | cstore |
| `alfamart` | `alfamart` | cstore |
| `akulaku` | `akulaku` | paylater |
| `kredivo` | `kredivo` | paylater |

---

## Payment Method Type Mapping (duitku_controller.go - mapPaymentType)

Digunakan untuk menentukan `type` payment method dari code Duitku.

| Code | Type |
|---|---|
| `BC`, `BR`, `M2`, `BT`, `I1`, `B1`, `A1`, `AG`, `BV`, `NC` | `bank_transfer` |
| `OV`, `SA`, `DA`, `LA`, `OL` | `ewallet` |
| `SP`, `LQ`, `NQ`, `GQ` | `qris` |
| `VC` | `cc` |
| `FT`, `IR` | `cstore` |

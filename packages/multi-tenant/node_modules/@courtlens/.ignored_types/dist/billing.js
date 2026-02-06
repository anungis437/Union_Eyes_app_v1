// Enums
export var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["SENT"] = "sent";
    InvoiceStatus["VIEWED"] = "viewed";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["PARTIAL"] = "partial";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (InvoiceStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
})(PaymentStatus || (PaymentStatus = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["CHECK"] = "check";
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["WIRE_TRANSFER"] = "wire_transfer";
    PaymentMethod["INTERAC"] = "interac";
})(PaymentMethod || (PaymentMethod = {}));
export var PaymentProcessorType;
(function (PaymentProcessorType) {
    PaymentProcessorType["STRIPE"] = "stripe";
    PaymentProcessorType["PAYPAL"] = "paypal";
    PaymentProcessorType["MONERIS"] = "moneris";
    PaymentProcessorType["SQUARE"] = "square";
    PaymentProcessorType["MANUAL"] = "manual";
})(PaymentProcessorType || (PaymentProcessorType = {}));
export var TrustTransactionType;
(function (TrustTransactionType) {
    TrustTransactionType["DEPOSIT"] = "deposit";
    TrustTransactionType["WITHDRAWAL"] = "withdrawal";
    TrustTransactionType["TRANSFER"] = "transfer";
    TrustTransactionType["INTEREST"] = "interest";
    TrustTransactionType["FEE"] = "fee";
})(TrustTransactionType || (TrustTransactionType = {}));
export var TrustTransactionStatus;
(function (TrustTransactionStatus) {
    TrustTransactionStatus["PENDING"] = "pending";
    TrustTransactionStatus["APPROVED"] = "approved";
    TrustTransactionStatus["COMPLETED"] = "completed";
    TrustTransactionStatus["REJECTED"] = "rejected";
})(TrustTransactionStatus || (TrustTransactionStatus = {}));
export var TaskCategory;
(function (TaskCategory) {
    TaskCategory["RESEARCH"] = "research";
    TaskCategory["DRAFTING"] = "drafting";
    TaskCategory["CORRESPONDENCE"] = "correspondence";
    TaskCategory["COURT_APPEARANCE"] = "court_appearance";
    TaskCategory["CLIENT_MEETING"] = "client_meeting";
    TaskCategory["NEGOTIATION"] = "negotiation";
    TaskCategory["ADMINISTRATIVE"] = "administrative";
    TaskCategory["TRAVEL"] = "travel";
    TaskCategory["REAL_ESTATE"] = "real_estate";
    TaskCategory["EMPLOYMENT"] = "employment";
    TaskCategory["WILLS_ESTATES"] = "wills_estates";
    TaskCategory["CORPORATE"] = "corporate";
    TaskCategory["LITIGATION"] = "litigation";
    TaskCategory["GENERAL"] = "general";
})(TaskCategory || (TaskCategory = {}));
export var ActivityType;
(function (ActivityType) {
    ActivityType["BILLABLE"] = "billable";
    ActivityType["NON_BILLABLE"] = "non_billable";
    ActivityType["PRO_BONO"] = "pro_bono";
})(ActivityType || (ActivityType = {}));
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["PENDING"] = "pending";
    SyncStatus["ERROR"] = "error";
})(SyncStatus || (SyncStatus = {}));
export var MatterStatus;
(function (MatterStatus) {
    MatterStatus["ACTIVE"] = "active";
    MatterStatus["INACTIVE"] = "inactive";
    MatterStatus["CLOSED"] = "closed";
    MatterStatus["ON_HOLD"] = "on_hold";
})(MatterStatus || (MatterStatus = {}));
export var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["DRAFT"] = "draft";
    ExpenseStatus["SUBMITTED"] = "submitted";
    ExpenseStatus["APPROVED"] = "approved";
    ExpenseStatus["REJECTED"] = "rejected";
    ExpenseStatus["REIMBURSED"] = "reimbursed";
})(ExpenseStatus || (ExpenseStatus = {}));
export var TaxType;
(function (TaxType) {
    TaxType["HST"] = "hst";
    TaxType["GST"] = "gst";
    TaxType["PST"] = "pst";
    TaxType["QST"] = "qst";
})(TaxType || (TaxType = {}));
//# sourceMappingURL=billing.js.map
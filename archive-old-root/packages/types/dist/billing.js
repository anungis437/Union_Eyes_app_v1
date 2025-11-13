"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxType = exports.ExpenseStatus = exports.MatterStatus = exports.SyncStatus = exports.ActivityType = exports.TaskCategory = exports.TrustTransactionStatus = exports.TrustTransactionType = exports.PaymentProcessorType = exports.PaymentMethod = exports.PaymentStatus = exports.InvoiceStatus = void 0;
// Enums
var InvoiceStatus;
(function (InvoiceStatus) {
    InvoiceStatus["DRAFT"] = "draft";
    InvoiceStatus["SENT"] = "sent";
    InvoiceStatus["VIEWED"] = "viewed";
    InvoiceStatus["PAID"] = "paid";
    InvoiceStatus["PARTIAL"] = "partial";
    InvoiceStatus["OVERDUE"] = "overdue";
    InvoiceStatus["CANCELLED"] = "cancelled";
})(InvoiceStatus || (exports.InvoiceStatus = InvoiceStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["CANCELLED"] = "cancelled";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["CHECK"] = "check";
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["WIRE_TRANSFER"] = "wire_transfer";
    PaymentMethod["INTERAC"] = "interac";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentProcessorType;
(function (PaymentProcessorType) {
    PaymentProcessorType["STRIPE"] = "stripe";
    PaymentProcessorType["PAYPAL"] = "paypal";
    PaymentProcessorType["MONERIS"] = "moneris";
    PaymentProcessorType["SQUARE"] = "square";
    PaymentProcessorType["MANUAL"] = "manual";
})(PaymentProcessorType || (exports.PaymentProcessorType = PaymentProcessorType = {}));
var TrustTransactionType;
(function (TrustTransactionType) {
    TrustTransactionType["DEPOSIT"] = "deposit";
    TrustTransactionType["WITHDRAWAL"] = "withdrawal";
    TrustTransactionType["TRANSFER"] = "transfer";
    TrustTransactionType["INTEREST"] = "interest";
    TrustTransactionType["FEE"] = "fee";
})(TrustTransactionType || (exports.TrustTransactionType = TrustTransactionType = {}));
var TrustTransactionStatus;
(function (TrustTransactionStatus) {
    TrustTransactionStatus["PENDING"] = "pending";
    TrustTransactionStatus["APPROVED"] = "approved";
    TrustTransactionStatus["COMPLETED"] = "completed";
    TrustTransactionStatus["REJECTED"] = "rejected";
})(TrustTransactionStatus || (exports.TrustTransactionStatus = TrustTransactionStatus = {}));
var TaskCategory;
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
})(TaskCategory || (exports.TaskCategory = TaskCategory = {}));
var ActivityType;
(function (ActivityType) {
    ActivityType["BILLABLE"] = "billable";
    ActivityType["NON_BILLABLE"] = "non_billable";
    ActivityType["PRO_BONO"] = "pro_bono";
})(ActivityType || (exports.ActivityType = ActivityType = {}));
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["SYNCED"] = "synced";
    SyncStatus["PENDING"] = "pending";
    SyncStatus["ERROR"] = "error";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
var MatterStatus;
(function (MatterStatus) {
    MatterStatus["ACTIVE"] = "active";
    MatterStatus["INACTIVE"] = "inactive";
    MatterStatus["CLOSED"] = "closed";
    MatterStatus["ON_HOLD"] = "on_hold";
})(MatterStatus || (exports.MatterStatus = MatterStatus = {}));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["DRAFT"] = "draft";
    ExpenseStatus["SUBMITTED"] = "submitted";
    ExpenseStatus["APPROVED"] = "approved";
    ExpenseStatus["REJECTED"] = "rejected";
    ExpenseStatus["REIMBURSED"] = "reimbursed";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var TaxType;
(function (TaxType) {
    TaxType["HST"] = "hst";
    TaxType["GST"] = "gst";
    TaxType["PST"] = "pst";
    TaxType["QST"] = "qst";
})(TaxType || (exports.TaxType = TaxType = {}));

# Jurisdiction Features - User Guide

## Introduction

The Union Claims Platform provides comprehensive support for **14 Canadian jurisdictions** (Federal + 10 provinces + 3 territories), ensuring compliance with labour laws across Canada. Each jurisdiction has unique rules for filing deadlines, strike vote thresholds, certification methods, and documentation requirements.

---

## Key Features

### 1. **Automatic Jurisdiction Detection**

Your organization's jurisdiction is automatically detected based on your tenant configuration. This ensures all deadlines, thresholds, and requirements are calculated according to the correct labour laws.

**How it works:**
- When you create a claim, grievance, strike vote, or certification campaign, the system automatically identifies your jurisdiction
- All calculations, forms, and guidance are tailored to your specific legal requirements
- No manual configuration needed

**Example:**
- If your organization is in **Federal** jurisdiction (e.g., banking, telecommunications), you'll see grievance filing deadlines of **25 business days** (CLC §240)
- If your organization is in **Ontario**, you'll see **30 business days** (LRA §48)

---

### 2. **Deadline Calculations with Business Days**

All filing deadlines are calculated in **business days**, automatically excluding:
- **Weekends** (Saturday & Sunday)
- **Statutory holidays** (jurisdiction-specific)
- **Provincial holidays** (for provinces only)

**Supported Calculations:**
- **Grievance Filing Deadlines**: Automatically calculated from incident date
- **Arbitration Filing Deadlines**: For grievances at Step 3 or arbitration status
- **Strike Vote Notice Periods**: Time required before conducting strike vote
- **Certification Application Windows**: Optimal timing for filing

**Visual Indicators:**
- 🔴 **Critical** (Overdue or due today): Red alert
- 🟠 **High** (1-3 days): Orange alert  
- 🟡 **Medium** (4-7 days): Yellow alert
- 🟢 **Low** (8+ days): Green "On Track"

---

### 3. **Bilingual Support**

Three jurisdictions require **bilingual (English/French)** documentation:
- **Federal** (CA-FED): Canada Labour Code requirements
- **Quebec** (CA-QC): Bill 101 language laws
- **New Brunswick** (CA-NB): Official Languages Act

**What it means:**
- All forms and notices are automatically provided in both English and French
- Templates include side-by-side translations
- Legal references cite both official language versions

---

### 4. **Strike Vote Thresholds**

Each jurisdiction has specific requirements for strike vote passage:

| Jurisdiction | Threshold | Calculation Base |
|--------------|-----------|------------------|
| **Manitoba** | **65%** | Votes cast (super-majority) |
| **New Brunswick** | **60%** | Votes cast |
| **Saskatchewan** | **45%** | **All eligible members** (unique rule) |
| **All Others** | **50%+1** | Votes cast (simple majority) |

**Real-Time Vote Tracking:**
- Live progress bars show vote status
- Automatic pass/fail determination based on jurisdiction rules
- Multi-jurisdiction comparison for educational purposes

**Saskatchewan Special Rule:**
Saskatchewan is the only jurisdiction where the threshold is based on **all eligible members**, not just votes cast. This means:
- ✅ **Passes**: If 45% or more of ALL eligible members vote "Yes"
- ❌ **Fails**: Even if 100% of votes cast are "Yes," if fewer than 45% of eligible members voted "Yes"

---

### 5. **Certification Methods**

Two certification methods are available, depending on jurisdiction:

#### **Card-Check** (8 jurisdictions)
Automatic certification without a vote, if support meets threshold:

| Jurisdiction | Threshold |
|--------------|-----------|
| **Saskatchewan** | **45%** (lowest) |
| **British Columbia** | **55%** |
| **Quebec, Prince Edward Island** | **50%** |
| **Alberta, Manitoba, Newfoundland** | **65%** (highest) |

#### **Mandatory Vote** (3 jurisdictions)
Vote required regardless of support level:
- **Federal**: 35% minimum support to trigger vote
- **Nova Scotia**: 40% minimum support to trigger vote
- **Ontario**: 40% minimum support to trigger vote

**Recommendation Engine:**
The system automatically recommends the best certification method based on your current support level:
- **Card-Check**: If support ≥ threshold AND card-check available
- **Mandatory Vote**: If support 35-threshold% AND mandatory vote supported
- **Insufficient Support**: If support < 35% (continue organizing)

---

### 6. **Interactive Deadline Calculator**

Every workflow page includes an **embedded deadline calculator**:

**Features:**
- **Date Picker**: Select any start date
- **Business Days Slider**: Adjust number of business days (1-100)
- **Holiday Visualization**: Calendar view shows all statutory holidays
- **Export**: Download calculation results as PDF

**Use Cases:**
- "What if" scenarios: "What if we file next Monday instead of today?"
- Verify system calculations
- Plan future actions with advance notice

**Example Calculation:**
```
Start Date: January 15, 2025 (Wednesday)
Business Days: 25 (Federal grievance)
Holidays Excluded: None in January
Result: February 19, 2025 (Wednesday)
```

---

### 7. **Multi-Jurisdiction Comparison**

Educational cards on every page allow you to **compare your jurisdiction with others**:

**Strike Vote Example:**
```
Your Jurisdiction (Manitoba): 65% required
vs.
Saskatchewan: 45% (45% of eligible members)
Ontario: 50%+1 (simple majority)
Federal: 50%+1 (simple majority)
```

**Why this is helpful:**
- Understand how your jurisdiction compares to others
- Plan for campaigns in multiple provinces
- Educate members about national labour law differences

---

### 8. **Legal References**

Every rule includes a **legal citation** linking to the relevant legislation:

**Examples:**
- **Federal**: Canada Labour Code §240 (grievance filing)
- **Ontario**: Labour Relations Act §48 (grievance filing)
- **Quebec**: Labour Code Art. 100.10 (certification)
- **Alberta**: Labour Relations Code s.18 (strike vote)

**Why this matters:**
- Verify system calculations against official legislation
- Cite in legal filings and arbitration briefs
- Train organizers and staff on labour law

---

## How to View Your Jurisdiction

### **Option 1: Claims, Grievances, or Strike Votes**
When you view any claim, grievance, strike vote, or certification campaign:
1. Look for the **"Jurisdiction Information"** card at the top
2. You'll see:
   - Your jurisdiction badge (e.g., 🇨🇦 Federal, 🇴🇳 Ontario)
   - Bilingual indicator (if applicable): 🌐 EN/FR
   - Relevant deadlines with urgency indicators
   - Legal references

### **Option 2: Organization Settings**
Navigate to **Settings → Organization** to view your organization's jurisdiction configuration.

---

## Common Questions

### **Q: Why are business days used instead of calendar days?**
**A:** Canadian labour law universally uses **business days** for filing deadlines, excluding weekends and statutory holidays. This gives parties more working time and avoids unfair disadvantage when deadlines fall on holidays.

### **Q: What happens if I'm in Quebec and file forms in English only?**
**A:** Quebec requires bilingual documentation under Bill 101. The system automatically provides both English and French versions of all forms and notices. Filing in English only may result in rejection by the Tribunal administratif du travail (TAT).

### **Q: Can I change my organization's jurisdiction?**
**A:** Jurisdiction is determined by your employer's industry and location under Canadian labour law. Contact your administrator if you believe your jurisdiction is incorrectly configured.

### **Q: How often are statutory holidays updated?**
**A:** The system is updated annually before each calendar year. Holiday dates for 2025, 2026, and 2027 are already loaded. Federal and provincial holidays are jurisdiction-specific.

### **Q: What if a deadline falls on a holiday?**
**A:** If a calculated deadline falls on a weekend or statutory holiday, the system automatically moves the deadline to the next business day, in compliance with Canadian labour law interpretation rules.

### **Q: Does the system support territorial jurisdictions?**
**A:** Yes! All three territories are fully supported:
- **Northwest Territories** (CA-NT)
- **Nunavut** (CA-NU)
- **Yukon** (CA-YT)

Each territory has its own labour laws and holiday schedules.

---

## Getting Help

If you have questions about jurisdiction rules, contact:
- **Your Union Representative**: For guidance on your specific case
- **System Administrator**: For technical issues or configuration
- **Platform Support**: support@unionclaims.ca

For legal advice, consult a labour lawyer licensed in your jurisdiction.

---

## Next Steps

- **[Deadline Calculator Tutorial](./deadline-calculator-tutorial.md)**: Step-by-step guide to using the calculator
- **[Jurisdiction Reference](../jurisdiction-reference/all-jurisdictions.md)**: Complete table of all 14 jurisdictions × 10 rule categories
- **[Developer Integration Guide](../developer/jurisdiction-integration-guide.md)**: For developers adding jurisdiction support to new modules

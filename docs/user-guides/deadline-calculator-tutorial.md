# Deadline Calculator - Step-by-Step Tutorial

## Introduction

The **Deadline Calculator** helps you calculate accurate filing deadlines for grievances, arbitrations, and other labour relations workflows. All calculations are done in **business days**, automatically excluding weekends and statutory holidays specific to your jurisdiction.

---

## When to Use the Calculator

### **Scenario 1: Calculating Grievance Filing Deadline**
You need to know the **last day** to file a grievance after an incident occurs.

**Example:**
- Incident Date: January 15, 2025
- Jurisdiction: Federal (25 business days)
- Result: February 19, 2025

### **Scenario 2: Planning Future Actions**
You want to file a grievance next Monday and need to know the deadline.

**Example:**
- Start Date: January 20, 2025 (Monday)
- Business Days: 25
- Result: February 21, 2025

### **Scenario 3: Verifying System Calculations**
The system calculated a deadline for you, and you want to double-check it.

---

## Step-by-Step Tutorial

### **Step 1: Open the Calculator**

The calculator is embedded on every workflow page:
1. Navigate to any **Claim**, **Grievance**, or **Strike Vote** page
2. Look for the **"Jurisdiction Information"** card
3. Click the **"Calculate Different Deadline"** button

A modal dialog will open with the calculator interface.

---

### **Step 2: Select Start Date**

**Instructions:**
1. Click the **"Start Date"** field
2. A calendar picker will appear
3. Click on the date when the deadline clock starts (e.g., incident date, notice date)
4. The selected date will appear in the field

**Tips:**
- For **grievances**, use the **incident date** (the day the alleged violation occurred)
- For **arbitration**, use the **grievance rejection date** (Step 3 or final step)
- For **strike votes**, use the **bargaining impasse date**

**Visual Indicators:**
- 📅 Current date is highlighted in **blue**
- 🔴 Selected date is highlighted in **green**
- 🚫 Weekends are grayed out (for reference, but system handles automatically)

---

### **Step 3: Enter Number of Business Days**

**Instructions:**
1. Locate the **"Business Days"** slider or input field
2. Enter the number of business days required by your jurisdiction
   - **Federal**: 25 business days (most common)
   - **Ontario**: 30 business days (grievances)
   - **Quebec**: 15 calendar days (converted to ~10 business days)
3. The system will automatically update the result

**Common Deadlines by Jurisdiction:**

| Jurisdiction | Grievance Filing | Arbitration Filing |
|--------------|------------------|--------------------|
| Federal | 25 business days | 90 calendar days |
| Alberta | 30 business days | 60 days after Step 3 |
| Ontario | 30 business days | No fixed deadline |
| Quebec | 15 calendar days | 60 days after rejection |
| British Columbia | 30 business days | 60 days after Step 3 |

**Note:** The system defaults to your jurisdiction's most common deadline, but you can override it for "what if" scenarios.

---

### **Step 4: Review Holidays Excluded**

The calculator automatically displays all statutory holidays that will be excluded from the calculation.

**Holiday Card Example:**
```
🎄 Holidays Excluded (3):
✓ Christmas Day - December 25, 2024
✓ Boxing Day - December 26, 2024
✓ New Year's Day - January 1, 2025
```

**Why this matters:**
- If your deadline period crosses a holiday, the deadline automatically moves forward
- Different jurisdictions have different holidays (e.g., Family Day in Ontario but not Quebec)
- Federal holidays differ from provincial holidays

**Federal Statutory Holidays (2025):**
- New Year's Day: January 1
- Good Friday: April 18
- Easter Monday: April 21
- Victoria Day: May 19
- Canada Day: July 1
- Civic Holiday: August 4
- Labour Day: September 1
- Thanksgiving: October 13
- Remembrance Day: November 11
- Christmas Day: December 25
- Boxing Day: December 26

**Provincial Holidays (Examples):**
- **Ontario**: Family Day (3rd Monday in February)
- **Quebec**: National Patriots' Day (Monday before May 25)
- **Alberta**: Heritage Day (1st Monday in August)

---

### **Step 5: View Calculated Deadline**

After entering the start date and business days, the calculator displays:

**Result Card Example:**
```
📅 Deadline: February 19, 2025 (Wednesday)

Calculation:
Start: January 15, 2025 (Wednesday)
+ 25 business days
= February 19, 2025 (Wednesday)

Holidays Excluded: None
Weekends Excluded: 10 days (5 weekends)
```

**Urgency Indicator:**
- 🟢 **On Track**: 15 days remaining (green background)
- 🟡 **Upcoming**: 6 days remaining (yellow background)
- 🟠 **Urgent**: 2 days remaining (orange background)
- 🔴 **Critical**: Overdue or due today (red background)

---

### **Step 6: Export Results (Optional)**

If you need to document the calculation for legal purposes:

1. Click the **"Export as PDF"** button at the bottom of the calculator
2. A PDF report will be generated with:
   - Start date, business days, and calculated deadline
   - List of holidays excluded
   - Legal reference (e.g., CLC §240)
   - Calculation timestamp
   - Your organization name and jurisdiction
3. Save the PDF to your case file or email it to your team

**PDF Report Example:**
```
Deadline Calculation Report
Generated: January 20, 2025 at 10:45 AM

Organization: Canadian Workers Union - Local 123
Jurisdiction: Federal (CA-FED)
Legal Reference: Canada Labour Code §240

Start Date: January 15, 2025
Business Days: 25
Calculated Deadline: February 19, 2025

Holidays Excluded: None
Weekends Excluded: January 18-19, 25-26, February 1-2, 8-9, 15-16

Notes:
- This calculation excludes weekends (Saturday & Sunday)
- This calculation excludes federal statutory holidays
- If deadline falls on a holiday, it moves to the next business day
```

---

## Interactive Scenarios

### **Scenario 1: Federal Grievance Crossing Christmas**

**Facts:**
- Incident Date: December 23, 2024 (Monday)
- Jurisdiction: Federal (25 business days)
- Holidays: Christmas (Dec 25), Boxing Day (Dec 26), New Year's Day (Jan 1)

**Calculation:**
```
Start: December 23, 2024
+ 25 business days
= February 5, 2025

Holidays Excluded:
- December 25, 2024 (Christmas Day)
- December 26, 2024 (Boxing Day)
- January 1, 2025 (New Year's Day)

Weekends Excluded:
- Dec 28-29, Jan 4-5, 11-12, 18-19, 25-26, Feb 1-2
```

**Why this matters:**
Without the calculator, you might miscalculate the deadline by not accounting for holidays falling mid-week.

---

### **Scenario 2: Ontario Grievance with Family Day**

**Facts:**
- Incident Date: February 3, 2025 (Monday)
- Jurisdiction: Ontario (30 business days)
- Holidays: Family Day (Feb 17, 2025 - 3rd Monday in February)

**Calculation:**
```
Start: February 3, 2025
+ 30 business days
= March 17, 2025

Holidays Excluded:
- February 17, 2025 (Family Day - Ontario only)

Weekends Excluded:
- Feb 8-9, 15-16, 22-23, Mar 1-2, 8-9, 15-16
```

**Note:** If you were in **Federal** jurisdiction, Family Day would NOT be excluded (it's not a federal holiday), and the deadline would be March 14, 2025 instead.

---

### **Scenario 3: Quebec Grievance with Bilingual Requirements**

**Facts:**
- Incident Date: January 10, 2025 (Friday)
- Jurisdiction: Quebec (15 calendar days, converted to business days)
- Holidays: None in January

**Calculation:**
```
Start: January 10, 2025
+ 10 business days (approx. 15 calendar days)
= January 24, 2025

Holidays Excluded: None

Weekends Excluded:
- January 11-12, 18-19

🌐 Bilingual Requirement: All forms must be submitted in both English and French
```

**Special Note:**
Quebec labour law requires **calendar days**, not business days. The calculator converts this to approximately **10 business days** for consistency, but you should always verify with the Tribunal administratif du travail (TAT) if the calculated deadline falls on a weekend or holiday.

---

### **Scenario 4: Year Boundary Crossing**

**Facts:**
- Incident Date: December 15, 2024 (Sunday → moves to Dec 16 Monday)
- Jurisdiction: Federal (25 business days)
- Holidays: Christmas (Dec 25), Boxing Day (Dec 26), New Year's Day (Jan 1)

**Calculation:**
```
Start: December 16, 2024 (Monday - Dec 15 was Sunday)
+ 25 business days
= January 28, 2025

Holidays Excluded:
- December 25, 2024 (Christmas Day)
- December 26, 2024 (Boxing Day)
- January 1, 2025 (New Year's Day)

Weekends Excluded:
- Dec 21-22, 28-29, Jan 4-5, 11-12, 18-19, 25-26

Year Boundary: Deadline crosses into 2025
```

**Why this matters:**
Year boundaries can be confusing when manually calculating deadlines, especially with multiple holidays clustered around Christmas and New Year's.

---

## Tips for Deadline Compliance

### **1. Start Early**
Always aim to file **at least 3-5 business days before the deadline** to account for:
- Technical issues (email servers, system downtime)
- Missing information (need to gather additional documents)
- Approval delays (supervisor review required)

### **2. Set Calendar Reminders**
After calculating a deadline:
- Add it to your calendar with **3 reminders**:
  - 🟢 7 days before: "Prepare filing documents"
  - 🟡 3 days before: "Final review and approvals"
  - 🔴 1 day before: "File by end of day tomorrow"

### **3. Export and Document**
Always export the calculation as a PDF and save it in your case file. If a deadline is disputed later, you can prove how you calculated it.

### **4. Verify with Legal**
For high-stakes cases (e.g., wrongful termination, safety violations), have your labour lawyer verify the deadline calculation before filing.

### **5. Use the "What If" Feature**
Before finalizing a filing date, use the calculator to test different start dates:
- "What if I file Monday vs. Wednesday?"
- "What if the incident date is disputed?"
- "What if there's a holiday I forgot about?"

---

## Troubleshooting

### **Issue 1: Calculated deadline seems wrong**
**Solution:**
- Double-check the start date (did you use incident date or discovery date?)
- Verify your jurisdiction (Federal vs. provincial rules differ)
- Check if a holiday was missed (system updates annually)

### **Issue 2: System calculated different deadline than me**
**Solution:**
- Ensure you're using **business days**, not calendar days
- Verify you excluded all weekends and holidays correctly
- Check if the start date falls on a weekend (system auto-adjusts to Monday)

### **Issue 3: Deadline falls on a holiday**
**Solution:**
- The system automatically moves the deadline to the **next business day**
- This is standard Canadian labour law interpretation
- Export the calculation as proof of your deadline extension

---

## Common Mistakes to Avoid

❌ **Mistake 1:** Counting calendar days instead of business days  
✅ **Correct:** Always use business days for grievance and arbitration deadlines

❌ **Mistake 2:** Forgetting provincial holidays  
✅ **Correct:** Use the calculator, which has all jurisdiction-specific holidays loaded

❌ **Mistake 3:** Starting count from day after incident  
✅ **Correct:** Start count from the incident date itself (day 0)

❌ **Mistake 4:** Filing on the deadline day after business hours  
✅ **Correct:** File by **end of business day** (typically 4:30 PM) on the deadline date

---

## Next Steps

- **[Jurisdiction Features Overview](./jurisdiction-features-overview.md)**: Learn about all jurisdiction features
- **[Jurisdiction Reference](../jurisdiction-reference/all-jurisdictions.md)**: Complete table of all 14 jurisdictions × 10 rule categories
- **[Developer Integration Guide](../developer/jurisdiction-integration-guide.md)**: For developers integrating the calculator into new modules

---

## Getting Help

If you're unsure about a deadline calculation:
- **Consult your Union Representative**: For guidance on specific cases
- **Contact System Administrator**: For technical issues
- **Email Platform Support**: support@unionclaims.ca
- **Legal Advice**: Consult a labour lawyer licensed in your jurisdiction

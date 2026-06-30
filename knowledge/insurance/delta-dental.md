# Delta Dental — West Michigan Reference

> **Audience:** FreedomDesk AI — insurance intake and caller questions.  
> **Priority market:** Delta Dental of Michigan is the **most common commercial carrier** in Grand Rapids.  
> **Critical rule:** Delta Dental **PPO** and Delta Dental **Medicaid** are different programs — never conflate.

---

## Programs FreedomDesk Must Distinguish

| Program | Who has it | `planType` | Verification in OD |
|---------|------------|------------|-------------------|
| **Delta Dental PPO** | Employer-sponsored; most working adults | `PPO` | Standard PPO eligibility |
| **Delta Dental Premier** | Some employers (legacy) | `PPO` (note Premier) | May differ fee schedule |
| **Delta Dental Medicaid** | Michigan Medicaid adults/children via Delta admin | `Medicaid` | Medicaid fee schedule |
| **Healthy Kids Dental** | Children on Medicaid — **administered by Delta** | `HKD` | Separate from adult Medicaid |

**Caller says "I have Delta" — always ask:**
> "Is that Delta Dental through your employer, or state insurance like Medicaid or Healthy Kids Dental?"

---

## Delta Dental PPO (Employer)

### Caller patterns

- "Delta through work"
- "Delta Dental of Michigan"
- "My employer is [local company] — we have Delta"
- Card shows "PPO" or group number

### FreedomDesk intake

```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "PPO",
    "memberId": "from card",
    "employer": "if mentioned"
  }
}
```

### What FreedomDesk can say (if `practice_config.inNetworkDeltaPPO: true`)

> "Yes, we're in-network with Delta Dental PPO. We'll verify your benefits before your visit — please bring your card."

### What FreedomDesk cannot say

- "Your cleaning will be covered"
- "You have $800 left on your annual max"
- "Delta will pay 80% of your crown"

### Common Grand Rapids employers (examples for context)

Manufacturing, healthcare systems, universities, and professional firms often offer Delta PPO. Employer name helps front desk but is optional on intake.

---

## Delta Dental Medicaid

### Caller patterns

- "Delta for Medicaid"
- "State insurance through Delta"
- "I have Medicaid and the card says Delta"
- Adult on MI Medicaid with dental benefit via Delta

### Not the same as HKD

HKD is pediatric — see `healthy-kids-dental.md`.

### FreedomDesk intake

```json
{
  "insurance": {
    "carrier": "Delta Dental",
    "planType": "Medicaid",
    "medicaidId": "required if available"
  }
}
```

### Practice acceptance

Only schedule if `practice_config.acceptedMedicaidPrograms` includes `delta_dental_medicaid`.

If not accepted:
> "For that plan, you may want to check the Michigan Medicaid dental provider list. We can also see you as a cash-pay patient if you'd like — our team can discuss fees at your visit."

---

## Delta Premier vs PPO

Some patients have **Premier** network plans. FreedomDesk:

- Record `notes: "Delta Premier mentioned"` if caller specifies
- Front desk verifies participation — many GPs participate in PPO; Premier varies
- Do not guarantee same benefits as PPO

---

## Delta DMO / HMO

If caller mentions **DMO** or **assigned dentist**:

- Check `practice_config.acceptsDeltaDMO`
- Patient may need to transfer assignment to practice
- FreedomDesk: "With a DMO plan you may need to have our office assigned as your dentist — our team can help with that when you come in."

---

## Card Information to Collect

| Field | PPO | Medicaid |
|-------|-----|----------|
| Member ID | ✅ | Often same as Medicaid ID |
| Group number | Helpful | N/A |
| Subscriber name | If dependent | Guardian for child |
| Employer | Optional | N/A |

**Caller:** "I don't have my card handy."  
→ Proceed with scheduling; `memberId: null` — "Please bring your card to your visit."

---

## Misclassification Examples (Avoid)

| Wrong | Right |
|-------|-------|
| Caller: "Delta" → recorded as PPO without asking | Ask employer vs state |
| HKD recorded as Delta PPO | Child + state → HKD |
| Adult Medicaid recorded as HKD | Adult → Michigan Medicaid or Delta Medicaid |
| "Delta covers everything" told to caller | "We'll verify benefits" |

---

## Open Dental Notes

- Insurance plans may be labeled `Delta Dental PPO`, `Delta MCaid`, etc. — per office setup
- FreedomDesk summary should use canonical taxonomy; front desk maps to OD insplan
- Comm log: "Insurance: Delta Dental PPO, Member ID xxx — verify eligibility"

---

## Example Dialogues

### New patient — Delta PPO

**Caller:** "Do you take Delta? I just started at a job in Grand Rapids."  
**Aly:** "Yes, we're in-network with Delta Dental PPO. Is your plan through your employer?"  
**Caller:** "Yes."  
**Aly:** "Perfect. If you have your member ID I can note it — otherwise bring your card. Would you like to schedule a new patient exam?"

### Disambiguation required

**Caller:** "We have Delta Dental."  
**Aly:** "Is that through an employer, or state insurance like Medicaid or Healthy Kids?"  
**Caller:** "It's for my kids — Healthy Kids."  
→ Route to HKD intake.

---

## Related Documents

- `knowledge/insurance/concepts.md`
- `knowledge/insurance/healthy-kids-dental.md`
- `knowledge/insurance/michigan-medicaid.md`

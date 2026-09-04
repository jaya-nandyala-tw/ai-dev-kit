---
name: generate-test-suite
description: "Generate a TSV test suite for a given flow or feature, formatted for direct copy-paste into your team's manual test-tracking spreadsheet. Use when asked to create test cases, generate a test suite, or populate the test suite for a flow."
argument-hint: "Flow name or feature area (e.g. 'Checkout', 'Onboarding V2')"
---

<!--
GENERICIZED TEMPLATE — this skill's TSV schema/row-layout mechanism is generic and reusable
for any team that tracks manual QA test cases in a spreadsheet (Excel, Sheets, SharePoint, etc.).
Fill in:
  - The "Supported flows" table with your own flows and spec paths (or delete it and always
    derive from the user's description).
  - The output filename convention / target spreadsheet if different from a local TSV file.
-->

# Generate Test Suite

Produce a TSV file (tab-separated) that can be pasted directly into your team's manual test-tracking spreadsheet.

## When to Use
- "Create a test suite for [flow]"
- "Generate test cases for the test suite"
- "Populate test scenarios for [feature]"
- User shows the test suite columns and asks for rows

## TSV Schema

Exactly these columns in this order:

| Column | Notes |
|---|---|
| `S. No.` | Integer group number. Appears only on the **first step of the first sub-flow** in the group; blank on all other rows. Continue from the last row number in the sheet if known. |
| `Scenario` | Short label for the feature area / group (e.g. `Checkout`). Appears only once per group, same cell as S. No. |
| `Flow Type` | Sub-flow name within the group (e.g. `Checkout – Guest User`). Appears on the **first step of each sub-flow**; blank on continuation step rows. |
| `Steps To Follow` | A single step per row. No numbering prefix. Plain imperative sentence. |
| `Desired state` | Expected visible outcome — only on the first step row of the sub-flow; blank on continuation rows. |
| `Assignee` | Leave blank unless specified. |
| `Status` | `Pending` by default (tester updates). |
| `Notes` | Pre-conditions go here as `Pre-condition: <text>`. Leave blank otherwise. Only on the first step row of the sub-flow. |
| `Evidence` | Leave blank (tester fills in). |

## Row Layout Rules

```
S.No  Scenario   Flow Type              Steps To Follow                  Desired state   ...  Notes
────  ─────────  ─────────────────────  ───────────────────────────────  ──────────────  ...  ───────────────────────
26    Checkout   Open Cart              Click the cart icon              Cart opens           Pre-condition: Logged in
                                        Confirm cart has expected items
                 Checkout – Guest User  Click "Checkout as Guest"        Order confirmed
                                        Enter shipping details
                                        Submit payment
```

Key rules:
- `S. No.` and `Scenario` appear **exactly once** per group (first row only).
- `Flow Type` appears on the **first step** of each sub-flow; blank on continuation steps.
- `Desired state`, `Status`, `Notes`, `Evidence` appear on the **first step row** of each sub-flow; blank on continuation rows.
- **No step numbering** in `Steps To Follow` — no `1.`, `2.`, `3.` prefixes.
- **No sub-scenario numbering** — do not use `26.1`, `26.2` etc.

## Procedure

### 1. Identify the Flow

Ask (or infer from context) which flow or feature area to generate scenarios for. If the user provides existing rows from the sheet, extract the last `S. No.` to continue numbering from the correct offset.

Supported flows — load the corresponding spec for step/state details (fill in your own):

| Flow | Spec File |
|---|---|
| `<flow-name>` | `specs/product/flows/<flow-slug>.md` |

If the flow is not listed, derive scenarios from the user's description and any relevant spec/code context.

### 2. Enumerate Sub-flows and Steps

For each named sub-flow within the feature area, identify all tester-visible actions. Follow this checklist:

- **Happy path first** — primary success scenario for each sub-flow
- **Edge cases** — empty state, validation error, permission denied, unsaved changes
- **Negative paths** — invalid input, missing required field, API/network error
- **Toggle-gated flows** — list the toggle as a pre-condition in Notes

Minimum coverage per flow:
- At least one happy-path sub-flow
- At least one validation/error sub-flow per form or modal
- At least one empty-state sub-flow where the feature has a list or table

### 3. Write Steps

Each step goes in its own row. Rules:
- Plain imperative sentence: `Click the submit button`
- No numbering prefix (no `1.`, `2.`, etc.)
- Tester-actionable — no implementation details or API calls unless it is an API test scenario

### 4. Write Desired State

State the visible outcome, not the internal mechanism:

- ✅ `Checkout modal closes; order confirmation appears with status 'Confirmed'`
- ❌ `POST /api/v1/orders returns 201`

For API-level test groups (e.g. CI/CD sync tests), the desired state may be an HTTP status + visible DB/registry state.

### 5. Handle Pre-conditions

If a sub-flow requires setup (feature toggle, specific user role, existing data), put it in the **Notes** column of the first step row:

```
Pre-condition: `enableCheckoutV2` toggle must be ON for the test user
```

Do **not** create a separate Pre-conditions column.

### 6. Produce the TSV File

Save to `e2e-suites/<flow-slug>-test-scenarios.tsv`. Use Python with `csv.writer(delimiter='\t')`.

```python
import csv

OUT_HEADER = [
    "S. No.", "Scenario", "Flow Type", "Steps To Follow",
    "Desired state", "Assignee", "Status", "Notes", "Evidence",
]

GROUPS = [
    # (group_num, group_label, [(sub_flow_name, [steps], desired, notes), ...])
]

with open("e2e-suites/<flow-slug>-test-scenarios.tsv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL)
    writer.writerow(OUT_HEADER)
    for grp_num, grp_label, subs in GROUPS:
        for sub_idx, (flow_name, steps, desired, notes) in enumerate(subs):
            for step_idx, step in enumerate(steps):
                if step_idx == 0 and sub_idx == 0:
                    row = [grp_num, grp_label, flow_name, step, desired, "", "Pending", notes, ""]
                elif step_idx == 0:
                    row = ["", "", flow_name, step, desired, "", "Pending", notes, ""]
                else:
                    row = ["", "", "", step, "", "", "", "", ""]
                writer.writerow([c.replace("\t", " ") for c in [str(x) for x in row]])
```

### 7. Preview and Offer Additions

Show a plain-text table preview of the first group in the chat response.

Then ask:
> "Would you like me to add edge-case sub-flows, error paths, or additional feature groups?"

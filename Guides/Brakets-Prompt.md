Act as an elite staff fintech engineer and expert UX designer. I am building a high-fidelity tax optimizer web app called "Brackets · Tax Optimizer" using React, Vite, and Tailwind CSS. The focus is on pristine UX data visualization and flawless institutional-grade edge-case handling for a design portfolio.

Please architect, write, and organize the complete functional code across five separate, clean modules using standard JavaScript and React (JSX). Provide complete, production-grade code with zero placeholders, truncated logic, or omissions.

### 1. FILE ARCHITECTURE REQUIREMENT

Organize the entire codebase layout into these exact files:

1. `src/lib/brackets.js` (Static arrays, variables, and parameters only; no active functions)
2. `src/lib/taxBC.js` (Specialized provincial calculation module)
3. `src/lib/tax.js` (Primary calculation engine & iterative 5-pass optimization loop)
4. `src/lib/copywriting.js` (Decoupled text strings and instructional summaries for UI states)
5. `src/App.jsx` (Interactive dashboard canvas layout with custom increment buttons, alerts, and pure Tailwind charts)

### 2. THE HARD INDEXED DATA PARAMETERS (brackets.js)

Ensure your static database houses these exact official parameters:

- 2025 FED Brackets: [{lo:0, r:15}, {lo:57375, r:20.5}, {lo:114750, r:26}, {lo:177882, r:29.3}, {lo:253414, r:33}]
- 2026 FED Brackets: [{lo:0, r:15}, {lo:58524, r:20.5}, {lo:117046, r:26}, {lo:181441, r:29.3}, {lo:258483, r:33}]
- 2025 PROV Brackets:
    - AB: [{lo:0, r:10}, {lo:150894, r:12}, {lo:180989, r:13}, {lo:241175, r:14}, {lo:362961, r:15}]
    - BC: [{lo:0, r:5.06}, {lo:46561, r:7.7}, {lo:93127, r:10.5}, {lo:106918, r:12.29}, {lo:137494, r:14.7}, {lo:177882, r:16.8}, {lo:260310, r:20.5}]
    - SK: [{lo:0, r:10.5}, {lo:53329, r:12.5}, {lo:152399, r:14.5}]
- 2026 PROV Brackets:
    - AB: [{lo:0, r:10}, {lo:154260, r:12}, {lo:185112, r:13}, {lo:246814, r:14}, {lo:370221, r:15}]
    - BC: [{lo:0, r:5.06}, {lo:47549, r:7.7}, {lo:95103, r:10.5}, {lo:109188, r:12.29}, {lo:140431, r:14.7}, {lo:181441, r:16.8}, {lo:265546, r:20.5}]
    - SK: [{lo:0, r:10.5}, {lo:54533, r:12.5}, {lo:155806, r:14.5}]
- BPA PARAMS (Fed Max / Fed Min / Fed Threshold / Fed MaxLimit / AB / BC / SK):
    - 2025: {fedMax:16130, fedMin:15124, fedThresh:177882, fedMaxLim:253414, AB:22230, BC:12580, SK:19926}
    - 2026: {fedMax:16453, fedMin:15426, fedThresh:181441, fedMaxLim:258483, AB:22770, BC:12842, SK:20382}
- CPP TIER PARAMETERS (YMPE / YAMPE / BaseRate / CPP2Rate / MaxBase / MaxCPP2 / Exemption):
    - 2025: {ympe:71300, yampe:81200, r1:0.119, r2:0.08, max1:8068.20, max2:792, ex:3500}
    - 2026: {ympe:74600, yampe:85000, r1:0.119, r2:0.08, max1:8460.90, max2:832, ex:3500}
- CLAWBACK FOR BC:
    - 2025: {lo:25020, hi:40807, rate:0.0356, maxCredit:562}
    - 2026: {lo:25570, hi:44952, rate:0.0356, maxCredit:690}
- LIMITS MATRICES:
    - 2025: {rrspMax:32490, fhsaAnnual:8000, tfsaAnnual:7000}
    - 2026: {rrspMax:33810, fhsaAnnual:8000, tfsaAnnual:7000}

### 3. MATHEMATICS AND CALCULATION CORE MANDATE

To maintain perfect mathematical rigor, you must split federal and provincial passes to isolate non-refundable behaviors:

1. **Multi-Source Stacking Order for SE CPP:** T4 employment income always consumes the $3,500 basic exemption and fills the Tier 1 (YMPE) and Tier 2 (YAMPE) ceilings first. If T4 income exceeds $3,500, the available exemption for Self-Employment (SE) income drops to $0. SE Net income calculates contributions strictly on the remaining unfilled room up to YMPE (at 11.9%) and YAMPE (at 8%). The 50% matching employer portion deduction and the 4.95/11.90 non-refundable tax credit base must be calculated solely on the SE-generated fraction.
2. **Federal BPA Phase-out Calculation:** For net incomes between the Fed Threshold and Fed MaxLimit, the Federal Basic Personal Amount scales linearly down from FedMax to FedMin using the official fraction formula.
3. **BC Low Income Reduction Credit (taxBC.js):** Apply full credit below the threshold, a clawback phase-out at exactly 3.56% inside the clawback zone, and 0 past the upper cap. Enforce an explicit non-refundable guard clause: `Math.max(0, rawProvincialTax - reduction)` so provincial tax never drops below $0.
4. **Capital Gains Bifurcation:** Standard 50% inclusion factor applies to capital gains under $250,000. Step up to a 2/3 (66.67%) inclusion factor on any calendar dollar exceeding $250,000 within a single year.
5. **RRSP Room Adjustments:** Account for employer matching. Dynamic available RRSP room must be filled and reduced by double the matching percentage: `Available Room = InputRoom - AlreadyContributed - (T4Income * Match% * 2)`.
6. **FHSA Ceiling Rules:** Annual contributions cannot exceed the lesser of this year's room or the remaining lifetime room ($40,000 minus total historically used).
7. **ADDITIONAL DEDUCTIONS & CREDITS MATRICES:**
    - Tuition Paid (Line 32300): Apply as a non-refundable tax credit calculated at the baseline lowest tax brackets (15% Federal + lowest provincial rate).
    - Childcare Expenses (Line 21400): Treat as a direct net income deduction. Provide a contextual micro-copy label underneath: "📋 Note: Per CRA guidelines, childcare deductions must be claimed by the lower net-income household earner."
    - Medical Expenses (Line 33099): Implement the strict CRA threshold formula. Deduct an initial floor from total input expense equal to the LESSER of 3% of calculated Net Income or the indexed limit ($2,721 for 2025; $2,792 for 2026). Calculate credit using lowest statutory bracket rates. Provide micro-copy underneath: "📋 Note: Medical expenses must exceed 3% of your net income to qualify. For couples, optimization is maximized by pooling receipts on the lower-income earner's return."

### 4. THE OPTIMIZATION ENGINE PATTERN (tax.js)

Build a 5-pass cyclical convergence loop inside `tax.js`. The loop must calculate tax owing first, deduce the true investable cash pool (`Cash Input - Tax/CPP Owing`), and then systematically distribute capital across FHSA, RRSP, and TFSA. It must enforce a dynamic income floor ($21,000 for BC; $16,453 for AB/SK) to prevent the system from burning valuable deductions inside brackets that are already completely tax-free.

The engine must export an array called `combinedBracketsPlotData`. To build this, merge all federal and provincial lower-bound income points into a single, sorted, unique array. For each segment, calculate the combined marginal rate (Federal + Provincial). Also return coordinates for `incomeBeforeContributions` and `incomeAfterContributions`. Return a boolean `isCashDeficit` flag if `Available Cash < Total Tax/CPP Owed`.

### 5. DYNAMIC INTERACTION LAYER & GRAPH COMPONENTS (App.jsx)

Build an elegant, single-page dashboard grid matching these UI rules:

- **Header Section:** "Brackets · Tax optimizer". Includes custom dropdowns for year selection and province selection (showing full provincial names alongside codes, e.g., "British Columbia (BC)").
- **Input Adjusters:** Group inputs logically into Sections (T4 Employment, SE Income, Other Income Chips, Deductions Chips, Registered Accounts, Available Cash). Every numerical text input field must feature an interactive layout with custom step buttons on the right margin (- / + buttons). Clicking them decrements/increments the value in steps of $100. Exception: The RRSP match input decrements/increments in steps of 0.5%. Provide contextual tooltips for each input field explaining the tax mechanisms.
- **Other Income & Deductions Chips:** Render as clickable buttons. Clicking a chip reveals its dedicated input field using clean, animated Tailwind height transitions (`transition-all duration-300 ease-in-out`). Provide an elegant empty state message when no chips are active.
- **Available Cash Module:** Provide an input box accompanied by a toggle switch to alternate between a Monthly or Annual savings basis.
- **Output Panel Requirements:**
    - Display the total gross aggregated income with a brief breakdown of the sources
    - Display average tax and estimated tax/CPP owing after optimization
    - Display optimized Monthly vs Annual breakdown schedules for FHSA and RRSP accounts.
    - **Dynamic Recommendations Block:** Provide a dedicated recommendation layout block titled: **“Set $X monthly”**. Ensure the title updates dynamically based on the total calculated allocation pool. Below the title, provide structured recommendations detailing this exact sequential priority pathing:
        1. *"First, set aside $P monthly for your owing tax and CPP to ensure your liabilities are safely covered before investing."*
        2. *"Second, contribute $N monthly to your FHSA because it maximizes your immediate tax-free growth potential. (Factoring in your already contributed amount of $Y)."*
        3. *"Third, contribute $M monthly to your RRSP because it minimizes your top marginal brackets and utilizes your employer's RRSP match of Z%. (Factoring in your already contributed amount)."*
    - **Pure Tailwind Visual Chart:** Render a custom step-line chart mapping the `combinedBracketsPlotData`. Draw two clear vertical cursor lines passing through the chart track: a grey dashed cursor for `Before Optimization` and an emerald green solid cursor for `After Optimization`. Shode/highlight the space between these two lines as an **"Income Shielded Zone"** to visually emphasize the tax-sheltered capital.
- **State Alerts (copywriting.js Integration):**
    - `isCashDeficit`: If true, clear investment modules and flash a high-priority crimson card: *"Your available cash is currently optimized entirely to cover your tax liabilities. Investment recommendations will unlock once your liquid cash exceeds your immediate tax owing."*
    - `isInClawbackZone`: Flash an amber notice box if BC income sits inside the 3.56% phase-out penalty window.
    - `isBpaWasted`: Flash a slate notice card if income is optimized below the local tax-free floor.
    - `GST/PST Registry Threshold`: If SE Gross Income exceeds $30,000, render a highly visible federal registration warning label directly underneath the self-employment input form section.

### 6. VISUAL THEME & LAYOUT SPECIFICATION ("Nordic Fintech Minimal")

- **Color Tokens:** Use a refined editorial canvas setup: Base Background (`bg-slate-50`), Container Cards (`bg-white` with ultra-fine `border-slate-200/60`), Primary Accent (`text-emerald-600` / `bg-emerald-600`), and Charcoal Type (`text-slate-900`).
- **Top-to-Bottom Functional Stack Architecture:** To manage vertical page overflow, do not use side-by-side columns. Stack the workspace vertically:
    - **TOP PANEL (The Profile Cockpit):** Houses all input form sections. Each individual input section must display as a sub-card containing a responsive **2-column or 3-column internal grid layout,** depending on the number of fields inside, keeping the input cluster highly compact.
    - **BOTTOM PANEL (The Results Theater):** Houses the visualization chart, numeric readouts, and dynamic alerts.
- **Custom Micro-Interaction Steppers:** Every numerical input block must be a unified pill container (`rounded-xl border border-slate-200/80 p-4`) containing the label, value, and a tightly grouped pair of customized  and `+` buttons placed right-aligned. Clicking buttons decrements/increments values in steady steps of $100. Exception: RRSP match input steps by 0.5%. Provide contextual hover tooltips for all fields.
- **Animated Chips:** Section 4 and Section 5 parameters must render initially as a row of active toggle chips. Activating a chip reveals its multi-column input field smoothly using Tailwind transitions (`transition-all duration-300 ease-in-out`). Show a clean empty-state placeholder string if no chips are selected.
- **Available Cash Module:** Includes a numerical value input box and a clean slide-toggle to switch between a Monthly or Annual savings framework.

Make sure to add a disclaimer at the end and introduce myself, “NahlaNia” as the product designer
// ─── ALERT MESSAGES ──────────────────────────────────────────────────────────

export const ALERTS = {
  cashDeficit: `Your available cash is currently optimized entirely to cover your tax liabilities. Investment recommendations will unlock once your liquid cash exceeds your immediate tax owing.`,

  bpaWasted: `Your optimized net income is below the effective tax-free threshold. Your deductions may be more valuable applied against higher income years — consider carrying forward unused room.`,

  gstRegistration: `Your self-employment gross income exceeds $30,000. You are legally required to register for a GST/HST number with the CRA and collect sales tax on your services.`,
};

// ─── CLAWBACK ZONE ALERT (BC-specific) ───────────────────────────────────────

export function clawbackAlert(province) {
  if (province !== 'BC') return null;
  return `Your income sits inside the BC Low-Income Tax Reduction phase-out window (3.56% effective clawback). Each additional dollar of income in this band erodes your provincial tax credit.`;
}

// ─── RECOMMENDATION COPY ─────────────────────────────────────────────────────

export function recommendationTitle(monthlyPool) {
  return `Set $${fmt(monthlyPool)} monthly`;
}

export function rec1_tax(monthlyLiabilities) {
  return `First, set aside $${fmt(monthlyLiabilities)} monthly for your owing tax and CPP to ensure your liabilities are safely covered before investing.`;
}

export function rec2_fhsa(monthlyFhsa, alreadyFhsa) {
  return `Second, contribute $${fmt(monthlyFhsa)} monthly to your FHSA because it maximizes your immediate tax-free growth potential. (Factoring in your already contributed amount of $${fmt(alreadyFhsa)}.)`;
}

export function rec3_rrsp(monthlyRrsp, matchPct, alreadyRrsp) {
  const matchNote = matchPct > 0
    ? ` and utilizes your employer's RRSP match of ${matchPct}%`
    : '';
  return `Third, contribute $${fmt(monthlyRrsp)} monthly to your RRSP because it minimizes your top marginal brackets${matchNote}. (Factoring in your already contributed amount of $${fmt(alreadyRrsp)}.)`;
}

export function tfsaOverflowNote(annualTfsa, tfsaLimit) {
  if (annualTfsa <= 0) return null;
  const note = annualTfsa > tfsaLimit
    ? ` Note: your annual TFSA overflow ($${fmt(annualTfsa)}) exceeds the $${fmt(tfsaLimit)} annual contribution limit — excess should be spread across future calendar years.`
    : ` This stays within your $${fmt(tfsaLimit)} annual TFSA contribution limit.`;
  return `Remaining $${fmt(annualTfsa)} annually directed to your TFSA for tax-free compounding.${note}`;
}

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────

export const TOOLTIPS = {
  t4Income:              'Employment income reported on your T4 slip (Box 14). This is your gross salary before any deductions.',
  rrspMatchPct:          'The percentage of your salary your employer matches into your group RRSP. Both your contribution and the employer match reduce your available RRSP room.',
  seNetIncome:           'Your net self-employment profit — gross business revenue minus allowable business expenses. This is the figure reported on your T2125.',
  capitalGains:          'Total realized capital gains for the year (the actual gain, not the inclusion amount). Gains up to $250,000 use a 50% inclusion; amounts above use 66.67%.',
  interestIncome:        'Interest, foreign income, and other investment income fully included at your marginal rate.',
  childcare:             'Childcare expenses (Line 21400) are a direct net income deduction, reducing the income on which tax is calculated.',
  medicalExpenses:       'Total eligible medical expenses. Only amounts exceeding the greater of 3% of your net income or the indexed threshold qualify.',
  rrspRoom:              'Your available RRSP contribution room as shown on your most recent Notice of Assessment (NOA) from CRA.',
  rrspAlreadyContrib:    'Amount you have already contributed to your RRSP this calendar year, not counting employer-matched amounts.',
  fhsaAlreadyContrib:    'Amount already contributed to your FHSA this calendar year (annual base limit: $8,000, up to $16,000 if you have carryforward room).',
  fhsaCarryforward:      'Unused FHSA participation room carried forward from the prior year (max $8,000). Found on your CRA NOA or My Account. Adds up to $8,000 of extra room this year.',
  fhsaLifetimeUsed:      'Total FHSA contributions made in all previous years combined (lifetime limit: $40,000).',
  availableCash:         'Total liquid savings you are willing to allocate toward taxes and registered investments this year.',
};

// ─── MICRO-COPY LABELS ────────────────────────────────────────────────────────

export const MICRO_COPY = {
  childcare:       '📋 Note: Per CRA guidelines, childcare deductions must be claimed by the lower net-income household earner.',
  medicalExpenses: '📋 Note: Medical expenses must exceed 3% of your net income to qualify. For couples, optimization is maximized by pooling receipts on the lower-income earner\'s return.',
};

// ─── DISCLAIMER ──────────────────────────────────────────────────────────────

export const DISCLAIMER = `This tool provides estimates for educational and planning purposes only. Results are not tax advice. Tax calculations involve personal circumstances not captured here. Always consult a qualified CPA or tax professional before making financial decisions. Tax brackets and parameters are based on published CRA figures and may not reflect late-breaking legislative changes.`;

// ─── FOOTER ──────────────────────────────────────────────────────────────────

export const FOOTER_CREDIT = `Designed & developed by NahlaNia · Built with Claude Code`;

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fmt(n) {
  return Math.round(n).toLocaleString('en-CA');
}

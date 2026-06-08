import { PROV_BRACKETS, BPA_PARAMS, BC_CLAWBACK, PROV_LOWEST_RATE } from './brackets.js';

// ─── GENERIC BRACKETED TAX ────────────────────────────────────────────────────
// Calculates raw tax on `income` using a sorted bracket array.

function bracketedTax(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i].lo;
    const hi = brackets[i + 1]?.lo ?? Infinity;
    const rate = brackets[i].r / 100;
    if (income <= lo) break;
    tax += (Math.min(income, hi) - lo) * rate;
  }
  return tax;
}

// ─── BC BASIC PERSONAL AMOUNT CREDIT ─────────────────────────────────────────

function bcBpaCredit(year) {
  return BPA_PARAMS[year].BC * (PROV_LOWEST_RATE.BC / 100);
}

// ─── BC LOW-INCOME TAX REDUCTION ─────────────────────────────────────────────
// Full credit below lo; 3.56% clawback in the lo→hi band; $0 above hi.
// Non-refundable: result is clamped to >= 0 when applied in calcProvBC.

function bcLowIncomeReduction(netIncome, year) {
  const { lo, hi, rate, maxCredit } = BC_CLAWBACK[year];
  if (netIncome <= lo) return maxCredit;
  if (netIncome >= hi) return 0;
  return Math.max(0, maxCredit - (netIncome - lo) * rate);
}

// ─── BC PROVINCIAL TAX ───────────────────────────────────────────────────────
// Returns { provTax, reduction, isInClawbackZone }

export function calcProvBC(taxableIncome, netIncome, year) {
  const brackets = PROV_BRACKETS[year].BC;
  const rawTax   = bracketedTax(taxableIncome, brackets);
  const bpaCred  = bcBpaCredit(year);
  const reduction = bcLowIncomeReduction(netIncome, year);

  // Non-refundable guard: tax never drops below $0
  const provTax = Math.max(0, rawTax - bpaCred - reduction);

  const { lo, hi } = BC_CLAWBACK[year];
  const isInClawbackZone = netIncome > lo && netIncome < hi;

  return { provTax, reduction, isInClawbackZone };
}

// ─── GENERIC PROVINCIAL TAX (AB / SK) ────────────────────────────────────────
// Returns { provTax, isInClawbackZone }

export function calcProvGeneric(taxableIncome, province, year) {
  const brackets = PROV_BRACKETS[year][province];
  const bpa      = BPA_PARAMS[year][province];
  const loRate   = PROV_LOWEST_RATE[province] / 100;

  const rawTax  = bracketedTax(taxableIncome, brackets);
  const bpaCred = bpa * loRate;
  const provTax = Math.max(0, rawTax - bpaCred);

  return { provTax, isInClawbackZone: false };
}

// ─── COMBINED DISPATCHER ─────────────────────────────────────────────────────

export function calcProv(taxableIncome, netIncome, province, year) {
  if (province === 'BC') return calcProvBC(taxableIncome, netIncome, year);
  return calcProvGeneric(taxableIncome, province, year);
}

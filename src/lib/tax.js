import {
  FED_BRACKETS,
  BPA_PARAMS,
  CPP_PARAMS,
  EI_PARAMS,
  LIMITS,
  MEDICAL_FLOOR,
  PROV_MEDICAL_FLOOR,
  PROV_BRACKETS,
  PROV_LOWEST_RATE,
  TAX_FREE_FLOOR,
} from './brackets.js';
import { calcProv } from './taxBC.js';

// ─── UTILITY ─────────────────────────────────────────────────────────────────

// function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// CPP1 base rate (pre-enhancement). Permanent statutory value — CRA has never changed it.
const CPP1_BASE_RATE = 0.0495;

// ─── BRACKETED TAX ───────────────────────────────────────────────────────────

function bracketedTax(income, brackets) {
  if (income <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const lo = brackets[i].lo;
    const hi = brackets[i + 1]?.lo ?? Infinity;
    if (income <= lo) break;
    tax += (Math.min(income, hi) - lo) * (brackets[i].r / 100);
  }
  return tax;
}

// ─── FEDERAL BPA (phase-out between fedThresh and fedMaxLim) ─────────────────

function fedBpa(netIncome, year) {
  const { fedMax, fedMin, fedThresh, fedMaxLim } = BPA_PARAMS[year];
  if (netIncome <= fedThresh) return fedMax;
  if (netIncome >= fedMaxLim) return fedMin;
  const frac = (netIncome - fedThresh) / (fedMaxLim - fedThresh);
  return fedMax - frac * (fedMax - fedMin);
}

// ─── CPP CALCULATIONS ────────────────────────────────────────────────────────
// Returns { t4Cpp1, t4Cpp2, seCpp1, seCpp2,
//           t4CppNrtcBase, t4EnhancedDeduction,
//           seEmployerDeduction, seEnhancedDeduction, seNrtcBase }
//
// T4:  4.95% base → Line 30800 NR credit
//      1.00% enhanced → Line 22215 deduction
//      full CPP2 → Line 22215 deduction
//
// SE:  4.95% base equivalent → Line 31000 NR credit
//      5.95% employer half → Line 22200 deduction
//      1.00% enhanced employee → Line 22215 deduction
//      full SE CPP2 → Line 22215 deduction 


function calcCpp(t4Income, seNetIncome, year) {
  const { ympe, yampe, ex, emR1, seR1, emR2, seR2, emMax1, seMax1, emMax2, seMax2 } = CPP_PARAMS[year];
  const enhR1 = emR1 - CPP1_BASE_RATE; // 1.00% enhanced employee rate

  // ==========================================
  // 1. T4 SALARY INCOME CPP CALCULATIONS
  // ==========================================
  // Tier 1 Pensionable earnings capped at YMPE
  const t4Pensionable1 = Math.max(0, Math.min(t4Income, ympe) - ex);
  // Employee T4 CPP1 contributions deducted at source
  const t4Cpp1 = Math.min(t4Pensionable1 * emR1, emMax1);
  
  // Non-refundable tax credit (Line 30800) and Enhanced deduction (Line 22215)
  const t4CppNrtcBase = t4Cpp1 * (CPP1_BASE_RATE / emR1); 
  const t4EnhancedDeduction = t4Cpp1 * (enhR1 / emR1);

  // Tier 2 (CPP2) earnings within the YMPE to YAMPE band
  const t4Cpp2Pensionable2 = Math.max(0, Math.min(t4Income, yampe) - ympe);
  const t4Cpp2 = Math.min(t4Cpp2Pensionable2 * emR2, emMax2);


  // ==========================================
  // 2. SELF-EMPLOYED (SE) INCOME CPP CALCULATIONS
  // ==========================================
    // --- SE Tier 1 (Base + First Additional) ---
  // Total allowed pensionable earnings across both income streams capped at YMPE
  const totalCombinedPensionable1 = Math.min(Math.max(0, t4Income) + Math.max(0, seNetIncome), ympe);
  // Calculate remaining SE earnings allocation available under the YMPE ceiling
  const seAllowedEarnings1 = Math.max(0, totalCombinedPensionable1 - Math.max(0, t4Income));
  
  // Net contributory earnings after applying single basic exemption buffer
  // If T4 income didn't fully use the exemption, the remainder shields SE income
  const t4UnderExemptionBonus = Math.max(0, ex - Math.min(t4Income, ex));
  const seContributoryEarnings1 = Math.max(0, seAllowedEarnings1 - t4UnderExemptionBonus);

  // Apply self-employed Tier 1 contribution calculations
  const seCpp1Raw = seContributoryEarnings1 * seR1;
  // Hard cap SE obligations against total remaining annual space 
  const remainingSeMax1 = Math.max(0, seMax1 - (Math.min(t4Income, ympe) > ex ? (Math.min(t4Income, ympe) - ex) * seR1 : 0));
  const seCpp1 = Math.min(seCpp1Raw, remainingSeMax1);

  // --- SE Tier 2 (CPP2 Additional) ---
  // Total allowed earnings spanning the Tier 2 band across both income streams
  const totalCombinedPensionable2 = Math.min(Math.max(0, t4Income) + Math.max(0, seNetIncome), yampe);
  const totalYampeEarningsAllocated = Math.max(0, totalCombinedPensionable2 - ympe);
  const t4YampeEarningsConsumed = Math.max(0, Math.min(t4Income, yampe) - ympe);
  
  // Net remaining Tier 2 space available exclusively for SE allocation
  const seAllowedEarnings2 = Math.max(0, totalYampeEarningsAllocated - t4YampeEarningsConsumed);
  
  const seCpp2Raw = seAllowedEarnings2 * seR2;
  const remainingSeMax2 = Math.max(0, seMax2 - (t4YampeEarningsConsumed * seR2));
  const seCpp2 = Math.min(seCpp2Raw, remainingSeMax2);


  // ==========================================
  // 3. TAX REPORTING LINE ALLOCATIONS
  // ==========================================
  // SE Employer Share Deduction (Line 22200): Exactly 50% of Tier 1
  const seEmployerDeduction = seCpp1 * 0.5;

  // SE Enhanced Employee Deduction (Line 22215): 1.00% Enhanced Tier 1 + 100% of CPP2
  const seEnhancedDeduction = (seCpp1 * (enhR1 / seR1)) + seCpp2;

  // SE Non-Refundable Tax Credit Base (Line 31000): 4.95% Base Tier 1
  const seNrtcBase = seCpp1 * (CPP1_BASE_RATE / seR1);

  return {
    t4Cpp1,
    t4Cpp2,
    seCpp1,
    seCpp2,
    t4CppNrtcBase,
    t4EnhancedDeduction,
    seEmployerDeduction,
    seEnhancedDeduction,
    seNrtcBase
  };
}


// ─── EI WITHHOLDING (display-only, T4 only) ──────────────────────────────────

export function calcEI(t4Income, year) {
  const { rate, maxInsurable, maxPremium } = EI_PARAMS[year];
  const insurableEarnings = Math.max(0, Math.min(t4Income, maxInsurable));
  return Math.min(insurableEarnings * rate, maxPremium);
}

// ─── CAPITAL GAINS INCLUSION ─────────────────────────────────────────────────
// ≤ $250K: 50% inclusion; beyond $250K: 2/3 (66.67%) inclusion on excess.

function capitalGainsInclusion(gains) {
  if (gains <= 0) return 0;
  const threshold = 250000;
  if (gains <= threshold) return gains * 0.5;
  return threshold * 0.5 + (gains - threshold) * (2 / 3);
}

// ─── FEDERAL TAX ─────────────────────────────────────────────────────────────

function calcFedTax(taxableIncome, netIncome, cppData, eiPremium, medExp, province, year) {
  const rawFed  = bracketedTax(taxableIncome, FED_BRACKETS[year]);
  const bpa     = fedBpa(netIncome, year);
  const bpaCred = bpa * 0.15;

  // CPP1 non-refundable credits (T4 base + SE base) at 15%
  const cppNrtc = (cppData.t4CppNrtcBase + cppData.seNrtcBase) * 0.15;

  // EI premium non-refundable credit (Line 31200) at 15%
  const eiCred  = eiPremium * 0.15;

  const medCred = (() => {
    const indexedFloor = MEDICAL_FLOOR[year];
    const pctFloor     = netIncome * 0.03;
    const floor        = Math.min(pctFloor, indexedFloor);
    const eligible     = Math.max(0, medExp - floor);
    return eligible * 0.15;
  })();

  return Math.max(0, rawFed - bpaCred - cppNrtc - eiCred - medCred);
}

// ─── RRSP AVAILABLE ROOM ─────────────────────────────────────────────────────

function calcRrspRoom(rrspRoomFromNoa, alreadyContributed, t4Income, matchPct) {
  const matchImpact = t4Income * (matchPct / 100) * 2; // employee + employer each at match%
  return Math.max(0, rrspRoomFromNoa - alreadyContributed - matchImpact);
}

// ─── FHSA AVAILABLE ROOM ─────────────────────────────────────────────────────

function calcFhsaRoom(alreadyThisYear, lifetimeUsed, carryforward, year) {
  const annual   = LIMITS[year].fhsaAnnual;
  const lifetime = LIMITS[year].fhsaLifetime;
  const effectiveAnnual = annual + Math.min(carryforward, annual); // up to $16,000 with carryforward
  const annualRoom   = Math.max(0, effectiveAnnual - alreadyThisYear);
  const lifetimeRoom = Math.max(0, lifetime - lifetimeUsed);
  return Math.min(annualRoom, lifetimeRoom);
}

// ─── OPTIMIZATION FLOOR ──────────────────────────────────────────────────────

function getFloor(province, year) {
  if (province === 'BC') return TAX_FREE_FLOOR.BC;
  // True zero-tax threshold for AB / SK: BPA credit (at 15%) ÷ first-bracket rate.
  // In 2025 the rates match (both 15%) so this equals fedMax exactly.
  // In 2026+ the first bracket was cut to 14%, making the threshold ~$1,176 above fedMax.
  const fedBpa       = BPA_PARAMS[year].fedMax;
  const fedFirstRate = FED_BRACKETS[year][0].r / 100;
  return (fedBpa * 0.15) / fedFirstRate;
}

// ─── COMBINED BRACKETS PLOT DATA ─────────────────────────────────────────────
// Merges all federal + provincial bracket lower bounds into a sorted unique set.
// For each segment, returns the combined marginal rate.

function buildBracketsPlotData(province, year) {
  const fedBrackets  = FED_BRACKETS[year];
  const provBrackets = PROV_BRACKETS[year][province];

  const points = new Set([
    ...fedBrackets.map(b => b.lo),
    ...provBrackets.map(b => b.lo),
  ]);
  const sorted = [...points].sort((a, b) => a - b);

  return sorted.map((lo, i) => {
    const testIncome = lo + 1;

    // Marginal fed rate at this income
    let fedRate = fedBrackets[0].r;
    for (let j = fedBrackets.length - 1; j >= 0; j--) {
      if (testIncome > fedBrackets[j].lo) { fedRate = fedBrackets[j].r; break; }
    }

    // Marginal prov rate at this income
    let provRate = provBrackets[0].r;
    for (let j = provBrackets.length - 1; j >= 0; j--) {
      if (testIncome > provBrackets[j].lo) { provRate = provBrackets[j].r; break; }
    }

    return {
      income: lo,
      fedRate,
      provRate,
      combinedRate: fedRate + provRate,
    };
  });
}

// ─── SINGLE FULL-CALCULATION PASS ────────────────────────────────────────────

function singlePass(inputs, rrspContrib, fhsaContrib) {
  const {
    year, province,
    t4Income, seNetIncome, interestIncome, capitalGains,
    childcare, medicalExpenses,
    rrspRoomFromNoa, rrspAlreadyContributed, rrspMatchPct,
    fhsaAlreadyThisYear, fhsaLifetimeUsed,
  } = inputs;

  const cpp = calcCpp(t4Income, seNetIncome, year);

  // ── Net income deductions ────────────────────────────────────────────────
  const cgInclusion = capitalGainsInclusion(capitalGains);
  const grossIncome = t4Income + seNetIncome + interestIncome + cgInclusion;

  // Line 22200: SE employer CPP1 + SE enhanced CPP1 + SE CPP2 (seEnhancedDeduction)
  // Line 22215: T4 enhanced CPP1 + T4 CPP2
  const seCppDeductions = cpp.seEmployerDeduction + cpp.seEnhancedDeduction;
  const t4CppLine22215  = cpp.t4EnhancedDeduction + cpp.t4Cpp2;

  const netIncome = Math.max(
    0,
    grossIncome
      - seCppDeductions
      - t4CppLine22215
      - (rrspAlreadyContributed || 0)
      - rrspContrib
      - (fhsaAlreadyThisYear || 0)
      - fhsaContrib
      - childcare,
  );

  // Taxable income = net income (no further deductions in scope)
  const taxableIncome = netIncome;

  // ── Federal tax ──────────────────────────────────────────────────────────
  const ei     = calcEI(t4Income, year);
  const fedTax = calcFedTax(
    taxableIncome, netIncome, cpp, ei, medicalExpenses, province, year,
  );

  // ── Provincial tax ───────────────────────────────────────────────────────
  const { provTax, isInClawbackZone } = calcProv(taxableIncome, netIncome, province, year);

  // ── Provincial NR credit for medical (applied to prov tax externally) ───
  const medFloor    = Math.min(netIncome * 0.03, PROV_MEDICAL_FLOOR[year][province]);
  const provMedCred = Math.max(0, medicalExpenses - medFloor) * (PROV_LOWEST_RATE[province] / 100);
  const adjProvTax  = Math.max(0, provTax - provMedCred);

  const totalTax = fedTax + adjProvTax;
  const totalCpp = cpp.t4Cpp1 + cpp.t4Cpp2 + cpp.seCpp1 + cpp.seCpp2;

  return {
    netIncome,
    taxableIncome,
    fedTax,
    provTax: adjProvTax,
    totalTax,
    cpp,
    totalCpp,
    ei,
    isInClawbackZone,
    grossIncome,
    cgInclusion,
  };
}

// ─── ESTIMATED T4 WITHHOLDING ────────────────────────────────────────────────
// Mirrors what a CRA payroll system withholds for a basic TD1 employee:
// tax on T4 income alone with standard NR credits (BPA, CPP, EI).

function estimateT4Withholding(t4Income, year, province) {
  if (!t4Income || t4Income <= 0) return 0;
  const { totalTax: t4TotalTax } = singlePass({
    year, province,
    t4Income,
    seNetIncome: 0, interestIncome: 0, capitalGains: 0,
    childcare: 0, medicalExpenses: 0,
    rrspRoomFromNoa: 0, rrspAlreadyContributed: 0, rrspMatchPct: 0,
    fhsaAlreadyThisYear: 0, fhsaLifetimeUsed: 0,
  }, 0, 0);
  return t4TotalTax;
}

// ─── MARGINAL RATE LOOKUP ─────────────────────────────────────────────────────

function getMarginalRate(income, plotData) {
  let rate = plotData.length > 0 ? plotData[0].combinedRate : 0;
  for (const b of plotData) {
    if (income >= b.income) rate = b.combinedRate;
    else break;
  }
  return rate;
}

// ─── MAIN EXPORT: calculateTax ────────────────────────────────────────────────

export function calculateTax(inputs) {
  const {
    year, province,
    t4Income, seNetIncome,
    availableCash,
    rrspRoomFromNoa, rrspAlreadyContributed, rrspMatchPct,
    fhsaAlreadyThisYear, fhsaLifetimeUsed, fhsaCarryforward,
  } = inputs;

  const floor       = getFloor(province, year);
  const rrspRoom    = calcRrspRoom(rrspRoomFromNoa, rrspAlreadyContributed, t4Income, rrspMatchPct);
  const fhsaRoom    = calcFhsaRoom(fhsaAlreadyThisYear, fhsaLifetimeUsed, fhsaCarryforward, year);
  const t4TotalTax  = estimateT4Withholding(t4Income, year, province);

  // ── Pre-optimization pass (zero contributions) — for before/after comparison
  const beforePass = singlePass(inputs, 0, 0);

  let rrspContrib = 0;
  let fhsaContrib = 0;
  let lastPass    = null;

  // ── 5-pass convergence loop ───────────────────────────────────────────────
  for (let pass = 0; pass < 5; pass++) {
    lastPass = singlePass(inputs, rrspContrib, fhsaContrib);
    const { totalTax, cpp: loopCpp } = lastPass;
    const loopSeCpp      = loopCpp.seCpp1 + loopCpp.seCpp2;
    const loopTaxOwing   = Math.max(0, totalTax - t4TotalTax);
    const totalLiabilities = loopTaxOwing + loopSeCpp;
    const investablePool   = Math.max(0, availableCash - totalLiabilities);

    // Priority 1: FHSA (immediate tax deduction + tax-free growth)
    const prevFhsaContrib = fhsaContrib;
    fhsaContrib = Math.min(investablePool, fhsaRoom);

    // Priority 2: RRSP (top marginal bracket compression)
    // Only contribute down to the optimization floor.
    // lastPass.netIncome already has CPP + prevRrsp + prevFhsa subtracted.
    // We add them back and subtract the new fhsaContrib to find true headroom.
    const rrspHeadroom = Math.max(
      0,
      lastPass.netIncome + rrspContrib + prevFhsaContrib - fhsaContrib - floor,
    );
    const remaining = Math.max(0, investablePool - fhsaContrib);
    rrspContrib = Math.min(remaining, rrspRoom, rrspHeadroom);
  }

  // ── Final pass with converged contributions ──────────────────────────────
  const result          = singlePass(inputs, rrspContrib, fhsaContrib);
  const { ei }          = result;
  const t4Cpp           = result.cpp.t4Cpp1 + result.cpp.t4Cpp2;
  const seCpp           = result.cpp.seCpp1 + result.cpp.seCpp2;
  const taxOwing        = Math.max(0, result.totalTax - t4TotalTax);
  const totalLiabilities = taxOwing + seCpp;
  const investablePool  = Math.max(0, availableCash - totalLiabilities);
  const tfsa            = Math.max(0, investablePool - fhsaContrib - rrspContrib);
  const tfsaAnnualLimit = LIMITS[year].tfsaAnnual;

  // ── Derived metrics ───────────────────────────────────────────────────────
  const afterTaxIncome = result.grossIncome - result.totalTax - result.totalCpp - ei;
  const avgTaxRate     = result.grossIncome > 0
    ? (result.totalTax / result.grossIncome) * 100 : 0;
  const taxSaving      = Math.max(0, beforePass.totalTax - result.totalTax);

  // ── Marginal rates before / after optimization ────────────────────────────
  const combinedBracketsPlotData = buildBracketsPlotData(province, year);
  const marginalRateBefore = getMarginalRate(beforePass.netIncome,  combinedBracketsPlotData);
  const marginalRateAfter  = getMarginalRate(result.netIncome,      combinedBracketsPlotData);

  // ── Flags ─────────────────────────────────────────────────────────────────
  const isCashDeficit          = availableCash < totalLiabilities;
  const isBpaWasted            = result.netIncome < floor && result.netIncome > 0;
  const isGstThresholdExceeded = seNetIncome > 30000;

  return {
    // Income
    grossIncome:     result.grossIncome,
    netIncome:       result.netIncome,
    taxableIncome:   result.taxableIncome,
    afterTaxIncome,

    // Tax
    fedTax:          result.fedTax,
    provTax:         result.provTax,
    totalTax:        result.totalTax,
    t4TotalTax,
    taxOwing,
    avgTaxRate,
    taxSaving,
    marginalRateBefore,
    marginalRateAfter,

    // CPP / EI
    cpp:             result.cpp,
    t4Cpp,
    seCpp,
    totalCpp:        result.totalCpp,
    ei,

    // Liabilities (year-end owing: taxOwing + seCpp)
    totalLiabilities,

    // Allocations
    fhsaContrib,
    rrspContrib,
    tfsa,
    tfsaAnnualLimit,
    fhsaRoom,
    rrspRoom,

    // Flags
    isCashDeficit,
    isBpaWasted,
    isGstThresholdExceeded,
    isInClawbackZone: result.isInClawbackZone,

    // Chart
    combinedBracketsPlotData,
    incomeBeforeContributions: beforePass.netIncome,
    incomeAfterContributions:  result.netIncome,
  };
}

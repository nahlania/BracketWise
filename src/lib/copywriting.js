// ─── ALERT MESSAGES ──────────────────────────────────────────────────────────

export const ALERTS = {
  cashDeficit: `Your available cash is currently optimized entirely to cover your tax liabilities. Investment recommendations will unlock once your liquid cash exceeds your immediate tax owing.`,

  bpaWasted: `Your optimized net income is below the effective tax-free threshold. Your deductions may be more valuable applied against higher income years — consider carrying forward unused room.`,

  gstRegistration: `Your self-employment gross income exceeds $30,000. You are legally required to register for a GST/HST number with the CRA and collect sales tax on your services.`,

  fhsaRoomExceeded: `FHSA Participation Room can't exceed $16,000. Annual base limit is $8,000 and the maximum is $16,000 if you have carryforward room.`,

};

// ─── CLAWBACK ZONE ALERT (BC-specific) ───────────────────────────────────────

export function clawbackAlert(province) {
  if (province !== 'BC') return null;
  return `Your income sits inside the BC Low-Income Tax Reduction phase-out window (3.56% effective clawback). Each additional dollar of income in this band erodes your provincial tax credit.`;
}

// ─── OPTIMIZATION STEP NOTES ─────────────────────────────────────────────────
// Each returns { variant: 'success' | 'info' | 'warning', text }, covering the
// edge cases for the "Save & Optimize Your Tax" action plan.

export function step1Note(totalLiabilities, availableCash, remainingMonths = 12, estimatedRefund = 0) {
  if (totalLiabilities > 0 && estimatedRefund >= totalLiabilities) {
    return {
      variant: 'success',
      text: `Your $${fmt(totalLiabilities)} SE CPP is deducted from your $${fmt(estimatedRefund)} refund — no cash needed from savings.`,
    };
  }
  if (totalLiabilities > 0 && estimatedRefund > 0) {
    const netOwing = totalLiabilities - estimatedRefund;
    return {
      variant: 'warning',
      text: `Your refund covers $${fmt(estimatedRefund)} of your owing. Set aside $${fmt(netOwing)} ($${fmt(netOwing / remainingMonths)}/month) for the balance.`,
    };
  }
  if (availableCash <= 0) {
    if (totalLiabilities > 0) {
      return {
        variant: 'warning',
        text: `Enter your Available Cash above to start your savings plan. You'll need to save $${fmt(totalLiabilities)} ($${fmt(totalLiabilities / remainingMonths)}/month) to cover this year's projected owing.`,
      };
    }
    return {
      variant: 'info',
      text: `Enter your Available Cash above to see how much you can put toward your FHSA, RRSP, and TFSA this year.`,
    };
  }
  const diff = availableCash - totalLiabilities;
  if (diff < 0) {
    return {
      variant: 'warning',
      text: `Your available cash falls $${fmt(-diff)} short of your year-end owing. Consider saving an extra $${fmt(-diff / remainingMonths)}/month.`,
    };
  }
  if (diff === 0) {
    return {
      variant: 'info',
      text: `Your available cash exactly covers your year-end owing — nothing remains for FHSA, RRSP, or TFSA this year.`,
    };
  }
  return {
    variant: 'success',
    text: `Fully covered. $${fmt(diff)} remains for your FHSA, RRSP, and TFSA contributions.`,
  };
}

export function step2Note({ fhsaContrib, fhsaRoom, fhsaRoomForYear, availableCash }) {
  if (fhsaContrib <= 0) {
    if (fhsaRoom <= 0) {
      if (fhsaRoomForYear <= 0) {
        return { variant: 'info', text: `Enter your FHSA Participation Room to include this account in tax optimization. Annual limit is $8,000, up to $16,000 with carryforward. Lifetime cap is $40,000.` };
      }
      return { variant: 'info', text: `You've already contributed your full $${fmt(fhsaRoomForYear)} FHSA room for this year — no additional room available.` };
    }
    if (availableCash <= 0) {
      return { variant: 'info', text: `Enter your Available Cash above to begin contributing to your FHSA.` };
    }
    return { variant: 'info', text: `No FHSA contribution this year — no cash remains after covering your owing.` };
  }
  if (fhsaContrib < fhsaRoom) {
    return { variant: 'info', text: `$${fmt(fhsaRoom - fhsaContrib)} of your FHSA room is going unused this year due to limited available cash.` };
  }
  return { variant: 'success', text: `You've used your full $${fmt(fhsaContrib)} FHSA room for this year. Unused room carries forward and total lifetime contributions are capped at $40,000.` };
}

export function step3Note({ rrspContrib, rrspRoom, rrspRoomFromNoa, availableCash }) {
  if (rrspContrib <= 0) {
    if (rrspRoom <= 0) {
      if (rrspRoomFromNoa <= 0) {
        return { variant: 'info', text: `Enter your RRSP Contribution Room to include this account in tax optimization.` };
      }
      return { variant: 'info', text: `Your $${fmt(rrspRoomFromNoa)} RRSP room is already fully used by your contributions and employer match this year.` };
    }
    if (availableCash <= 0) {
      return { variant: 'info', text: `Enter your Available Cash above to begin contributing to your RRSP.` };
    }
    return { variant: 'info', text: `No RRSP contribution this year — no cash remains after FHSA.` };
  }
  const carryforward = rrspRoom - rrspContrib;
  if (carryforward > 0) {
    return { variant: 'info', text: `$${fmt(carryforward)} of your RRSP room is unused and carries forward indefinitely — it never expires.` };
  }
  return { variant: 'success', text: `Your full RRSP room is used this year — no carryforward remaining.` };
}

export function tfsaNote(tfsaAmount, tfsaAvailableRoom, availableCash, tfsaRoomInput) {
  if (tfsaAmount <= 0) {
    if (!tfsaRoomInput) {
      return { variant: 'info', text: `Enter your TFSA Available Room above to include this account in your plan.` };
    }
    if (tfsaAvailableRoom <= 0) {
      return { variant: 'info', text: `You've already used your full TFSA room for this year — nothing more to add.` };
    }
    if (!availableCash) {
      return { variant: 'info', text: `Enter your Available Cash above to begin contributing to your TFSA.` };
    }
    return { variant: 'info', text: `No TFSA contribution this year — no cash remains after FHSA and RRSP.` };
  }
  if (tfsaAmount >= tfsaAvailableRoom) {
    return { variant: 'success', text: `Your full $${fmt(tfsaAvailableRoom)} TFSA room is used — every dollar grows tax-free.` };
  }
  return {
    variant: 'success',
    text: `Save $${fmt(tfsaAmount)} in your TFSA for tax-free growth. $${fmt(tfsaAvailableRoom - tfsaAmount)} of room goes unused and carries forward to next year.`,
  };
}

// ─── TOOLTIPS ────────────────────────────────────────────────────────────────

export const TOOLTIPS = {
  t4Income:              'Your standard salaried income before any taxes are deducted. If you are referencing a CRA tax slip, this is the total amount found in Box 14 of your T4.',
  bonusIncome:           'Performance or signing bonuses paid through payroll. Enter the full gross amount before any withholding tax was deducted.',
  rrspMatchPct:          'The percentage of your base salary your employer matches into your group RRSP. Both your contribution and the employer match reduce your available RRSP room. The engine automatically excludes your bonus from this calculation.',
  seGrossIncome:         'Your total freelance or business revenue before any business expenses.',
  businessExpenses:      'Eligible costs to run your business (software, home office, etc.). The engine subtracts this to calculate your Net Business Income.',
  capitalGains:          'Total realized profit from the sale of investments or property. The engine automatically applies the correct inclusion rate (50% inclusion for up to $250,000, and 66.67% for amounts above that).',
  otherTaxableIncome:    'Interest, foreign income, taxable dividends, RRIF withdrawals, and other fully taxable income not covered above. Included 100% at your marginal taxrate.',
  childcare:             'Deductible expenses for daycare, nannies, or camps. Per CRA guidelines, this must be claimed by the spouse with the lower net income.',
  medicalExpenses:       'Out-of-pocket health and dental costs. Expenses must exceed 3% of your net income to qualify. For couples, optimize by pooling all receipts on the file of lower-income spouse.',
  rrspRoom:              'Your total available RRSP room. You can find this exact number printed on your most recent CRA Notice of Assessment (NOA)',
  rrspAlreadyContrib:    'Money you have already deposited into your RRSP this calendar year or the first 60 days of the following year. DO NOT include employer-matched contributions.',
  fhsaAlreadyContrib:    'Amount already contributed to your FHSA this calendar year.\nAnnual base limit is $8,000 and the maximum is $16,000 if you have carryforward room.',
  fhsaRoomForYear:       'The amount shown as "Your FHSA participation room" on your CRA Notice of Assessment (NOA). If it\'s your first year with an FHSA, input $8,000.',
  tfsaRoom:              'Your total available TFSA room as shown on CRA My Account. Includes the annual limit, carryforward from previous years, and re-contribution room from prior withdrawals.',
  tfsaAlreadyContrib:    'Amount you have already deposited into your TFSA this calendar year. The engine deducts this from your available room before allocating any remaining cash.',
  availableCash:         'Total liquid savings you are willing to allocate toward taxes and registered investments this year.',

  // Results panel
  grossIncome:        'Total income before any deductions or taxes — the starting point for your tax calculation.',
  afterTaxIncome:     'Take-home income after all federal and provincial taxes, CPP, and EI have been deducted.',
  avgTaxRate:         'Total tax as a percentage of gross income. Unlike the marginal rate, this reflects what you actually pay across all your income combined — not just the rate on your last dollar.',
  fedTax:             'Federal income tax on your taxable income, calculated using the CRA federal brackets for the selected tax year.',
  provTax:            'Provincial income tax based on your province of residence and its tax schedule.',
  seCpp:              'CPP contributions on self-employment net income. Self-employed individuals pay both the employee and employer portions — roughly double the rate of a salaried worker.',
  totalLiabilities:   'Total of all taxes and CPP owing before any employer withholding is credited.',
  withheldAtSource:   'Tax your employer has already deducted from your T4 pay and remitted to the CRA on your behalf (Box 22 of your T4 slip).',
  yearEndOwing:       'Estimated balance when you file. Positive means a payment is due by April 30. Zero or negative means you may receive a refund.',
  estimatedRefund:    'Your employer withheld more tax than you actually owe — the excess is returned when you file your return.',
  marginalAfter:      'The rate applied to your last dollar of income after FHSA and RRSP contributions reduce your taxable income.',
  taxSaving:          'Estimated reduction in tax from FHSA and RRSP deductions. These contributions pull your income out of higher brackets.',
  marginalBefore:     'The rate applied to your last dollar of income before any registered account contributions.',
};

// ─── MICRO-COPY LABELS ────────────────────────────────────────────────────────

export const MICRO_COPY = {
  childcare:       '📋 Note: Per CRA guidelines, childcare deductions must be claimed by the lower net-income household earner.',
  medicalExpenses: '📋 Note: Medical expenses must exceed 3% of your net income to qualify. For couples, optimization is maximized by pooling receipts on the lower-income earner\'s return.',
};

// ─── DISCLAIMER ──────────────────────────────────────────────────────────────

export const DISCLAIMER = `For educational planning only. Results are estimates based on published CRA figures, not professional tax advice. Always consult a qualified CPA before making financial decisions.`;

// ─── FOOTER ──────────────────────────────────────────────────────────────────

export const FOOTER_CREDIT = `Designed & developed by NahlaNia · Built with Claude Code`;

// ─── ONBOARDING MODAL ────────────────────────────────────────────────────────

export const ONBOARDING_MODAL = {
  headline: 'Proactive Tax & Wealth Optimization',
  subheadline: 'Stop guessing your year-end liabilities. Instantly map your mixed income to the optimal tax and investment strategy.',
  steps: [
    {
      title: 'Map Your Income',
      description: 'Enter your T4 salary, self-employment revenue, and other income sources to establish your exact federal and provincial tax brackets.',
    },
    {
      title: 'Enter Your Available Cash',
      description: 'Enter the money you can set aside. The engine requires this to know exactly how much capital it can safely allocate.',
    },
    {
      title: 'Define CRA Limits',
      description: 'Input your available FHSA, RRSP, and TFSA contribution room (found on your Notice of Assessment) to set the boundaries for the optimization engine.',
    },
    
    {
      title: 'Get Your Optimized Action Plan',
      description: 'The engine secures your mandatory Tax and CPP liabilities first, then automatically cascades the remaining cash into your registered accounts for maximum tax efficiency.',
    },
  ],
  privacyBadge: '100% Private & Secure. All calculations run instantly on your own device. Your financial data is never sent to a server, saved, or tracked.',
  disclaimer: 'For educational planning only. Results are estimates based on published CRA figures, not professional tax advice. Always consult a qualified CPA.',
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function fmt(n) {
  return Math.round(n).toLocaleString('en-CA');
}

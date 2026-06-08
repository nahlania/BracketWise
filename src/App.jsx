import { useState, useMemo, useRef } from 'react';
import { calculateTax } from './lib/tax.js';
import { PROVINCE_NAMES, LIMITS } from './lib/brackets.js';
import {
  ALERTS, TOOLTIPS, MICRO_COPY, DISCLAIMER, FOOTER_CREDIT,
  clawbackAlert, recommendationTitle, rec1_tax, rec2_fhsa, rec3_rrsp, tfsaOverflowNote,
} from './lib/copywriting.js';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n) {
  return Math.round(n ?? 0).toLocaleString('en-CA');
}

function fmtPct(n) {
  return (n ?? 0).toFixed(1) + '%';
}

// ─── STEPPER INPUT ────────────────────────────────────────────────────────────

function StepperInput({ label, value, onChange, step = 100, min = 0, max = Infinity, prefix = '$', suffix = '', tooltip, children }) {
  const handleStep = (dir) => {
    const next = Math.max(min, Math.min(max, (value || 0) + dir * step));
    onChange(parseFloat(next.toFixed(2)));
  };
  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    onChange(raw === '' ? 0 : parseFloat(raw) || 0);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500 leading-tight">{label}</span>
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center min-w-0 flex-1 border border-slate-200 rounded-lg overflow-hidden">
          {prefix && (
            <span className="px-2 text-xs text-slate-400 bg-slate-50 border-r border-slate-200 py-2 shrink-0">{prefix}</span>
          )}
          <input
            type="text"
            value={value === 0 ? '' : value}
            onChange={handleChange}
            placeholder="0"
            className="w-full px-2 py-2 text-sm text-slate-800 font-semibold bg-white outline-none text-right"
          />
          {suffix && (
            <span className="px-2 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 py-2 shrink-0">{suffix}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleStep(-1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center text-base font-medium transition-colors"
            aria-label={`Decrease ${label}`}
          >−</button>
          <button
            onClick={() => handleStep(1)}
            className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center text-base font-medium transition-colors"
            aria-label={`Increase ${label}`}
          >+</button>
        </div>
      </div>
      {tooltip && <p className="text-xs text-slate-400 leading-snug">{tooltip}</p>}
      {children}
    </div>
  );
}

// ─── CHIP ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
        active
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
          : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
      }`}
    >
      {label}
    </button>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ─── ALERT CARD ───────────────────────────────────────────────────────────────

function AlertCard({ variant, message }) {
  const styles = {
    crimson: 'bg-red-50 border-red-200 text-red-800',
    amber:   'bg-amber-50 border-amber-200 text-amber-800',
    slate:   'bg-slate-100 border-slate-300 text-slate-700',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {message}
    </div>
  );
}

// ─── STAT PILL ────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
      <span className="text-xs text-slate-500 leading-tight">{label}</span>
      <span className={`text-base font-bold ${accent ? 'text-emerald-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, labelOff, labelOn }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold transition-colors ${!checked ? 'text-slate-700' : 'text-slate-400'}`}>{labelOff}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
      <span className={`text-xs font-semibold transition-colors ${checked ? 'text-slate-700' : 'text-slate-400'}`}>{labelOn}</span>
    </div>
  );
}

// ─── CUSTOM DROPDOWN ──────────────────────────────────────────────────────────

function Dropdown({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── MARGINAL RATE CHART ──────────────────────────────────────────────────────

function MarginalRateChart({ plotData, incomeBefore, incomeAfter }) {
  if (!plotData || plotData.length === 0) return null;

  const W = 680, H = 220;
  const PAD = { top: 20, right: 20, bottom: 40, left: 56 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const maxIncome = Math.max(
    (plotData[plotData.length - 1]?.income ?? 0) * 1.15,
    (incomeBefore ?? 0) * 1.15,
    300000,
  );
  const maxRate = Math.max(...plotData.map(d => d.combinedRate), 40) + 6;

  const xS = (v) => PAD.left + (v / maxIncome) * cW;
  const yS = (v) => PAD.top + cH - (v / maxRate) * cH;

  // Step-line path
  let path = '';
  for (let i = 0; i < plotData.length; i++) {
    const { income, combinedRate } = plotData[i];
    const nextIncome = plotData[i + 1]?.income ?? maxIncome;
    const x1 = xS(income), x2 = xS(nextIncome), y = yS(combinedRate);
    path += i === 0 ? `M ${x1} ${y}` : ` L ${x1} ${y}`;
    path += ` L ${x2} ${y}`;
  }

  const xBefore = xS(incomeBefore ?? 0);
  const xAfter  = xS(incomeAfter ?? 0);
  const xLeft   = Math.min(xBefore, xAfter);
  const xRight  = Math.max(xBefore, xAfter);

  const xTicks = [0, 50000, 100000, 150000, 200000, 250000, 300000].filter(v => v <= maxIncome);
  const yTicks = [0, 10, 20, 30, 40, 50].filter(v => v <= maxRate);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-label="Combined marginal tax rate chart">
      {/* Grid */}
      {yTicks.map(t => (
        <line key={t} x1={PAD.left} x2={W - PAD.right} y1={yS(t)} y2={yS(t)} stroke="#e2e8f0" strokeWidth="1" />
      ))}

      {/* Income shielded zone */}
      {xRight > xLeft + 3 && (
        <rect x={xLeft} y={PAD.top} width={xRight - xLeft} height={cH} fill="#d1fae5" fillOpacity="0.55" />
      )}

      {/* Step-line */}
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Before cursor — grey dashed */}
      {(incomeBefore ?? 0) > 0 && (
        <>
          <line x1={xBefore} x2={xBefore} y1={PAD.top} y2={PAD.top + cH} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,4" />
          <text x={xBefore + 4} y={PAD.top + 13} fontSize="10" fill="#64748b" fontWeight="500">Before</text>
        </>
      )}

      {/* After cursor — emerald solid */}
      {(incomeAfter ?? 0) > 0 && incomeAfter !== incomeBefore && (
        <>
          <line x1={xAfter} x2={xAfter} y1={PAD.top} y2={PAD.top + cH} stroke="#059669" strokeWidth="2" />
          <text x={xAfter + 4} y={PAD.top + 27} fontSize="10" fill="#059669" fontWeight="600">After</text>
        </>
      )}

      {/* Shielded zone label */}
      {xRight - xLeft > 50 && (
        <text x={(xLeft + xRight) / 2} y={PAD.top + cH / 2 + 5} textAnchor="middle" fontSize="10" fill="#065f46" fontWeight="700">
          Income Shielded
        </text>
      )}

      {/* Y-axis labels */}
      {yTicks.map(t => (
        <text key={t} x={PAD.left - 6} y={yS(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{t}%</text>
      ))}

      {/* X-axis labels */}
      {xTicks.map(t => (
        <text key={t} x={xS(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
          {t === 0 ? '$0' : `$${t / 1000}K`}
        </text>
      ))}

      {/* Axis titles */}
      <text x={W / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#94a3b8">Annual Income</text>
      <text x={12} y={H / 2 + 4} textAnchor="middle" fontSize="10" fill="#94a3b8" transform={`rotate(-90, 12, ${H / 2})`}>Marginal Rate</text>
    </svg>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Global
  const [year, setYear]         = useState(2026);
  const [province, setProvince] = useState('BC');

  // T4 Employment
  const [t4Income, setT4Income]         = useState(0);
  const [rrspMatchPct, setRrspMatchPct] = useState(0);

  // SE Income
  const [seGrossIncome, setSeGrossIncome]     = useState(0);
  const [businessExpenses, setBusinessExpenses] = useState(0);
  const seNetIncome = Math.max(0, seGrossIncome - businessExpenses);

  // Other Income chips
  const [capGainsActive, setCapGainsActive] = useState(false);
  const [interestActive, setInterestActive] = useState(false);
  const [capitalGains, setCapitalGains]     = useState(0);
  const [interestIncome, setInterestIncome] = useState(0);

  // Deduction chips
  const [childcareActive, setChildcareActive] = useState(false);
  const [medicalActive,   setMedicalActive]   = useState(false);
  const [childcare,       setChildcare]       = useState(0);
  const [medicalExpenses, setMedicalExpenses] = useState(0);

  // Registered Accounts
  const [rrspRoomFromNoa,        setRrspRoomFromNoa]      = useState(0);
  const [rrspAlreadyContributed, setRrspAlreadyContrib]   = useState(0);
  const [fhsaAlreadyThisYear,    setFhsaAlreadyThisYear]  = useState(0);
  const [fhsaLifetimeUsed,       setFhsaLifetimeUsed]     = useState(0);
  const [fhsaCarryforward,       setFhsaCarryforward]     = useState(0);

  // Available Cash
  const [availableCashInput, setAvailableCashInput] = useState(0);
  const [cashIsMonthly, setCashIsMonthly]           = useState(false);
  const availableCash = cashIsMonthly ? availableCashInput * 12 : availableCashInput;

  const hasIncome = t4Income > 0 || seNetIncome > 0;

  // ── Calculation ─────────────────────────────────────────────────────────────
  const result = useMemo(() => {
    if (!hasIncome) return null;
    try {
      return calculateTax({
        year:                  Number(year),
        province,
        t4Income,
        seNetIncome,
        capitalGains:          capGainsActive ? capitalGains : 0,
        interestIncome:        interestActive ? interestIncome : 0,
        childcare:             childcareActive ? childcare     : 0,
        medicalExpenses:       medicalActive  ? medicalExpenses : 0,
        rrspRoomFromNoa,
        rrspAlreadyContributed,
        rrspMatchPct,
        fhsaAlreadyThisYear,
        fhsaLifetimeUsed,
        fhsaCarryforward,
        availableCash,
      });
    } catch (e) {
      console.error('Tax calculation error:', e);
      return null;
    }
  }, [
    year, province, t4Income, seGrossIncome, businessExpenses,
    capGainsActive, capitalGains, interestActive, interestIncome,
    childcareActive, childcare, medicalActive, medicalExpenses,
    rrspRoomFromNoa, rrspAlreadyContributed, rrspMatchPct,
    fhsaAlreadyThisYear, fhsaLifetimeUsed, fhsaCarryforward, availableCash,
  ]);

  const monthlyLiabilities = result ? result.totalLiabilities / 12 : 0;
  const monthlyFhsa        = result ? result.fhsaContrib / 12 : 0;
  const monthlyRrsp        = result ? result.rrspContrib / 12 : 0;
  const monthlyPool        = monthlyLiabilities + monthlyFhsa + monthlyRrsp;

  const otherIncomeChips = [
    { key: 'capGains', label: 'Capital Gains',            active: capGainsActive, toggle: () => setCapGainsActive(v => !v) },
    { key: 'interest', label: 'Interest / Foreign Income', active: interestActive, toggle: () => setInterestActive(v => !v) },
  ];

  const deductionChips = [
    { key: 'childcare', label: 'Childcare (Line 21400)', active: childcareActive, toggle: () => setChildcareActive(v => !v) },
    { key: 'medical',   label: 'Medical (Line 33099)',   active: medicalActive,   toggle: () => setMedicalActive(v => !v)   },
  ];

  const anyOtherIncome = capGainsActive || interestActive;
  const anyDeductions  = childcareActive || medicalActive;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/70 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-0">
            <span className="text-xl font-bold text-slate-900 tracking-tight">Brackets</span>
            <span className="text-xl font-light text-emerald-600 tracking-tight">&nbsp;· Tax Optimizer</span>
          </div>
          <div className="flex items-center gap-3">
            <Dropdown
              value={String(year)}
              onChange={v => setYear(Number(v))}
              options={[
                { value: '2025', label: '2025 Tax Year' },
                { value: '2026', label: '2026 Tax Year' },
              ]}
            />
            <Dropdown
              value={province}
              onChange={setProvince}
              options={Object.entries(PROVINCE_NAMES).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-5">

        {/* ══ TOP PANEL — PROFILE COCKPIT ══════════════════════════════════ */}

        {/* § T4 Employment */}
        <SectionCard title="Employment Income">
          <div className="grid grid-cols-2 gap-3">
            <StepperInput
              label="T4 Employment Income"
              value={t4Income}
              onChange={setT4Income}
              tooltip={TOOLTIPS.t4Income}
            />
            <StepperInput
              label="Employer RRSP Match"
              value={rrspMatchPct}
              onChange={setRrspMatchPct}
              step={0.5}
              min={0}
              max={100}
              prefix=""
              suffix="%"
              tooltip={TOOLTIPS.rrspMatchPct}
            />
          </div>
        </SectionCard>

        {/* § Self-Employment */}
        <SectionCard title="Projected Self-Employment Income">
          <div className="grid grid-cols-2 gap-3">
            <StepperInput
              label="Gross SE Income"
              value={seGrossIncome}
              onChange={setSeGrossIncome}
              tooltip="Your total self-employment revenue before any business expenses (Line 13499 / T2125 gross)."
            />
            <StepperInput
              label="Business Expenses"
              value={businessExpenses}
              onChange={setBusinessExpenses}
              tooltip="Allowable CRA business expenses (Line 13500 / T2125 net calculation). Subtracted from gross to arrive at net SE income."
            />
          </div>
          {seGrossIncome > 0 && (
            <div className="mt-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="text-xs text-slate-500 font-medium">Net SE Income (used for tax &amp; CPP)</span>
              <span className="text-sm font-bold text-slate-800">${fmt(seNetIncome)}</span>
            </div>
          )}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: seGrossIncome > 30000 ? '80px' : '0px' }}
          >
            <div className="mt-3">
              <AlertCard variant="crimson" message={ALERTS.gstRegistration} />
            </div>
          </div>
        </SectionCard>

        {/* § Other Income — chips */}
        <SectionCard title="Other Income">
          <div className="flex flex-wrap gap-2 mb-3">
            {otherIncomeChips.map(c => (
              <Chip key={c.key} label={c.label} active={c.active} onClick={c.toggle} />
            ))}
          </div>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: anyOtherIncome ? '300px' : '0px' }}
          >
            <div className="grid grid-cols-2 gap-3 pt-1">
              {capGainsActive && (
                <StepperInput
                  label="Capital Gains (gross amount)"
                  value={capitalGains}
                  onChange={setCapitalGains}
                  tooltip={TOOLTIPS.capitalGains}
                />
              )}
              {interestActive && (
                <StepperInput
                  label="Interest / Foreign Income"
                  value={interestIncome}
                  onChange={setInterestIncome}
                  tooltip={TOOLTIPS.interestIncome}
                />
              )}
            </div>
          </div>
          {!anyOtherIncome && (
            <p className="text-xs text-slate-400 italic">No additional income sources selected.</p>
          )}
        </SectionCard>

        {/* § Deductions & Credits — chips */}
        <SectionCard title="Deductions &amp; Credits">
          <div className="flex flex-wrap gap-2 mb-3">
            {deductionChips.map(c => (
              <Chip key={c.key} label={c.label} active={c.active} onClick={c.toggle} />
            ))}
          </div>
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: anyDeductions ? '600px' : '0px' }}
          >
            <div className="grid grid-cols-1 gap-3 pt-1">
              {childcareActive && (
                <StepperInput
                  label="Childcare Expenses (Line 21400)"
                  value={childcare}
                  onChange={setChildcare}
                  tooltip={TOOLTIPS.childcare}
                >
                  <p className="text-xs text-amber-700 mt-1 leading-snug">{MICRO_COPY.childcare}</p>
                </StepperInput>
              )}
              {medicalActive && (
                <StepperInput
                  label="Medical Expenses (Line 33099)"
                  value={medicalExpenses}
                  onChange={setMedicalExpenses}
                  tooltip={TOOLTIPS.medicalExpenses}
                >
                  <p className="text-xs text-amber-700 mt-1 leading-snug">{MICRO_COPY.medicalExpenses}</p>
                </StepperInput>
              )}
            </div>
          </div>
          {!anyDeductions && (
            <p className="text-xs text-slate-400 italic">No deductions or credits selected.</p>
          )}
        </SectionCard>

        {/* § Registered Accounts */}
        <SectionCard title="Registered Accounts">
          <div className="grid grid-cols-2 gap-3">
            <StepperInput
              label="RRSP Room"
              value={rrspRoomFromNoa}
              onChange={setRrspRoomFromNoa}
              tooltip={TOOLTIPS.rrspRoom}
            />
            <StepperInput
              label="RRSP Already Contributed"
              value={rrspAlreadyContributed}
              onChange={setRrspAlreadyContrib}
              tooltip={TOOLTIPS.rrspAlreadyContrib}
            />
            <StepperInput
              label="FHSA Contributed This Year"
              value={fhsaAlreadyThisYear}
              onChange={setFhsaAlreadyThisYear}
              max={16000}
              tooltip={TOOLTIPS.fhsaAlreadyContrib}
            />
            <StepperInput
              label="FHSA Carryforward Room"
              value={fhsaCarryforward}
              onChange={setFhsaCarryforward}
              max={8000}
              tooltip={TOOLTIPS.fhsaCarryforward}
            />
            <StepperInput
              label="FHSA Lifetime Used"
              value={fhsaLifetimeUsed}
              onChange={setFhsaLifetimeUsed}
              max={40000}
              tooltip={TOOLTIPS.fhsaLifetimeUsed}
            />
          </div>
        </SectionCard>

        {/* § Available Cash */}
        <SectionCard title="Available Cash">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Your total liquid savings budget for tax and investments.</p>
              <Toggle
                checked={cashIsMonthly}
                onChange={setCashIsMonthly}
                labelOff="Annual"
                labelOn="Monthly"
              />
            </div>
            <StepperInput
              label={cashIsMonthly ? 'Monthly Savings Available' : 'Annual Savings Available'}
              value={availableCashInput}
              onChange={setAvailableCashInput}
              tooltip={TOOLTIPS.availableCash}
            />
            {cashIsMonthly && availableCashInput > 0 && (
              <p className="text-xs text-slate-500">
                = <strong className="text-slate-700">${fmt(availableCash)}</strong> annually
              </p>
            )}
          </div>
        </SectionCard>

        {/* ══ BOTTOM PANEL — RESULTS THEATER ═══════════════════════════════ */}

        {!hasIncome ? (
          <div className="bg-white rounded-2xl border border-slate-200/60 p-10 text-center text-slate-400 text-sm shadow-sm">
            Enter your income sources above to unlock your personalized tax optimization.
          </div>
        ) : result ? (
          <>
            {/* State Alerts */}
            {(result.isCashDeficit || result.isInClawbackZone || result.isBpaWasted) && (
              <div className="flex flex-col gap-3">
                {result.isCashDeficit && (
                  <AlertCard variant="crimson" message={ALERTS.cashDeficit} />
                )}
                {result.isInClawbackZone && (
                  <AlertCard variant="amber" message={clawbackAlert(province)} />
                )}
                {result.isBpaWasted && (
                  <AlertCard variant="slate" message={ALERTS.bpaWasted} />
                )}
              </div>
            )}

            {/* Income Summary */}
            <SectionCard title="Income Summary">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <StatPill label="Gross Income"       value={`$${fmt(result.grossIncome)}`} />
                <StatPill label="After-Tax Income"   value={`$${fmt(result.afterTaxIncome)}`} />
                <StatPill label="Average Tax Rate"   value={fmtPct(result.avgTaxRate)} />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <StatPill label="Marginal Rate (before RRSP/FHSA)" value={fmtPct(result.marginalRateBefore)} />
                <StatPill label="Marginal Rate (after RRSP/FHSA)"  value={fmtPct(result.marginalRateAfter)} />
              </div>
              {result.taxSaving > 0 && (
                <div className="mb-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-between">
                  <span className="text-xs text-emerald-700 font-medium">Tax saved by RRSP / FHSA optimization</span>
                  <span className="text-sm font-bold text-emerald-800">${fmt(result.taxSaving)}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Tax Breakdown */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
                  <p className="font-bold text-slate-700 mb-2 text-xs uppercase tracking-wide">Tax Breakdown</p>
                  <div className="flex justify-between text-slate-500">
                    <span>Federal Tax</span>
                    <span className="font-semibold text-slate-800">${fmt(result.fedTax)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Provincial Tax ({province})</span>
                    <span className="font-semibold text-slate-800">${fmt(result.provTax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-600">
                    <span>Total Income Tax</span>
                    <span className="font-semibold">${fmt(result.totalTax)}</span>
                  </div>
                  {result.t4TotalTax > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Est. Withheld at Source (Box 22)</span>
                      <span className="font-semibold text-emerald-700">−${fmt(result.t4TotalTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-700 font-bold">
                    <span>Income Tax Owing</span>
                    <span>${fmt(result.taxOwing)}</span>
                  </div>
                </div>

                {/* CPP / EI Breakdown */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs space-y-1.5">
                  <p className="font-bold text-slate-700 mb-2 text-xs uppercase tracking-wide">CPP &amp; EI</p>
                  <div className="flex justify-between text-slate-500">
                    <span>T4 CPP (withheld at source)</span>
                    <span className="font-semibold text-slate-800">${fmt(result.t4Cpp)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>EI (withheld at source)</span>
                    <span className="font-semibold text-slate-800">${fmt(result.ei)}</span>
                  </div>
                  {result.seCpp > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>SE CPP (year-end owing)</span>
                      <span className="font-semibold text-slate-800">${fmt(result.seCpp)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-600">
                    <span>Income Tax Owing</span>
                    <span className="font-semibold">${fmt(result.taxOwing)}</span>
                  </div>
                  {result.seCpp > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>SE CPP Owing</span>
                      <span className="font-semibold">${fmt(result.seCpp)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-700 font-bold">
                    <span>Total Year-End Owing</span>
                    <span>${fmt(result.totalLiabilities)}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Optimized Contribution Schedule */}
            {!result.isCashDeficit && availableCash > 0 && (
              <SectionCard title="Optimized Contribution Schedule">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <StatPill label="FHSA Annual"   value={`$${fmt(result.fhsaContrib)}`} accent />
                  <StatPill label="FHSA Monthly"  value={`$${fmt(result.fhsaContrib / 12)}`} accent />
                  <StatPill label="FHSA Room Left" value={`$${fmt(Math.max(0, result.fhsaRoom - result.fhsaContrib))}`} />
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <StatPill label="RRSP Annual"   value={`$${fmt(result.rrspContrib)}`} accent />
                  <StatPill label="RRSP Monthly"  value={`$${fmt(result.rrspContrib / 12)}`} accent />
                  <StatPill label="RRSP Room Left" value={`$${fmt(Math.max(0, result.rrspRoom - result.rrspContrib))}`} />
                </div>
                {result.tfsa > 0 && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-800 leading-relaxed">
                    {tfsaOverflowNote(result.tfsa, result.tfsaAnnualLimit)}
                  </div>
                )}
              </SectionCard>
            )}

            {/* Dynamic Recommendations */}
            {!result.isCashDeficit && availableCash > 0 && (
              <SectionCard title={recommendationTitle(monthlyPool)}>
                <ol className="flex flex-col gap-4">
                  <li className="flex gap-3 items-start">
                    <span className="flex-none w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">1</span>
                    <p className="text-sm text-slate-600 leading-relaxed">{rec1_tax(monthlyLiabilities)}</p>
                  </li>
                  {result.fhsaContrib > 0 && (
                    <li className="flex gap-3 items-start">
                      <span className="flex-none w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">2</span>
                      <p className="text-sm text-slate-600 leading-relaxed">{rec2_fhsa(monthlyFhsa, fhsaAlreadyThisYear)}</p>
                    </li>
                  )}
                  {result.rrspContrib > 0 && (
                    <li className="flex gap-3 items-start">
                      <span className="flex-none w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">3</span>
                      <p className="text-sm text-slate-600 leading-relaxed">{rec3_rrsp(monthlyRrsp, rrspMatchPct, rrspAlreadyContributed)}</p>
                    </li>
                  )}
                </ol>
              </SectionCard>
            )}

            {/* Marginal Rate Chart */}
            <SectionCard title="Combined Marginal Tax Rate">
              <div className="flex flex-wrap items-center gap-5 mb-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6" style={{ borderTop: '2px dashed #94a3b8' }} />
                  Before optimization
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-6 border-t-2 border-emerald-600" />
                  After optimization
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 h-3 bg-emerald-100 rounded" />
                  Income shielded zone
                </span>
              </div>
              <MarginalRateChart
                plotData={result.combinedBracketsPlotData}
                incomeBefore={result.incomeBeforeContributions}
                incomeAfter={result.incomeAfterContributions}
              />
            </SectionCard>
          </>
        ) : null}

        {/* ── FOOTER / DISCLAIMER ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm mt-2">
          <p className="text-xs text-slate-400 leading-relaxed mb-4">{DISCLAIMER}</p>
          <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-400">© {new Date().getFullYear()} Brackets · Tax Optimizer</span>
            <span className="text-xs text-slate-400">{FOOTER_CREDIT}</span>
          </div>
        </div>

      </main>
    </div>
  );
}

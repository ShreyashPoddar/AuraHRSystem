import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = await getDb();
  
  const payrollData = db.employees.map(emp => {
    const ctc = emp.salary || 0;
    const grossMonthly = ctc / 12;
    const basic = grossMonthly * 0.5;
    const hra = grossMonthly * 0.2;
    const specialAllowance = grossMonthly * 0.3;
    
    // Statutory Deductions
    const epf = basic * 0.12;
    let pt = 200; // default Indian Professional Tax monthly average
    if (emp.state === 'Karnataka') pt = 200;
    if (emp.state === 'Maharashtra') pt = 200; // Simplified for prototype
    
    // TDS Calculation Approximation (FY 2025-26 Simplification)
    let tdsYearly = 0;
    
    if (emp.taxRegime === 'old') {
      const taxable = Math.max(0, ctc - 50000 - 150000); // Standard Ded + avg 80C
      if (taxable > 250000) tdsYearly = taxable * 0.1; // extreme prototype simplicity
    } else {
      // New Regime FY 25-26 rules (Zero tax under 7L)
      if (ctc > 700000) {
        if (ctc <= 1000000) tdsYearly = (ctc - 700000) * 0.1;
        else tdsYearly = 30000 + (ctc - 1000000) * 0.15; // approximation for UI mapping
      }
    }
    const tds = tdsYearly / 12;

    const net = grossMonthly - (epf + pt + tds);

    return {
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      pan: emp.pan || 'N/A',
      ctc,
      grossMonthly: Math.round(grossMonthly),
      basic: Math.round(basic),
      hra: Math.round(hra),
      specialAllowance: Math.round(specialAllowance),
      deductions: {
        epf: Math.round(epf),
        pt: Math.round(pt),
        tds: Math.round(tds)
      },
      net: Math.round(net)
    };
  });

  return NextResponse.json({ success: true, payroll: payrollData });
}

'use client';
import { useState, useEffect } from 'react';
import { IndianRupee, Calculator, Download, Receipt, Users } from 'lucide-react';

export default function PayrollPage() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payroll/calculate')
      .then(r => r.json())
      .then(d => {
        setPayroll(d.payroll || []);
        setIsLoading(false);
      });
  }, []);

  const formatINR = (val: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const totalNet = payroll.reduce((acc, p) => acc + p.net, 0);
  const totalTDS = payroll.reduce((acc, p) => acc + p.deductions.tds, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">Payroll & Compensation</h1>
          <p className="text-ink/60 font-sans text-sm">Automated CTC breakdown and Indian tax calculations (FY 2025-26).</p>
        </div>
        <button className="bg-ink text-cream hover:bg-gold hover:text-ink px-6 py-3 rounded-xl shadow-sm text-sm font-medium transition-all duration-300 flex items-center group">
          <Calculator className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
          Run Payroll Register
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bento-card p-6 bg-cream shadow-sm border border-ink/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl group-hover:bg-gold/10 transition-colors" />
          <div className="flex items-center space-x-2 text-ink/60 mb-2">
            <IndianRupee className="w-4 h-4 text-sage" />
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Total Net Pay (Monthly)</h3>
          </div>
          <div className="font-serif text-5xl text-ink tracking-tight">{formatINR(totalNet)}</div>
        </div>
        <div className="bento-card p-6 bg-ink text-cream shadow-xl border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rust/10 rounded-full blur-2xl group-hover:bg-rust/20 transition-colors" />
          <div className="flex items-center space-x-2 text-cream/60 mb-2">
            <Receipt className="w-4 h-4 text-rust" />
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Total TDS Liability</h3>
          </div>
          <div className="font-serif text-5xl text-cream tracking-tight">{formatINR(totalTDS)}</div>
        </div>
        <div className="bento-card p-6 bg-cream shadow-sm border border-ink/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sage/5 rounded-full blur-2xl group-hover:bg-sage/10 transition-colors" />
          <div className="flex items-center space-x-2 text-ink/60 mb-2">
            <Users className="w-4 h-4 text-gold" />
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.15em]">Processed Employees</h3>
          </div>
          <div className="font-serif text-5xl text-ink tracking-tight">{payroll.length}</div>
        </div>
      </div>

      <div className="bento-card p-0 overflow-hidden shadow-sm border border-ink/10">
        <div className="p-6 border-b border-ink/5 bg-warm-sand/30 flex justify-between items-center">
          <div>
            <h2 className="font-serif text-2xl text-ink">Salary Register</h2>
            <p className="text-xs text-ink/50 font-mono mt-1">LATEST RUN: TODAY (DD/MM/YYYY)</p>
          </div>
          <button className="text-ink/60 hover:text-ink bg-white border border-ink/10 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center shadow-sm transition-all hover:shadow-md">
            <Download className="w-4 h-4 mr-2" /> Export to Bank Transfer CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white border-b border-ink/5 font-mono text-[10px] font-bold uppercase text-ink/50 tracking-[0.1em]">
              <tr>
                <th className="p-4 px-6">Employee</th>
                <th className="p-4">PAN</th>
                <th className="p-4 bg-warm-sand/30">Gross (M)</th>
                <th className="p-4">Basic</th>
                <th className="p-4">EPF</th>
                <th className="p-4">PT</th>
                <th className="p-4 text-rust">TDS</th>
                <th className="p-4 px-6 bg-gold/10 text-ink">Net Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-white font-mono text-[11px] tracking-wide">
              {isLoading ? (
                <tr><td colSpan={8} className="p-16 text-center text-ink/50 font-sans text-sm animate-pulse">Running Tax Equations...</td></tr>
              ) : payroll.length === 0 ? (
                <tr><td colSpan={8} className="p-16 text-center text-ink/50 font-sans text-sm">No employees available for payroll.</td></tr>
              ) : payroll.map(p => (
                <tr key={p.employeeId} className="hover:bg-warm-sand/40 transition-colors">
                  <td className="p-4 px-6 font-sans font-bold text-ink text-sm">{p.name}</td>
                  <td className="p-4 text-ink/50 bg-ink/5 font-bold rounded-l my-2 inline-block px-2">{p.pan}</td>
                  <td className="p-4 font-bold text-ink/70 bg-warm-sand/30">{formatINR(p.grossMonthly)}</td>
                  <td className="p-4 text-ink/60">{formatINR(p.basic)}</td>
                  <td className="p-4 text-ink/60">{formatINR(p.deductions.epf)}</td>
                  <td className="p-4 text-ink/60">{formatINR(p.deductions.pt)}</td>
                  <td className="p-4 text-rust font-bold bg-rust/5">{formatINR(p.deductions.tds)}</td>
                  <td className="p-4 px-6 font-bold text-ink bg-gold/10 text-sm shadow-inner">{formatINR(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

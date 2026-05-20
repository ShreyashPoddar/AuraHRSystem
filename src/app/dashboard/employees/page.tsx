'use client';
import { useState, useEffect } from 'react';
import { Upload, FileDown, User, AlertCircle, CheckCircle, Mail, MapPin, Briefcase, X } from 'lucide-react';
import Papa from 'papaparse';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{added: number, duplicates: number} | null>(null);

  const dbFields = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email Address' },
    { key: 'role', label: 'Job Title / Role' },
    { key: 'ctc', label: 'Annual CTC (₹)' },
    { key: 'pan', label: 'PAN Number' },
    { key: 'aadhar', label: 'Aadhar Number' },
    { key: 'uan', label: 'UAN (EPFO)' },
    { key: 'taxRegime', label: 'Tax Regime (old/new)' },
    { key: 'state', label: 'State (for PT)' }
  ];

  const fetchEmployees = async () => {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(data.employees || []);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if(results.meta.fields) {
          setHeaders(results.meta.fields);
          // Auto map 
          const initialMapping: Record<string, string> = {};
          results.meta.fields.forEach(h => {
            const match = dbFields.find(f => h.toLowerCase().includes(f.key.toLowerCase()));
            if(match) initialMapping[h] = match.key;
          });
          setMapping(initialMapping);
        }
        setCsvData(results.data);
      }
    });
  };

  const handleImport = async () => {
    setIsUploading(true);
    const mappedPayload = csvData.map(row => {
      const obj: any = {};
      Object.keys(mapping).forEach(csvHeader => {
        const dbKey = mapping[csvHeader];
        if (dbKey) {
          obj[dbKey] = row[csvHeader] || '';
        }
      });
      return obj;
    });

    try {
      const res = await fetch('/api/employees/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees: mappedPayload })
      });
      const result = await res.json();
      setUploadStats({ added: result.added, duplicates: result.duplicates });
      fetchEmployees();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif text-ink tracking-tight mb-1">Employee Directory</h1>
          <p className="text-ink/60 font-sans text-sm">Manage localized payroll logic, taxes, and core details.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={() => setIsModalOpen(true)} className="bg-ink text-cream hover:opacity-90 px-6 py-3 rounded-xl shadow-sm text-sm font-medium transition-all flex items-center group">
            <Upload className="w-4 h-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
            Bulk Import CSV
          </button>
        </div>
      </div>

      <div className="bento-card p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-sm whitespace-nowrap">
            <thead className="bg-warm-sand/50 border-b border-ink/10 font-mono text-xs uppercase text-ink/50 tracking-wider">
              <tr>
                <th className="p-4 font-bold">Employee</th>
                <th className="p-4 font-bold">Role & Location</th>
                <th className="p-4 font-bold">CTC (₹)</th>
                <th className="p-4 font-bold">Tax Regime</th>
                <th className="p-4 font-bold">Statutory IDs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5 bg-white">
              {employees.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-ink/50">No employees found. Import via CSV to begin.</td></tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-warm-sand/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-serif font-bold text-lg">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-ink">{emp.name}</div>
                        <div className="text-xs text-ink/50 flex items-center mt-0.5"><Mail className="w-3 h-3 mr-1" /> {emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-ink flex items-center mb-1"><Briefcase className="w-3 h-3 mr-1.5 text-gold/70" /> {emp.role}</div>
                    <div className="text-xs text-ink/50 flex items-center"><MapPin className="w-3 h-3 mr-1.5 text-sage" /> {emp.state || emp.location}</div>
                  </td>
                  <td className="p-4 font-mono font-medium text-ink bg-warm-sand/10">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(emp.salary || 0)}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded inline-block text-[10px] tracking-wider font-mono font-bold uppercase ${emp.taxRegime === 'old' ? 'bg-rust/10 text-rust border border-rust/20' : 'bg-sage/10 text-sage border border-sage/20'}`}>
                      {emp.taxRegime || 'new'}
                    </span>
                  </td>
                  <td className="p-4 space-y-1.5">
                    <div className="text-[11px] font-mono flex items-center"><span className="w-14 text-ink/40 font-bold">PAN</span><span className="bg-ink/5 px-1.5 rounded">{emp.pan || '--'}</span></div>
                    <div className="text-[11px] font-mono flex items-center"><span className="w-14 text-ink/40 font-bold">UAN</span><span className="bg-ink/5 px-1.5 rounded">{emp.uan || '--'}</span></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Import Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-cream w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-ink/10 overflow-hidden">
            <div className="p-6 border-b border-ink/10 flex justify-between items-center bg-white">
              <h2 className="font-serif text-2xl text-ink">CSV Data Transfer Engine</h2>
              <button onClick={() => {setIsModalOpen(false); setCsvData([]); setUploadStats(null);}} className="text-ink/40 hover:text-ink bg-warm-sand hover:bg-ink/5 p-2 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-warm-sand/40 space-y-6">
              {!csvData.length ? (
                <div className="border-2 border-dashed border-ink/20 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-white transition-colors hover:border-gold/50 cursor-pointer relative shadow-sm group">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className="w-20 h-20 bg-warm-sand rounded-full flex items-center justify-center mb-6 group-hover:bg-gold/10 transition-colors">
                    <FileDown className="w-10 h-10 text-gold opacity-80" />
                  </div>
                  <h3 className="font-bold text-ink text-xl mb-2 font-serif">Drop your CSV here</h3>
                  <p className="text-sm text-ink/60 max-w-sm mx-auto">Upload massive employee datasets instantly including localized fields like PAN, Aadhar, CTC, and UAN logic.</p>
                </div>
              ) : uploadStats ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-sage/20 shadow-sm animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-sage" />
                  </div>
                  <h3 className="font-serif text-3xl text-ink mb-3">Import Complete</h3>
                  <p className="font-sans text-ink/70 text-lg">Successfully mapped and added <span className="font-bold text-ink">{uploadStats.added}</span> localized employees.</p>
                  {uploadStats.duplicates > 0 && (
                    <p className="text-xs text-rust mt-4 font-mono font-medium tracking-wide bg-rust/10 py-1.5 px-4 inline-block rounded-full">
                      Skipped {uploadStats.duplicates} duplicates detected via strict PAN/Email rules.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-ink/10 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
                  <div className="p-6 border-b border-ink/10 bg-warm-sand/30 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-ink text-sm uppercase tracking-wider font-mono">Dynamic Data Mapping</h3>
                      <p className="text-xs text-ink/60 mt-1">Map your CSV columns to NexusHR standard Indian fields.</p>
                    </div>
                    <div className="bg-ink/5 px-3 py-1 rounded-full text-xs font-mono font-bold text-ink/60">
                      Found {csvData.length} records
                    </div>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-white max-h-[50vh] overflow-y-auto">
                    {headers.map(header => (
                      <div key={header} className="flex items-center space-x-3 bg-warm-sand/20 p-2 rounded-lg border border-transparent hover:border-ink/5">
                        <div className="w-[45%] font-mono text-xs font-bold text-ink/70 truncate px-2" title={header}>
                          {header}
                        </div>
                        <div className="text-gold opacity-50 font-bold">→</div>
                        <select 
                          className="w-[55%] bg-white border border-ink/15 shadow-sm rounded-md px-3 py-2 text-xs font-medium text-ink focus:border-gold/50 focus:ring-1 focus:ring-gold/50 outline-none transition-all"
                          value={mapping[header] || ''}
                          onChange={(e) => setMapping({...mapping, [header]: e.target.value})}
                        >
                          <option value="" className="text-ink/40">-- Ignore Field --</option>
                          {dbFields.map(dbf => <option key={dbf.key} value={dbf.key}>{dbf.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-ink/10 bg-white flex justify-end space-x-4">
              <button onClick={() => {setIsModalOpen(false); setCsvData([]);}} className="px-6 py-2.5 text-sm font-medium text-ink hover:bg-warm-sand rounded-full transition-colors border border-transparent">
                Cancel
              </button>
              {csvData.length > 0 && !uploadStats && (
                <button 
                  onClick={handleImport} 
                  disabled={isUploading}
                  className="px-8 py-2.5 text-sm font-medium bg-ink text-cream hover:bg-gold hover:text-ink hover:shadow-[0_0_15px_rgba(200,168,75,0.4)] rounded-full transition-all flex items-center disabled:opacity-50"
                >
                  {isUploading ? 'Executing Import...' : 'Confirm Mapping & Process DB'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

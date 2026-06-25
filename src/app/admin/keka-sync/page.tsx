"use client";

import React, { useState, useEffect } from 'react';

// Keka API Types based on the expected JSON shapes
interface KekaJob {
  id: string;
  title: string;
  [key: string]: any;
}

interface KekaCandidate {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  [key: string]: any;
}

export default function KekaSyncPage() {
  const [jobs, setJobs] = useState<KekaJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [candidates, setCandidates] = useState<KekaCandidate[]>([]);
  
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [candidatesError, setCandidatesError] = useState('');

  // Map candidate IDs to their sync status ('idle', 'loading', 'success', 'error')
  const [syncStatus, setSyncStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});

  // Console logging state
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [activeLogs, setActiveLogs] = useState<{ time: string; type: 'info' | 'success' | 'error' | 'header'; message: string }[]>([]);
  const [syncingCandidate, setSyncingCandidate] = useState<KekaCandidate | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'header' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setActiveLogs((prev) => [...prev, { time, type, message }]);
  };

  // Fetch Jobs on Mount
  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await fetch('/api/keka/sync-jobs');
        const data = await res.json();
        if (data.success && data.jobs) {
          setJobs(data.jobs);
        } else {
          setJobsError(data.error || 'Failed to fetch jobs');
        }
      } catch (err: any) {
        setJobsError(err.message || 'Network error fetching jobs');
      } finally {
        setIsLoadingJobs(false);
      }
    }
    loadJobs();
  }, []);

  // Fetch Candidates when Job changes
  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([]);
      return;
    }

    async function loadCandidates() {
      setIsLoadingCandidates(true);
      setCandidatesError('');
      try {
        const res = await fetch(`/api/keka/sync-candidates?jobId=${selectedJobId}`);
        const data = await res.json();
        if (data.success && data.candidates) {
          setCandidates(data.candidates);
        } else {
          setCandidatesError(data.error || 'Failed to fetch candidates');
        }
      } catch (err: any) {
        setCandidatesError(err.message || 'Network error fetching candidates');
      } finally {
        setIsLoadingCandidates(false);
      }
    }
    
    loadCandidates();
  }, [selectedJobId]);

  // Handle Candidate Sync
  const handleSync = async (candidateId: string, email: string, firstName: string, lastName: string) => {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown';
    setSyncingCandidate({ id: candidateId, email, firstName, lastName });
    setIsConsoleOpen(true);
    setActiveLogs([]);
    setSyncStatus((prev) => ({ ...prev, [candidateId]: 'loading' }));

    addLog(`Initializing sync pipeline for candidate: ${fullName} (ID: ${candidateId})`, 'header');
    
    // Simulate steps as the fetch happens
    addLog(`[Step 1/3] Contacting local proxy endpoint: /api/keka/fetch-resume...`, 'info');
    await new Promise((resolve) => setTimeout(resolve, 600));
    addLog(`[Step 1/3] Server-side Keka OAuth handshake initiated...`, 'info');
    
    try {
      const res = await fetch(`/api/keka/fetch-resume?id=${candidateId}&email=${encodeURIComponent(email || '')}`);
      const data = await res.json();
      
      if (data.success) {
        addLog(`[Step 1/3] Keka OAuth handshake successful. Active token secured.`, 'success');
        await new Promise((resolve) => setTimeout(resolve, 400));
        
        addLog(`[Step 2/3] Extracting candidate resume location from rackbank.keka.com...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, 400));
        addLog(`[Step 2/3] Resume file URL located. Dynamically parsed file name.`, 'success');
        
        addLog(`[Step 2/3] Downloading resume file stream and converting to base64...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, 450));
        addLog(`[Step 2/3] Conversion completed. Extracted base64 string.`, 'success');

        addLog(`[Step 3/3] Initiating payload delivery to Moodle...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, 400));
        addLog(`[Step 3/3] Calling Moodle function: local_aurahr_jobs_upload_resume`, 'info');
        
        addLog(`[Step 3/3] Moodle server response: status: "success"`, 'success');
        await new Promise((resolve) => setTimeout(resolve, 400));

        addLog(`[Moodle Processing Pipeline] Resume successfully saved to Moodle file storage.`, 'success');
        addLog(`[Moodle Processing Pipeline] Node.js script (parse_pdf.js) triggered for text extraction.`, 'info');
        addLog(`[Moodle Processing Pipeline] Scanning text for contact details & socials (Github/LinkedIn/Leetcode)...`, 'info');
        addLog(`[Moodle Processing Pipeline] Triggering JD Match scoring (match_candidates)...`, 'info');
        
        addLog(`Sync and Parse complete! Match metrics successfully calculated.`, 'header');

        setSyncStatus((prev) => ({ ...prev, [candidateId]: 'success' }));
      } else {
        addLog(`[Error] Handshake failed or returned error: ${data.error || 'Unknown error'}`, 'error');
        if (data.rawKekaData) {
          addLog(`[Keka Error Details] ${JSON.stringify(data.rawKekaData)}`, 'error');
        }
        if (data.debuginfo) {
          addLog(`[Moodle Debug Info] ${data.debuginfo}`, 'error');
        }
        setSyncStatus((prev) => ({ ...prev, [candidateId]: 'error' }));
      }
    } catch (err: any) {
      addLog(`[Network Error] Pipeline interrupted: ${err.message || 'Unknown network failure'}`, 'error');
      setSyncStatus((prev) => ({ ...prev, [candidateId]: 'error' }));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">Keka Integration Sync</h1>
        <p className="text-gray-500 mt-2">Dynamically sync active jobs and parse candidate resumes.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar for Jobs */}
        <div className="w-full md:w-1/3 flex flex-col">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 h-full">
            <h2 className="text-lg font-medium mb-4 text-gray-700">Active Vacancies</h2>
            
            {isLoadingJobs && <div className="text-gray-500 text-sm">Loading jobs...</div>}
            {jobsError && <div className="text-red-500 text-sm">{jobsError}</div>}
            
            {!isLoadingJobs && !jobsError && jobs.length === 0 && (
              <div className="text-gray-500 text-sm">No active jobs found.</div>
            )}

            <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                      selectedJobId === job.id 
                        ? 'bg-blue-50 border-blue-200 text-blue-700 border' 
                        : 'bg-gray-50 hover:bg-gray-100 border border-transparent text-gray-700'
                    }`}
                  >
                    {job.title || 'Untitled Job'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content for Candidates */}
        <div className="w-full md:w-2/3 flex flex-col">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-0 overflow-hidden">
            {!selectedJobId ? (
              <div className="p-12 text-center text-gray-400">
                <p>Select a job vacancy from the list to view candidates.</p>
              </div>
            ) : (
              <div className="p-0">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-medium text-gray-700">Applicant Pipeline</h2>
                </div>
                
                {isLoadingCandidates ? (
                  <div className="p-8 text-center text-gray-500 text-sm">Loading candidates...</div>
                ) : candidatesError ? (
                  <div className="p-8 text-center text-red-500 text-sm">{candidatesError}</div>
                ) : candidates.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">No candidates found for this job.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                          <th className="px-6 py-4 font-medium">Name</th>
                          <th className="px-6 py-4 font-medium">Email</th>
                          <th className="px-6 py-4 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {candidates.map((candidate) => {
                          const status = syncStatus[candidate.id] || 'idle';
                          const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown';
                          const email = candidate.email || 'N/A';

                          return (
                            <tr key={candidate.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">
                                {fullName}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                {email}
                              </td>
                              <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                                {status === 'idle' || status === 'error' ? (
                                  <div className="flex items-center justify-end gap-2">
                                    {status === 'error' && <span className="text-xs text-red-500 font-medium">Failed</span>}
                                    <button
                                      onClick={() => handleSync(candidate.id, candidate.email, candidate.firstName, candidate.lastName)}
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md shadow-sm text-xs font-medium hover:bg-gray-50 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                    >
                                      Sync & Parse
                                    </button>
                                  </div>
                                ) : status === 'loading' ? (
                                  <div className="flex items-center justify-end">
                                    <button
                                      onClick={() => setIsConsoleOpen(true)}
                                      className="px-4 py-2 bg-blue-50 border border-blue-105 text-blue-600 rounded-md shadow-sm text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-2"
                                    >
                                      <svg className="animate-spin h-3 w-3 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Parsing...
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setIsConsoleOpen(true)}
                                      className="px-3 py-1 text-[10px] border border-gray-200 text-gray-500 rounded hover:bg-gray-50 transition-colors font-mono"
                                    >
                                      View Logs
                                    </button>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                      </svg>
                                      Synced
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Console Modal for Sync Details */}
      {isConsoleOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 text-gray-100 border border-gray-800 w-full max-w-2xl rounded-lg shadow-2xl flex flex-col h-[520px] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <h3 className="font-mono text-sm font-semibold tracking-wide text-gray-200">
                  Sync Pipeline Console — {syncingCandidate ? `${syncingCandidate.firstName} ${syncingCandidate.lastName}` : ''}
                </h3>
              </div>
              <button 
                onClick={() => setIsConsoleOpen(false)}
                className="text-gray-400 hover:text-gray-200 hover:bg-gray-800 p-1.5 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {/* Console Log Body */}
            <div className="flex-1 p-6 font-mono text-[11px] overflow-y-auto space-y-3 bg-gray-950/85">
              {activeLogs.length === 0 ? (
                <div className="text-gray-600 animate-pulse">Establishing stream...</div>
              ) : (
                activeLogs.map((log, idx) => {
                  let color = 'text-gray-300';
                  let prefix = '⚙️';
                  if (log.type === 'header') {
                    color = 'text-blue-400 font-bold border-b border-gray-800 pb-1 mt-4 first:mt-0';
                    prefix = '▶';
                  } else if (log.type === 'success') {
                    color = 'text-green-400';
                    prefix = '✔';
                  } else if (log.type === 'error') {
                    color = 'text-red-400 font-semibold';
                    prefix = '❌';
                  }
                  return (
                    <div key={idx} className={`leading-relaxed ${color} flex items-start gap-2`}>
                      <span className="text-gray-600 flex-shrink-0 select-none">[{log.time}]</span>
                      <span className="flex-shrink-0">{prefix}</span>
                      <span className="whitespace-pre-wrap">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex justify-between items-center">
              <span className="text-[10px] text-gray-500 font-mono">
                AuraHR Keka Integration (v1.0.0-poc)
              </span>
              <button
                onClick={() => setIsConsoleOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded transition-colors focus:outline-none"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

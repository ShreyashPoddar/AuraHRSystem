'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Sparkles, Video, Calendar, 
  ChevronDown, Mail, ArrowRight, ExternalLink
} from 'lucide-react';

const DOC_SECTIONS = [
  {
    title: 'Recruitment Pipeline',
    items: [
      { title: 'Understanding Stages', desc: 'How candidates move from Applied to Selected' },
      { title: 'Manual Overrides', desc: 'How to skip stages or reject candidates' },
      { title: 'Pipeline Analytics', desc: 'Viewing drop-off rates and time-to-hire' },
    ]
  },
  {
    title: 'AI Features',
    items: [
      { title: 'JD Parser Scoring', desc: 'How resumes are matched against Job Descriptions' },
      { title: 'Social Profile Analysis', desc: 'Triggering GitHub/LinkedIn AI scoring' },
      { title: 'Malpractice Detection', desc: 'Reviewing flagged behavior from video assessments' },
    ]
  },
  {
    title: 'Employee Management',
    items: [
      { title: 'Adding Employees', desc: 'Onboarding new hires to the employee portal' },
      { title: 'Department Org Chart', desc: 'Organizing your workforce structure' },
      { title: 'Skill Tracking', desc: 'Managing the internal talent pool' },
    ]
  },
  {
    title: 'Payroll & Compliance',
    items: [
      { title: 'Statutory Identity', desc: 'Configuring GSTIN, TAN, and Regions' },
      { title: 'Tax Calculations', desc: 'Automated PF, ESI, PT, and TDS deductions' },
      { title: 'Payslip Generation', desc: 'Publishing monthly payslips to employees' },
    ]
  }
];

const FAQS = [
  {
    question: 'How does the AI score candidates?',
    answer: 'Our JD Parser uses Gemini 2.5 to evaluate a candidates resume against your Job Description. It extracts "must-have" and "good-to-have" skills and outputs a match percentage from 0-100.'
  },
  {
    question: 'How is social profile analysis triggered?',
    answer: 'Social profile analysis is triggered automatically as soon as a candidate applies to a job posting. The system will scrape their provided GitHub, LinkedIn, and LeetCode links and generate scores instantly.'
  },
  {
    question: 'What is the malpractice detection system?',
    answer: 'During video assessments (Academia/Interviews), we monitor tab switches, multiple faces, and suspicious audio. If detected, the candidates "Malpractice" flag is raised for recruiter review.'
  },
  {
    question: 'Can I customize the pipeline stages?',
    answer: 'Currently, the core pipeline (Applied → Screened → Academia → Interview → Offer → Selected) is fixed to ensure consistent AI scoring, but you can configure which stages are automated vs manual in Settings.'
  },
  {
    question: 'How does smart scheduling work?',
    answer: 'The Smart Scheduler looks at your connected calendar availability and the candidates preferred times to suggest optimal interview slots, avoiding double bookings.'
  },
  {
    question: 'How do I export candidate data?',
    answer: 'In the Applications view, click the "Export CSV" button in the top right of the table to download the current filtered view of candidates, including their AI scores.'
  }
];

const QUICK_ACTIONS = [
  { icon: Plus, title: 'Creating a Job Post', desc: 'Create and publish listings', color: 'text-sage' },
  { icon: Sparkles, title: 'AI-Powered Screening', desc: 'JD parser and scoring', color: 'text-gold' },
  { icon: Video, title: 'Managing Interviews', desc: 'Proctoring and video calls', color: 'text-rust' },
  { icon: Calendar, title: 'Smart Scheduler', desc: 'Automated interview booking', color: 'text-ink' },
];

export default function OrgHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const filteredFaqs = FAQS.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-12">
      {/* Header Section */}
      <div className="text-center space-y-4 py-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl -z-10" />
        <h1 className="font-serif text-4xl font-bold text-ink tracking-tight">Organization Help Center</h1>
        <p className="text-ink/60 text-sm max-w-lg mx-auto">
          Find documentation, guides, and answers to manage your recruitment pipeline effectively.
        </p>
        
        <div className="max-w-2xl mx-auto pt-6 relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none mt-6">
            <Search className="h-5 w-5 text-ink/40 group-focus-within:text-gold transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation, features, or FAQs..."
            className="w-full pl-14 pr-6 py-4 bg-white/80 backdrop-blur-sm border border-ink/10 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold shadow-sm transition-all text-lg"
          />
        </div>
      </div>

      {/* Quick Start Grid */}
      {!searchQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, idx) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bento-card p-6 group cursor-pointer hover:border-gold/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-white/50"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2.5 rounded-xl bg-warm-sand shadow-sm border border-ink/5 ${action.color}`}>
                    <action.icon size={22} />
                  </div>
                  <ArrowRight size={18} className="text-ink/20 group-hover:text-gold group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-serif text-base font-bold text-ink mb-1">{action.title}</h3>
                <p className="text-sm text-ink/60 flex-grow">{action.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Documentation & FAQs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Docs Index */}
        {!searchQuery && (
          <div className="lg:col-span-1 space-y-6">
            <h2 className="font-serif text-2xl font-bold text-ink">Documentation</h2>
            <div className="space-y-4">
              {DOC_SECTIONS.map((section, idx) => (
                <div key={idx} className="bento-card p-5 bg-white/40">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-ink/40 mb-3">{section.title}</h3>
                  <ul className="space-y-3">
                    {section.items.map((item, i) => (
                      <li key={i} className="group cursor-pointer">
                        <p className="text-sm font-semibold text-ink group-hover:text-gold transition-colors">{item.title}</p>
                        <p className="text-xs text-ink/50 mt-0.5 line-clamp-1">{item.desc}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Col: FAQs */}
        <div className={searchQuery ? 'lg:col-span-3' : 'lg:col-span-2'}>
          <div className="bento-card p-8 bg-white/80">
            <h2 className="font-serif text-2xl font-bold text-ink mb-6">Frequently Asked Questions</h2>
            
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 text-ink/50 bg-warm-sand/30 rounded-xl border border-dashed border-ink/10">
                <Search size={32} className="mx-auto mb-3 text-ink/20" />
                <p>No results found for "{searchQuery}".</p>
                <p className="text-sm mt-1">Try searching for "AI", "pipeline", or "export".</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className={`border rounded-xl transition-all duration-300 overflow-hidden ${isOpen ? 'border-gold/30 bg-gold/5 shadow-sm' : 'border-ink/10 bg-white hover:border-ink/20'}`}
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                      >
                        <span className="font-sans font-semibold text-ink pr-8">{faq.question}</span>
                        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0 text-ink/40">
                          <ChevronDown size={20} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-5 pt-0 text-sm text-ink/70 leading-relaxed border-t border-ink/5 mt-2">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Support */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bento-card p-8 bg-ink text-cream flex flex-col md:flex-row items-center justify-between border-none shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sage/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mb-6 md:mb-0 flex items-center gap-5 relative z-10">
          <div className="p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
            <Mail size={32} className="text-gold" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold mb-1">Enterprise Support</h3>
            <p className="text-sm text-cream/70">Our dedicated SLA guarantees a response within 2 hours.</p>
          </div>
        </div>
        <a href="mailto:support@aurahr.com" className="w-full md:w-auto px-6 py-3 bg-gold hover:bg-gold/90 text-ink rounded-xl font-bold text-sm transition-colors shadow-lg shadow-gold/20 flex items-center justify-center gap-2 relative z-10">
          Contact Support
          <ExternalLink size={16} />
        </a>
      </motion.div>
    </div>
  );
}

import Link from 'next/link';
import { ArrowRight, FileText, CheckCircle, Calendar, Video, BarChart2, LayoutDashboard } from 'lucide-react';

export default function RecruitmentPage() {
  return (
    <div className="min-h-screen bg-[#EDE8DF] text-[#3D3A34] selection:bg-[#B8972E]/30 font-sans">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-[#EDE8DF]/90 backdrop-blur-md border-b border-[#D8D2C8]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold text-[#1A1814] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Nexus<span className="text-[#B8972E]">HR</span>
          </Link>
          <div className="hidden md:flex items-center space-x-1 bg-[#F5F1EB] rounded-full px-2 py-1 border border-[#D8D2C8]">
            {['Features', 'Recruitment', 'Testimonials', 'Pricing'].map((item) => (
              <Link key={item} href={item === 'Recruitment' ? '/recruitment' : `/#${item.toLowerCase()}`} className="px-5 py-2 text-sm font-medium text-[#3D3A34] hover:text-[#1A1814] hover:bg-black/5 rounded-full transition-colors">
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="hidden md:inline-flex text-sm font-medium text-[#1A1814] hover:text-[#B8972E] transition-colors">
              Log in
            </Link>
            <Link href="/login" className="bg-[#1A1814] text-[#F5F1EB] hover:bg-black/80 px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-48 pb-24 px-6 border-b border-[#D8D2C8]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">
              AI Recruitment
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-normal text-[#1A1814] leading-tight mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Hire smarter, not<br/>
            <span className="text-[#B8972E] italic">harder</span>
          </h1>
          <p className="text-xl text-[#3D3A34] max-w-2xl mx-auto mb-10">
            From job description to offer letter — fully automated by AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/login" className="bg-[#1A1814] text-[#F5F1EB] hover:opacity-90 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto flex items-center justify-center">
              Start Hiring <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link href="#demo" className="bg-transparent border border-[#D8D2C8] text-[#1A1814] hover:bg-black/5 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto bg-[#F5F1EB]">
              See It Live
            </Link>
          </div>
        </div>
      </section>

      {/* Pipeline Visualization Section */}
      <section className="py-24 px-6 bg-[#F5F1EB] border-b border-[#D8D2C8]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E] block mb-4">
              How It Works
            </span>
            <h2 className="text-4xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>
              From JD to <span className="text-[#B8972E] italic">Hire</span> in 6 steps
            </h2>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-[60px] left-[5%] right-[5%] h-[2px] bg-[#B8972E]/30" />

            <div className="grid grid-cols-1 md:grid-cols-6 gap-6 relative z-10">
              {[
                { step: '1', title: 'JD Parser & Filtering', icon: FileText, desc: 'Paste a JD — AI extracts skills, experience, and requirements automatically.' },
                { step: '2', title: 'Shortlisting Engine', icon: CheckCircle, desc: 'AI scores every applicant against your JD and surfaces the top matches instantly.' },
                { step: '3', title: 'Interview Scheduling', icon: Calendar, desc: "Candidates self-schedule from your team's live calendar. Zero back-and-forth." },
                { step: '4', title: 'AI Interview & Assessment', icon: Video, desc: 'AI conducts async video interviews and evaluates responses in real time.' },
                { step: '5', title: 'Scoring & Ranking', icon: BarChart2, desc: 'Every candidate gets a detailed score card — skills, culture fit, communication.' },
                { step: '6', title: 'Recruiter Dashboard', icon: LayoutDashboard, desc: 'One unified view of your entire pipeline. Filter, compare, and make offers fast.' }
              ].map((s, i) => (
                <div key={i} className="relative bg-[#EDE8DF] border border-[#D8D2C8] rounded-xl p-6 flex flex-col items-start border-t-4 border-t-[#B8972E] shadow-sm hover:-translate-y-1 transition-transform">
                  <div className="bg-[#F5F1EB] border border-[#D8D2C8] w-12 h-12 rounded-full flex items-center justify-center relative z-10 mb-6 mx-auto md:mx-0 shadow-sm">
                    <s.icon className="w-5 h-5 text-[#C8A84B]" />
                  </div>
                  <div className="text-2xl text-[#B8972E] mb-3" style={{ fontFamily: 'Georgia, serif' }}>0{s.step}</div>
                  <h3 className="font-bold text-[#1A1814] text-sm mb-3 font-sans leading-tight">{s.title}</h3>
                  <p className="text-xs text-[#9A9486] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep-Dive Section */}
      <section className="py-24 px-6 bg-[#EDE8DF] border-b border-[#D8D2C8]">
        <div className="max-w-6xl mx-auto space-y-32">
          
          {/* Block 1 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full order-2 md:order-1">
              <div className="bg-[#F5F1EB] rounded-2xl border border-[#D8D2C8] p-8 shadow-sm h-80 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-full max-w-sm bg-white rounded-lg border border-[#D8D2C8] p-4 shadow-sm opacity-90 transform -rotate-1">
                  <div className="h-2 w-24 bg-[#D8D2C8]/50 rounded mb-4" />
                  <div className="h-2 w-full bg-[#D8D2C8]/30 rounded mb-2" />
                  <div className="h-2 w-4/5 bg-[#D8D2C8]/30 rounded mb-6" />
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-[#B8972E]/10 text-[#B8972E] rounded text-[10px] font-mono border border-[#B8972E]/20">React</span>
                    <span className="px-2 py-1 bg-[#B8972E]/10 text-[#B8972E] rounded text-[10px] font-mono border border-[#B8972E]/20">5 yrs exp</span>
                    <span className="px-2 py-1 bg-[#B8972E]/10 text-[#B8972E] rounded text-[10px] font-mono border border-[#B8972E]/20">Remote OK</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 order-1 md:order-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">JD Parser</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Extract requirements instantly.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Generates highly accurate skill tokens.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Normalizes job titles and experience.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Removes biased language automatically.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Block 2 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">Shortlisting Engine</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Find the top 1% instantly.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> AI scores candidates on 50+ data points.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Eliminates resume review fatigue.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Highlights missing required skills.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="flex-1 w-full relative">
              <div className="bg-[#F5F1EB] rounded-2xl border border-[#D8D2C8] p-8 shadow-sm h-80 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm space-y-3 transform rotate-1">
                  {[98, 92, 85].map((score, i) => (
                    <div key={i} className="bg-white rounded border border-[#D8D2C8] p-3 flex justify-between items-center shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#EDE8DF] border border-[#D8D2C8]" />
                        <div className="h-2 w-20 bg-[#D8D2C8]/50 rounded" />
                      </div>
                      <div className="font-mono text-sm font-bold text-[#B8972E]">{score}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Block 3 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full order-2 md:order-1">
              <div className="bg-[#F5F1EB] rounded-2xl border border-[#D8D2C8] p-8 shadow-sm h-80 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm bg-white rounded-lg border border-[#D8D2C8] p-5 shadow-sm">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {Array.from({length: 14}).map((_, i) => (
                      <div key={i} className={`h-8 rounded ${i === 4 || i === 9 ? 'bg-[#B8972E] text-white flex items-center justify-center font-mono text-xs shadow-md transform scale-110' : 'bg-[#EDE8DF]'}`}>
                        {i === 4 || i === 9 ? '✓' : ''}
                      </div>
                    ))}
                  </div>
                  <div className="h-8 w-full bg-[#1A1814] rounded-full text-white flex items-center justify-center text-xs font-medium">Confirm Slot</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 order-1 md:order-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">Interview Scheduling</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Zero back-and-forth emails.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Syncs directly with Google/Outlook calendars.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Automated timezone conversions for globals.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Smart dynamic rescheduling workflows.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Block 4 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">AI Interview</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Asynchronous AI Screening.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Conduct dynamic video interviews 24/7.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> AI generates tailored follow-up questions.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Deep voice & sentiment text analysis.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="flex-1 w-full relative">
              <div className="bg-[#1A1814] rounded-2xl border border-[#D8D2C8] p-2 shadow-xl h-80 flex relative overflow-hidden">
                <div className="w-2/3 bg-[#3D3A34] rounded-xl relative">
                  <div className="absolute top-4 right-4 bg-red-500 w-2 h-2 rounded-full animate-pulse" />
                </div>
                <div className="w-1/3 p-4 flex flex-col">
                  <div className="w-full h-3 bg-[#B8972E]/50 rounded mb-2" />
                  <div className="w-4/5 h-3 bg-white/20 rounded mb-4" />
                  <div className="mt-auto flex space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                    <div className="w-8 h-8 rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 5 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 w-full order-2 md:order-1">
              <div className="bg-[#F5F1EB] rounded-2xl border border-[#D8D2C8] p-8 shadow-sm h-80 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-48 h-48 border border-[#B8972E]/50 rounded-full flex items-center justify-center relative">
                  <div className="w-32 h-32 border border-[#D8D2C8] rounded-full absolute" />
                  <svg className="w-full h-full absolute transform rotate-45 opacity-50 text-[#B8972E]" viewBox="0 0 100 100">
                    <polygon points="50,15 85,35 75,75 25,75 15,35" fill="currentColor" />
                  </svg>
                  <div className="font-mono text-xl font-bold text-[#1A1814] z-10">A+</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6 order-1 md:order-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">Scoring & Ranking</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Detailed multi-axis intelligence.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Combines technical & behavioral scores.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Normalizes ratings to prevent reviewer bias.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Radar charts for instant visual comparison.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          </div>

          {/* Block 6 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#B8972E]">Dashboard</span>
              <h3 className="text-3xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>Complete pipeline control.</h3>
              <ul className="space-y-3 text-[#3D3A34]">
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Drag-and-drop Kanban candidate workflow.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> One-click offer letter generation.</li>
                <li className="flex items-start"><CheckCircle className="w-5 h-5 text-[#C8A84B] mr-3 shrink-0" /> Integrated team collaboration commenting.</li>
              </ul>
              <Link href="#" className="inline-flex items-center text-sm font-medium text-[#B8972E] hover:text-[#1A1814] transition-colors mt-4">
                Learn more <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="flex-1 w-full relative">
              <div className="bg-[#F5F1EB] rounded-2xl border border-[#D8D2C8] p-6 shadow-sm h-80 flex space-x-4 overflow-hidden items-center justify-center">
                <div className="w-1/3 bg-[#EDE8DF] rounded-lg p-2 flex flex-col gap-2 h-4/5">
                  <div className="h-4 w-1/2 bg-[#D8D2C8] rounded mb-2" />
                  <div className="h-12 bg-white rounded border border-[#D8D2C8] shadow-sm transform rotate-2" />
                  <div className="h-12 bg-white rounded border border-[#D8D2C8] shadow-sm" />
                </div>
                <div className="w-1/3 bg-[#EDE8DF] rounded-lg p-2 flex flex-col gap-2 h-4/5">
                  <div className="h-4 w-2/3 bg-[#D8D2C8] rounded mb-2" />
                  <div className="h-12 bg-[#B8972E]/10 border border-[#B8972E]/50 rounded shadow-sm transform -rotate-1" />
                </div>
                <div className="w-1/3 bg-[#EDE8DF] rounded-lg p-2 flex flex-col gap-2 h-4/5">
                  <div className="h-4 w-1/3 bg-[#D8D2C8] rounded mb-2" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-[#D8D2C8] bg-[#F5F1EB] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x md:divide-[#D8D2C8]">
          {[
            { value: '73%', label: 'Reduction in time-to-hire' },
            { value: '4.8x', label: 'More qualified shortlists' },
            { value: '90%', label: 'Candidate satisfaction' },
            { value: 'Zero', label: 'Scheduling conflicts' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center space-y-2">
              <div className="text-5xl md:text-6xl text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>{stat.value}</div>
              <div className="font-mono uppercase text-xs font-bold tracking-[0.15em] text-[#9A9486] max-w-[150px] mx-auto leading-relaxed">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-32 px-6 bg-[#EDE8DF]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl text-[#1A1814] mb-6" style={{ fontFamily: 'Georgia, serif' }}>
            Your next great hire is <span className="text-[#B8972E] italic">one click away</span>
          </h2>
          <p className="text-lg text-[#3D3A34] mb-10 max-w-xl mx-auto">
            Let AI handle the screening. You focus on the conversation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="bg-[#1A1814] text-[#F5F1EB] hover:opacity-90 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto flex items-center justify-center">
              Get Started <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link href="#demo" className="bg-transparent border border-[#D8D2C8] text-[#1A1814] hover:bg-black/5 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto bg-[#F5F1EB]">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#F5F1EB]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-2xl font-bold text-[#1A1814]" style={{ fontFamily: 'Georgia, serif' }}>
            Nexus<span className="text-[#B8972E]">HR</span>
          </div>
          <div className="flex space-x-6 text-sm text-[#9A9486] font-sans">
            <a href="#" className="hover:text-[#1A1814]">Terms</a>
            <a href="#" className="hover:text-[#1A1814]">Privacy</a>
            <a href="#" className="hover:text-[#1A1814]">Contact</a>
          </div>
          <div className="text-xs font-mono text-[#9A9486]">
            © 2026 NexusHR Global.
          </div>
        </div>
      </footer>
    </div>
  );
}

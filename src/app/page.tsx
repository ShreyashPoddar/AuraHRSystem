import Link from 'next/link';
import { ArrowRight, Globe2, Building2, Server, Globe, Users, Wallet, CreditCard, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-sand selection:bg-gold/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-warm-sand/80 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold text-ink tracking-tight">
            Nexus<span className="text-gold">HR</span>
          </Link>
          <div className="hidden md:flex items-center space-x-1 bg-cream rounded-full px-2 py-1 border border-ink/10">
            {['Features', 'Recruitment', 'Testimonials', 'Pricing'].map((item) => (
              <Link key={item} href={item === 'Recruitment' ? '/recruitment' : `/#${item.toLowerCase()}`} className="px-5 py-2 text-sm font-medium text-ink/80 hover:text-ink hover:bg-ink/5 rounded-full transition-colors">
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="hidden md:inline-flex text-sm font-medium text-ink hover:text-gold transition-colors">
              Log in
            </Link>
            <Link href="/login" className="bg-ink text-cream hover:opacity-90 px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-medium text-ink leading-tight mb-6">
            Global HR, automated with <span className="italic text-gold">precision</span>.
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/dashboard/verification" className="bg-ink text-cream hover:opacity-90 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto flex items-center justify-center">
              Enter Dashboard <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link href="#features" className="bg-transparent border border-ink text-ink hover:bg-ink/5 px-8 py-3.5 rounded-full font-medium transition-all w-full sm:w-auto">
              See Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <div className="border-y border-ink/10 bg-cream/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap justify-between items-center gap-8">
          {[
            { label: '150+ Currencies', icon: Wallet },
            { label: '10,000+ Companies', icon: Building2 },
            { label: '99.9% Uptime', icon: Server },
            { label: '50+ Countries', icon: Globe }
          ].map((stat, i) => (
            <div key={i} className="flex items-center space-x-3 text-ink/80">
              <stat.icon className="w-5 h-5 text-gold" />
              <span className="font-mono uppercase text-sm font-medium tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features - Bento Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="font-serif text-4xl text-ink mb-4">Everything you need.</h2>
          <p className="font-sans text-ink/70 text-lg max-w-xl">One unified platform integrating all aspects of global HR.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[400px]">
          {/* Workforce */}
          <div className="bento-card p-8 flex flex-col relative overflow-hidden group">
            <div className="bg-sage/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
              <Users className="text-sage w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl mb-4">Workforce Planning</h3>
            <ul className="space-y-3 font-sans text-sm text-ink/70">
              <li className="flex items-center">✓ Shareable headcount</li>
              <li className="flex items-center">✓ Comp reviews</li>
              <li className="flex items-center">✓ Survey & learning tools</li>
              <li className="flex items-center">✓ Core HRIS</li>
            </ul>
          </div>

          {/* Payroll */}
          <div className="bento-card p-0 flex flex-col relative overflow-hidden lg:col-span-2 bg-[#1C1A16] border-none group">
            <div className="absolute top-8 left-8 z-10">
              <div className="bg-gold/20 w-12 h-12 rounded-full flex items-center justify-center">
                <Wallet className="text-gold w-6 h-6" />
              </div>
            </div>
            <div className="w-full h-full flex items-center justify-center p-4 pt-20">
              <img 
                src="/roadmap.png" 
                alt="AuraHR Infrastructure" 
                className="w-full h-auto object-contain rounded-2xl opacity-90 group-hover:opacity-100 transition-opacity duration-500"
              />
            </div>
          </div>

          {/* Payments */}
          <div className="bento-card p-8 flex flex-col relative overflow-hidden group">
            <div className="bg-rust/10 w-12 h-12 rounded-full flex items-center justify-center mb-6">
              <CreditCard className="text-rust w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl mb-4">Global Payments</h3>
            <ul className="space-y-3 font-sans text-sm text-ink/70">
              <li className="flex items-center">✓ 150+ Currencies</li>
              <li className="flex items-center">✓ Localized contracts</li>
              <li className="flex items-center">✓ Invoice approvals</li>
              <li className="flex items-center">✓ Expense tracking</li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="bento-card p-8 flex flex-col lg:col-span-4 relative overflow-hidden group items-center text-center justify-center bg-cream/50 border-ink/20">
            <ShieldCheck className="text-sage w-10 h-10 mb-4" />
            <h3 className="font-serif text-3xl mb-4">Compliance & Legal made easy.</h3>
            <p className="font-sans text-ink/70 max-w-2xl mx-auto">
              Automate local tax, labor compliance, and benefits administration with support from local HR and legal experts worldwide.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-cream/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-4xl text-ink mb-12 text-center">Loved by global teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "AuraHR completely transformed how we manage our remote engineers.", author: "Sarah J., CTO" },
              { quote: "The AI compliance alerts saved us from massive legal headaches in Germany.", author: "Mark T., SVP People" },
              { quote: "Payroll across 12 countries takes minutes instead of days. Unbelievable.", author: "Elena R., Founder" }
            ].map((t, i) => (
              <div key={i} className="bento-card p-8 flex flex-col justify-between bg-warm-sand border-none shadow-sm">
                <p className="font-serif text-xl italic text-ink/90 mb-6">"{t.quote}"</p>
                <p className="font-mono text-sm uppercase text-ink/60 tracking-wider">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-cream/30 border-t border-ink/5">
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-ink mb-4">Simple, transparent pricing</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bento-card p-8 flex flex-col">
              <h3 className="font-mono uppercase text-sm font-medium tracking-wider mb-2">Starter</h3>
              <p className="font-serif text-4xl mb-6">$49<span className="text-lg text-ink/50 font-sans">/mo</span></p>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/70">
                <li>✓ Up to 10 employees</li>
                <li>✓ Basic HRIS</li>
                <li>✓ Local contracts</li>
              </ul>
              <Link href="/login" className="block text-center border border-ink py-3 rounded-full hover:bg-ink hover:text-cream transition-colors">Start Free</Link>
            </div>
            <div className="bento-card p-8 flex flex-col relative border-gold shadow-[0_0_20px_rgba(200,168,75,0.15)] ring-1 ring-gold bg-cream">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gold text-ink text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <h3 className="font-mono uppercase text-sm font-medium tracking-wider mb-2">Growth</h3>
              <p className="font-serif text-4xl mb-6">$199<span className="text-lg text-ink/50 font-sans">/mo</span></p>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/70">
                <li>✓ Up to 100 employees</li>
                <li>✓ Advanced Payroll</li>
                <li>✓ AI Summaries</li>
                <li>✓ 24/7 Support</li>
              </ul>
              <Link href="/login" className="block text-center bg-ink text-cream py-3 rounded-full hover:opacity-90 transition-colors">Get Growth</Link>
            </div>
            <div className="bento-card p-8 flex flex-col">
              <h3 className="font-mono uppercase text-sm font-medium tracking-wider mb-2">Enterprise</h3>
              <p className="font-serif text-4xl mb-6">Custom</p>
              <ul className="space-y-4 mb-8 flex-1 text-sm text-ink/70">
                <li>✓ Unlimited employees</li>
                <li>✓ Dedicated account manager</li>
                <li>✓ Custom API access</li>
              </ul>
              <Link href="/login" className="block text-center border border-ink py-3 rounded-full hover:bg-ink hover:text-cream transition-colors">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-serif text-2xl font-bold text-ink">
            Nexus<span className="text-gold">HR</span>
          </div>
          <div className="flex space-x-6 text-sm text-ink/60 font-sans">
            <a href="#" className="hover:text-ink">Terms</a>
            <a href="#" className="hover:text-ink">Privacy</a>
            <a href="#" className="hover:text-ink">Contact</a>
          </div>
          <div className="text-sm font-mono text-ink/40">
            © 2026 NexusHR Global.
          </div>
        </div>
      </footer>
    </div>
  );
}

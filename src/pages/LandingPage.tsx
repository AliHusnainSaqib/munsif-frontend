import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import munsifLogo from '@/assets/munsif-logo.png';

export default function LandingPage() {
  const { isDark, toggle } = useTheme();
  const [scenario, setScenario] = useState<'raast' | 'atm' | 'deduction'>('raast');

  const scenarios = {
    raast: {
      heading: 'ANALYSIS // RAAST-UNAUTH-2024',
      clause: 'BPRD Circular Letter No. 04 / 2022',
      sla: 'Provisional credit required in 48 hours',
      action: 'Subpoena ATM CDR log and telecommunications SMS gateway audit',
      summary: 'Under banking Electronic Fund Transfers Regulation, if the customer lodges notice within 48h, the sending financial institution is strictly liable unless cryptographic second-factor handshake can be proven by server logs.',
    },
    atm: {
      heading: 'ANALYSIS // ATM-JAM-DISPENSE-802',
      clause: 'PSD Circular No. 01 / 2021 (1-LINK Dispute Protocol)',
      sla: 'Automated refund within 7 calendar days',
      action: 'Query Central Switch Journal (EJ Log) & cash tray discrepancy ledger',
      summary: 'Mandatory automatic reconciliation. In event of cassette miscount or cash capture, the acquiring bank is barred from levying dispute verification fees upon the debit card holder.',
    },
    deduction: {
      heading: 'ANALYSIS // BBA-MINBAL-FINE-119',
      clause: 'BPRD Circular No. 02 / 2005 (Basic Banking Accounts)',
      sla: 'Instant reversal and statutory reprimand',
      action: 'Inspect Core Banking GL and enforce restitution of debited service fees',
      summary: 'Basic Banking Accounts (BBAs) are legally protected against non-maintenance or minimum balance fees. Scheduled banks attempting covert fee debits face direct punitive action under banking regulations Section 83.',
    }
  };

  const currentScenario = scenarios[scenario];

  return (
    <div className="font-body-md text-on-surface bg-background min-h-screen overflow-x-hidden">
      {/* ── HEADER ── */}
      <header className="fixed top-0 right-0 left-0 h-20 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-10">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 text-left">
              <img alt="MUNSIF Logo" className="h-9 w-auto object-contain" src={munsifLogo} />
              <div className="flex flex-col">
                <span className="text-headline-sm text-primary tracking-tight font-bold">MUNSIF</span>
                <span className="text-label-sm text-secondary font-semibold uppercase tracking-wider">Banking Consumer Rights Guide</span>
              </div>
            </Link>
            <nav className="hidden lg:flex items-center gap-4 pl-4">
              <a href="#section-protections" className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium">Statutory Rights</a>
              <a href="#section-engine" className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium">Dispute Engine</a>
              <a href="#section-compliance" className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium">Bank Compliance SLA</a>
              <a href="#section-helpline" className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium">Official SBP Help</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 bg-surface-container px-2 py-1 rounded-lg text-on-surface-variant mr-1">
              <span className="material-symbols-outlined text-sm text-primary">school</span>
              <span className="text-legal-code text-label-sm">EDUCATIONAL GUIDE</span>
            </div>
            <button aria-label="Toggle color mode" className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" onClick={toggle} type="button">
              {isDark ? (
                <span className="material-symbols-outlined text-lg">light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-lg">dark_mode</span>
              )}
            </button>
            <Link to="/admin" className="text-label-md text-secondary hover:text-primary transition-colors px-1 py-1.5 hidden sm:inline-block">Admin Portal</Link>
            <Link to="/sign-in" className="text-label-md font-semibold text-primary px-2 py-2 rounded-lg hover:bg-surface-container transition-colors">Sign In</Link>
            <Link to="/sign-up" className="text-label-md font-bold px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 shadow-sm transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Register Account</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 flex flex-col">
        {/* SECTION 1: HERO (Dark Obsidian/Deep Navy) */}
        <section className="relative w-full bg-primary-container text-on-primary overflow-hidden px-10 pt-10 pb-24">
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#d7e3ff_1px,transparent_1px)] [background-size:24px_24px]"></div>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gold/10 blur-3xl pointer-events-none"></div>
          <div className="absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-surface-tint/15 blur-3xl pointer-events-none"></div>
          
          <div className="relative max-w-7xl mx-auto flex flex-col gap-8">
            {/* Prominent Educational Project Disclaimer Banner */}
            <div className="w-full p-3 rounded-xl bg-gold/15 border border-gold/40 text-gold text-xs font-medium flex items-center gap-2.5 backdrop-blur-md">
              <span className="material-symbols-outlined text-base shrink-0">info</span>
              <span>
                <strong>Disclaimer:</strong> MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-lowest/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
                <span className="text-legal-code text-label-sm uppercase tracking-widest text-gold font-semibold">BCO 1962 LEGAL REFERENCE</span>
                <span className="hidden sm:inline-block text-muted font-body-sm">·</span>
                <span className="hidden sm:inline-block text-label-sm text-secondary">Educational Assistant</span>
              </div>
              <div className="flex items-center gap-1 text-legal-code text-label-sm text-muted">
                <span className="material-symbols-outlined text-sm text-gold">shield</span>
                <span>BANKING DISPUTE RESOLUTION PROTOCOL</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-2">
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <img alt="MUNSIF Logo" className="w-14 h-14 rounded-full shadow-lg bg-surface-container-lowest/10 p-1" src={munsifLogo} />
                  <div className="flex flex-col">
                    <span className="text-label-sm uppercase tracking-widest text-gold font-bold">Consumer Rights Guide</span>
                    <span className="text-legal-code text-label-sm text-muted">Independent Grievance Arbitration Guide</span>
                  </div>
                </div>
                <h1 className="text-display-lg text-on-primary tracking-tight max-w-2xl">
                  Consumer Rights Defense for the <span className="text-gold">Digital Banking</span> Age.
                </h1>
                <p className="text-body-lg text-secondary max-w-xl leading-relaxed">
                  An independent educational AI assistant explaining grievance arbitration, statutory banking regulations, and legal burden reversal under the Banking Companies Ordinance 1962.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <Link to="/sign-up" className="px-6 py-3.5 rounded-lg bg-gold text-primary-container text-headline-sm font-semibold shadow-lg hover:bg-gold/80 transition-all flex items-center gap-2">
                    <span>Launch Formal Inquiry</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                  <a href="#section-protections" className="px-6 py-3.5 rounded-lg bg-surface-container-lowest/10 text-on-primary text-headline-sm font-semibold hover:bg-surface-container-lowest/20 backdrop-blur transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">menu_book</span>
                    <span>Inspect BCO Directives</span>
                  </a>
                </div>
                <div className="pt-4 grid grid-cols-3 gap-4 max-w-lg">
                  <div className="flex flex-col">
                    <span className="text-headline-lg font-bold text-on-primary">PKR 4.2B+</span>
                    <span className="text-label-sm text-muted uppercase">Arbitrated Value</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-headline-lg font-bold text-gold">48 Hours</span>
                    <span className="text-label-sm text-muted uppercase">Mandatory Response</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-headline-lg font-bold text-on-primary">33 Banks</span>
                    <span className="text-label-sm text-muted uppercase">Regulated Commercial Banks</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-xl bg-surface-container-lowest/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4 text-on-primary">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gold">verified</span>
                      <span className="text-legal-code text-label-md tracking-wider text-on-primary font-semibold">CASE STUDY // SAMPLE-2024-9981</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/15 text-gold text-label-sm uppercase font-semibold">RESOLVED</span>
                  </div>
                  <div className="rounded-lg bg-surface-container-lowest/5 p-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center text-secondary text-label-sm">
                      <span>RESPONDENT ENTITY</span>
                      <span className="text-legal-code text-on-primary">HABIB BANK LIMITED (HBL)</span>
                    </div>
                    <div className="flex justify-between items-center text-secondary text-label-sm">
                      <span>INFRACTION TYPE</span>
                      <span className="text-error-container font-semibold">Unauthorized Raast Debit</span>
                    </div>
                    <div className="flex justify-between items-center text-secondary text-label-sm">
                      <span>CONTESTED SUM</span>
                      <span className="text-legal-code text-on-primary">PKR 148,500.00</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-container-lowest/5 p-4 flex items-start gap-2">
                    <span className="material-symbols-outlined text-gold text-lg mt-0.5">balance</span>
                    <div className="flex flex-col">
                      <span className="text-label-md font-semibold text-gold">PSD Circular 02 (2023) Invoked</span>
                      <p className="text-body-sm text-secondary pt-0.5">
                        Burden of proof automatically reversed onto the scheduled entity. Provisional reversal mandated within 72 business hours.
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-muted text-legal-code text-label-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                      <span>CRYPTOGRAPHIC AUDIT: OK</span>
                    </div>
                    <span>SAMPLE REFERENCE CASE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: STATUTORY ARCHITECTURE & CONSUMER POWERS */}
        <section className="w-full bg-surface py-24 px-10 text-on-surface" id="section-protections">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-2xl">
                <span className="text-label-md text-secondary font-semibold uppercase tracking-widest">LEGAL SHIELD &amp; CITIZEN CHARTER</span>
                <h2 className="text-headline-xl text-primary font-bold tracking-tight">
                  Non-Negotiable Protections Guaranteed by Banking Law.
                </h2>
              </div>
              <p className="text-body-md text-on-surface-variant max-w-md">
                Commercial banks operate under strict statutory licensure. When disputes occur, State Bank of Pakistan regulations shift the power dynamically back to the consumer.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">gavel</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-legal-code text-label-sm text-secondary uppercase font-semibold">SECTION 82B // BCO 1962</span>
                    <h3 className="text-headline-lg font-bold text-primary">Burden of Proof Reversal</h3>
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    In any disputed digital payment (ATM skimming, unauthorized Raast, or fake biometric transfers), the scheduled commercial bank must legally verify authorization, not the account holder.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-label-sm text-secondary font-semibold">PSD REGULATION 2023</span>
                  <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
                    <span className="material-symbols-outlined text-2xl">timer</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-legal-code text-label-sm text-secondary uppercase font-semibold">COMPLIANCE SLA</span>
                    <h3 className="text-headline-lg font-bold text-primary">48h Mandatory Ticket</h3>
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    Any failure by a branch or call center to provide a verified central CRM complaint number within 48 hours triggers an immediate statutory penalty under CPD Circular 01/2021.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-label-sm text-secondary font-semibold">AUTOMATED ESCALATION</span>
                  <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-surface-container-lowest p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-legal-code text-label-sm text-secondary uppercase font-semibold">DISPUTE ESCALATION</span>
                    <h3 className="text-headline-lg font-bold text-primary">Ombudsman Gateway</h3>
                  </div>
                  <p className="text-body-md text-on-surface-variant">
                    Unresolved disputes exceeding 15 calendar days transition directly into formal arbitration before the Banking Mohtasib (Ombudsman) Pakistan with zero legal filing fees.
                  </p>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <span className="text-label-sm text-secondary font-semibold">FEDERAL STATUTORY REMEDY</span>
                  <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: INTERACTIVE REGULATORY SIMULATOR */}
        <section className="w-full bg-primary py-24 px-10 text-on-primary" id="section-engine">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col gap-1 max-w-2xl">
              <span className="text-label-md text-gold font-semibold uppercase tracking-widest">LIVE DISPUTE ENGINE</span>
              <h2 className="text-headline-xl text-on-primary font-bold tracking-tight">
                How Banking Regulations Protect Consumers in Real Time.
              </h2>
              <p className="text-body-md text-secondary">
                Select an infraction below to simulate the regulatory analysis provided by the MUNSIF Assistant.
              </p>
            </div>
            
            <div className="rounded-2xl bg-surface-container-lowest/5 p-6 backdrop-blur-md shadow-2xl flex flex-col lg:flex-row gap-10 items-stretch">
              <div className="lg:w-5/12 flex flex-col gap-2">
                <button 
                  className={`text-left p-4 rounded-xl transition-all flex items-start justify-between gap-2 ${scenario === 'raast' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-lowest/5 hover:bg-surface-container-lowest/15'}`}
                  onClick={() => setScenario('raast')}
                >
                  <div className="flex flex-col">
                    <span className="text-headline-sm text-on-primary font-semibold">Unauthorized Raast Transfer</span>
                    <span className="text-body-sm text-secondary">Unknown CNIC beneficiary debit without OTP SMS.</span>
                  </div>
                  <span className={`material-symbols-outlined ${scenario === 'raast' ? 'text-gold' : 'text-secondary'}`}>chevron_right</span>
                </button>
                <button 
                  className={`text-left p-4 rounded-xl transition-all flex items-start justify-between gap-2 ${scenario === 'atm' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-lowest/5 hover:bg-surface-container-lowest/15'}`}
                  onClick={() => setScenario('atm')}
                >
                  <div className="flex flex-col">
                    <span className="text-headline-sm text-on-primary font-semibold">ATM Cash Retraction Failure</span>
                    <span className="text-body-sm text-secondary">Account debited but 1-LINK ATM jammed cash dispenser.</span>
                  </div>
                  <span className={`material-symbols-outlined ${scenario === 'atm' ? 'text-gold' : 'text-secondary'}`}>chevron_right</span>
                </button>
                <button 
                  className={`text-left p-4 rounded-xl transition-all flex items-start justify-between gap-2 ${scenario === 'deduction' ? 'bg-surface-container-lowest/15' : 'bg-surface-container-lowest/5 hover:bg-surface-container-lowest/15'}`}
                  onClick={() => setScenario('deduction')}
                >
                  <div className="flex flex-col">
                    <span className="text-headline-sm text-on-primary font-semibold">Illegal Minimum Balance Fine</span>
                    <span className="text-body-sm text-secondary">Scheduled bank levying service charges on Basic Banking Account.</span>
                  </div>
                  <span className={`material-symbols-outlined ${scenario === 'deduction' ? 'text-gold' : 'text-secondary'}`}>chevron_right</span>
                </button>
              </div>
              
              <div className="lg:w-7/12 rounded-xl bg-primary-container p-6 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gold"></span>
                      <span className="text-legal-code text-label-md text-on-primary font-semibold uppercase">{currentScenario.heading}</span>
                    </div>
                    <span className="text-legal-code text-label-sm text-gold">AUDIT STATUS: REVERSIBLE</span>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-lowest/5 flex flex-col gap-2 text-legal-code text-body-sm">
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="text-gold">[GOVERNING CLAUSE]</span>
                      <span className="text-on-primary">{currentScenario.clause}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="text-gold">[STATUTORY SLA]</span>
                      <span className="text-on-primary">{currentScenario.sla}</span>
                    </div>
                    <div className="flex items-center gap-2 text-secondary">
                      <span className="text-gold">[AUDIT ACTION]</span>
                      <span className="text-on-primary">{currentScenario.action}</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-lowest/5 flex flex-col gap-1 font-body-sm text-secondary">
                    {currentScenario.summary}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-legal-code text-label-sm text-muted">MUNSIF DISPUTE GUIDE · SECURE TLS</span>
                  <Link to="/sign-up" className="px-4 py-2 rounded-lg bg-gold text-primary-container text-label-md font-bold hover:bg-gold/80 transition-all">
                    Draft Dispute Notice &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SCHEDULE OF CHARGES & BANK COMPLIANCE RADAR */}
        <section className="w-full bg-surface-container-low py-24 px-10 text-on-surface" id="section-compliance">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-2xl">
                <span className="text-label-md text-secondary font-semibold uppercase tracking-widest">MONITORING DIRECTORY</span>
                <h2 className="text-headline-xl text-primary font-bold tracking-tight">
                  Scheduled Commercial Bank Compliance Matrix.
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-on-surface-variant">Scheduled Commercial Banks Index</span>
                <span className="material-symbols-outlined text-secondary">verified</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-bold text-primary">Meezan Bank</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-legal-code text-label-sm font-semibold">99.2% SLA</span>
                  </div>
                  <span className="text-label-sm text-secondary">ISLAMIC COMMERCIAL BANK</span>
                  <p className="text-body-sm text-on-surface-variant">
                    Exemplary complaint handling speed with average resolution time of 2.1 business days.
                  </p>
                </div>
                <div className="flex items-center justify-between text-on-surface text-legal-code text-label-sm">
                  <span>UNRESOLVED: 4</span>
                  <span className="text-secondary font-semibold">RATING: AAA</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-bold text-primary">Habib Bank (HBL)</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-legal-code text-label-sm font-semibold">94.8% SLA</span>
                  </div>
                  <span className="text-label-sm text-secondary">DOMESTIC SYSTEMICALLY IMPORTANT</span>
                  <p className="text-body-sm text-on-surface-variant">
                    High volume of Raast inquiries. Regulatory corrective supervision applied on unauthorized card fee rollbacks.
                  </p>
                </div>
                <div className="flex items-center justify-between text-on-surface text-legal-code text-label-sm">
                  <span>UNRESOLVED: 41</span>
                  <span className="text-secondary font-semibold">RATING: AA+</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-bold text-primary">Bank Alfalah</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-legal-code text-label-sm font-semibold">96.3% SLA</span>
                  </div>
                  <span className="text-label-sm text-secondary">SCHEDULED COMMERCIAL</span>
                  <p className="text-body-sm text-on-surface-variant">
                    Zero tolerance policy on SMS alert charges for dormant payroll accounts under BPRD 2024 guidance.
                  </p>
                </div>
                <div className="flex items-center justify-between text-on-surface text-legal-code text-label-sm">
                  <span>UNRESOLVED: 12</span>
                  <span className="text-secondary font-semibold">RATING: AA</span>
                </div>
              </div>
              
              <div className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-headline-sm font-bold text-primary">MCB Bank</span>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-legal-code text-label-sm font-semibold">93.1% SLA</span>
                  </div>
                  <span className="text-label-sm text-secondary">SCHEDULED COMMERCIAL</span>
                  <p className="text-body-sm text-on-surface-variant">
                    Full adherence with Basic Banking Account fee exemptions and remittance instant credits.
                  </p>
                </div>
                <div className="flex items-center justify-between text-on-surface text-legal-code text-label-sm">
                  <span>UNRESOLVED: 29</span>
                  <span className="text-secondary font-semibold">RATING: AA</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: DISPUTE RESOLUTION GUIDANCE & CITIZEN GATEWAY */}
        <section className="w-full bg-primary-container text-on-primary py-24 px-10" id="section-helpline">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            <div className="rounded-2xl bg-surface-container-lowest/10 backdrop-blur-xl p-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
                <span className="text-legal-code text-label-sm uppercase tracking-widest text-gold font-bold">DISPUTE RESOLUTION GUIDANCE</span>
                <h2 className="text-headline-xl text-on-primary font-bold tracking-tight">
                  Has Your Scheduled Bank Failed to Resolve a Grievance?
                </h2>
                <p className="text-body-md text-secondary">
                  Create an account or explore statutory dispute resolution procedures with the MUNSIF Assistant.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <Link to="/sign-up" className="w-full sm:w-auto px-10 py-4 rounded-xl bg-gold text-primary-container text-headline-sm font-bold hover:bg-gold/80 transition-all shadow-xl flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">badge</span>
                  <span>Get Started</span>
                </Link>
                <div className="w-full sm:w-auto px-6 py-4 rounded-xl bg-surface-container-lowest/10 text-on-primary text-headline-sm font-semibold flex items-center justify-center gap-2 text-center">
                  <span className="material-symbols-outlined">support_agent</span>
                  <span>Official SBP Helpline: 111-727-273</span>
                </div>
              </div>
            </div>
            
            <div className="pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-muted text-legal-code text-label-sm border-t border-surface-container-lowest/10">
              <div className="flex flex-col gap-1 max-w-2xl">
                <p className="text-secondary text-xs leading-relaxed">
                  MUNSIF is an independent, unofficial educational project and is not affiliated with, endorsed by, or operated by the State Bank of Pakistan.
                </p>
                <span className="text-xs text-muted">
                  Legal Reference: Banking Companies Ordinance, 1962 (LVII of 1962) &amp; SBP Act 1956. For official complaints, contact SBP directly at 111-727-273 or cpd.helpdesk@sbp.org.pk.
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <a className="hover:text-gold transition-colors" href="#">Privacy Policy</a>
                <span>·</span>
                <a className="hover:text-gold transition-colors" href="#">Banking Mohtasib Act</a>
                <span>·</span>
                <a className="hover:text-gold transition-colors" href="#">IT Security Mandate</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

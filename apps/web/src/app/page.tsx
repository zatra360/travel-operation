'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Plane, Building2, Users, CreditCard, FileText, Ticket,
  Globe, Shield, BarChart3, ArrowRight, Check, Star, Sparkles,
  Calculator, ClipboardList, UserCheck, Bell, Clock, Phone,
  Mail, MapPin, ChevronRight, Quote, Layers, Wallet, Award, ChevronDown, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { brand } from '@/lib/brand';
import { Button } from '@/components/ui/button';

const stats = [
  { value: 'CRM', label: 'Lead-to-Client Pipeline' },
  { value: 'Ops', label: 'Booking & Ticketing' },
  { value: 'Finance', label: 'Invoicing & Payments' },
  { value: 'HRM', label: 'Employee & Payroll' },
];

const personas = [
  { icon: Globe, title: 'Travel Agencies', description: 'Full-service agencies managing flights, hotels, tours, visas and corporate travel from walk-in clients to B2B accounts.' },
  { icon: Plane, title: 'OTAs & Ticketing', description: 'Online travel agencies handling high-volume bookings, PNR management, ticket issuance and after-sales refunds/reissues.' },
  { icon: Shield, title: 'Visa Agencies', description: 'Visa processing companies tracking applications, passport docs, embassy submissions and client follow-ups.' },
  { icon: Building2, title: 'Corporate Travel', description: 'In-house travel desks for enterprises managing employee travel, approvals, budgets and vendor relationships.' },
];

const features = [
  { icon: ClipboardList, title: 'Lead Management', description: 'Capture leads from website, social media, walk-ins and referrals. Score, prioritize and track through customizable pipeline stages.' },
  { icon: Users, title: 'Client CRM', description: '360° client profiles with passports, visas, travel history, preferences, loyalty status, outstanding balances and activity timeline.' },
  { icon: FileText, title: 'Quotation Builder', description: 'Create multi-line quotations with flights, hotels, visas, tours. Track revisions, e-sign, send to clients with public acceptance links.' },
  { icon: Ticket, title: 'Booking & PNR', description: 'Manage bookings with passengers, flight segments, hotel stays, PNR locators, hold expiry and status lifecycle.' },
  { icon: Plane, title: 'Ticket Issuance', description: 'Issue tickets, void, refund, reissue with full audit trail and automatic booking status sync.' },
  { icon: CreditCard, title: 'Invoicing & Payments', description: 'Generate invoices from quotations or bookings, receive payments with idempotency protection, auto-generate receipts.' },
  { icon: Calculator, title: 'Double-Entry Ledger', description: 'Append-only financial ledger entries for payments, expenses, refunds and salary runs. Multi-currency with exchange rates.' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Real-time dashboard with revenue trends, pipeline charts, team performance, tax reports, profit & loss and expiry tracking.' },
  { icon: UserCheck, title: 'HR & Payroll', description: 'Employee profiles, attendance, leave management, performance reviews, salary runs, commission and incentive tracking.' },
  { icon: Bell, title: 'Smart Alerts', description: 'TTL reminders for expiring quotations, bookings on hold, passport/visa expiry and contract end dates. Email notifications included.' },
  { icon: Globe, title: 'Multi-Branch', description: 'Operate unlimited branches under one tenant. Branch-level dashboards, user assignments and role-based access control.' },
  { icon: Shield, title: 'Enterprise Security', description: '185 granular permissions, tenant isolation, audit logging on every mutation, JWT with refresh tokens and rate limiting.' },
];

const modules = [
  { name: 'Lead Pipeline', items: 'Leads, Follow-ups, Activity Timeline, Auto-assignment' },
  { name: 'Client Management', items: 'Clients, Passports, Visas, Tasks, Contracts, e-Sign' },
  { name: 'Quotations', items: 'Line Items, Revisions, E-Sign, Public Sharing, Accept/Reject' },
  { name: 'Bookings', items: 'PNR, Passengers, Segments, Hotels, Status Lifecycle' },
  { name: 'Ticketing', items: 'Ticket Issue, Void, Refund, Reissue, After-Sales' },
  { name: 'Finance', items: 'Invoices, Payments, Receipts, Expenses, Ledger, Multi-Currency' },
  { name: 'Banking', items: 'Bank Accounts, Cash Registers, Deposits, Withdrawals' },
  { name: 'HR & Payroll', items: 'Employees, Leave, Attendance, Salary, Commission' },
  { name: 'Vendors', items: 'Airlines, Hotels, Transport, Visa Processors, GDS' },
  { name: 'Master Data', items: 'Countries, Currencies, Airlines, Airports, Cabin Classes' },
  { name: 'Security', items: 'RBAC, Audit Log, Login History, Token Rotation, Lockout' },
  { name: 'Reports', items: 'Finance, Sales, Leads, Attendance, Tax, Profit & Loss' },
];

const steps = [
  { step: 1, title: 'Create lead', description: 'Capture from website, walk-in, or referral' },
  { step: 2, title: 'Build quotation', description: 'Add flights, hotels, visas — send to client' },
  { step: 3, title: 'Convert to booking', description: 'Add passengers, PNR, issue tickets' },
  { step: 4, title: 'Invoice & collect', description: 'Generate invoice, receive payment, ledger' },
];

const faqs = [
  { q: 'Is there a free trial?', a: 'Yes — 14 days free, no credit card required. All features included.' },
  { q: 'Can I add my own team?', a: 'Absolutely. Invite unlimited users with role-based permissions per branch.' },
  { q: 'Is my data secure?', a: 'Yes. Complete tenant isolation, encrypted passwords, JWT auth, and audit logging.' },
  { q: 'Can I customize reports?', a: 'Real-time dashboards and 6 report types. Export to CSV for custom analysis.' },
  { q: 'Do you support multiple currencies?', a: 'Yes. Multi-currency invoices, payments, expenses with configurable exchange rates.' },
  { q: 'Is there an API?', a: 'Full REST API with Swagger documentation. Available on Enterprise plan for integrations.' },
];

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      router.replace(user.isPlatformSuperAdmin ? '/platform' : '/dashboard');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-6xl">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">{brand.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#modules" className="hover:text-foreground transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">Sign in</Link>
            <Link href="/register"><Button size="sm">Start free trial</Button></Link>
            <button
              type="button"
              className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t bg-background px-4 py-3 space-y-1">
            <a href="#features" className="block py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#how" className="block py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#modules" className="block py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Modules</a>
            <a href="#pricing" className="block py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#faq" className="block py-2 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>FAQ</a>
            <Link href="/login" className="block py-2 text-sm text-muted-foreground hover:text-foreground sm:hidden" onClick={() => setMobileOpen(false)}>Sign in</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-6xl px-4 py-24 md:py-32 text-center relative">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground mb-8 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            14-day free trial — no credit card required
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6 max-w-4xl mx-auto">
            The operating system for{' '}
            <span className="text-primary">travel agencies</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Manage leads, quotations, bookings, tickets, invoices, payments, employees, and vendors — 
            all in one platform. Built for travel agencies, OTAs, visa processors, and corporate travel teams.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="text-base px-8 h-12">
                Start free trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-base px-8 h-12">Sign in</Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />14 days free</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-success" />Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* Stats / Module highlights */}
      <section className="border-y bg-muted/20">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl md:text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Built for every type of travel business</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">One platform. Multiple use cases. Whether you run a small agency or a multi-branch enterprise.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {personas.map((p) => (
              <div key={p.title} className="rounded-xl border bg-card p-6 hover:shadow-md transition-all">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-muted/30 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">From first contact to final payment, everything flows through one connected system.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-4 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary/20">
                  {s.step}
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 -right-4">
                    <ChevronRight className="h-5 w-5 text-primary/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to run your agency</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">A complete travel operations platform with 80+ features across CRM, operations, finance, and HR.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="group rounded-xl border bg-card p-6 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules table */}
      <section id="modules" className="py-20 bg-muted/30 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Complete module coverage</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Every department of your travel agency is covered with dedicated modules.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {modules.map((m) => (
              <div key={m.name} className="rounded-xl border bg-card p-5 hover:shadow-sm transition-all">
                <h3 className="font-semibold text-sm mb-2">{m.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.items}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Quote className="h-10 w-10 text-primary/30 mx-auto mb-6" />
          <blockquote className="text-xl md:text-2xl font-medium text-muted-foreground italic max-w-2xl mx-auto leading-relaxed">
            &ldquo;Travel Operation has transformed how we manage our agency. From lead tracking to ticket issuance and payroll — everything in one place.&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">AK</div>
            <div className="text-left">
              <p className="text-sm font-medium">Ahmed Khan</p>
              <p className="text-xs text-muted-foreground">Director, TripNow Limited</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Start free, upgrade when you grow. All plans include a 14-day trial.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: 'Free', period: 'forever', description: 'For small agencies', features: ['5 users · 1 branch', 'Leads & clients', 'Quotations & bookings', 'Invoices & payments', 'Tickets & refunds', 'Email support'], cta: 'Start free', href: '/register', highlight: false },
              { name: 'Professional', price: '$49', period: '/month', description: 'For growing agencies', features: ['25 users · 5 branches', 'Everything in Starter', 'Passports & visas', 'Contracts & e-sign', 'HR & payroll', 'Priority support'], cta: 'Start trial', href: '/register', highlight: true },
              { name: 'Enterprise', price: '$149', period: '/month', description: 'For large agencies', features: ['Unlimited users & branches', 'Everything in Pro', 'White-label', 'API access', 'Custom integrations', 'Dedicated support'], cta: 'Contact sales', href: `mailto:${brand.emails.support}?subject=Enterprise%20Plan%20Inquiry`, highlight: false },
            ].map((p) => (
              <div key={p.name} className={`rounded-xl border p-6 text-left ${p.highlight ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105 bg-card' : 'bg-card'}`}>
                {p.highlight && <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-3"><Star className="h-3 w-3" />Most popular</div>}
                <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={p.href}>
                  <Button variant={p.highlight ? 'default' : 'outline'} className="w-full">{p.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know about {brand.name}.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <FaqItem key={i} question={f.q} answer={f.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4 text-primary-foreground">Ready to streamline your travel operations?</h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">Join travel agencies who trust {brand.name} to manage their entire business.</p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-10 h-12">
              Start your free trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <p className="text-primary-foreground/60 text-sm mt-4">14-day trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/20 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Plane className="h-4 w-4" />
                </div>
                <span className="font-bold">{brand.name}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">All-in-one platform for travel agencies, OTAs, visa agencies and corporate travel teams.</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#modules" className="hover:text-foreground transition-colors">Modules</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/register" className="hover:text-foreground transition-colors">Sign up</Link></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />support@travel-operation.com</li>
                <li className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />travel-operation.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ question, answer, defaultOpen }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-5 text-left font-semibold hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 -mt-1"><p className="text-sm text-muted-foreground leading-relaxed">{answer}</p></div>}
    </div>
  );
}

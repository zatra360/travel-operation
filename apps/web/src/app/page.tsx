'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Plane, Building2, Users, CreditCard, FileText, Ticket,
  Globe, Shield, BarChart3, ArrowRight, Check, Star, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { brand } from '@/lib/brand';
import { Button } from '@/components/ui/button';

const features = [
  { icon: Plane, title: 'Bookings & Ticketing', description: 'Manage flight bookings, issue tickets, handle PNRs and segments all in one place.' },
  { icon: FileText, title: 'Quotations & Invoices', description: 'Create professional quotes, convert to bookings, generate invoices automatically.' },
  { icon: Users, title: 'Client & Lead Management', description: 'Track leads through pipeline stages, manage client profiles, passports and visas.' },
  { icon: Globe, title: 'Multi-Branch Support', description: 'Operate multiple branches with tenant isolation, role-based access and branch-level reporting.' },
  { icon: CreditCard, title: 'Payments & Finance', description: 'Receive payments, track expenses, manage ledger entries and commission calculations.' },
  { icon: BarChart3, title: 'Reports & Analytics', description: 'Real-time dashboard with charts, revenue trends, pipeline analytics and expiry tracking.' },
];

const plans = [
  { name: 'Starter', price: 'Free', period: 'forever', description: 'For small agencies getting started', features: ['5 users', '1 branch', 'Leads & clients', 'Quotations & invoices', 'Bookings & tickets', 'Email support'], cta: 'Start free', href: '/register', highlight: false },
  { name: 'Professional', price: '$49', period: '/month', description: 'For growing agencies', features: ['25 users', '5 branches', 'Everything in Starter', 'Passports & visas', 'Contracts & e-sign', 'Priority support'], cta: 'Start trial', href: '/register', highlight: true },
  { name: 'Enterprise', price: '$149', period: '/month', description: 'For large agencies', features: ['Unlimited users', 'Unlimited branches', 'Everything in Pro', 'White-label', 'API access', 'Dedicated support'], cta: 'Contact sales', href: '/register', highlight: false },
];

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      router.replace(user.isPlatformSuperAdmin ? '/platform' : '/dashboard');
    }
  }, [mounted, isAuthenticated, user, router]);

  if (!mounted || isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Plane className="h-4 w-4" />
            </div>
            <span className="font-semibold text-lg tracking-tight">{brand.name}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
          </nav>
          <Link href="/register"><Button size="sm">Start free trial</Button></Link>
        </div>
      </header>

      <main>
        <section className="py-20 md:py-28 text-center px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              New: 14-day free trial — no credit card required
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              The all-in-one platform for{' '}
              <span className="text-primary">travel agencies</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Manage leads, create quotations, issue tickets, track finances, and run your entire travel operation from one dashboard. Built for agencies of all sizes.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/register"><Button size="lg" className="text-base px-8">Start free trial <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <Link href="/login"><Button variant="outline" size="lg" className="text-base px-8">Sign in</Button></Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" />No credit card</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" />14 days free</span>
              <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-success" />Cancel anytime</span>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/30 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Everything you need to run your agency</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">From lead capture to ticket issuance, manage every step of your travel operations in one place.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="group rounded-xl border bg-card p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Simple, transparent pricing</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Start free, upgrade when you grow. All plans include a 14-day trial.</p>
            </div>
            <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              {plans.map((p) => (
                <div key={p.name} className={`rounded-xl border p-6 text-left ${p.highlight ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105' : 'bg-card'}`}>
                  {p.highlight && <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-3"><Star className="h-3 w-3" />Most popular</div>}
                  <h3 className="font-semibold text-lg mb-1">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{p.price}</span>
                    <span className="text-sm text-muted-foreground">{p.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                  <ul className="space-y-2 mb-6">
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

        <section className="py-20 bg-muted/30 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to streamline your travel operations?</h2>
            <p className="text-muted-foreground mb-8">Join agencies around the world who trust {brand.name} to manage their business.</p>
            <Link href="/register"><Button size="lg" className="text-base px-10">Start your free trial <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <p className="text-xs text-muted-foreground mt-4">14-day trial · No credit card · Cancel anytime</p>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" />
            <span>{brand.name}</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
          <span>© {new Date().getFullYear()} {brand.name}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}

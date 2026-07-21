import Link from 'next/link';
import { brand } from '@/lib/brand';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-3xl prose prose-sm prose-neutral">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: July 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using {brand.name} (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>{brand.name} is a cloud-based travel operations platform providing CRM, quotations, bookings, ticketing, finance, HR, and related tools for travel agencies, OTAs, and corporate travel departments.</p>

        <h2>3. Account Registration</h2>
        <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</p>

        <h2>4. Subscription and Payment</h2>
        <p>Paid plans are billed monthly or annually as selected. You may upgrade or downgrade your plan at any time. Fees are non-refundable except where required by law. We reserve the right to change pricing with 30 days&apos; notice.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to misuse the Service, including but not limited to: violating laws, infringing intellectual property, transmitting malware, attempting unauthorized access, or using the Service for any unlawful purpose.</p>

        <h2>6. Data Ownership</h2>
        <p>You retain all rights to your data. We do not claim ownership of any content, customer information, bookings, financial records, or documents you store in the Service.</p>

        <h2>7. Data Privacy</h2>
        <p>Our handling of your data is governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. We implement industry-standard security measures to protect your information.</p>

        <h2>8. Service Availability</h2>
        <p>We strive to maintain high availability but do not guarantee uninterrupted access. We may temporarily suspend service for maintenance, upgrades, or emergencies.</p>

        <h2>9. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, {brand.name} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

        <h2>10. Termination</h2>
        <p>You may cancel your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, you may export your data within 30 days.</p>

        <h2>11. Changes to Terms</h2>
        <p>We may update these terms from time to time. Continued use after changes constitutes acceptance. Material changes will be notified via email or in-app notice.</p>

        <h2>12. Contact</h2>
        <p>For questions about these terms, contact us at <a href={`mailto:${brand.emails.support}`} className="text-primary hover:underline">{brand.emails.support}</a>.</p>

        <div className="mt-10 pt-6 border-t">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

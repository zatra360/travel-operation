import Link from 'next/link';
import { brand } from '@/lib/brand';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="container mx-auto max-w-3xl prose prose-sm prose-neutral">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: July 2026</p>

        <h2>1. Information We Collect</h2>
        <p>We collect information you provide directly: company details, employee accounts, customer contact information, passport data, travel bookings, financial transactions, and documents you upload. We also collect usage data such as login history, IP addresses, and browser information for security purposes.</p>

        <h2>2. How We Use Information</h2>
        <p>Your data is used solely to provide, maintain, and improve the Service. This includes processing bookings, generating invoices, managing customer relationships, providing reports, and ensuring platform security.</p>

        <h2>3. Data Storage and Security</h2>
        <p>Data is stored in secure cloud infrastructure with encryption at rest and in transit. We use:</p>
        <ul>
          <li>PostgreSQL databases with row-level tenant isolation</li>
          <li>Encrypted password storage (bcrypt)</li>
          <li>JWT-based authentication with refresh token rotation</li>
          <li>Cloudflare R2 for secure document storage with presigned URLs</li>
          <li>HTTPS for all API and web traffic</li>
          <li>Immutable audit logs for compliance</li>
        </ul>

        <h2>4. Tenant Isolation</h2>
        <p>{brand.name} is a multi-tenant platform. Every customer&apos;s data is logically separated by tenant ID. One tenant cannot access another tenant&apos;s leads, clients, bookings, invoices, documents, or any other data. All API requests are scoped to the authenticated tenant.</p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell, rent, or share your data with third parties except:</p>
        <ul>
          <li>When you explicitly request it (e.g., sending a quotation to a customer)</li>
          <li>When required by law or legal process</li>
          <li>To protect the rights, property, or safety of {brand.name}, our users, or the public</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>We retain your data for as long as your account is active. Soft-deleted records are preserved for audit purposes. You may request permanent deletion of your data within 30 days of account closure.</p>

        <h2>7. Data Portability</h2>
        <p>You may export your data at any time. CSV export is available for leads, clients, bookings, invoices, payments, tickets, quotations, employees, and expenses through the platform.</p>

        <h2>8. Your Rights</h2>
        <p>Depending on your jurisdiction, you may have rights to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Delete your data (right to erasure)</li>
          <li>Export your data (data portability)</li>
          <li>Object to or restrict processing</li>
        </ul>
        <p>To exercise these rights, contact us at <a href={`mailto:${brand.emails.support}`} className="text-primary hover:underline">{brand.emails.support}</a>.</p>

        <h2>9. Cookies</h2>
        <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising cookies.</p>

        <h2>10. International Transfers</h2>
        <p>Your data may be stored and processed in any country where we operate. We ensure appropriate safeguards are in place for cross-border data transfers.</p>

        <h2>11. Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. Material changes will be communicated via email or in-app notification.</p>

        <h2>12. Contact</h2>
        <p>For privacy-related inquiries, contact our Data Protection Officer at:</p>
        <p><a href={`mailto:${brand.emails.support}`} className="text-primary hover:underline">{brand.emails.support}</a></p>

        <div className="mt-10 pt-6 border-t">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

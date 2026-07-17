/**
 * Central product branding.
 *
 * This is the single source of truth for public-facing product identity so a
 * future commercial rename never requires editing dozens of components. It is
 * intentionally separate from tenant/company branding (which comes from the
 * active tenant record).
 */
export const brand = {
  name: 'ZATRA360',
  shortName: 'ZATRA360',
  tagline: 'One operating system for modern travel businesses',
  description:
    'Manage leads, quotations, bookings, ticketing, after-sales service, finance, employees and customer communication from one secure workspace.',
  emails: {
    support: 'support@traveloperation.com',
    sales: 'sales@traveloperation.com',
  },
  urls: {
    website: 'https://traveloperation.com',
    app: 'https://app.traveloperation.com',
  },
  social: {
    linkedin: '',
    x: '',
    facebook: '',
  },
  legalName: 'Travel Operation',
} as const;

export type Brand = typeof brand;

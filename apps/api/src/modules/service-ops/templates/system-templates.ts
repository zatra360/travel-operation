export interface StageDefinition {
  code: string;
  name: string;
  group: string;
  slaHours?: number;
  requiredDocumentTypes?: string[];
  requiredChecklist?: Array<{ code: string; title: string }>;
  requiresApproval?: boolean;
  requiresPayment?: boolean;
  isInitial?: boolean;
  isTerminal?: boolean;
  /**
   * Side stages (correction/revision loops) are skipped by the default
   * linear flow and are only reachable via extraNextStageCodes; their own
   * targets are exclusively their extraNextStageCodes.
   */
  isSideStage?: boolean;
  /** Extra allowed targets besides the next stage in order (e.g. correction loops). */
  extraNextStageCodes?: string[];
}

/** Bump when the stage definitions change; old instances stay pinned to their version. */
export const SYSTEM_TEMPLATE_VERSION = 3;

export interface WorkflowTemplateDefinition {
  serviceTypeCode: string;
  code: string;
  name: string;
  description: string;
  stages: StageDefinition[];
}

export const AIR_TICKET_TEMPLATE: WorkflowTemplateDefinition = {
  serviceTypeCode: 'AIR_TICKET',
  code: 'AIR_TICKET_STANDARD',
  name: 'Air Ticket â€” Standard',
  description: 'Default air ticketing workflow: enquiry to travel completion',
  stages: [
    { code: 'ENQUIRY_RECEIVED', name: 'Enquiry Received', group: 'INTAKE', slaHours: 2, isInitial: true },
    { code: 'REQUIREMENTS_COLLECTED', name: 'Travel Requirements Collected', group: 'INTAKE', slaHours: 4 },
    { code: 'FLIGHT_SEARCH', name: 'Flight Search Started', group: 'PROCESSING', slaHours: 4 },
    { code: 'OPTIONS_PREPARED', name: 'Flight Options Prepared', group: 'QUOTATION', slaHours: 8 },
    { code: 'FARE_RULES_VERIFIED', name: 'Fare Rules Verified', group: 'QUOTATION', requiredChecklist: [{ code: 'FARE_RULES', title: 'Fare rules and conditions reviewed' }] },
    { code: 'QUOTATION_SENT', name: 'Quotation Sent', group: 'QUOTATION', slaHours: 24 },
    { code: 'OPTION_SELECTED', name: 'Customer Option Selected', group: 'QUOTATION' },
    { code: 'PASSENGER_DETAILS', name: 'Passenger Details Collected', group: 'DOCUMENTATION', requiredChecklist: [{ code: 'NAME_VERIFICATION', title: 'Passenger names verified against passports' }] },
    { code: 'PNR_CREATED', name: 'PNR Created', group: 'BOOKING', slaHours: 4 },
    { code: 'TTL_RECORDED', name: 'Ticketing Time Limit Recorded', group: 'BOOKING', requiredChecklist: [{ code: 'TTL_SET', title: 'Ticketing deadline recorded on booking' }] },
    { code: 'PAYMENT_PENDING', name: 'Payment or Credit Approval Pending', group: 'PAYMENT', slaHours: 24 },
    { code: 'PAYMENT_APPROVED', name: 'Payment or Credit Approved', group: 'PAYMENT', requiresPayment: true },
    { code: 'FINAL_FARE_VERIFICATION', name: 'Final Fare Verification', group: 'PROCESSING', requiredChecklist: [{ code: 'FARE_REVALIDATED', title: 'Fare revalidated before issuance (TTL check)' }] },
    { code: 'TICKET_ISSUED', name: 'Ticket Issued', group: 'DELIVERY', slaHours: 4 },
    { code: 'INVOICE_GENERATED', name: 'Invoice Generated', group: 'PAYMENT' },
    { code: 'TICKET_DELIVERED', name: 'Ticket Delivered', group: 'DELIVERY' },
    { code: 'TRAVEL_COMPLETED', name: 'Travel Completed', group: 'AFTER_SALES' },
    { code: 'CASE_CLOSED', name: 'Case Closed', group: 'CLOSURE', isTerminal: true },
  ],
};

export const VISA_TEMPLATE: WorkflowTemplateDefinition = {
  serviceTypeCode: 'VISA',
  code: 'VISA_STANDARD',
  name: 'Visa â€” Standard',
  description: 'Default visa processing workflow: enquiry to passport delivery',
  stages: [
    { code: 'ENQUIRY_RECEIVED', name: 'Visa Enquiry Received', group: 'INTAKE', slaHours: 2, isInitial: true },
    { code: 'DESTINATION_SELECTED', name: 'Destination and Visa Type Selected', group: 'INTAKE' },
    { code: 'ELIGIBILITY_ASSESSMENT', name: 'Preliminary Eligibility Assessment', group: 'QUALIFICATION', slaHours: 24 },
    { code: 'SCOPE_FEES_SHARED', name: 'Service Scope and Fees Shared', group: 'QUOTATION', slaHours: 24 },
    { code: 'AGREEMENT_ACCEPTED', name: 'Customer Agreement Accepted', group: 'QUOTATION' },
    { code: 'CASE_OPENED', name: 'Visa Case Opened', group: 'PROCESSING' },
    { code: 'CHECKLIST_GENERATED', name: 'Document Checklist Generated', group: 'DOCUMENTATION' },
    { code: 'DOCUMENTS_REQUESTED', name: 'Documents Requested', group: 'DOCUMENTATION', slaHours: 72 },
    { code: 'DOCUMENTS_RECEIVED', name: 'Documents Received', group: 'DOCUMENTATION' },
    { code: 'DOCUMENT_VERIFICATION', name: 'Document Verification', group: 'DOCUMENTATION', slaHours: 24, requiredDocumentTypes: ['PASSPORT', 'PHOTO'], extraNextStageCodes: ['CORRECTION_REQUIRED'] },
    { code: 'CORRECTION_REQUIRED', name: 'Correction Required', group: 'DOCUMENTATION', isSideStage: true, extraNextStageCodes: ['DOCUMENTS_RECEIVED'] },
    { code: 'APPLICATION_PREPARED', name: 'Application Prepared', group: 'PROCESSING', slaHours: 48 },
    { code: 'QUALITY_REVIEW', name: 'Internal Quality Review', group: 'APPROVAL', requiresApproval: true },
    { code: 'APPOINTMENT_SCHEDULED', name: 'Appointment or Biometrics Scheduled', group: 'PROCESSING' },
    { code: 'APPLICATION_SUBMITTED', name: 'Application Submitted', group: 'PROCESSING' },
    { code: 'EMBASSY_PROCESSING', name: 'Embassy Processing', group: 'PROCESSING', extraNextStageCodes: ['ADDITIONAL_DOCUMENTS'] },
    { code: 'ADDITIONAL_DOCUMENTS', name: 'Additional Documents Requested', group: 'DOCUMENTATION', isSideStage: true, extraNextStageCodes: ['EMBASSY_PROCESSING'] },
    { code: 'DECISION_RECEIVED', name: 'Decision Received', group: 'DELIVERY' },
    { code: 'PASSPORT_COLLECTION', name: 'Passport Collection', group: 'DELIVERY', slaHours: 48 },
    { code: 'PASSPORT_DELIVERED', name: 'Passport Delivered', group: 'DELIVERY' },
    { code: 'CASE_CLOSED', name: 'Case Closed', group: 'CLOSURE', isTerminal: true },
  ],
};

export const HOTEL_TEMPLATE: WorkflowTemplateDefinition = {
  serviceTypeCode: 'HOTEL',
  code: 'HOTEL_STANDARD',
  name: 'Hotel â€” Standard',
  description: 'Default hotel booking workflow: enquiry to checkout and reconciliation',
  stages: [
    { code: 'ENQUIRY_RECEIVED', name: 'Hotel Enquiry Received', group: 'INTAKE', slaHours: 2, isInitial: true },
    { code: 'REQUIREMENTS_COLLECTED', name: 'Stay Requirements Collected', group: 'INTAKE' },
    { code: 'SUPPLIER_SEARCH', name: 'Supplier Search', group: 'PROCESSING', slaHours: 8 },
    { code: 'OPTIONS_COMPARED', name: 'Hotel Options Compared', group: 'QUOTATION' },
    { code: 'QUOTATION_SENT', name: 'Quotation Sent', group: 'QUOTATION', slaHours: 24 },
    { code: 'CUSTOMER_SELECTION', name: 'Customer Selection', group: 'QUOTATION' },
    { code: 'GUEST_INFO_COLLECTED', name: 'Guest Information Collected', group: 'DOCUMENTATION' },
    { code: 'AVAILABILITY_RECHECKED', name: 'Availability and Price Rechecked', group: 'PROCESSING', requiredChecklist: [{ code: 'RATE_RECHECK', title: 'Availability and rate reconfirmed with supplier' }] },
    { code: 'PAYMENT_APPROVED', name: 'Payment or Credit Approved', group: 'PAYMENT', requiresPayment: true },
    { code: 'BOOKING_REQUESTED', name: 'Booking Requested', group: 'BOOKING', slaHours: 12 },
    { code: 'SUPPLIER_CONFIRMED', name: 'Supplier Confirmation Received', group: 'BOOKING', slaHours: 24 },
    { code: 'VOUCHER_GENERATED', name: 'Voucher Generated', group: 'DELIVERY' },
    { code: 'VOUCHER_DELIVERED', name: 'Voucher Delivered', group: 'DELIVERY' },
    { code: 'PRE_ARRIVAL_RECONFIRMATION', name: 'Pre-Arrival Reconfirmation', group: 'DELIVERY', requiredChecklist: [{ code: 'RECONFIRMED', title: 'Booking reconfirmed with hotel before check-in' }] },
    { code: 'CHECKED_IN', name: 'Guest Checked In', group: 'DELIVERY' },
    { code: 'CHECKED_OUT', name: 'Guest Checked Out', group: 'AFTER_SALES' },
    { code: 'SUPPLIER_RECONCILIATION', name: 'Supplier Reconciliation', group: 'AFTER_SALES' },
    { code: 'CASE_CLOSED', name: 'Case Closed', group: 'CLOSURE', isTerminal: true },
  ],
};

export const TOUR_TEMPLATE: WorkflowTemplateDefinition = {
  serviceTypeCode: 'TOUR',
  code: 'TOUR_STANDARD',
  name: 'Tour â€” Standard',
  description: 'Default tour package workflow: enquiry to feedback and closure',
  stages: [
    { code: 'ENQUIRY_RECEIVED', name: 'Tour Enquiry Received', group: 'INTAKE', slaHours: 4, isInitial: true },
    { code: 'REQUIREMENTS_COLLECTED', name: 'Traveller Requirements Collected', group: 'INTAKE' },
    { code: 'TOUR_TYPE_IDENTIFIED', name: 'Tour Type Identified', group: 'QUALIFICATION' },
    { code: 'DRAFT_ITINERARY', name: 'Draft Itinerary Created', group: 'PROCESSING', slaHours: 48 },
    { code: 'SUPPLIER_COSTING_REQUESTED', name: 'Supplier Costing Requested', group: 'PROCESSING', slaHours: 48 },
    { code: 'PACKAGE_COSTING_COMPLETED', name: 'Package Costing Completed', group: 'PROCESSING' },
    { code: 'QUOTATION_SENT', name: 'Quotation Sent', group: 'QUOTATION', slaHours: 24, extraNextStageCodes: ['REVISION_REQUESTED'] },
    { code: 'REVISION_REQUESTED', name: 'Revision Requested', group: 'QUOTATION', isSideStage: true, extraNextStageCodes: ['QUOTATION_SENT'] },
    { code: 'ITINERARY_APPROVED', name: 'Final Itinerary Approved', group: 'APPROVAL' },
    { code: 'DEPOSIT_RECEIVED', name: 'Deposit Received', group: 'PAYMENT', requiresPayment: true },
    { code: 'RESERVATIONS_STARTED', name: 'Supplier Reservations Started', group: 'BOOKING' },
    { code: 'HOTEL_CONFIRMED', name: 'Hotel Confirmed', group: 'BOOKING', slaHours: 72 },
    { code: 'TRANSPORT_CONFIRMED', name: 'Transport Confirmed', group: 'BOOKING', slaHours: 72 },
    { code: 'ACTIVITIES_CONFIRMED', name: 'Activities Confirmed', group: 'BOOKING' },
    { code: 'GUIDE_CONFIRMED', name: 'Guide Confirmed', group: 'BOOKING' },
    { code: 'FINAL_PAYMENT_RECEIVED', name: 'Final Payment Received', group: 'PAYMENT', requiresPayment: true },
    { code: 'TRAVEL_DOCS_GENERATED', name: 'Travel Documents Generated', group: 'DELIVERY', requiredChecklist: [{ code: 'DOCS_PACK', title: 'Vouchers, itinerary and contacts pack prepared' }] },
    { code: 'PRE_DEPARTURE_BRIEFING', name: 'Pre-Departure Briefing', group: 'DELIVERY' },
    { code: 'TOUR_IN_PROGRESS', name: 'Tour In Progress', group: 'DELIVERY' },
    { code: 'DAILY_OPERATIONS', name: 'Daily Operations Monitored', group: 'DELIVERY' },
    { code: 'TOUR_COMPLETED', name: 'Tour Completed', group: 'AFTER_SALES' },
    { code: 'SUPPLIER_RECONCILIATION', name: 'Supplier Reconciliation', group: 'AFTER_SALES' },
    { code: 'FEEDBACK_COLLECTED', name: 'Feedback Collected', group: 'AFTER_SALES' },
    { code: 'CASE_CLOSED', name: 'Case Closed', group: 'CLOSURE', isTerminal: true },
  ],
};

export const SYSTEM_WORKFLOW_TEMPLATES: WorkflowTemplateDefinition[] = [
  AIR_TICKET_TEMPLATE,
  VISA_TEMPLATE,
  HOTEL_TEMPLATE,
  TOUR_TEMPLATE,
];

export const SYSTEM_SERVICE_TYPES: Array<{
  systemCode: string; displayName: string; slug: string; icon: string; category: string;
  displayOrder: number; supportsTicketing?: boolean; supportsApplication?: boolean;
}> = [
  { systemCode: 'AIR_TICKET', displayName: 'Air Ticket', slug: 'air-ticket', icon: 'plane', category: 'TRAVEL', displayOrder: 1, supportsTicketing: true },
  { systemCode: 'VISA', displayName: 'Visa Processing', slug: 'visa', icon: 'file-check', category: 'TRAVEL', displayOrder: 2, supportsApplication: true },
  { systemCode: 'HOTEL', displayName: 'Hotel Booking', slug: 'hotel', icon: 'building', category: 'TRAVEL', displayOrder: 3 },
  { systemCode: 'TOUR', displayName: 'Tour Package', slug: 'tour', icon: 'map', category: 'TRAVEL', displayOrder: 4 },
  { systemCode: 'INSURANCE', displayName: 'Travel Insurance', slug: 'insurance', icon: 'shield', category: 'TRAVEL', displayOrder: 5 },
  { systemCode: 'TRANSFER', displayName: 'Airport Transfer', slug: 'transfer', icon: 'car', category: 'TRAVEL', displayOrder: 6 },
  { systemCode: 'UMRAH', displayName: 'Umrah Package', slug: 'umrah', icon: 'sun', category: 'PILGRIMAGE', displayOrder: 7, supportsApplication: true },
  { systemCode: 'HAJJ', displayName: 'Hajj Package', slug: 'hajj', icon: 'star', category: 'PILGRIMAGE', displayOrder: 8, supportsApplication: true },
  { systemCode: 'MEDICAL_TOURISM', displayName: 'Medical Tourism', slug: 'medical-tourism', icon: 'heart', category: 'SPECIALIZED', displayOrder: 9, supportsApplication: true },
  { systemCode: 'STUDENT_VISA', displayName: 'Student Visa', slug: 'student-visa', icon: 'graduation-cap', category: 'EDUCATION', displayOrder: 10, supportsApplication: true },
  { systemCode: 'MANPOWER', displayName: 'Manpower / Recruitment', slug: 'manpower', icon: 'briefcase', category: 'SPECIALIZED', displayOrder: 11, supportsApplication: true },
  { systemCode: 'CRUISE', displayName: 'Cruise', slug: 'cruise', icon: 'anchor', category: 'TRAVEL', displayOrder: 12 },
];

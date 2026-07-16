export interface IntakeField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

/**
 * Default per-service intake fields captured at case creation and stored
 * in ServiceCaseItem.metadata. Tenants can override the whole list via
 * TenantServiceTypeConfig.configuration.intakeFields.
 */
export const DEFAULT_INTAKE_FIELDS: Record<string, IntakeField[]> = {
  AIR_TICKET: [
    { key: 'origin', label: 'Origin', type: 'text', required: true, placeholder: 'DAC' },
    { key: 'destination', label: 'Destination', type: 'text', required: true, placeholder: 'DXB' },
    { key: 'departureDate', label: 'Departure date', type: 'date', required: true },
    { key: 'returnDate', label: 'Return date', type: 'date' },
    { key: 'tripType', label: 'Trip type', type: 'select', options: ['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'] },
    { key: 'passengers', label: 'Passengers', type: 'number', required: true },
    { key: 'cabin', label: 'Cabin', type: 'select', options: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] },
    { key: 'preferredAirline', label: 'Preferred airline', type: 'text' },
  ],
  VISA: [
    { key: 'destinationCountry', label: 'Destination country', type: 'text', required: true },
    { key: 'visaCategory', label: 'Visa category', type: 'select', options: ['TOURIST', 'BUSINESS', 'WORK', 'STUDENT', 'TRANSIT', 'MEDICAL', 'OTHER'], required: true },
    { key: 'intendedTravelDate', label: 'Intended travel date', type: 'date' },
    { key: 'applicantNationality', label: 'Applicant nationality', type: 'text' },
    { key: 'previousRefusals', label: 'Previous refusals', type: 'select', options: ['NO', 'YES'] },
  ],
  HOTEL: [
    { key: 'destination', label: 'Destination', type: 'text', required: true },
    { key: 'checkIn', label: 'Check-in', type: 'date', required: true },
    { key: 'checkOut', label: 'Check-out', type: 'date', required: true },
    { key: 'rooms', label: 'Rooms', type: 'number', required: true },
    { key: 'adults', label: 'Adults', type: 'number' },
    { key: 'children', label: 'Children', type: 'number' },
    { key: 'mealPlan', label: 'Meal plan', type: 'select', options: ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD', 'FULL_BOARD', 'ALL_INCLUSIVE'] },
  ],
  TOUR: [
    { key: 'destination', label: 'Destination', type: 'text', required: true },
    { key: 'startDate', label: 'Start date', type: 'date' },
    { key: 'durationDays', label: 'Duration (days)', type: 'number' },
    { key: 'travellers', label: 'Travellers', type: 'number', required: true },
    { key: 'tourType', label: 'Tour type', type: 'select', options: ['FIXED_DEPARTURE', 'CUSTOMIZED', 'GROUP', 'FAMILY', 'CORPORATE', 'LUXURY', 'ADVENTURE'] },
  ],
  INSURANCE: [
    { key: 'destination', label: 'Destination', type: 'text', required: true },
    { key: 'travelStart', label: 'Travel start', type: 'date', required: true },
    { key: 'travelEnd', label: 'Travel end', type: 'date', required: true },
    { key: 'travellerAge', label: 'Traveller age', type: 'number' },
    { key: 'coverageType', label: 'Coverage type', type: 'select', options: ['SINGLE_TRIP', 'MULTI_TRIP', 'STUDENT', 'FAMILY'] },
  ],
  TRANSFER: [
    { key: 'pickup', label: 'Pickup location', type: 'text', required: true },
    { key: 'dropoff', label: 'Drop-off location', type: 'text', required: true },
    { key: 'pickupAt', label: 'Pickup date & time', type: 'date', required: true },
    { key: 'flightNumber', label: 'Flight number', type: 'text' },
    { key: 'passengers', label: 'Passengers', type: 'number' },
    { key: 'vehicleCategory', label: 'Vehicle', type: 'select', options: ['SEDAN', 'SUV', 'VAN', 'MINIBUS', 'BUS'] },
  ],
  UMRAH: [
    { key: 'departureDate', label: 'Departure date', type: 'date' },
    { key: 'nights', label: 'Total nights', type: 'number' },
    { key: 'pilgrims', label: 'Pilgrims', type: 'number', required: true },
    { key: 'roomSharing', label: 'Room sharing', type: 'select', options: ['DOUBLE', 'TRIPLE', 'QUAD', 'SHARED'] },
  ],
  HAJJ: [
    { key: 'hajjYear', label: 'Hajj year', type: 'text', required: true },
    { key: 'pilgrims', label: 'Pilgrims', type: 'number', required: true },
    { key: 'packageCategory', label: 'Package category', type: 'select', options: ['ECONOMY', 'STANDARD', 'PREMIUM', 'VIP'] },
  ],
  MEDICAL_TOURISM: [
    { key: 'treatmentArea', label: 'Treatment area', type: 'text', required: true },
    { key: 'preferredCountry', label: 'Preferred country', type: 'text' },
    { key: 'preferredDate', label: 'Preferred date', type: 'date' },
    { key: 'attendants', label: 'Accompanying persons', type: 'number' },
  ],
  STUDENT_VISA: [
    { key: 'preferredCountry', label: 'Preferred country', type: 'text', required: true },
    { key: 'studyLevel', label: 'Study level', type: 'select', options: ['FOUNDATION', 'UNDERGRADUATE', 'POSTGRADUATE', 'PHD', 'LANGUAGE'] },
    { key: 'intake', label: 'Target intake', type: 'text', placeholder: 'Fall 2027' },
    { key: 'fieldOfStudy', label: 'Field of study', type: 'text' },
  ],
  MANPOWER: [
    { key: 'destinationCountry', label: 'Destination country', type: 'text', required: true },
    { key: 'trade', label: 'Trade / role', type: 'text', required: true },
    { key: 'workers', label: 'Workers required', type: 'number' },
    { key: 'employerName', label: 'Employer', type: 'text' },
  ],
  CRUISE: [
    { key: 'region', label: 'Cruise region', type: 'text', required: true },
    { key: 'sailingMonth', label: 'Sailing month', type: 'text', placeholder: 'March 2027' },
    { key: 'nights', label: 'Nights', type: 'number' },
    { key: 'passengers', label: 'Passengers', type: 'number', required: true },
    { key: 'cabinCategory', label: 'Cabin category', type: 'select', options: ['INSIDE', 'OCEANVIEW', 'BALCONY', 'SUITE'] },
  ],
};

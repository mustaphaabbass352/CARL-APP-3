
export enum PaymentType {
  CASH = 'CASH',
  CARD = 'CARD',
  BOLT_PAYOUT = 'BOLT_PAYOUT'
}

export enum ExpenseCategory {
  FUEL = 'FUEL',
  MAINTENANCE = 'MAINTENANCE',
  CAR_WASH = 'CAR_WASH',
  COMMISSION = 'COMMISSION',
  OTHER = 'OTHER'
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Trip {
  id: string;
  startTime: number;
  endTime?: number;
  distance: number; // in km
  fare: number; // GHS
  commission: number; // Calculated or manual
  fuelCostEstimate: number;
  pickupLocation: string;
  dropoffLocation: string;
  paymentType: PaymentType;
  customerId?: string;
  notes?: string;
  route: LatLng[];
  status: 'ACTIVE' | 'COMPLETED';
}

export interface Expense {
  id: string;
  date: number;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  totalSpent: number;
  totalTrips: number;
}

export interface DailySummary {
  date: string;
  tripsCount: number;
  totalFare: number;
  totalExpenses: number;
  netProfit: number;
}

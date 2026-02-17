
import { Trip, Expense, Customer } from './types.ts';

const STORAGE_KEYS = {
  TRIPS: 'carl_trips',
  EXPENSES: 'carl_expenses',
  CUSTOMERS: 'carl_customers'
};

export const DB = {
  saveTrip: (trip: Trip) => {
    try {
      const trips = DB.getTrips();
      const existingIndex = trips.findIndex(t => t.id === trip.id);
      if (existingIndex >= 0) {
        trips[existingIndex] = trip;
      } else {
        trips.push(trip);
      }
      // Limit saved route data size if it gets too large for localStorage (approx 5MB limit)
      // Only keep last 50 trips to prevent storage overflow
      const trimmedTrips = trips.slice(-50);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trimmedTrips));
    } catch (e) {
      console.error("Failed to save trip to DB:", e);
      throw new Error("Storage is full or inaccessible. Trip data may not be saved.");
    }
  },

  deleteTrip: (id: string) => {
    try {
      const trips = DB.getTrips();
      const updatedTrips = trips.filter(t => t.id !== id);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(updatedTrips));
    } catch (e) {
      console.error("Failed to delete trip:", e);
    }
  },

  getTrips: (): Trip[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Corrupted trip data:", e);
      return [];
    }
  },

  saveExpense: (expense: Expense) => {
    try {
      const expenses = DB.getExpenses();
      expenses.push(expense);
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses.slice(-100)));
    } catch (e) {
      console.error("Failed to save expense:", e);
    }
  },

  getExpenses: (): Expense[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCustomer: (customer: Customer) => {
    try {
      const customers = DB.getCustomers();
      const existingIndex = customers.findIndex(c => c.id === customer.id);
      if (existingIndex >= 0) {
        customers[existingIndex] = customer;
      } else {
        customers.push(customer);
      }
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers.slice(-100)));
    } catch (e) {
      console.error("Failed to save customer:", e);
    }
  },

  getCustomers: (): Customer[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
};

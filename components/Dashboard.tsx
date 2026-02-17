
import React, { useState, useEffect } from 'react';
import { Trip, Expense } from '../types.ts';
import { DB } from '../db.ts';
import { TrendingUp, Fuel, Timer, CreditCard, ChevronRight, BrainCircuit, Trash2 } from 'lucide-react';
import { getDriverInsights } from '../services/geminiService.ts';

const Dashboard: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [insight, setInsight] = useState<string>("Loading your daily insights...");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedTrips = DB.getTrips();
    const loadedExpenses = DB.getExpenses();
    setTrips(loadedTrips);
    setExpenses(loadedExpenses);

    const msg = await getDriverInsights(loadedTrips, loadedExpenses);
    setInsight(msg);
  };

  const handleDeleteTrip = (id: string) => {
    if (window.confirm("Delete this trip? This cannot be undone.")) {
      DB.deleteTrip(id);
      loadData();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTrips = trips.filter(t => new Date(t.startTime).toISOString().split('T')[0] === todayStr);
  const totalEarnings = todayTrips.reduce((acc, t) => acc + t.fare, 0);
  const totalExpenses = expenses
    .filter(e => new Date(e.date).toISOString().split('T')[0] === todayStr)
    .reduce((acc, e) => acc + e.amount, 0);
  
  const netProfit = totalEarnings - totalExpenses;

  return (
    <div className="p-4 space-y-6">
      <section className="space-y-1">
        <h2 className="text-sm font-medium text-slate-500">Today's Performance</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 text-green-600 mb-1">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Earnings</span>
            </div>
            <p className="text-2xl font-bold">₵{totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 text-red-500 mb-1">
              <Fuel size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Expenses</span>
            </div>
            <p className="text-2xl font-bold text-slate-700">₵{totalExpenses.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-green-600 p-5 rounded-2xl shadow-lg mt-3 text-white flex justify-between items-center">
          <div>
            <p className="text-green-100 text-xs font-medium uppercase tracking-widest">Net Profit</p>
            <p className="text-3xl font-bold">₵{netProfit.toFixed(2)}</p>
          </div>
          <div className="bg-green-500/50 p-2 rounded-xl">
            <Timer size={32} />
          </div>
        </div>
      </section>

      <section className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex space-x-3 items-start">
        <div className="mt-1 text-blue-600">
          <BrainCircuit size={20} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Carl's AI Tip</h3>
          <p className="text-sm text-blue-800 leading-relaxed font-medium">
            "{insight}"
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Activity</h2>
          <button className="text-xs font-bold text-green-600 flex items-center">
            View All <ChevronRight size={14} />
          </button>
        </div>
        
        {todayTrips.length === 0 ? (
          <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm italic">No rides logged yet today.</p>
            <button className="mt-4 bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-md">Start First Ride</button>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTrips.slice(0, 5).map((trip) => (
              <div key={trip.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${trip.paymentType === 'CASH' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 max-w-[120px] truncate">{trip.dropoffLocation || trip.pickupLocation}</p>
                    <p className="text-[10px] text-slate-500">{new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {trip.distance}km</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <p className="font-bold text-slate-900">₵{trip.fare.toFixed(2)}</p>
                  <button 
                    onClick={() => handleDeleteTrip(trip.id)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 p-4 rounded-2xl text-white">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Trips Today</p>
          <p className="text-xl font-bold">{todayTrips.length}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-2xl text-white">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Fuel Status</p>
          <p className="text-xl font-bold">Good</p>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

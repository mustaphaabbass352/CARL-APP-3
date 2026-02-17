
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import RideTracker from './components/RideTracker.tsx';

const FinancePlaceholder = () => (
  <div className="p-4 space-y-4">
    <h2 className="text-xl font-bold mb-4">Finance Manager</h2>
    <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 border border-slate-100">
      <div className="flex justify-between items-center pb-4 border-b">
        <span className="text-slate-500 font-medium">Monthly Commission (20%)</span>
        <span className="font-bold">₵240.00</span>
      </div>
      <div className="flex justify-between items-center pb-4 border-b">
        <span className="text-slate-500 font-medium">Fuel Expenses</span>
        <span className="font-bold">₵850.00</span>
      </div>
      <div className="flex justify-between items-center pb-4 border-b">
        <span className="text-slate-500 font-medium">Car Wash</span>
        <span className="font-bold">₵60.00</span>
      </div>
      <div className="pt-2 flex justify-between items-center">
        <span className="text-slate-800 font-bold">Total Expenses</span>
        <span className="text-red-600 font-black text-xl">₵1,150.00</span>
      </div>
    </div>
    <button className="w-full py-4 bg-slate-800 text-white rounded-2xl font-bold shadow-lg mt-4">+ Log Expense</button>
  </div>
);

const ReportsPlaceholder = () => (
  <div className="p-4 space-y-6">
    <h2 className="text-xl font-bold">Performance Analytics</h2>
    <div className="h-64 bg-white rounded-2xl border border-slate-100 flex items-center justify-center flex-col text-slate-400 p-8 text-center space-y-4">
      <div className="flex space-x-2 items-end">
        <div className="w-6 h-20 bg-green-500/20 rounded-t"></div>
        <div className="w-6 h-32 bg-green-500/40 rounded-t"></div>
        <div className="w-6 h-12 bg-green-500/20 rounded-t"></div>
        <div className="w-6 h-40 bg-green-600 rounded-t"></div>
        <div className="w-6 h-24 bg-green-500/40 rounded-t"></div>
        <div className="w-6 h-36 bg-green-500/30 rounded-t"></div>
      </div>
      <p className="text-sm font-medium italic">Earnings Trend (Accra Central is 15% more profitable during weekends)</p>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-slate-900 p-5 rounded-2xl text-white">
        <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Avg Fare</p>
        <p className="text-2xl font-bold">₵45.20</p>
      </div>
      <div className="bg-slate-900 p-5 rounded-2xl text-white">
        <p className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Top Zone</p>
        <p className="text-2xl font-bold text-green-400">Osu</p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tracker" element={<RideTracker />} />
          <Route path="/finance" element={<FinancePlaceholder />} />
          <Route path="/reports" element={<ReportsPlaceholder />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;

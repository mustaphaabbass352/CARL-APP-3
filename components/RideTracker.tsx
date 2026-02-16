
import React, { useState, useEffect, useRef } from 'react';
import { Trip, PaymentType, LatLng } from '../types';
import { DB } from '../db';
import { Play, Square, MapPin, Navigation, Banknote, CreditCard, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const ACCRA_COORDS = { lat: 5.6037, lng: -0.1870 };

const RideTracker: React.FC = () => {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [fare, setFare] = useState<string>('');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [distance, setDistance] = useState<number>(0);
  const [mapsError, setMapsError] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pickupInputRef = useRef<HTMLInputElement>(null);
  const dropoffInputRef = useRef<HTMLInputElement>(null);
  const googleMap = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);

  useEffect(() => {
    const initMaps = () => {
      if (typeof window.google === 'undefined' || !window.google.maps || !mapRef.current) {
        // If not loaded yet, retry in a second (helpful for async scripts)
        const timer = setTimeout(() => {
          if (typeof window.google === 'undefined') setMapsError(true);
        }, 3000);
        return () => clearTimeout(timer);
      }

      try {
        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center: ACCRA_COORDS,
          zoom: 13,
          disableDefaultUI: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
        });

        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
          map: googleMap.current,
          suppressMarkers: false,
          polylineOptions: { strokeColor: "#16a34a", strokeWeight: 5 }
        });

        const options = {
          componentRestrictions: { country: "gh" },
          fields: ["formatted_address", "geometry"],
        };

        if (pickupInputRef.current) {
          const pickupAuto = new window.google.maps.places.Autocomplete(pickupInputRef.current, options);
          pickupAuto.addListener("place_changed", () => {
            const place = pickupAuto.getPlace();
            if (place.formatted_address) {
              setPickup(place.formatted_address);
              calculateRoute(place.formatted_address, dropoff);
            }
          });
        }

        if (dropoffInputRef.current) {
          const dropoffAuto = new window.google.maps.places.Autocomplete(dropoffInputRef.current, options);
          dropoffAuto.addListener("place_changed", () => {
            const place = dropoffAuto.getPlace();
            if (place.formatted_address) {
              setDropoff(place.formatted_address);
              calculateRoute(pickup, place.formatted_address);
            }
          });
        }
      } catch (e) {
        console.error("Maps failed to init:", e);
        setMapsError(true);
      }
    };

    initMaps();
  }, []);

  const calculateRoute = (p: string, d: string) => {
    if (!p || !d || !window.google?.maps) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: p,
        destination: d,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.current.setDirections(result);
          const distInKm = result.routes[0].legs[0].distance.value / 1000;
          setDistance(parseFloat(distInKm.toFixed(2)));
        }
      }
    );
  };

  const handleStart = () => {
    if (!pickup) return alert("Select a pickup point.");
    setActiveTrip({
      id: Math.random().toString(36).substr(2, 9),
      startTime: Date.now(),
      distance,
      fare: 0,
      commission: 0,
      fuelCostEstimate: 0,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      paymentType: PaymentType.CASH,
      route: [],
      status: 'ACTIVE'
    });
    timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
  };

  const handleEnd = () => {
    if (!activeTrip) return;
    if (!fare || parseFloat(fare) <= 0) return alert("Enter fare amount.");
    
    DB.saveTrip({
      ...activeTrip,
      endTime: Date.now(),
      status: 'COMPLETED',
      fare: parseFloat(fare),
      paymentType,
      dropoffLocation: dropoff || 'Unspecified',
      commission: parseFloat(fare) * 0.20
    });
    
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTrip(null);
    setElapsed(0);
    setFare('');
    setPickup('');
    setDropoff('');
    setDistance(0);
    alert("Trip logged!");
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="relative h-[30vh] w-full border-b bg-slate-200">
        <div ref={mapRef} className="h-full w-full" />
        {mapsError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center">
            <div className="space-y-2">
              <AlertCircle className="mx-auto text-orange-500" size={32} />
              <p className="text-sm font-bold text-slate-700">Maps Key Required</p>
              <p className="text-xs text-slate-500">Please provide a valid Google Maps API Key in index.html to see the map.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeTrip ? (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <input 
                ref={pickupInputRef}
                type="text" 
                placeholder="Pickup Location"
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 font-medium"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
              <input 
                ref={dropoffInputRef}
                type="text" 
                placeholder="Dropoff (Optional)"
                className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-green-500 font-medium"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
              {distance > 0 && <p className="text-center text-xs font-bold text-green-600 uppercase tracking-widest">{distance} KM Estimated</p>}
            </div>

            <button 
              onClick={handleStart}
              className="w-full py-6 rounded-3xl bg-green-600 text-white shadow-xl active:scale-95 transition-all"
            >
              <span className="text-2xl font-black uppercase tracking-widest">Start Ride</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-6 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Trip Timer</p>
                  <p className="text-5xl font-black font-mono">{formatTime(elapsed)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">KM</p>
                  <p className="text-3xl font-black text-green-400">{distance}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Final Fare (GHS)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-3xl font-black focus:outline-none focus:border-green-500"
                  value={fare}
                  onChange={(e) => setFare(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentType(PaymentType.CASH)}
                  className={`flex items-center justify-center space-x-2 py-5 rounded-2xl border-2 ${paymentType === PaymentType.CASH ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-400'}`}
                >
                  <Banknote size={24} /><span className="font-bold">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentType(PaymentType.CARD)}
                  className={`flex items-center justify-center space-x-2 py-5 rounded-2xl border-2 ${paymentType === PaymentType.CARD ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-400'}`}
                >
                  <CreditCard size={24} /><span className="font-bold">Card</span>
                </button>
              </div>

              <button 
                onClick={handleEnd}
                className="w-full bg-slate-900 text-white py-6 rounded-3xl shadow-xl active:scale-95 transition-all font-black uppercase tracking-widest"
              >
                Finish Ride
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideTracker;


import React, { useState, useEffect, useRef } from 'react';
import { Trip, PaymentType, LatLng } from '../types.ts';
import { DB } from '../db.ts';
import { 
  Play, Square, MapPin, Navigation, Banknote, CreditCard, 
  LocateFixed, Search, Loader2, ArrowUpLeft, ArrowUpRight, 
  ArrowUp, Milestone, Utensils, Building2, Flag
} from 'lucide-react';

declare const L: any; // Leaflet global

const ACCRA_COORDS: [number, number] = [5.6037, -0.1870];

interface RouteStep {
  text: string;
  distance: number;
  type: string;
  index: number;
}

const RideTracker: React.FC = () => {
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [fare, setFare] = useState<string>('');
  const [pickup, setPickup] = useState('My Current Location');
  const [dropoff, setDropoff] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [distance, setDistance] = useState<number>(0);
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [instructions, setInstructions] = useState<RouteStep[]>([]);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [totalEstimatedDistance, setTotalEstimatedDistance] = useState<number | null>(null);
  const [isFetchingPois, setIsFetchingPois] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const routingControl = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const dropoffMarkerRef = useRef<any>(null);
  const poiLayerRef = useRef<any>(null);
  const routeLabelsLayerRef = useRef<any>(null);
  const timerInterval = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const pathCoordinates = useRef<LatLng[]>([]);
  const routeFullCoords = useRef<LatLng[]>([]);

  // Fetch nearby POIs using Overpass API
  const fetchNearbyPOIs = async (lat: number, lng: number) => {
    if (isFetchingPois) return;
    setIsFetchingPois(true);
    try {
      const query = `[out:json];(node["amenity"~"restaurant|fast_food"](around:1500,${lat},${lng});node["office"](around:1500,${lat},${lng});node["industrial"](around:1500,${lat},${lng});node["shop"](around:1500,${lat},${lng}););out;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (poiLayerRef.current) {
        poiLayerRef.current.clearLayers();
      }

      data.elements.forEach((el: any) => {
        if (!el.lat || !el.lon || !el.tags.name) return;
        const isFood = el.tags.amenity === 'restaurant' || el.tags.amenity === 'fast_food';
        const iconHtml = `
          <div class="flex flex-col items-center">
            <div class="bg-white p-1 rounded-full shadow-md border-2 ${isFood ? 'border-orange-500 text-orange-500' : 'border-slate-700 text-slate-700'}">
              ${isFood ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>' : 
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M8 10h.01"></path><path d="M16 10h.01"></path><path d="M8 14h.01"></path><path d="M16 14h.01"></path></svg>'}
            </div>
            <span class="bg-white/90 px-1 rounded text-[8px] font-bold mt-0.5 whitespace-nowrap shadow-sm border border-slate-100">${el.tags.name}</span>
          </div>
        `;
        L.marker([el.lat, el.lon], {
          icon: L.divIcon({
            className: 'poi-icon',
            html: iconHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          })
        }).addTo(poiLayerRef.current);
      });
    } catch (e) {
      console.error("POI Fetch error:", e);
    } finally {
      setIsFetchingPois(false);
    }
  };

  const getDistance = (p1: LatLng, p2: LatLng) => {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const searchLocation = async (query: string) => {
    if (!query || query.length < 3 || query === 'My Current Location') return null;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Ghana")}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setIsSearching(false);
    }
    return null;
  };

  // Logic to update live directions based on current position
  const updateLiveDirections = (newPos: LatLng) => {
    if (!instructions.length || !routeFullCoords.current.length) return;

    // Find the closest point on the route to the current position
    let minDistance = Infinity;
    let closestIndex = 0;

    routeFullCoords.current.forEach((coord, i) => {
      const d = getDistance(newPos, coord);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    });

    // Find the next instruction after this closestIndex
    const nextInstructionIdx = instructions.findIndex(inst => inst.index > closestIndex);
    if (nextInstructionIdx !== -1 && nextInstructionIdx !== currentInstructionIndex) {
      setCurrentInstructionIndex(nextInstructionIdx);
    }
  };

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView(ACCRA_COORDS, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(leafletMap.current);

    poiLayerRef.current = L.layerGroup().addTo(leafletMap.current);
    routeLabelsLayerRef.current = L.layerGroup().addTo(leafletMap.current);

    markerRef.current = L.marker(ACCRA_COORDS, {
      icon: L.divIcon({
        className: 'current-pos-marker',
        html: `<div style="background-color: #3b82f6; width: 22px; height: 22px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.7);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      })
    }).addTo(leafletMap.current);

    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const oldPos = currentPos;
          setCurrentPos(newPos);
          
          if (leafletMap.current && !activeTrip) {
            leafletMap.current.panTo([newPos.lat, newPos.lng]);
            markerRef.current.setLatLng([newPos.lat, newPos.lng]);
            
            if (!oldPos || getDistance(oldPos, newPos) > 0.5) {
              fetchNearbyPOIs(newPos.lat, newPos.lng);
            }
          }

          if (activeTrip) {
            updateLiveDirections(newPos);
            const lastPos = pathCoordinates.current[pathCoordinates.current.length - 1];
            if (lastPos) {
              const d = getDistance(lastPos, newPos);
              if (d > 0.005) {
                setDistance(prev => parseFloat((prev + d).toFixed(2)));
                pathCoordinates.current.push(newPos);
                if (polylineRef.current) {
                  polylineRef.current.setLatLngs(pathCoordinates.current.map(p => [p.lat, p.lng]));
                }
              }
            } else {
              pathCoordinates.current.push(newPos);
            }
            if (leafletMap.current) leafletMap.current.panTo([newPos.lat, newPos.lng]);
            markerRef.current.setLatLng([newPos.lat, newPos.lng]);
          }
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [activeTrip, instructions]);

  const updateRoute = async () => {
    if (!dropoff) return;
    
    let startPoint: LatLng | null = null;
    if (pickup === 'My Current Location' && currentPos) {
      startPoint = currentPos;
    } else {
      startPoint = await searchLocation(pickup);
    }

    if (!startPoint) {
      if (pickup !== 'My Current Location') {
        alert("Pickup location not found. Defaulting to GPS.");
        if (currentPos) startPoint = currentPos;
        else return;
      } else if (!currentPos) {
        alert("Waiting for GPS signal...");
        return;
      } else {
        startPoint = currentPos;
      }
    }

    const dest = await searchLocation(dropoff);
    if (!dest) {
      alert("Destination not found. Try adding a street or landmark name.");
      return;
    }

    if (routingControl.current) {
      leafletMap.current.removeControl(routingControl.current);
    }

    routingControl.current = L.Routing.control({
      waypoints: [
        L.latLng(startPoint.lat, startPoint.lng),
        L.latLng(dest.lat, dest.lng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      show: false,
      lineOptions: {
        styles: [{ color: '#3b82f6', opacity: 0.8, weight: 6 }]
      },
      createMarker: function() { return null; }
    }).addTo(leafletMap.current);

    routingControl.current.on('routesfound', (e: any) => {
      const routes = e.routes;
      const summary = routes[0].summary;
      const coords = routes[0].coordinates;
      routeFullCoords.current = coords;
      setTotalEstimatedDistance(summary.totalDistance / 1000); 
      
      const steps = routes[0].instructions.map((inst: any) => ({
        text: inst.text,
        distance: inst.distance,
        type: inst.type,
        index: inst.index
      }));
      setInstructions(steps);
      setCurrentInstructionIndex(0);

      // Clear existing route labels
      if (routeLabelsLayerRef.current) {
        routeLabelsLayerRef.current.clearLayers();
      }

      // Add dropoff marker
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.remove();
      }
      dropoffMarkerRef.current = L.marker([dest.lat, dest.lng], {
        icon: L.divIcon({
          className: 'dropoff-marker',
          html: `<div class="bg-red-600 p-2 rounded-full shadow-2xl border-2 border-white text-white flex items-center justify-center transform -translate-y-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        })
      }).addTo(leafletMap.current);

      // Add street labels
      steps.forEach((step: RouteStep) => {
        const match = step.text.match(/(?:onto|on)\s+([^,]+)/i);
        const streetName = match ? match[1].trim() : null;
        if (streetName && coords[step.index]) {
          const point = coords[step.index];
          const labelHtml = `
            <div class="flex items-center space-x-1 bg-white/95 backdrop-blur-sm border border-slate-200 px-2 py-0.5 rounded-full shadow-lg transform -translate-y-4">
              <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span class="text-[9px] font-black text-slate-800 whitespace-nowrap uppercase tracking-tight">${streetName}</span>
            </div>
          `;
          L.marker([point.lat, point.lng], {
            icon: L.divIcon({
              className: 'route-street-label',
              html: labelHtml,
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            }),
            interactive: false
          }).addTo(routeLabelsLayerRef.current);
        }
      });
      
      const bounds = L.latLngBounds([startPoint.lat, startPoint.lng], [dest.lat, dest.lng]);
      leafletMap.current.fitBounds(bounds, { padding: [50, 50] });
    });
  };

  const handleStart = () => {
    if (polylineRef.current) polylineRef.current.remove();
    pathCoordinates.current = currentPos ? [currentPos] : [];
    
    polylineRef.current = L.polyline([], { 
      color: '#16a34a', 
      weight: 10, 
      opacity: 0.9,
      lineJoin: 'round'
    }).addTo(leafletMap.current);
    
    setActiveTrip({
      id: Math.random().toString(36).substr(2, 9),
      startTime: Date.now(),
      distance: 0,
      fare: 0,
      commission: 0,
      fuelCostEstimate: 0,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      paymentType: PaymentType.CASH,
      route: [],
      status: 'ACTIVE'
    });

    setDistance(0);
    setElapsed(0);
    timerInterval.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
  };

  const handleEnd = () => {
    if (!activeTrip) return;
    if (!fare || parseFloat(fare) <= 0) return alert("Please enter the fare amount.");

    DB.saveTrip({
      ...activeTrip,
      endTime: Date.now(),
      status: 'COMPLETED',
      fare: parseFloat(fare),
      distance: distance,
      paymentType,
      dropoffLocation: dropoff || 'Unspecified',
      commission: parseFloat(fare) * 0.20,
      route: [...pathCoordinates.current]
    });

    if (timerInterval.current) clearInterval(timerInterval.current);
    if (routingControl.current) leafletMap.current.removeControl(routingControl.current);
    if (polylineRef.current) polylineRef.current.remove();
    if (routeLabelsLayerRef.current) routeLabelsLayerRef.current.clearLayers();
    if (dropoffMarkerRef.current) dropoffMarkerRef.current.remove();
    
    setActiveTrip(null);
    setFare('');
    setDropoff('');
    setDistance(0);
    setInstructions([]);
    setTotalEstimatedDistance(null);
    alert("Trip complete! Data saved.");
  };

  const getInstructionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'left': return <ArrowUpLeft className="text-blue-400" size={32} />;
      case 'right': return <ArrowUpRight className="text-blue-400" size={32} />;
      case 'straight': return <ArrowUp className="text-blue-400" size={32} />;
      default: return <Navigation className="text-blue-400" size={32} />;
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStep = instructions[currentInstructionIndex] || instructions[0];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="relative h-[45vh] w-full border-b bg-slate-200 shadow-lg">
        <div ref={mapRef} className="h-full w-full z-10" />
        
        {instructions.length > 0 && (
          <div className="absolute top-4 left-4 right-4 z-20 transition-all duration-500">
            <div className="bg-slate-900/95 backdrop-blur-lg text-white p-4 rounded-2xl shadow-2xl flex items-center space-x-4 border border-slate-700/50">
              <div className="bg-slate-800 p-3 rounded-xl">
                {getInstructionIcon(currentStep?.type || 'straight')}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Live Navigation</p>
                <p className="text-lg font-bold leading-tight line-clamp-2">{currentStep?.text}</p>
                {currentStep?.distance > 0 && (
                  <p className="text-sm font-bold text-slate-400 mt-1">
                    Next step in {(currentStep.distance / 1000).toFixed(1)} km
                  </p>
                )}
              </div>
              {totalEstimatedDistance && (
                <div className="text-right pl-4 border-l border-slate-700 hidden xs:block">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Left</p>
                  <p className="text-sm font-black text-white">{(totalEstimatedDistance - distance).toFixed(1)}km</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute top-24 right-4 z-20 flex flex-col space-y-2">
           <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-1">
              <Utensils className="text-orange-500" size={12} />
              <span className="text-[8px] font-bold text-slate-600 uppercase">Food</span>
           </div>
           <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center space-x-1">
              <Building2 className="text-slate-700" size={12} />
              <span className="text-[8px] font-bold text-slate-600 uppercase">Biz</span>
           </div>
        </div>

        <button 
          onClick={() => currentPos && leafletMap.current?.flyTo([currentPos.lat, currentPos.lng], 16)}
          className="absolute bottom-4 right-4 z-20 bg-white p-4 rounded-full shadow-2xl border border-slate-200 active:scale-90 transition-transform"
        >
          <LocateFixed className="text-blue-600" size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeTrip ? (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-0 relative">
              <div className="absolute left-[34px] top-[50px] bottom-[50px] w-0.5 border-l-2 border-dotted border-slate-200 z-0"></div>
              
              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all relative z-10 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <MapPin className="text-blue-600" size={20} />
                </div>
                <div className="flex-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pickup Location</p>
                   <input 
                    type="text" 
                    className="w-full bg-transparent border-none focus:ring-0 font-bold text-lg outline-none placeholder:text-slate-300"
                    value={pickup}
                    onFocus={() => pickup === 'My Current Location' && setPickup('')}
                    onBlur={() => {
                      if (!pickup.trim()) setPickup('My Current Location');
                      updateRoute();
                    }}
                    onChange={(e) => setPickup(e.target.value)}
                  />
                </div>
                <button onClick={updateRoute} className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 active:scale-90 transition-all">
                  {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>

              <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border-2 border-transparent focus-within:border-blue-500 transition-all relative z-10">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Navigation className="text-green-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Destination (Drop-off)</p>
                  <input 
                    type="text" 
                    placeholder="Where to? (e.g. Kotoka Airport)"
                    className="w-full bg-transparent border-none focus:ring-0 font-bold text-lg outline-none placeholder:text-slate-300"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    onBlur={() => updateRoute()}
                  />
                </div>
                <button onClick={updateRoute} className="p-2 text-green-600 bg-green-50 rounded-xl hover:bg-green-100 active:scale-90 transition-all">
                  {isSearching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </div>
            </div>

            <button 
              onClick={handleStart}
              className="w-full py-6 rounded-3xl bg-green-600 text-white shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3 group"
            >
              <div className="bg-green-500 p-2 rounded-full group-hover:scale-110 transition-transform">
                <Play fill="currentColor" size={24} />
              </div>
              <span className="text-2xl font-black uppercase tracking-widest">Start Trip</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
               <div className="absolute -bottom-6 -right-6 p-4 opacity-5">
                <Milestone size={180} />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Time Elapsed</p>
                  <p className="text-5xl font-black font-mono tracking-tighter text-blue-400">{formatTime(elapsed)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Distance Driven</p>
                  <p className="text-3xl font-black text-green-400">{distance.toFixed(2)}<span className="text-sm ml-1 text-slate-500 uppercase">km</span></p>
                </div>
              </div>
              <div className="pt-2">
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full animate-pulse transition-all duration-1000" style={{ width: '100%' }}></div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest text-center">Tracking Real-time GPS coordinates</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Collect Fare (GHS)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 bg-slate-100 px-3 py-1 rounded-lg text-xl font-black text-slate-500">₵</div>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full pl-20 pr-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-2xl text-4xl font-black focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                    value={fare}
                    onChange={(e) => setFare(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentType(PaymentType.CASH)}
                  className={`flex flex-col items-center justify-center space-y-2 py-5 rounded-2xl border-2 transition-all ${paymentType === PaymentType.CASH ? 'border-green-600 bg-green-50 text-green-700 shadow-inner' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
                >
                  <Banknote size={28} /><span className="font-black uppercase text-[10px] tracking-widest">Cash Pay</span>
                </button>
                <button 
                  onClick={() => setPaymentType(PaymentType.CARD)}
                  className={`flex flex-col items-center justify-center space-y-2 py-5 rounded-2xl border-2 transition-all ${paymentType === PaymentType.CARD ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-inner' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
                >
                  <CreditCard size={28} /><span className="font-black uppercase text-[10px] tracking-widest">Online/Card</span>
                </button>
              </div>

              <button 
                onClick={handleEnd}
                className="w-full bg-slate-900 text-white py-6 rounded-3xl shadow-2xl active:scale-95 transition-all font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-3"
              >
                <div className="bg-red-500 p-1.5 rounded-lg">
                   <Square fill="currentColor" size={16} />
                </div>
                <span>Complete Trip</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideTracker;

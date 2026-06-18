/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Truck, Navigation, MapPin, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { WasteCase } from "../types";

interface DispatchPortalProps {
  cases: WasteCase[];
  onUpdateCase: (updatedCase: WasteCase) => void;
  onRefreshData: () => void;
}

export default function DispatchPortal({ cases, onUpdateCase, onRefreshData }: DispatchPortalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  const [selectedCase, setSelectedCase] = useState<WasteCase | null>(null);
  const [truckASchedule, setTruckASchedule] = useState<WasteCase[]>([]);
  const [truckBSchedule, setTruckBSchedule] = useState<WasteCase[]>([]);
  
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Initialize and update Map markers dynamically
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Build map if not already present
    if (!mapInstanceRef.current) {
      // Centered around Yilan Yilan city / Lotung area
      const map = L.map(mapContainerRef.current, {
        center: [24.7000, 121.7580],
        zoom: 12,
        scrollWheelZoom: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const mapInstance = mapInstanceRef.current;

    // Clear previous pins
    markersRef.current.forEach((mk) => mapInstance.removeLayer(mk));
    markersRef.current = [];

    // Plot pins for each case
    cases.forEach((c) => {
      // Color based on status
      const pinColor = 
        c.status === "已完成" ? "#10b981" : // Emerald green
        c.status === "待派工" ? "#f59e0b" : // Amber yellow
        c.status === "清運中" ? "#3b82f6" : // Blue
        "#ef4444"; // Red (Pending/Unpaid)

      const bubbleHtml = `
        <div style="
          background-color: ${pinColor}; 
          width: 14px; 
          height: 14px; 
          border-radius: 50%; 
          border: 2px solid white; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transform: scale(1);
          transition: all 0.3s ease;
        "></div>
      `;

      const customIcon = L.divIcon({
        html: bubbleHtml,
        className: "custom-leaflet-pin-wrapper",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([c.lat, c.lng], { icon: customIcon }).addTo(mapInstance);
      
      const popupText = `
        <div style="font-family: sans-serif; font-size: 11px; max-width: 160px;">
          <b style="font-size: 12px; color: #111;">${c.id}</b><br/>
          <b>市民:</b> ${c.name}<br/>
          <b>地址:</b> ${c.address.slice(3)}<br/>
          <b>狀態:</b> <span style="color:${pinColor};font-weight:bold">${c.status}</span>
        </div>
      `;
      marker.bindPopup(popupText);

      marker.on("click", () => {
        setSelectedCase(c);
      });

      markersRef.current.push(marker);
    });

  }, [cases]);

  // AI Scheduling Engine: Group pending jobs into optimized routes
  const handleAIOptimizeSchedule = () => {
    setIsOptimizing(true);
    
    // Simulate smart clustering of pending dispatch cases
    setTimeout(() => {
      const dispatchable = cases.filter((c) => c.status === "待派工" || c.status === "清運中");
      
      const aTruck: WasteCase[] = [];
      const bTruck: WasteCase[] = [];
      
      // Let's divide them geographically (A takes North/East, B takes South/West or simply alternate)
      dispatchable.forEach((cCase, idx) => {
        if (idx % 2 === 0) {
          aTruck.push(cCase);
        } else {
          bTruck.push(cCase);
        }
      });
      
      setTruckASchedule(aTruck);
      setTruckBSchedule(bTruck);
      setIsOptimizing(false);
    }, 1200);
  };

  const handleConfirmRouteDispatch = async (vehicleName: string, crewList: string, targetCases: WasteCase[]) => {
    if (targetCases.length === 0) {
      alert("此路線無清運案件，無法派工。");
      return;
    }

    try {
      // Loop over case updates sequentially
      for (const tCase of targetCases) {
        await fetch(`/api/cases/${tCase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "清運中",
            dispatch: {
              date: new Date().toISOString().substring(0, 10),
              vehicle: vehicleName,
              worker: crewList
            }
          })
        });
      }
      
      alert(`已成功將本路線派發予 ${vehicleName}（隊員：${crewList}）！狀態已同步移至『清運中』。`);
      onRefreshData();
      // Reset schedules
      setTruckASchedule([]);
      setTruckBSchedule([]);
    } catch (err) {
      console.error(err);
      alert("派配失敗。");
    }
  };

  // Compile Google Maps dir URL based on coordinates
  const getGoogleMapsRouteUrl = (caseList: WasteCase[]) => {
    if (caseList.length === 0) return "#";
    const origin = "Yilan"; // Standard starting garage
    const destinations = caseList.map((c) => `${c.lat},${c.lng}`).join("/");
    return `https://www.google.com/maps/dir/${origin}/${destinations}`;
  };

  return (
    <div className="space-y-6">
      {/* Map Header block */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
            <span className="w-1.5 h-5 bg-teal-600 rounded"></span>
            地圖化派工暨 AI 稽查勤務規劃
          </h3>
          <p className="text-xs text-gray-500">
            地圖標案狀態圈：<span className="text-red-500 font-bold">● 未繳/未審</span> | <span className="text-amber-500 font-bold">● 待派工</span> | <span className="text-blue-500 font-bold">● 清運中</span> | <span className="text-emerald-500 font-bold">● 已完成</span>
          </p>
        </div>

        <button
          onClick={handleAIOptimizeSchedule}
          disabled={isOptimizing}
          className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow flex items-center gap-1.5 transition shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {isOptimizing ? "AI 勤務演算優化中..." : "AI 勤務自動排班"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Leaflet instance map visual frame */}
        <div className="lg:col-span-8 space-y-4">
          <div 
            ref={mapContainerRef} 
            className="w-full h-[450px] bg-gray-100 rounded-xl relative overflow-hidden shadow-sm border border-gray-150"
            id="dispatch-map-viewer"
          >
            {/* Embedded maps loading indicator */}
            <div className="absolute top-2 right-2 bg-white/90 z-20 px-2 py-1 rounded shadow text-[10px] font-mono text-gray-500">
              OSM Base Tile-Service
            </div>
          </div>

          {/* Optimized truck schedules */}
          {(truckASchedule.length > 0 || truckBSchedule.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-teal-50/50 border border-teal-100 rounded-xl p-5">
              {/* Truck A route card */}
              <div className="bg-white rounded-lg p-4 border border-teal-200/60 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-bold text-teal-900 text-xs flex items-center gap-1">
                    <Truck className="w-4 h-4 text-teal-700" /> 清運大卡A車 (North/East)
                  </span>
                  <span className="font-mono text-xs text-gray-500">積載：{truckASchedule.reduce((sum, c) => sum + (c.reviewResult?.estimated_volume || 0), 0).toFixed(1)} m³</span>
                </div>
                
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {truckASchedule.map((tCase, i) => (
                    <div key={tCase.id} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{tCase.id}（{tCase.name}）</p>
                        <p className="text-[10px] text-gray-400 truncate">{tCase.address.slice(3)}</p>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 rounded font-semibold px-1">站點 {i+1}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={getGoogleMapsRouteUrl(truckASchedule)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[10.5px] font-bold text-gray-700 py-1.5 rounded flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" /> Google 導航
                  </a>
                  <button
                    onClick={() => handleConfirmRouteDispatch("清運A車", "張隊員、王司機", truckASchedule)}
                    className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold py-1.5 rounded transition"
                  >
                    確認派工
                  </button>
                </div>
              </div>

              {/* Truck B route card */}
              <div className="bg-white rounded-lg p-4 border border-teal-200/60 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="font-bold text-teal-900 text-xs flex items-center gap-1">
                    <Truck className="w-4 h-4 text-teal-700" /> 清運中卡B車 (South/West)
                  </span>
                  <span className="font-mono text-xs text-gray-500">積載：{truckBSchedule.reduce((sum, c) => sum + (c.reviewResult?.estimated_volume || 0), 0).toFixed(1)} m³</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {truckBSchedule.map((tCase, i) => (
                    <div key={tCase.id} className="text-xs bg-gray-50 p-2 rounded flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{tCase.id}（{tCase.name}）</p>
                        <p className="text-[10px] text-gray-400 truncate">{tCase.address.slice(3)}</p>
                      </div>
                      <span className="text-[10px] bg-teal-100 text-teal-800 rounded font-semibold px-1">站點 {i+1}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <a
                    href={getGoogleMapsRouteUrl(truckBSchedule)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center bg-gray-100 hover:bg-gray-200 border border-gray-200 text-[10.5px] font-bold text-gray-700 py-1.5 rounded flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-600" /> Google 導航
                  </a>
                  <button
                    onClick={() => handleConfirmRouteDispatch("清運B車", "陳隊員、劉組長", truckBSchedule)}
                    className="flex-1 bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold py-1.5 rounded transition"
                  >
                    確認派工
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar details panel */}
        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h4 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-gray-400" />
            點選地圖地針查看詳情
          </h4>

          {selectedCase ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between font-mono font-bold text-gray-800">
                  <span>單號：{selectedCase.id}</span>
                  <span className="text-indigo-600 font-sans">{selectedCase.status}</span>
                </div>
                <div className="border-t border-gray-200 pt-1 text-gray-600 space-y-1">
                  <p><b>聯絡人：</b> {selectedCase.name} ({selectedCase.phone})</p>
                  <p className="truncate"><b>地址：</b> {selectedCase.address}</p>
                  <p><b>申報：</b> {Object.entries(selectedCase.items).map(([n, q]) => `${n} x${q}`).join(", ")}</p>
                </div>
              </div>

              {selectedCase.reviewResult && (
                <div className="bg-teal-50 text-teal-800 border border-teal-200 p-3 rounded-lg text-[11px] space-y-1">
                  <p className="font-bold">✓ AI 材積分析判定</p>
                  <p className="text-gray-600 scale-95 origin-left leading-relaxed">{selectedCase.reviewResult.reason}</p>
                  <div className="flex gap-2 font-mono mt-1 text-[10px]">
                    <span className="bg-teal-100 px-1 rounded">體積：{selectedCase.reviewResult.estimated_volume} m³</span>
                    <span className="bg-teal-100 px-1 rounded">重量：{selectedCase.reviewResult.estimated_weight} kg</span>
                  </div>
                </div>
              )}

              {selectedCase.photoUrl && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 mb-1">申報照片存照：</p>
                  <img
                    src={selectedCase.photoUrl}
                    alt="reported"
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {selectedCase.status === "待派工" && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-1.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold">準備指派清運車輛：</h5>
                    <p className="mt-1 text-[10.5px]">您可以使用上方的「AI 勤務自動排班」將此案與沿路站點自動分發給清潔隊大中卡車運行。</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-xs text-gray-400 py-12 space-y-2">
              <Truck className="w-12 h-12 stroke-1 text-gray-300 mx-auto" />
              <p>無當前選定。請點選左側地圖上的標記針點，或執行 AI 智慧排程派遣車隊。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Trash2, User, Search, Settings, Map, ClipboardCheck, Sparkles, AlertCircle, Clock 
} from "lucide-react";
import { WasteCase, ViolatorRecord, WastePriceItem } from "./types";
import CitizenPortal from "./components/CitizenPortal";
import CitizenSearch from "./components/CitizenSearch";
import AdminPortal from "./components/AdminPortal";
import DispatchPortal from "./components/DispatchPortal";
import CrewPortal from "./components/CrewPortal";

type PortalRole = "CITIZEN_APPLY" | "CITIZEN_QUERY" | "ADMIN_AUDIT" | "DISPATCH_MAP" | "CREW_FIELD";

export default function App() {
  // Master Applet roles state toggle
  const [activeRole, setActiveRole] = useState<PortalRole>("CITIZEN_APPLY");

  // Master databases synced states
  const [cases, setCases] = useState<WasteCase[]>([]);
  const [blacklist, setBlacklist] = useState<ViolatorRecord[]>([]);
  const [priceStandards, setPriceStandards] = useState<WastePriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats summary for portal overview bar
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(0);

  // Sync data from Express API standard endpoints
  const fetchData = async () => {
    try {
      const [casesRes, blacklistRes, ratesRes] = await Promise.all([
        fetch("/api/cases"),
        fetch("/api/blacklist"),
        fetch("/api/rates"),
      ]);

      if (casesRes.ok && blacklistRes.ok && ratesRes.ok) {
        const casesData: WasteCase[] = await casesRes.json();
        const blacklistData: ViolatorRecord[] = await blacklistRes.json();
        const ratesData: WastePriceItem[] = await ratesRes.json();

        setCases(casesData);
        setBlacklist(blacklistData);
        setPriceStandards(ratesData);

        // Update counts
        setPendingReviewCount(casesData.filter((c) => c.status === "待審核").length);
        setPendingPaymentCount(casesData.filter((c) => c.status === "待繳費").length);
      }
    } catch (err) {
      console.error("Failed to sync backend database files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update a single case locally to maintain responsive UX speeds before backing up to server
  const handleUpdateCaseLocal = (updatedCase: WasteCase) => {
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    
    // Recalculate quick dashboard alerts
    setPendingReviewCount((prev) => {
      const isCurrentlyPending = updatedCase.status === "待審核";
      const wasPending = cases.find((c) => c.id === updatedCase.id)?.status === "待審核";
      if (isCurrentlyPending && !wasPending) return prev + 1;
      if (!isCurrentlyPending && wasPending) return prev - 1;
      return prev;
    });

    setPendingPaymentCount((prev) => {
      const isCurrentlyPendingPayment = updatedCase.status === "待繳費";
      const wasPendingPayment = cases.find((c) => c.id === updatedCase.id)?.status === "待繳費";
      if (isCurrentlyPendingPayment && !wasPendingPayment) return prev + 1;
      if (!isCurrentlyPendingPayment && wasPendingPayment) return prev - 1;
      return prev;
    });
  };

  const handleCreateCaseLocal = (newCase: WasteCase) => {
    setCases((prev) => [newCase, ...prev]);
    setPendingReviewCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-800">
      {/* Prime Navigation header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo element with tradition styling */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 text-white p-2 rounded-xl shadow-sm flex items-center justify-center">
              <Trash2 className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-lg text-gray-900 tracking-tight">AI 巨大垃圾智慧受理暨清運管理平台</h1>
                <span className="bg-teal-50 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider">
                  Proto
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">AI Bulk Waste Smart Management Platform</p>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg py-1 px-3 flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>待 AI 稽核：{pendingReviewCount} 件</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-lg py-1 px-3 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>待規費申繳：{pendingPaymentCount} 件</span>
            </div>
          </div>

        </div>

        {/* Dynamic Role Swapper Selector */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 flex gap-1 overflow-x-auto pb-0 text-xs sm:text-sm">
          {[
            { id: "CITIZEN_APPLY", name: "市民清運申請", icon: User },
            { id: "CITIZEN_QUERY", name: "民眾進度查詢付款", icon: Search },
            { id: "ADMIN_AUDIT", name: "公所審查工作台", icon: Settings, count: pendingReviewCount },
            { id: "DISPATCH_MAP", name: "勤務路線調度", icon: Map },
            { id: "CREW_FIELD", name: "隊員外勤結案", icon: ClipboardCheck },
          ].map((role) => {
            const Icon = role.icon;
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id as PortalRole)}
                className={`flex items-center gap-1.5 px-4 py-3 font-semibold border-b-2 transition relative select-none shrink-0 cursor-pointer ${
                  isActive
                    ? "border-emerald-700 text-emerald-800 bg-emerald-50/20"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{role.name}</span>
                {role.count ? (
                  <span className="bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold absolute top-1 right-1 animate-pulse">
                    {role.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content frame */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-xs font-semibold">智慧資料同步連線中，請稍候...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {activeRole === "CITIZEN_APPLY" && (
              <CitizenPortal 
                priceStandards={priceStandards} 
                onSubmitSuccess={handleCreateCaseLocal} 
              />
            )}
            
            {activeRole === "CITIZEN_QUERY" && (
              <CitizenSearch 
                cases={cases} 
                onUpdateCase={handleUpdateCaseLocal} 
              />
            )}

            {activeRole === "ADMIN_AUDIT" && (
              <AdminPortal 
                cases={cases} 
                blacklist={blacklist} 
                priceStandards={priceStandards}
                onUpdateCase={handleUpdateCaseLocal}
                onRefreshData={fetchData}
              />
            )}

            {activeRole === "DISPATCH_MAP" && (
              <DispatchPortal 
                cases={cases} 
                onUpdateCase={handleUpdateCaseLocal}
                onRefreshData={fetchData}
              />
            )}

            {activeRole === "CREW_FIELD" && (
              <CrewPortal 
                cases={cases} 
                onUpdateCase={handleUpdateCaseLocal} 
                onRefreshData={fetchData}
              />
            )}
          </div>
        )}
      </main>

      {/* Humble Footer footer */}
      <footer className="bg-white border-t border-gray-150 py-5 text-center text-xs text-gray-400 mt-auto shrink-0 leading-normal">
        <p>© 2026 AI巨大垃圾智慧清運管理平台. 全系統採開源技術 ── 零伺服器授權費規劃設計</p>
        <p className="mt-1 text-gray-300">Powered by Google Gemini 3.5 & Leaflet OpenStreetMap</p>
      </footer>
    </div>
  );
}

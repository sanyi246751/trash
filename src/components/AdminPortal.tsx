/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, Trash2, ShieldAlert, DollarSign, Activity, FileCheck, RefreshCw, AlertTriangle, Scale } from "lucide-react";
import { WasteCase, ViolatorRecord, WastePriceItem, CaseStatus } from "../types";

interface AdminPortalProps {
  cases: WasteCase[];
  blacklist: ViolatorRecord[];
  priceStandards: WastePriceItem[];
  onUpdateCase: (updatedCase: WasteCase) => void;
  onRefreshData: () => void;
}

export default function AdminPortal({ cases, blacklist, priceStandards, onUpdateCase, onRefreshData }: AdminPortalProps) {
  const [selectedStatusTab, setSelectedStatusTab] = useState<CaseStatus | "全部">("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [analyzingCaseId, setAnalyzingCaseId] = useState<string | null>(null);
  
  // Manual override editing states
  const [editingCase, setEditingCase] = useState<WasteCase | null>(null);

  // Statistics calculation helpers
  const totalCases = cases.length;
  const pendingReview = cases.filter((c) => c.status === "待審核").length;
  const pendingPayment = cases.filter((c) => c.status === "待繳費").length;
  const pendingDispatch = cases.filter((c) => c.status === "待派工").length;
  const completed = cases.filter((c) => c.status === "已完成").length;

  const totalRevenue = cases
    .filter((c) => c.billing?.paymentStatus === "已付款")
    .reduce((sum, c) => sum + (c.billing?.totalAmount || 0), 0);
    
  const totalVolume = cases
    .filter((c) => c.status === "已完成" && c.reviewResult)
    .reduce((sum, c) => sum + (c.reviewResult?.estimated_volume || 0), 0);

  // Trigger server side Gemini API review
  const handleTriggerAIReview = async (caseId: string) => {
    const target = cases.find((c) => c.id === caseId);
    if (!target) return;

    setAnalyzingCaseId(caseId);
    try {
      const response = await fetch("/api/cases/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: target.id,
          photoDataUrl: target.photoUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        onUpdateCase(result.case);
        onRefreshData();
      } else {
        const err = await response.json();
        alert(`AI 辨識稽核失敗：${err.error || "未知錯誤"}`);
      }
    } catch (e) {
      console.error(e);
      alert("呼叫智慧稽核 API 網路連線錯誤！");
    } finally {
      setAnalyzingCaseId(null);
    }
  };

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    try {
      const response = await fetch(`/api/cases/${editingCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCase)
      });

      if (response.ok) {
        const result = await response.json();
        onUpdateCase(result);
        setEditingCase(null);
        alert(`案件編號 ${result.id} 的審查已成功覆寫並更新狀態！`);
      } else {
        alert("覆寫覆審更新失敗。");
      }
    } catch (err) {
      console.error(err);
      alert("通訊失聯。");
    }
  };

  // Check blacklist records count and suggest audit level
  const getAuditLevelSuggestion = (applicantName: string) => {
    const record = blacklist.find(
      (b) => b.name.trim() === applicantName.trim()
    );
    if (record && record.violationCount > 0) {
      return {
        text: "人工複查 ── 曾有違規紀錄！",
        color: "bg-red-100 text-red-800 border-red-300",
        suggestion: "該市民曾蓄意夾雜營建廢料，AI 建議停止自動審核，並強制由清潔分隊員現場勘查。"
      };
    }
    return {
      text: "AI 自動審核通過 ── 無歷史違規",
      color: "bg-emerald-100 text-emerald-800 border-emerald-300",
      suggestion: "信譽良好，可信任 AI 審判之材積體積比例，自動核准清運規費後產生繳費通知。"
    };
  };

  const filteredCases = cases.filter((c) => {
    const matchesTab = selectedStatusTab === "全部" || c.status === selectedStatusTab;
    const matchesQuery = 
      c.id.includes(searchQuery) ||
      c.name.includes(searchQuery) ||
      c.phone.includes(searchQuery) ||
      c.address.includes(searchQuery);
    return matchesTab && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* 4 Metrics Header row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-semibold">累計收訖清運費</p>
            <p className="text-xl font-mono font-bold text-gray-900">${totalRevenue} <span className="text-xs text-gray-500">元</span></p>
          </div>
          <div className="bg-emerald-100 text-emerald-600 rounded-lg p-2 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-semibold">AI 等待審定案件</p>
            <p className="text-xl font-mono font-bold text-amber-600">{pendingReview} <span className="text-xs text-gray-500">件</span></p>
          </div>
          <div className="bg-amber-100 text-amber-600 rounded-lg p-2 shrink-0 animate-pulse">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-semibold">待繳費 / 待派工</p>
            <p className="text-xl font-mono font-bold text-indigo-700">
              {pendingPayment} / {pendingDispatch}
            </p>
          </div>
          <div className="bg-indigo-100 text-indigo-600 rounded-lg p-2 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-150 p-4 shrink-0 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-gray-400 text-xs font-semibold">累計清運碎量體積</p>
            <p className="text-xl font-mono font-bold text-teal-800">{totalVolume.toFixed(1)} <span className="text-xs text-gray-500">m³</span></p>
          </div>
          <div className="bg-teal-100 text-teal-600 rounded-lg p-2 shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Work orders table */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-5 bg-indigo-600 rounded"></span>
              <h3 className="font-bold text-gray-900">巨大清運通報工作台</h3>
            </div>
            
            <input
              type="text"
              placeholder="搜尋姓名、電話、地址..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 focus:border-indigo-500 outline-none rounded-lg py-1.5 px-3 max-w-[200px]"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-100 text-xs">
            {["全部", "待審核", "待繳費", "待派工", "清運中", "已完成"].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedStatusTab(tab as any)}
                className={`px-3 py-1.5 rounded-lg font-medium select-none shrink-0 cursor-pointer ${
                  selectedStatusTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Cases grid / list */}
          <div className="space-y-3">
            {filteredCases.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-10">此狀態分類下無清運通報案件資料。</p>
            ) : (
              filteredCases.map((c) => {
                const auditLevel = getAuditLevelSuggestion(c.name);
                const isAnalyzing = analyzingCaseId === c.id;

                return (
                  <div key={c.id} className="border border-gray-150 rounded-xl p-4 hover:shadow-sm transition bg-white flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-gray-900">{c.id}</span>
                        <span className="text-xs text-gray-400">| {c.date}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block border ${
                          c.status === "待審核" ? "bg-amber-50 text-amber-800 border-amber-200" :
                          c.status === "待繳費" ? "bg-indigo-50 text-indigo-800 border-indigo-200" :
                          c.status === "待派工" ? "bg-teal-50 text-teal-800 border-teal-200" :
                          c.status === "清運中" ? "bg-blue-50 text-blue-800 border-blue-200" :
                          "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                        <div>
                          <strong className="text-gray-700">申請人：</strong> {c.name} ({c.phone})
                        </div>
                        <div>
                          <strong className="text-gray-700">申報品項：</strong> 
                          <span className="font-semibold text-gray-900">
                            {Object.entries(c.items).map(([n, q]) => `${n}x${q}`).join(", ")}
                          </span>
                        </div>
                        <div className="sm:col-span-2 text-gray-500">
                          <strong>地址：</strong> {c.address}
                        </div>
                      </div>

                      {/* AI trust advice bar */}
                      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-gray-100">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${auditLevel.color}`}>
                          {auditLevel.text}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">{auditLevel.suggestion}</span>
                      </div>

                      {/* Show AI results if available */}
                      {c.reviewResult ? (
                        <div className={`p-2 rounded-lg text-xs flex mt-2 border ${
                          c.reviewResult.approved 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : "bg-red-50 text-red-800 border-red-100"
                        }`}>
                          <div className="space-y-1">
                            <p className="font-semibold flex items-center gap-1">
                              {c.reviewResult.approved ? "✓ AI 智能分析：正常可清運" : "✗ AI 警告：檢出混充裝潢營建原料"}
                            </p>
                            <p className="text-slate-600 scale-95 origin-left leading-relaxed">{c.reviewResult.reason}</p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              預估：{c.reviewResult.estimated_volume} m³ | 重量：{c.reviewResult.estimated_weight} kg
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Operations Right section */}
                    <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0 items-center justify-end">
                      {c.status === "待審核" && !c.reviewResult ? (
                        <button
                          type="button"
                          disabled={isAnalyzing}
                          onClick={() => handleTriggerAIReview(c.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {isAnalyzing ? "AI 解析中..." : "AI 智慧稽核"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setEditingCase(c || null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1 border border-gray-200"
                      >
                        <Scale className="w-3.5 h-3.5" /> 覆核修改
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blacklist / Rules view Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Blacklist block */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                市民歷史違規審查庫
              </h4>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              系統自動對照身份名冊。若市民曾因「偷倒事業營建土石」留有違規次數紀錄，系統將動態給予警醒提示，並改以人工複查、不予以 AI 自動結存：
            </p>

            <div className="space-y-2.5">
              {blacklist.map((vRecord) => (
                <div key={vRecord.name} className="border border-gray-150 p-3 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-xs">{vRecord.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      vRecord.violationCount > 0 
                        ? "bg-red-50 text-red-700 border border-red-200 animate-pulse" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      違規：{vRecord.violationCount} 次
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">行動地址：{vRecord.address}</p>
                  {vRecord.violationCount > 0 && (
                    <p className="text-[10px] bg-red-50 text-red-700 rounded p-1.5">{vRecord.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Override / Manual edit Dialogue popup */}
      {editingCase && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-150 max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-gray-800 to-indigo-900 text-white p-4 flex justify-between items-center">
              <h4 className="font-bold text-sm">手動人工覆核 ── 案件編號：{editingCase.id}</h4>
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="text-white hover:text-gray-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualOverride} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">強制設定狀態</label>
                  <select
                    value={editingCase.status}
                    onChange={(e) => setEditingCase({ ...editingCase, status: e.target.value as any })}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2"
                  >
                    <option value="待審核">待審核</option>
                    <option value="待繳費">待繳費</option>
                    <option value="待派工">待派工</option>
                    <option value="清運中">清運中</option>
                    <option value="已完成">已完成</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">AI 判定合規性</label>
                  <select
                    value={editingCase.reviewResult ? (editingCase.reviewResult.approved ? "true" : "false") : "true"}
                    onChange={(e) => {
                      const appStatus = e.target.value === "true";
                      const currentResult = editingCase.reviewResult || {
                        approved: true,
                        reason: "人工審計核發准予清運。",
                        items_detected: {},
                        estimated_volume: 1.0,
                        estimated_weight: 40,
                        is_construction_waste: false
                      };
                      setEditingCase({
                        ...editingCase,
                        reviewResult: {
                          ...currentResult,
                          approved: appStatus,
                          is_construction_waste: !appStatus
                        }
                      });
                    }}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2"
                  >
                    <option value="true">合規：允許清運</option>
                    <option value="false">違規：拒絕清運</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">人工加註審查建議</label>
                <textarea
                  required
                  rows={3}
                  value={editingCase.reviewResult?.reason || "人工重新稽核品項：准予清。"}
                  onChange={(e) => {
                    const currentResult = editingCase.reviewResult || {
                      approved: true,
                      reason: "",
                      items_detected: {},
                      estimated_volume: 1.0,
                      estimated_weight: 40,
                      is_construction_waste: false
                    };
                    setEditingCase({
                      ...editingCase,
                      reviewResult: {
                        ...currentResult,
                        reason: e.target.value
                      }
                    });
                  }}
                  className="w-full text-xs border border-gray-200 outline-none rounded p-2 resize-none"
                />
              </div>

              {/* Adjust Billing amount if needed */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">手動計算清運費</label>
                  <input
                    type="number"
                    value={editingCase.billing?.totalAmount || 0}
                    onChange={(e) => {
                      const currentBilling = editingCase.billing || {
                        items: [],
                        totalAmount: 0,
                        paymentStatus: "未付款"
                      };
                      setEditingCase({
                        ...editingCase,
                        billing: {
                          ...currentBilling,
                          totalAmount: parseInt(e.target.value, 10) || 0
                        }
                      });
                    }}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">收款核銷狀態</label>
                  <select
                    value={editingCase.billing?.paymentStatus || "未付款"}
                    onChange={(e) => {
                      const currentBilling = editingCase.billing || {
                        items: [],
                        totalAmount: 0,
                        paymentStatus: "未付款"
                      };
                      setEditingCase({
                        ...editingCase,
                        billing: {
                          ...currentBilling,
                          paymentStatus: e.target.value as any
                        }
                      });
                    }}
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-2"
                  >
                    <option value="未付款">未付款 (Pending)</option>
                    <option value="已付款">已付款 (Paid)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-150 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 rounded text-xs select-none"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-xs shadow select-none"
                >
                  確認儲存覆寫
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

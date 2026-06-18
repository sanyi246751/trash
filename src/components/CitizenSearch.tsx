/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, MapPin, DollarSign, Calendar, Landmark, CheckCircle, Clock } from "lucide-react";
import { WasteCase, CaseStatus } from "../types";

interface CitizenSearchProps {
  cases: WasteCase[];
  onUpdateCase: (updatedCase: WasteCase) => void;
}

export default function CitizenSearch({ cases, onUpdateCase }: CitizenSearchProps) {
  const [searchId, setSearchId] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchedCase, setSearchedCase] = useState<WasteCase | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Bank transfer submission state
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payLast5, setPayLast5] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    
    if (!searchId || !searchPhone) {
      alert("請輸入案件編號與聯絡手機末 4 碼！");
      return;
    }

    const matched = cases.find(
      (c) =>
        c.id.toLowerCase() === searchId.trim().toLowerCase() &&
        c.phone.slice(-4) === searchPhone.trim()
    );
    
    setSearchedCase(matched || null);
    
    if (matched && matched.billing) {
      setPayAmount(String(matched.billing.totalAmount));
      setPayDate(new Date().toISOString().substring(0, 10));
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedCase || !payAmount || !payDate || !payLast5) {
      alert("請完整填寫付款資訊！");
      return;
    }

    if (payLast5.length !== 5 || isNaN(Number(payLast5))) {
      alert("帳號末五碼必須為 5 位純數字！");
      return;
    }

    setIsSubmittingPay(true);
    try {
      // Automatic ROC transition: Since they paid, paymentStatus is sets to '已付款'
      // and case status moves from '待繳費' to '待派工'!
      const billingUpdate = {
        ...searchedCase.billing,
        paymentStatus: "已付款",
        paymentDate: payDate,
        paymentLast5Digits: payLast5
      };

      const response = await fetch(`/api/cases/${searchedCase.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "待派工", // Automatically moves to pending dispatch!
          billing: billingUpdate
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setSearchedCase(updated);
        onUpdateCase(updated);
        alert("規費繳納款項登記成功！本局已將狀態更新為『待派工』，謝謝您的配合。");
      } else {
        alert("繳納登記失敗，請聯絡客服。");
      }
    } catch (err) {
      console.error(err);
      alert("網路連線錯誤。");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Timeline representation map
  const TIMELINE_STEPS: { name: CaseStatus; title: string; desc: string }[] = [
    { name: "待審核", title: "已受理等待 AI / 人工審核", desc: "系統已建立案件編號，AI 辨識及人工確認品項正確性中。" },
    { name: "待繳費", title: "審核通過，等待繳納規費", desc: "請核對明細，ATM 轉帳支付清運手續費並於此回報末五碼。" },
    { name: "待派工", title: "規費已繳，等待安排清運車輛", desc: "規費清核完成，清潔隊即將排入清運勤務班次。" },
    { name: "清運中", title: "清運中（勤務安排完成）", desc: "垃圾清運車輛與隊員正依照規劃路徑前進並到場清運。" },
    { name: "已完成", title: "清運完成（合規結案）", desc: "隊員現場作業拍照確認，已完成巨大垃圾清理任務！" }
  ];

  const getStepIndex = (currentStatus: CaseStatus) => {
    return TIMELINE_STEPS.findIndex((s) => s.name === currentStatus);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Query Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              輸入案件編號
            </label>
            <input
              type="text"
              required
              placeholder="例如：11506150001"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              通報手機號碼末 4 碼
            </label>
            <input
              type="text"
              required
              maxLength={4}
              placeholder="例如：5678"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-indigo-500 rounded-lg p-2.5 outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg shadow transition flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            <Search className="w-4 h-4" /> 查詢清運進度
          </button>
        </form>
      </div>

      {hasSearched && !searchedCase && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-800 space-y-2">
          <Clock className="w-8 h-8 text-red-500 mx-auto" />
          <h4 className="font-bold">找不到相符的案件記錄</h4>
          <p className="text-xs text-red-700 max-w-sm mx-auto">
            未發現與該編號以及手機末四碼相符之大型廢棄物通報資料。請檢視編號是否填寫正確（如 11506150001 格式）。
          </p>
        </div>
      )}

      {searchedCase && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Timeline and Details Column */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-150 pb-4">
              <div>
                <span className="bg-indigo-100 text-indigo-800 font-mono text-xs px-2.5 py-1 rounded-full border border-indigo-200">
                  狀態：{searchedCase.status}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  案件編號：<span className="font-mono text-xl">{searchedCase.id}</span>
                </h3>
              </div>
              {searchedCase.photoUrl && (
                <img
                  src={searchedCase.photoUrl}
                  alt="uploaded waste"
                  className="w-16 h-12 object-cover rounded shadow"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {/* General Case Info block */}
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">通報人：</span>
                <span className="font-semibold text-gray-800">{searchedCase.name}</span>
              </div>
              <div>
                <span className="text-gray-400">申報日期：</span>
                <span className="font-mono font-semibold text-gray-800">{searchedCase.date}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-400">清運地點：</span>
                <span className="font-semibold text-gray-800 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" /> {searchedCase.address}
                </span>
              </div>
              <div className="sm:col-span-2 border-t border-gray-200/60 pt-2.5">
                <span className="text-gray-400">申報品項：</span>
                <span className="font-semibold text-gray-800">
                  {Object.entries(searchedCase.items)
                    .map(([name, qty]) => `${name} x${qty}`)
                    .join(", ")}
                </span>
              </div>
            </div>

            {/* Timeline graphics */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-sm">申報處理流程進度線</h4>
              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {TIMELINE_STEPS.map((step, idx) => {
                  const currentIdx = getStepIndex(searchedCase.status);
                  const isPassed = idx <= currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={idx} className="relative flex gap-3 text-sm">
                      {/* Check Node circle mark */}
                      <span
                        className={`absolute -left-[21px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isPassed
                            ? "bg-indigo-600 border-indigo-600 ring-4 ring-indigo-100"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        {isPassed && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                      </span>
                      <div className="flex-1">
                        <p className={`font-bold transition-all ${isPassed ? "text-indigo-900" : "text-gray-400"}`}>
                          {step.title}
                          {isCurrent && <span className="bg-amber-100 text-amber-800 text-[10px] ml-2 px-1.5 py-0.5 rounded font-medium">清運當前點</span>}
                        </p>
                        <p className={`text-xs mt-0.5 ${isPassed ? "text-gray-600" : "text-gray-300"}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pricing Standard & Remittance Form */}
          <div className="lg:col-span-5 space-y-6">
            {/* AI Review info if audited */}
            {searchedCase.reviewResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-1 text-emerald-900 font-bold text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  AI 智能識別稽核報告
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed bg-white border border-emerald-100 rounded p-3">
                  {searchedCase.reviewResult.reason}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-emerald-800">
                  <div className="bg-emerald-500/10 p-2 rounded">
                    體積：<strong>{searchedCase.reviewResult.estimated_volume} m³</strong>
                  </div>
                  <div className="bg-emerald-500/10 p-2 rounded">
                    重量：<strong>{searchedCase.reviewResult.estimated_weight} kg</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Panel */}
            {searchedCase.billing ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-150 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-800 to-indigo-900 text-white p-4">
                  <h4 className="font-bold text-sm flex justify-between items-center">
                    <span>規費費用明細</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      searchedCase.billing.paymentStatus === "已付款" 
                        ? "bg-emerald-500 text-white" 
                        : "bg-red-500 text-white animate-pulse"
                    }`}>
                      {searchedCase.billing.paymentStatus}
                    </span>
                  </h4>
                </div>

                <div className="p-5 space-y-4">
                  <div className="divide-y divide-gray-100">
                    {searchedCase.billing.items.map((bItem, i) => (
                      <div key={i} className="flex justify-between py-2 text-xs text-gray-700">
                        <span>{bItem.name} (x{bItem.qty})</span>
                        <span className="font-mono">${bItem.total} 元</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-150 pt-3 flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-sm">總計規費應繳：</span>
                    <span className="text-lg font-bold font-mono text-indigo-700">${searchedCase.billing.totalAmount} 元</span>
                  </div>

                  {searchedCase.billing.paymentStatus === "未付款" ? (
                    /* Bank remittance reporting Form */
                    <form onSubmit={handleRegisterPayment} className="border-t border-indigo-100 pt-4 mt-3 space-y-3 bg-indigo-50/20 p-3 rounded-lg border border-indigo-200/50">
                      <p className="text-xs text-indigo-900 leading-relaxed font-semibold">
                        繳費方式：請轉帳匯款至「羅東鎮農會垃圾清運帳戶（模擬：(600) 039-114-061801）」並回報：
                      </p>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                          轉帳日期
                        </label>
                        <input
                          type="date"
                          required
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="w-full bg-white text-xs border border-gray-200 focus:border-indigo-500 rounded p-1.5 outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                            回報金額
                          </label>
                          <input
                            type="number"
                            required
                            disabled
                            value={payAmount}
                            className="w-full bg-gray-50 border border-gray-200 text-xs rounded p-1.5 text-gray-500 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">
                            您的銀行帳號末五碼
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            placeholder="防偽末5碼"
                            value={payLast5}
                            onChange={(e) => setPayLast5(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-white border border-gray-200 focus:border-indigo-500 text-xs rounded p-1.5 font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingPay}
                        className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-1.5 rounded text-xs transition shadow flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                      >
                        <Landmark className="w-3.5 h-3.5" /> 
                        {isSubmittingPay ? "上傳中..." : "登記並自動對帳結清"}
                      </button>
                    </form>
                  ) : (
                    /* Display payment info */
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> 規費已結清入庫
                      </p>
                      <p>匯款末五碼：<strong className="font-mono">{searchedCase.billing.paymentLast5Digits}</strong></p>
                      <p>入帳清算日：<span className="font-mono">{searchedCase.billing.paymentDate}</span></p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center text-amber-900 space-y-1">
                <Clock className="w-8 h-8 text-amber-600 mx-auto animate-pulse" />
                <h5 className="font-bold text-xs">AI 財務審查中</h5>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  案件正等待 AI 辨識品項與量體以核算清運規費。一旦審核通過，規費帳單將會自動在此更新，市民得以回報匯款完成繳費。
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

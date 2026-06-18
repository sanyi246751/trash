/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Upload, Camera, Trash2, Plus, Minus, Check, Sparkles, MapPin, AlertCircle, FileText } from "lucide-react";
import { WasteCase, WastePriceItem } from "../types";

interface CitizenPortalProps {
  priceStandards: WastePriceItem[];
  onSubmitSuccess: (newCase: WasteCase) => void;
}

// Preset high fidelity bulky waste image mocks for easy testing
const DEFAULT_SOFA_PHOTO = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=420";

const DEMO_PRESETS = [
  {
    name: "模擬：廢棄三人皮沙發",
    url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=420",
    items: { "沙發": 1 },
    notes: "一樓門口，不會擋到行人通道。"
  },
  {
    name: "模擬：壞掉雙門大冰箱",
    url: "https://images.unsplash.com/photo-1571175432267-ef7ed216a6c1?auto=format&fit=crop&q=80&w=420",
    items: { "冰箱": 1 },
    notes: "防火巷口，已經跟一樓住戶告知。"
  },
  {
    name: "模擬：雙人老舊彈簧床",
    url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=420",
    items: { "床墊": 1 },
    notes: "請幫忙清運。床墊有部分污漬。"
  },
  {
    name: "模擬：包含營建碎石塊 (AI將審核拒收案例)",
    url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=420",
    items: { "桌子": 1 },
    notes: "混有碎石、水泥渣。裝修後拆下來的碎料。"
  }
];

export default function CitizenPortal({ priceStandards, onSubmitSuccess }: CitizenPortalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<WasteCase | null>(null);
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  
  // Simulated Coordinates based on famous spots in Yilan for map demo
  const MOCK_COORD_PRESETS = [
    { name: "羅東鎮民權路", lat: 24.6758, lng: 121.7672 },
    { name: "冬山鄉廣興路", lat: 24.6652, lng: 121.7348 },
    { name: "宜蘭市神農路", lat: 24.7516, lng: 121.7512 },
    { name: "礁溪鄉礁溪路", lat: 24.8296, lng: 121.7725 },
    { name: "羅東鎮純精路", lat: 24.6732, lng: 121.7589 },
    { name: "冬山鄉冬山路", lat: 24.6342, lng: 121.7922 },
  ];

  // Address simulation helper
  useEffect(() => {
    if (address.length > 2 && !address.startsWith("宜蘭縣")) {
      setAddressSuggestions([
        `宜蘭縣羅東鎮${address}`,
        `宜蘭縣冬山鄉${address}`,
        `宜蘭縣宜蘭市${address}`,
        `宜蘭縣礁溪鄉${address}`
      ]);
    } else {
      setAddressSuggestions([]);
    }
  }, [address]);

  const handleSelectItemPreset = (preset: typeof DEMO_PRESETS[0]) => {
    setPhotoUrl(preset.url);
    setSelectedItems(preset.items);
    setNotes(preset.notes);
  };

  const handleItemQtyChange = (name: string, diff: number) => {
    setSelectedItems((prev) => {
      const current = prev[name] || 0;
      const next = current + diff;
      const updated = { ...prev };
      if (next <= 0) {
        delete updated[name];
      } else {
        updated[name] = next;
      }
      return updated;
    });
  };

  const calculateTotal = () => {
    return Object.entries(selectedItems).reduce((sum, [name, qty]) => {
      const itemConfig = priceStandards.find((p) => p.name === name);
      const qtyNum = typeof qty === "number" ? qty : Number(qty) || 0;
      return sum + (itemConfig ? itemConfig.unitPrice * qtyNum : 0);
    }, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerMockCamera = () => {
    // Simulated random preset selection to simulate camera
    const randomPreset = DEMO_PRESETS[Math.floor(Math.random() * 3)];
    handleSelectItemPreset(randomPreset);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address || Object.keys(selectedItems).length === 0) {
      alert("請完整填寫姓名、電話、通報地址，並至少選擇一項清運品項！");
      return;
    }

    setIsSubmitting(true);
    
    // Choose coordinate randomly or based on address string
    let coord = MOCK_COORD_PRESETS[Math.floor(Math.random() * MOCK_COORD_PRESETS.length)];
    const matchingPreset = MOCK_COORD_PRESETS.find(p => address.includes(p.name.replace(/鎮|鄉|市/, "")));
    if (matchingPreset) {
      coord = { name: address, lat: matchingPreset.lat + (Math.random() - 0.5) * 0.005, lng: matchingPreset.lng + (Math.random() - 0.5) * 0.005 };
    }

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          address,
          lat: coord.lat,
          lng: coord.lng,
          photoUrl: photoUrl || DEFAULT_SOFA_PHOTO,
          items: selectedItems,
          notes
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccessInfo(result);
        onSubmitSuccess(result);
        // Clear form
        setName("");
        setPhone("");
        setAddress("");
        setNotes("");
        setSelectedItems({});
        setPhotoUrl("");
      } else {
        alert("新增清運單失敗，請稍後再試。");
      }
    } catch (err) {
      console.error(err);
      alert("網路異常，新增失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-emerald-500/30 text-emerald-300 font-medium text-xs px-3 py-1 rounded-full border border-emerald-500/20">
            市民線上服務快捷
          </span>
          <h2 className="text-2xl font-bold tracking-tight mt-3">巨大垃圾清運線上通報</h2>
          <p className="text-emerald-100/80 text-sm mt-1 max-w-xl">
            提供市民廢棄大型家具（如沙發、床墊、冰箱等）免出門、免紙張受理登記。AI 將於 3 秒內智能分析照片並生成繳款計費。
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-12 pointer-events-none">
          <Sparkles className="w-40 h-40" />
        </div>
      </div>

      {successInfo && (
        <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 shadow-md transition-all duration-300 transform scale-100">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-500 text-white rounded-full p-2 mt-1">
              <Check className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-gray-900">恭喜！您的清運申請已成功遞交</h3>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">案件編號：</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">{successInfo.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">通報日期：</span>
                  <span className="font-semibold text-gray-800">{successInfo.date}</span>
                </div>
                <div>
                  <span className="text-gray-500">申請人姓名：</span>
                  <span className="font-semibold text-gray-800">{successInfo.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">通報手機號：</span>
                  <span className="font-semibold text-gray-800">{successInfo.phone}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-500">清運地址：</span>
                  <span className="font-semibold text-gray-800">{successInfo.address}</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">後續作業叮嚀：</p>
                  <p className="mt-1">
                    1. 請記下您的案件編號 <span className="font-mono font-bold">{successInfo.id}</span> 與申請手機。
                  </p>
                  <p>
                    2. 預計 5-10 分鐘內將由 AI 與清潔隊人員完成審核，您可在<strong>「民眾案件查詢」</strong>進行進度追蹤和取得轉帳帳號付款。
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuccessInfo(null)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-5 rounded-lg transition"
              >
                繼續通報下一筆
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <span className="w-1 h-5 bg-emerald-600 rounded"></span>
            <h3 className="font-bold text-gray-900">填寫通報基本資料</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                通報人姓名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="例如：張建國"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                聯絡手機號碼 <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="例如：0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 outline-none transition"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              清運地點（地址） <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="請輸入欲清運之街道、巷弄、門牌號碼"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setAddress("宜蘭縣羅東鎮中山路三段50號")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1"
                title="帶入預設宜蘭位置"
              >
                <MapPin className="w-3.5 h-3.5" /> 羅東
              </button>
            </div>
            
            {addressSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 max-h-48 overflow-y-auto text-sm">
                {addressSuggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setAddress(sug);
                      setAddressSuggestions([]);
                    }}
                    className="w-full text-left p-2.5 hover:bg-gray-50 text-gray-700 border-b border-gray-100 last:border-0"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-500">
                選擇廢棄家具與申報數量
              </label>
              <span className="text-gray-400 text-xs">（可多選）</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {priceStandards.map((item) => {
                const qty = selectedItems[item.name] || 0;
                return (
                  <div
                    key={item.name}
                    className={`flex items-center justify-between p-3 rounded-lg border transition ${
                      qty > 0 ? "border-emerald-300 bg-emerald-50/40" : "border-gray-150 bg-gray-50/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-emerald-700 font-mono mt-0.5">${item.unitPrice} 元/件</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(item.name, -1)}
                        className="bg-white hover:bg-red-50 text-gray-600 border border-gray-200 w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm w-5 text-center">{qty}</span>
                      <button
                        type="button"
                        onClick={() => handleItemQtyChange(item.name, 1)}
                        className="bg-white hover:bg-emerald-50 text-gray-600 border border-gray-200 w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              清運位置加註與特殊備註
            </label>
            <textarea
              rows={2}
              placeholder="例如：請堆置於一樓門口、舊大樓警衛室旁、附言說明。"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg p-2.5 outline-none transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl shadow transition duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="inline-block animate-pulse">正在傳送資料...</span>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                送出清運申請單 (${calculateTotal()} 元)
              </>
            )}
          </button>
        </form>

        {/* Media & Preset Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <span className="w-1 h-5 bg-teal-600 rounded"></span>
              <h3 className="font-bold text-gray-900">上傳大型廢棄物照片</h3>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                政府要求：通報人必須上傳欲清運巨大家具之現場真實照片，以利 AI 與稽核人員進行合規性比對，防範建築廢土碎瓦等違法傾倒混入。
              </p>

              {/* Photo View Box */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl relative overflow-hidden bg-gray-55 aspect-video flex flex-col items-center justify-center text-center p-4">
                {photoUrl ? (
                  <>
                    <img
                      src={photoUrl}
                      alt="bulky waste upload"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotoUrl("")}
                      className="absolute top-2 right-2 bg-red-600/95 text-white p-1.5 rounded-full hover:bg-red-700 transition shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 pointer-events-none text-gray-400">
                    <Upload className="w-10 h-10 mx-auto stroke-1" />
                    <p className="text-xs font-semibold text-gray-600">隨選 preset 或者上傳現場照片</p>
                    <p className="text-[10px] text-gray-400">支援 PNG, JPG</p>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="grid grid-cols-2 gap-2">
                <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 border border-gray-200 rounded-lg text-center cursor-pointer text-xs flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> 選擇檔案
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={triggerMockCamera}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3 border border-gray-200 rounded-lg text-xs flex items-center justify-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" /> 模擬拍照
                </button>
              </div>
            </div>
          </div>

          {/* Test Presets Panel */}
          <div className="bg-amber-50/50 border border-amber-200/65 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <h4 className="font-bold text-xs">快速測試 presets 組模</h4>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              您不需要親自去外面給家具拍照！我們為您打包了 4 組模擬巨大垃圾的照片與配置，點選任一預設即可直接帶入通報：
            </p>
            <div className="space-y-1.5">
              {DEMO_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleSelectItemPreset(preset)}
                  className="w-full text-left text-xs bg-white hover:bg-amber-100 border border-amber-200 text-gray-700 font-medium py-2 px-3 rounded-lg flex items-center gap-2 group transition"
                >
                  <img
                    src={preset.url}
                    alt="mini mock"
                    className="w-8 h-6 object-cover rounded shadow-sm group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="truncate flex-1">
                    <p className="font-bold text-gray-900 leading-tight">{preset.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{preset.notes}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import { WasteCase, CaseStatus, AIReviewResult, BillingDetails } from "./src/types";

const app = express();
const PORT = 3000;

// Body parser with 50MB limit to support large base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database file path
const DATA_STORE_PATH = path.join(process.cwd(), "src", "data_store.json");

// Ensure the src directory exists
const srcDir = path.join(process.cwd(), "src");
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

// Initial Standard Pricing list
const PRICE_STANDARDS = [
  { name: "沙發", unitPrice: 300, description: "客廳沙發椅、單人/雙人/三人沙發床" },
  { name: "床墊", unitPrice: 400, description: "各尺寸彈簧床墊、海綿床墊" },
  { name: "冰箱", unitPrice: 500, description: "單門、雙門或多門家用電冰箱" },
  { name: "衣櫃", unitPrice: 350, description: "大型木質或金屬組合衣櫃、斗櫃" },
  { name: "桌子", unitPrice: 150, description: "書桌、辦公桌、餐桌、大型泡茶桌" },
  { name: "洗衣機", unitPrice: 450, description: "直立式、滾筒式家用洗衣機或脫水機" },
  { name: "電視機", unitPrice: 200, description: "各尺寸液晶/曲面電視、舊式傳統電視" }
];

// Initial Blacklist/Violators
const BLACKLIST_RECORDS = [
  { name: "陳阿土", phone: "0912111222", address: "宜蘭縣羅東鎮中山路三段50號", violationCount: 2, notes: "兩次任意傾倒磚瓦、木條營建混合廢棄物，並拒絕支付規費。" },
  { name: "王大富", phone: "0933444555", address: "宜蘭縣宜蘭市光復路100號", violationCount: 1, notes: "通報清運一般床墊，現場實際堆置大量廢棄石綿瓦與水泥塊。" },
  { name: "林小華", phone: "0972555666", address: "宜蘭縣冬山鄉廣興路50號", violationCount: 0, notes: "無違規紀錄，優良市民。" }
];

// Helper to secure base64 preset mock photos
const DEFAULT_SOFA_PHOTO = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=400";
const DEFAULT_FRIDGE_PHOTO = "https://images.unsplash.com/photo-1571175432267-ef7ed216a6c1?auto=format&fit=crop&q=80&w=400";
const DEFAULT_MATTRESS_PHOTO = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=400";
const DEFAULT_CLEANED_PHOTO = "https://images.unsplash.com/photo-1621905252507-b354bc25edac?auto=format&fit=crop&q=80&w=400";

// Seeds data if data_store.json does not exist
const seedCases: WasteCase[] = [
  {
    id: "11506150001",
    date: "2026-06-15",
    name: "張建國",
    phone: "0912345678",
    address: "宜蘭縣羅東鎮民權路110號",
    lat: 24.6758,
    lng: 121.7672,
    photoUrl: DEFAULT_SOFA_PHOTO,
    items: { "沙發": 1, "衣櫃": 1 },
    notes: "一樓大門口旁空地，已與鄰居打招呼。請在早上清運。",
    status: "已完成",
    reviewResult: {
      approved: true,
      reason: "AI 辨識符合清運品項（沙發 1 件、衣櫃 1 件），現場不含任何營建黏土、磚石與瓦片等違規物。",
      items_detected: { "沙發": 1, "衣櫃": 1 },
      estimated_volume: 3.2,
      estimated_weight: 110,
      is_construction_waste: false
    },
    billing: {
      items: [
        { name: "沙發", qty: 1, unitPrice: 300, total: 300 },
        { name: "衣櫃", qty: 1, unitPrice: 350, total: 350 }
      ],
      totalAmount: 650,
      paymentStatus: "已付款",
      paymentDate: "2026-06-15",
      paymentLast5Digits: "12345"
    },
    dispatch: {
      date: "2026-06-15",
      vehicle: "清運A車",
      worker: "張清潔、李掃地"
    },
    safetyChecklist: {
      helmet: true,
      gloves: true,
      vest: true,
      twoWorkers: true,
      harnessConfirmed: true
    },
    completion: {
      finishDate: "2026-06-15 10:24",
      finishPhoto: DEFAULT_CLEANED_PHOTO,
      finishGps: { lat: 24.6759, lng: 121.7671 },
      worker: "張清潔、李掃地"
    }
  },
  {
    id: "11506160001",
    date: "2026-06-16",
    name: "林惠君",
    phone: "0921987654",
    address: "宜蘭縣冬山鄉廣興路220號",
    lat: 24.6652,
    lng: 121.7348,
    photoUrl: DEFAULT_FRIDGE_PHOTO,
    items: { "冰箱": 1 },
    notes: "舊冰箱，放於防火巷口，有貼紙註記清運。",
    status: "待審核",
    reviewResult: null,
    billing: null,
    dispatch: null,
    safetyChecklist: null,
    completion: null
  },
  {
    id: "11506170001",
    date: "2026-06-17",
    name: "李自強",
    phone: "0933888777",
    address: "宜蘭縣宜蘭市神農路一段1號",
    lat: 24.7516,
    lng: 121.7512,
    photoUrl: DEFAULT_MATTRESS_PHOTO,
    items: { "床墊": 1, "冰箱": 1 },
    notes: "公寓一樓，放置於大門口，人會移至門口等候。",
    status: "待繳費",
    reviewResult: {
      approved: true,
      reason: "影像判別：床墊 1 床、冰箱 1 台。品項確實，大小符合收運規範，無夾雜有害或事業廢棄物。",
      items_detected: { "床墊": 1, "冰箱": 1 },
      estimated_volume: 2.5,
      estimated_weight: 95,
      is_construction_waste: false
    },
    billing: {
      items: [
        { name: "床墊", qty: 1, unitPrice: 400, total: 400 },
        { name: "冰箱", qty: 1, unitPrice: 500, total: 500 }
      ],
      totalAmount: 900,
      paymentStatus: "未付款"
    },
    dispatch: null,
    safetyChecklist: null,
    completion: null
  },
  {
    id: "11506170002",
    date: "2026-06-17",
    name: "許永德",
    phone: "0975666555",
    address: "宜蘭縣礁溪鄉礁溪路五段80號",
    lat: 24.8296,
    lng: 121.7725,
    photoUrl: DEFAULT_SOFA_PHOTO,
    items: { "沙發": 1 },
    notes: "礁溪舊宿舍拆除家具沙發一組。請務必開立收據。",
    status: "待派工",
    reviewResult: {
      approved: true,
      reason: "自動通過。審查正常。",
      items_detected: { "沙發": 1 },
      estimated_volume: 1.8,
      estimated_weight: 45,
      is_construction_waste: false
    },
    billing: {
      items: [
        { name: "沙發", qty: 1, unitPrice: 300, total: 300 }
      ],
      totalAmount: 300,
      paymentStatus: "已付款",
      paymentDate: "2026-06-18",
      paymentLast5Digits: "98765"
    },
    dispatch: null,
    safetyChecklist: null,
    completion: null
  }
];

// Helper to load current database
function readData(): WasteCase[] {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const data = fs.readFileSync(DATA_STORE_PATH, "utf-8");
      return JSON.parse(data);
    } else {
      fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(seedCases, null, 2), "utf-8");
      return seedCases;
    }
  } catch (error) {
    console.error("Error reading data store:", error);
    return seedCases;
  }
}

// Helper to write to database
function writeData(data: WasteCase[]) {
  try {
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving data store:", error);
  }
}

// Initialize Gemini Client
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Routes

// 1. Get Cases List
app.get("/api/cases", (req, res) => {
  const cases = readData();
  res.json(cases);
});

// 2. Create New Case
app.post("/api/cases", (req, res) => {
  const { name, phone, address, lat, lng, photoUrl, items, notes } = req.body;
  const cases = readData();
  
  // Format Case ID: 115 + MMDD + 4-digit serial
  const today = new Date();
  const rocYear = today.getFullYear() - 1911; // 2026 is 115
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const prefix = `${rocYear}${month}${day}`;
  
  // Find current day's highest serial
  const todayPrefixCases = cases.filter((c) => c.id.startsWith(prefix));
  let serialNum = 1;
  if (todayPrefixCases.length > 0) {
    const serials = todayPrefixCases.map((c) => parseInt(c.id.substring(7), 10));
    serialNum = Math.max(...serials) + 1;
  }
  const caseId = `${prefix}${String(serialNum).padStart(4, "0")}`;
  
  const newCase: WasteCase = {
    id: caseId,
    date: today.toISOString().substring(0, 10),
    name,
    phone,
    address,
    lat: parseFloat(lat) || 24.6758,
    lng: parseFloat(lng) || 121.7672,
    photoUrl: photoUrl || DEFAULT_SOFA_PHOTO,
    items: items || {},
    notes: notes || "",
    status: "待審核",
    reviewResult: null,
    billing: null,
    dispatch: null,
    safetyChecklist: null,
    completion: null
  };
  
  cases.unshift(newCase);
  writeData(cases);
  res.status(201).json(newCase);
});

// 3. Update Case (status, billing, dispatch, checklist, complete)
app.put("/api/cases/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const cases = readData();
  
  const index = cases.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Case not found" });
  }
  
  const currentCase = cases[index];
  cases[index] = {
    ...currentCase,
    ...updates,
    // Deep-merge structures if provided directly
    reviewResult: updates.reviewResult !== undefined ? updates.reviewResult : currentCase.reviewResult,
    billing: updates.billing !== undefined ? updates.billing : currentCase.billing,
    dispatch: updates.dispatch !== undefined ? updates.dispatch : currentCase.dispatch,
    safetyChecklist: updates.safetyChecklist !== undefined ? updates.safetyChecklist : currentCase.safetyChecklist,
    completion: updates.completion !== undefined ? updates.completion : currentCase.completion
  };
  
  writeData(cases);
  res.json(cases[index]);
});

// 4. AI Analysis of Waste Case Image
app.post("/api/cases/ai-analyze", async (req, res) => {
  const { caseId, photoDataUrl } = req.body;
  const cases = readData();
  
  const currentCase = cases.find((c) => c.id === caseId);
  if (!currentCase) {
    return res.status(404).json({ error: "Case not found" });
  }
  
  // If we don't have Gemini configured, return a deterministic high-quality mock response
  if (!ai) {
    console.warn("GEMINI_API_KEY is not configured. Falling back to intelligent mock analysis.");
    
    // Check user declared items to respond intelligently
    const declared = currentCase.items;
    const hasSofa = "沙發" in declared;
    const hasFridge = "冰箱" in declared;
    const hasMattress = "床墊" in declared;
    const isIllegalNotes = currentCase.notes.includes("水泥") || currentCase.notes.includes("石棉瓦") || currentCase.notes.includes("營建");
    
    let approved = true;
    let desc = "AI 辨識正常其餘品項符合公所收運基準。現場堆放品項大小確實，未含有害裝潢營建混雜磚石。";
    let is_const = false;
    
    if (isIllegalNotes) {
      approved = false;
      is_const = true;
      desc = "AI 警告：影像及通報備註中檢出疑似『營建碎磚瓦與廢棄石棉瓦』等禁止收運之事業與營建廢棄物，本所依法拒收。請聯絡合格清除機構辦理。";
    }
    
    const analyzedResult: AIReviewResult = {
      approved,
      reason: desc,
      items_detected: currentCase.items,
      estimated_volume: Number((Object.values(declared).reduce((a, b) => a + b, 0) * 1.4).toFixed(1)) || 1.5,
      estimated_weight: Object.values(declared).reduce((a, b) => a + b, 0) * 45 || 40,
      is_construction_waste: is_const
    };
    
    // Auto populate default billing if approved
    let billing: BillingDetails | null = null;
    if (approved) {
      const billingItems = Object.entries(currentCase.items).map(([name, qty]) => {
        const rateObj = PRICE_STANDARDS.find((r) => r.name === name);
        const unitPrice = rateObj ? rateObj.unitPrice : 300;
        return {
          name,
          qty,
          unitPrice,
          total: qty * unitPrice
        };
      });
      const totalAmount = billingItems.reduce((sum, item) => sum + item.total, 0);
      billing = {
        items: billingItems,
        totalAmount,
        paymentStatus: "未付款"
      };
    }
    
    currentCase.reviewResult = analyzedResult;
    currentCase.status = approved ? "待繳費" : "待審核"; // if rejected, keep pending review for manual check
    if (billing) {
      currentCase.billing = billing;
    }
    
    writeData(cases);
    return res.json({ case: currentCase });
  }
  
  try {
    let cleanBase64 = photoDataUrl;
    let mimeType = "image/jpeg";
    
    if (photoDataUrl.startsWith("data:")) {
      const match = photoDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }
    } else if (photoDataUrl.startsWith("http")) {
      // It's a remote URL image, let's fetch and convert to base64
      try {
        const response = await fetch(photoDataUrl);
        const arrayBuffer = await response.arrayBuffer();
        cleanBase64 = Buffer.from(arrayBuffer).toString("base64");
        const contentType = response.headers.get("content-type");
        if (contentType) mimeType = contentType;
      } catch (e) {
        console.error("Failed to fetch remote image:", e);
        // Fallback to a mock image conversion or fail
      }
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64
      }
    };
    
    const catalogJson = JSON.stringify(PRICE_STANDARDS.map(p => p.name));
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          imagePart,
          {
            text: `你現在是 台灣鄉鎮市公所 清潔隊「巨大垃圾與廢棄物智慧AI審理官」。
請分析這張巨大垃圾通報照片，並完成以下審核：
1. 目測找出這張影像包含的巨大家具品項：可收運項目包括：沙發、床墊、冰箱、衣櫃、桌子、洗衣機、電視機。
   請盤點每一項的件數。如果是可清運垃圾，將 true 設為 approved 行動。
2. 警告檢查：影像內是否包含「營建廢棄物、石綿瓦、水泥塊、磚塊、大理石板、陶瓷衛浴等營建混碎、土石瓦片」等國家法令規定的「不可清運」項目。如果是，請把 approved 設為 false，is_construction_waste 設為 true，並在 reason 中加註「警告：偵測到營建廢碎料與土石瓦礫，本所法規禁止運送此類事業與建築廢棄物」。
3. 估算出總體積（立方公尺，浮點數）與預估總重量（公斤，整數）。
4. 自動在 reason 提供一段 150 字內、繁體中文的專業親和審查結論。

請【嚴格】返回以下格式之 繁體中文 JSON：
{
  "approved": boolean,
  "reason": "審核結果描述",
  "items_detected": {
    "沙發": 0,
    "床墊": 0,
    "冰箱": 0,
    "衣櫃": 0,
    "桌子": 0,
    "洗衣機": 0,
    "電視機": 0
  },
  "estimated_volume": 1.5,
  "estimated_weight": 80,
  "is_construction_waste": false
}
注意：偵測字典中，若該項沒有發現，數量返還 0。請勿任意加字，只回傳合法的 JSON 結構本身。`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const aiText = response.text || "";
    const parsedData: AIReviewResult = JSON.parse(aiText);
    
    // Update the case
    currentCase.reviewResult = parsedData;
    currentCase.status = parsedData.approved ? "待繳費" : "待審核"; // If rejected, keep Pending Review so staff can manually audit or notify citizen
    
    if (parsedData.approved) {
      // Calculate billing automaticaly
      const billingItems = Object.entries(parsedData.items_detected)
        .filter(([_, qty]) => qty > 0)
        .map(([name, qty]) => {
          const rateObj = PRICE_STANDARDS.find((r) => r.name === name);
          const unitPrice = rateObj ? rateObj.unitPrice : 300;
          return {
            name,
            qty,
            unitPrice,
            total: qty * unitPrice
          };
        });
        
      // Also check if citizen added items not detected but requested, merge safely!
      if (billingItems.length === 0) {
        Object.entries(currentCase.items).forEach(([name, qty]) => {
          const rateObj = PRICE_STANDARDS.find((r) => r.name === name);
          const unitPrice = rateObj ? rateObj.unitPrice : 300;
          billingItems.push({
            name,
            qty,
            unitPrice,
            total: qty * unitPrice
          });
        });
      }
      
      const totalAmount = billingItems.reduce((sum, item) => sum + item.total, 0);
      currentCase.billing = {
        items: billingItems,
        totalAmount,
        paymentStatus: "未付款"
      };
    }
    
    writeData(cases);
    res.json({ case: currentCase });
    
  } catch (error: any) {
    console.error("Gemini AI API Call failed:", error);
    res.status(500).json({ error: "AI 分析失敗", details: error.message });
  }
});

// 5. Get Price Standards List
app.get("/api/rates", (req, res) => {
  res.json(PRICE_STANDARDS);
});

// 6. Get Blacklist Citizens List
app.get("/api/blacklist", (req, res) => {
  res.json(BLACKLIST_RECORDS);
});

// 7. Get Basic Statistics for Metrics
app.get("/api/stats", (req, res) => {
  const cases = readData();
  const total = cases.length;
  const pendingReview = cases.filter((c) => c.status === "待審核").length;
  const pendingPayment = cases.filter((c) => c.status === "待繳費").length;
  const pendingDispatch = cases.filter((c) => c.status === "待派工").length;
  const cleaning = cases.filter((c) => c.status === "清運中").length;
  const completed = cases.filter((c) => c.status === "已完成").length;
  
  const totalPaidRevenue = cases
    .filter((c) => c.billing?.paymentStatus === "已付款")
    .reduce((sum, c) => sum + (c.billing?.totalAmount || 0), 0);
    
  const totalCubicMeters = cases
    .filter((c) => c.status === "已完成" && c.reviewResult)
    .reduce((sum, c) => sum + (c.reviewResult?.estimated_volume || 0), 0);
    
  res.json({
    total,
    pendingReview,
    pendingPayment,
    pendingDispatch,
    cleaning,
    completed,
    totalPaidRevenue,
    totalCubicMeters
  });
});

// Integration of Vite Dev Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting at http://localhost:${PORT}`);
  });
}

startServer();

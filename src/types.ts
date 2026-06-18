/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Core Waste Case Data Definitions
export type CaseStatus = "待審核" | "待繳費" | "待派工" | "清運中" | "已完成";

export interface AIReviewResult {
  approved: boolean;
  reason: string;
  items_detected: Record<string, number>;
  estimated_volume: number; // In cubic meters
  estimated_weight: number; // In kilograms
  is_construction_waste: boolean;
}

export interface BillingDetails {
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  paymentStatus: "未付款" | "已付款";
  paymentDate?: string;
  paymentLast5Digits?: string;
}

export interface DispatchDetails {
  date?: string;
  vehicle?: string; // e.g. A車, B車, C車
  worker?: string; // Assigned execution staff
}

export interface SafetyChecklist {
  helmet: boolean;
  gloves: boolean;
  vest: boolean;
  twoWorkers: boolean;
  harnessConfirmed: boolean;
}

export interface CompletionDetails {
  finishDate?: string;
  finishPhoto?: string; // base64 image
  finishGps?: {
    lat: number;
    lng: number;
  };
  worker?: string;
}

export interface WasteCase {
  id: string; // e.g. 11506180001
  date: string; // YYYY-MM-DD
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
  photoUrl: string; // Base64 or preset placeholder image
  items: Record<string, number>; // User self-declared items
  notes: string;
  status: CaseStatus;
  
  // AI audit details
  reviewResult?: AIReviewResult | null;
  
  // Billing details
  billing?: BillingDetails | null;
  
  // Dispatch details
  dispatch?: DispatchDetails | null;
  
  // Checklist verification (on-site)
  safetyChecklist?: SafetyChecklist | null;
  
  // Completion details (on-site GPS + Photo)
  completion?: CompletionDetails | null;
}

// Pricing Standards Table
export interface WastePriceItem {
  name: string;
  unitPrice: number;
  description: string;
}

// Violator/Blacklist Standard Data
export interface ViolatorRecord {
  name: string;
  phone: string;
  address: string;
  violationCount: number;
  notes: string;
}

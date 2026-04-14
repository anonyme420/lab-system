// ============================================================
// Core TypeScript interfaces for the Lab Sample System
// ============================================================

export type SampleStatus = 'pending' | 'approved' | 'rejected';
export type ImportSource = 'csv' | 'excel' | 'docx' | 'ocr' | 'manual';

export interface Sample {
  id: string;
  sampleId: string;        // Lab sample identifier (e.g., "BIO-2025-0042")
  patientName: string;
  sampleType: string;       // e.g., "Blood", "Urine", "Tissue"
  collectionDate: string;   // ISO date string
  receivedDate: string;     // ISO date string
  testRequested: string;
  status: SampleStatus;
  importSource: ImportSource;
  importedAt: string;       // ISO datetime
  validatedAt?: string;     // ISO datetime
  validatedBy?: string;
  rejectionComment?: string;
  rawData?: Record<string, string>; // Original parsed fields
  standardized: boolean;
}

export interface UploadResult {
  success: boolean;
  fileName: string;
  fileType: string;
  totalRecords: number;
  validRecords: number;
  errors: ValidationError[];
  samples: Sample[];
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface Notification {
  id: string;
  type: 'submission' | 'validation' | 'error' | 'info';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sampleId?: string;
}

export interface OCRResult {
  text: string;
  confidence: number;
  fields: Record<string, string>;
  imagePreview?: string;
}

export interface DashboardStats {
  totalSamples: number;
  pendingSamples: number;
  approvedSamples: number;
  rejectedSamples: number;
  todayImports: number;
  unreadNotifications: number;
}

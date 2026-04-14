// ============================================================
// Upload validation rules — US-06
// ============================================================
import { Sample, ValidationError } from './types';

const VALID_SAMPLE_TYPES = [
  'Blood', 'Urine', 'Tissue', 'Serum', 'Plasma',
  'Saliva', 'Cerebrospinal Fluid', 'Stool', 'Swab', 'Unspecified',
];

const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Validate file before parsing
export function validateFile(file: { name: string; size: number }): ValidationError[] {
  const errors: ValidationError[] = [];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push({
      row: 0,
      field: 'file',
      message: `Unsupported file format ".${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      severity: 'error',
    });
  }

  if (file.size === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'File is empty. Please upload a file with data.',
      severity: 'error',
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push({
      row: 0,
      field: 'file',
      message: `File size exceeds 10 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      severity: 'error',
    });
  }

  return errors;
}

// Validate parsed samples
export function validateSamples(samples: Sample[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (samples.length === 0) {
    errors.push({
      row: 0,
      field: 'data',
      message: 'No records found in the file. Ensure the file contains data rows.',
      severity: 'error',
    });
    return errors;
  }

  samples.forEach((sample, idx) => {
    const row = idx + 1;

    // Required field: patient name
    if (!sample.patientName || sample.patientName === 'Unknown') {
      errors.push({
        row,
        field: 'patientName',
        message: 'Patient name is missing or empty.',
        severity: 'error',
      });
    }

    // Required field: sample type
    if (!sample.sampleType || sample.sampleType === 'Unspecified') {
      errors.push({
        row,
        field: 'sampleType',
        message: 'Sample type is missing.',
        severity: 'warning',
      });
    } else if (!VALID_SAMPLE_TYPES.includes(sample.sampleType)) {
      errors.push({
        row,
        field: 'sampleType',
        message: `Unknown sample type "${sample.sampleType}". Expected: ${VALID_SAMPLE_TYPES.join(', ')}`,
        severity: 'warning',
      });
    }

    // Date validation for collection date
    if (sample.collectionDate) {
      const d = new Date(sample.collectionDate);
      if (isNaN(d.getTime())) {
        errors.push({
          row,
          field: 'collectionDate',
          message: `Invalid collection date: "${sample.collectionDate}"`,
          severity: 'error',
        });
      } else if (d > new Date()) {
        errors.push({
          row,
          field: 'collectionDate',
          message: 'Collection date is in the future.',
          severity: 'warning',
        });
      }
    }

    // Date validation for received date
    if (sample.receivedDate) {
      const d = new Date(sample.receivedDate);
      if (isNaN(d.getTime())) {
        errors.push({
          row,
          field: 'receivedDate',
          message: `Invalid received date: "${sample.receivedDate}"`,
          severity: 'error',
        });
      }
    }

    // Check received >= collected
    if (sample.collectionDate && sample.receivedDate) {
      const collected = new Date(sample.collectionDate);
      const received = new Date(sample.receivedDate);
      if (!isNaN(collected.getTime()) && !isNaN(received.getTime()) && received < collected) {
        errors.push({
          row,
          field: 'receivedDate',
          message: 'Received date is before collection date.',
          severity: 'warning',
        });
      }
    }

    // Required field: test requested
    if (!sample.testRequested || sample.testRequested === 'General') {
      errors.push({
        row,
        field: 'testRequested',
        message: 'Test requested is missing or generic.',
        severity: 'warning',
      });
    }
  });

  return errors;
}

// Check for duplicate samples
export function detectDuplicates(
  newSamples: Sample[],
  existingSamples: Sample[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const existingIds = new Set(existingSamples.map((s) => s.sampleId));

  newSamples.forEach((sample, idx) => {
    if (existingIds.has(sample.sampleId)) {
      errors.push({
        row: idx + 1,
        field: 'sampleId',
        message: `Duplicate sample ID "${sample.sampleId}" already exists in the system.`,
        severity: 'error',
      });
    }
  });

  // Check within the batch itself
  const seen = new Set<string>();
  newSamples.forEach((sample, idx) => {
    const key = `${sample.patientName}|${sample.collectionDate}|${sample.testRequested}`;
    if (seen.has(key)) {
      errors.push({
        row: idx + 1,
        field: 'duplicate',
        message: `Possible duplicate: same patient, date, and test as another row in this batch.`,
        severity: 'warning',
      });
    }
    seen.add(key);
  });

  return errors;
}

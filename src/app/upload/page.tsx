'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { parseCSV, parseExcel, rowsToSamples, detectFileType } from '@/lib/parser';
import { standardizeSamples } from '@/lib/standardizer';
import { validateFile, validateSamples, detectDuplicates } from '@/lib/validator';
import { ValidationError, Sample } from '@/lib/types';

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);
  const [parsedSamples, setParsedSamples] = useState<Sample[]>([]);
  const [existingSamples, setExistingSamples] = useState<Sample[]>([]);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then(data => setExistingSamples(data))
      .catch(console.error);
  }, []);

  const processFile = useCallback(async (file: File) => {
    setUploading(true);
    setErrors([]);
    setWarnings([]);
    setParsedSamples([]);
    setImported(false);
    setFileName(file.name);

    // Step 1: Validate file (US-06)
    const fileErrors = validateFile({ name: file.name, size: file.size });
    if (fileErrors.some((e) => e.severity === 'error')) {
      setErrors(fileErrors.filter((e) => e.severity === 'error'));
      setWarnings(fileErrors.filter((e) => e.severity === 'warning'));
      setUploading(false);
      return;
    }

    try {
      const fileType = detectFileType(file.name);
      let rows: Record<string, string>[] = [];

      // Step 2: Parse file (US-01)
      if (fileType === 'csv') {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (fileType === 'excel') {
        const buffer = await file.arrayBuffer();
        rows = parseExcel(buffer);
      } else if (fileType === 'docx') {
        // For DOCX, try to extract as text tables
        const text = await file.text();
        rows = parseCSV(text); // Fallback to CSV-like parsing
      }

      if (rows.length === 0) {
        setErrors([{
          row: 0,
          field: 'data',
          message: 'No data rows found in the file. Ensure the file has headers and data.',
          severity: 'error',
        }]);
        setUploading(false);
        return;
      }

      // Step 3: Convert to samples
      let samples = rowsToSamples(rows, fileType);

      // Step 4: Standardize (US-04)
      samples = standardizeSamples(samples);

      // Step 5: Validate samples (US-06)
      const sampleErrors = validateSamples(samples);
      const dupErrors = detectDuplicates(samples, existingSamples);
      const allIssues = [...sampleErrors, ...dupErrors];

      setErrors(allIssues.filter((e) => e.severity === 'error'));
      setWarnings(allIssues.filter((e) => e.severity === 'warning'));
      setParsedSamples(samples);
    } catch (err) {
      setErrors([{
        row: 0,
        field: 'parse',
        message: `Failed to parse file: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error',
      }]);
    }

    setUploading(false);
  }, [existingSamples]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleImport = async () => {
    if (parsedSamples.length === 0) return;

    const validSamples = parsedSamples.filter((_, idx) =>
      !errors.some((e) => e.row === idx + 1)
    );

    try {
      // 1. Add Samples
      const resSamples = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSamples),
      });

      if (!resSamples.ok) throw new Error('Failed to import samples');

      // 2. Add Notification
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `n-${Date.now()}`,
          type: 'submission',
          title: 'New Samples Imported',
          message: `${validSamples.length} sample(s) imported from "${fileName}" and awaiting validation.`,
          read: false,
          createdAt: new Date().toISOString(),
        }),
      });

      setImported(true);
      // Refresh local cache for next upload
      setExistingSamples((prev) => [...prev, ...validSamples]);
    } catch (error) {
      console.error('Import process failed:', error);
      alert('Failed to save the import. Check console for details.');
    }
  };

  const resetUpload = () => {
    setFileName('');
    setErrors([]);
    setWarnings([]);
    setParsedSamples([]);
    setImported(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Upload Files</h1>
        <p>Import lab sample data from CSV, Excel, or DOCX files</p>
      </div>

      {/* Upload Zone */}
      {!fileName && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="upload-icon">
            <Upload size={28} />
          </div>
          <h3>Drop your file here or click to browse</h3>
          <p>Upload lab sample data files for automatic parsing and validation</p>
          <div className="formats">
            <span className="format-tag">CSV</span>
            <span className="format-tag">XLSX</span>
            <span className="format-tag">XLS</span>
            <span className="format-tag">DOCX</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.docx,.doc"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Processing State */}
      {uploading && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Processing {fileName}...</p>
        </div>
      )}

      {/* Results */}
      {fileName && !uploading && (
        <div className="animate-slide-up">
          {/* File Info Bar */}
          <div className="glass-card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FileText size={20} style={{ color: 'var(--accent-indigo)' }} />
                <div>
                  <strong>{fileName}</strong>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {parsedSamples.length} record(s) parsed
                    {errors.length > 0 && ` • ${errors.length} error(s)`}
                    {warnings.length > 0 && ` • ${warnings.length} warning(s)`}
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={resetUpload}>
                <X size={14} /> New Upload
              </button>
            </div>
          </div>

          {/* Validation Errors (US-06) */}
          {errors.length > 0 && (
            <div className="validation-list" style={{ marginBottom: '16px' }}>
              {errors.map((err, i) => (
                <div key={i} className="validation-item error">
                  <span className="validation-icon"><AlertCircle size={16} /></span>
                  <span>
                    {err.row > 0 && <strong>Row {err.row}</strong>}
                    {err.row > 0 && ' — '}
                    {err.field !== 'file' && err.field !== 'data' && err.field !== 'parse' && (
                      <strong>[{err.field}]</strong>
                    )}{' '}
                    {err.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="validation-list" style={{ marginBottom: '16px' }}>
              {warnings.map((w, i) => (
                <div key={i} className="validation-item warning">
                  <span className="validation-icon"><AlertTriangle size={16} /></span>
                  <span>
                    {w.row > 0 && <strong>Row {w.row}</strong>}
                    {w.row > 0 && ' — '}
                    {w.field !== 'file' && <strong>[{w.field}]</strong>}{' '}
                    {w.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Success message */}
          {imported && (
            <div className="validation-item success" style={{ marginBottom: '16px' }}>
              <span className="validation-icon"><CheckCircle2 size={16} /></span>
              <span>
                <strong>Import successful!</strong> Samples have been added to the system and are awaiting validation.
              </span>
            </div>
          )}

          {/* Preview Table */}
          {parsedSamples.length > 0 && !imported && (
            <>
              <div className="data-table-container" style={{ marginBottom: '16px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Sample ID</th>
                      <th>Patient Name</th>
                      <th>Type</th>
                      <th>Collection Date</th>
                      <th>Test Requested</th>
                      <th>Standardized</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedSamples.map((sample, i) => {
                      const hasError = errors.some((e) => e.row === i + 1);
                      return (
                        <tr key={i} style={hasError ? { background: 'rgba(239, 68, 68, 0.05)' } : {}}>
                          <td><strong>{sample.sampleId}</strong></td>
                          <td>{sample.patientName}</td>
                          <td>{sample.sampleType}</td>
                          <td>{sample.collectionDate}</td>
                          <td>{sample.testRequested}</td>
                          <td>
                            {sample.standardized ? (
                              <CheckCircle2 size={16} style={{ color: 'var(--status-approved)' }} />
                            ) : (
                              <AlertCircle size={16} style={{ color: 'var(--status-pending)' }} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={resetUpload}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={errors.filter(e => e.row > 0).length === parsedSamples.length}
                >
                  <CheckCircle2 size={16} />
                  Import {parsedSamples.length - errors.filter(e => e.row > 0).length} Sample(s)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download, RefreshCw, X } from 'lucide-react';

interface CsvUploadResult {
  imported: number;
  rejected: number;
  duplicates: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  errors: string[];
}

interface CsvUploaderProps {
  onUploadSuccess: () => void;
}

export function CsvUploader({ onUploadSuccess }: CsvUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<CsvUploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setErrorMsg('Please upload a valid .csv file.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/transactions/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setResult(data.summary);
      onUploadSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload and parse CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadSampleCsv = () => {
    const today = new Date();
    const rows = [
      'date,description,amount,type,category,balance',
      `${new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0]},Morning Cab Trips,1150,INCOME,Ride Earnings,2450`,
      `${new Date(today.getTime() - 4 * 86400000).toISOString().split('T')[0]},Petrol Refill,250,EXPENSE,Fuel,2200`,
      `${new Date(today.getTime() - 3 * 86400000).toISOString().split('T')[0]},Evening Surge Rides,1400,INCOME,Ride Earnings,3600`,
      `${new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0]},Full Day Trips,1200,INCOME,Ride Earnings,4800`,
      `${new Date(today.getTime() - 2 * 86400000).toISOString().split('T')[0]},Lunch & Snacks,180,EXPENSE,Food,4620`,
      `${new Date(today.getTime() - 1 * 86400000).toISOString().split('T')[0]},Airport Pickup,950,INCOME,Ride Earnings,5570`,
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bahi_sample_transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 600, color: 'var(--navy)' }}>
            Transaction Ingestion & Cash-Flow Ingest
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Upload raw bank statements or UPI ledger CSV to automatically calculate your cash-flow Bahi Score.
          </p>
        </div>
        <button
          onClick={downloadSampleCsv}
          className="btn btn-outline"
          style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={14} /> Download Sample CSV
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--gold)' : 'var(--border)'}`,
          backgroundColor: dragActive ? 'rgba(217, 119, 6, 0.05)' : 'var(--cream)',
          borderRadius: '8px',
          padding: '28px 16px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          disabled={isUploading}
        />
        {isUploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={28} className="spin" style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              Parsing transactions, detecting anomalies & recalculating Bahi Score...
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <Upload size={30} style={{ color: 'var(--navy)', opacity: 0.7 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--navy)' }}>
              Drag & Drop your statement CSV here, or <span style={{ color: 'var(--gold)', textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Supports Date, Description, Amount, Type (Income/Expense), Category, Balance
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '6px',
            color: '#B91C1C',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 600 }}>
              <CheckCircle2 size={18} /> Ingestion & Verification Summary
            </div>
            <button
              onClick={() => setResult(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534' }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: '10px',
              fontSize: '0.82rem',
            }}
          >
            <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Imported</div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '1rem' }}>{result.imported}</div>
            </div>
            <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Duplicates</div>
              <div style={{ fontWeight: 700, color: '#D97706', fontSize: '1rem' }}>{result.duplicates}</div>
            </div>
            <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Verified Income</div>
              <div style={{ fontWeight: 700, color: '#166534', fontSize: '1rem' }}>
                ₹{result.totalIncome.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Expenses</div>
              <div style={{ fontWeight: 700, color: '#DC2626', fontSize: '1rem' }}>
                ₹{result.totalExpenses.toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '4px', border: '1px solid #DCFCE7' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>Net Cash Flow</div>
              <div
                style={{
                  fontWeight: 700,
                  color: result.netCashFlow >= 0 ? '#166534' : '#DC2626',
                  fontSize: '1rem',
                }}
              >
                ₹{result.netCashFlow.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

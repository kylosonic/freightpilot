import { useEffect, useState, useRef } from 'react';
import { StatusBadge } from './ui/StatusBadge';
import type { FreightInvoice } from '../services/logisticsApi';
import { getInvoices, uploadInvoices } from '../services/logisticsApi';

export function FreightReconciliationPanel() {
  const [invoices, setInvoices] = useState<FreightInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      await uploadInvoices(file);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to upload invoices', err);
      setUploadError('Upload failed. Please check the CSV format and try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const mismatches = invoices.filter((inv) => inv.status === 'mismatch_flagged');
  const totalVariance = mismatches.reduce((acc, curr) => acc + curr.variance, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#252522]">Carrier invoices</h3>
        <div>
          <input
            type="file"
            accept=".csv"
            aria-label="Upload carrier invoices CSV"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            className="fp-action-secondary !min-h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload invoices'}
          </button>
        </div>
      </div>

      {uploadError ? (
        <p role="alert" className="mb-3 rounded-md border border-[#e7c2be] bg-[#fff8f7] px-3 py-2 text-xs text-[#8f302a]">
          {uploadError}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="flex-1 rounded-md border border-[#e5e4e0] bg-[#f7f7f5] p-3">
          <div className="text-xs text-[#73736e]">Charges that differ</div>
          <div className="font-mono text-xl tabular-nums text-[#885100]">{mismatches.length}</div>
        </div>
        <div className="flex-1 rounded-md border border-[#e5e4e0] bg-[#f7f7f5] p-3">
          <div className="text-xs text-[#73736e]">Difference</div>
          <div className="font-mono text-xl tabular-nums text-[#a3342f]">{totalVariance.toFixed(2)} ETB</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-[#e5e4e0]">
        {loading ? (
          <div className="flex h-full items-center justify-center p-4 text-sm text-[#73736e]">Loading invoices...</div>
        ) : (
          <table className="w-full text-left text-xs text-[#5f5f59]">
            <thead className="sticky top-0 bg-[#f7f7f5] text-[10px] font-semibold uppercase tracking-[0.06em] text-[#73736e]">
              <tr>
                <th scope="col" className="px-4 py-3">Carrier</th>
                <th scope="col" className="px-4 py-3">Order ID</th>
                <th scope="col" className="px-4 py-3">Quoted (ETB)</th>
                <th scope="col" className="px-4 py-3">Actual (ETB)</th>
                <th scope="col" className="px-4 py-3">Variance (ETB)</th>
                <th scope="col" className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeeea] bg-white">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-[#73736e]">No invoices yet.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-[#f7f7f5]">
                    <td className="px-4 py-2.5 font-medium text-[#252522]">{inv.carrier_id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.order_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{inv.quoted_rate.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{inv.actual_rate.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-medium tabular-nums ${inv.variance > 0 ? 'text-[#a3342f]' : 'text-[#14745f]'}`}>
                        {inv.variance > 0 ? '+' : ''}{inv.variance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={inv.status === 'mismatch_flagged' ? 'Check this' : 'Matches'}
                        tone={inv.status === 'mismatch_flagged' ? 'warning' : 'success'}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

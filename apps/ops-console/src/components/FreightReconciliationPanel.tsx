import { useEffect, useState, useRef } from 'react';
import type { FreightInvoice } from '../services/logisticsApi';
import { getInvoices, uploadInvoices } from '../services/logisticsApi';

export function FreightReconciliationPanel() {
  const [invoices, setInvoices] = useState<FreightInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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
    try {
      await uploadInvoices(file);
      await fetchInvoices();
    } catch (err) {
      console.error('Failed to upload invoices', err);
      alert('Upload failed. Please check the CSV format.');
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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#20372f]">Freight invoice reconciliation</h3>
        <div>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            className="bg-[#087f72] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#06675d] disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Invoices'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 border border-[#d7dfdc] bg-[#f8faf9] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#63766f]">Flagged mismatches</div>
          <div className="font-mono text-xl tabular-nums text-[#885100]">{mismatches.length}</div>
        </div>
        <div className="flex-1 border border-[#d7dfdc] bg-[#f8faf9] p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#63766f]">Total variance</div>
          <div className="font-mono text-xl tabular-nums text-[#a3342f]">${totalVariance.toFixed(2)}</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-[#d7dfdc]">
        {loading ? (
          <div className="flex h-full items-center justify-center p-4">Loading...</div>
        ) : (
          <table className="w-full text-left text-xs text-[#52665e]">
            <thead className="sticky top-0 bg-[#f5f8f6] text-[10px] font-semibold uppercase tracking-[0.06em] text-[#63766f]">
              <tr>
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Quoted ($)</th>
                <th className="px-4 py-3">Actual ($)</th>
                <th className="px-4 py-3">Variance ($)</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6ebe8]">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center">No invoices uploaded</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#f8faf9]">
                    <td className="px-4 py-2.5 font-medium text-[#20372f]">{inv.carrier_id}</td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.order_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{inv.quoted_rate.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{inv.actual_rate.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono tabular-nums ${inv.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {inv.variance > 0 ? '+' : ''}{inv.variance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          inv.status === 'mismatch_flagged'
                            ? 'bg-[#fffaf0] text-[#885100]'
                            : 'bg-[#f3faf7] text-[#14745f]'
                        }`}
                      >
                        {inv.status === 'mismatch_flagged' ? 'Mismatch' : 'Matched'}
                      </span>
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

import React, { useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { apiRequest, formatINR, formatStatus, getAuthToken } from '../../lib/api';
import { AMCRecord, CompanyConfig, Customer, Employee, ServiceRequest } from '../../lib/types';

export function AdminServiceAndAmcTab({
  serviceRequests,
  amcRecords,
  customers,
  employees,
  onRefresh,
  notify,
}: {
  serviceRequests: ServiceRequest[];
  amcRecords: AMCRecord[];
  customers: Customer[];
  employees: Employee[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showAmcForm, setShowAmcForm] = useState(false);
  const [amcForm, setAmcForm] = useState({
    customerId: customers[0]?.id || '',
    equipmentName: '',
    frequency: 'Quarterly (4 Visits / Year)',
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    nextServiceDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    contractValue: 25000,
    notes: '',
  });

  const updateTicket = async (id: string, patch: any) => {
    try {
      await apiRequest(`/service-requests/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      notify('success', 'Service ticket updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleCreateAmc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/amc', {
        method: 'POST',
        body: JSON.stringify({
          ...amcForm,
          customerId: amcForm.customerId || customers[0]?.id,
          contractValue: Number(amcForm.contractValue),
        }),
      });
      notify('success', 'AMC contract created.');
      setShowAmcForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const updateAmcStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/amc/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      notify('success', 'AMC status updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Customer Service Requests */}
      <div className="space-y-3">
        <h3 className="font-display text-base font-bold text-slate-900">Service Requests &amp; Technician Assignment</h3>
        {serviceRequests.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono-tabular text-xs font-bold text-teal-700">
                {s.ticketNumber} · {s.equipmentCategory} · {s.priority} Priority
              </p>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{s.subject}</h4>
              <p className="text-xs text-slate-600">{s.customerName} ({s.customerPhone})</p>
              <p className="text-xs text-slate-700 mt-1">{s.description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={s.assignedTechnicianId || ''}
                onChange={(e) => updateTicket(s.id, { assignedTechnicianId: e.target.value || null })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
              >
                <option value="">Assign Technician</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
              <select
                value={s.status}
                onChange={(e) => updateTicket(s.id, { status: e.target.value })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
              >
                {['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                  <option key={st} value={st}>
                    {formatStatus(st)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {/* AMC Contracts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-base font-bold text-slate-900">AMC Contracts &amp; Maintenance Schedules</h3>
          <button
            type="button"
            onClick={() => setShowAmcForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add AMC Contract
          </button>
        </div>

        {showAmcForm && (
          <form onSubmit={handleCreateAmc} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={amcForm.customerId || customers[0]?.id || ''}
              onChange={(e) => setAmcForm({ ...amcForm, customerId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Equipment / Plant Name *"
              value={amcForm.equipmentName}
              onChange={(e) => setAmcForm({ ...amcForm, equipmentName: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              required
              placeholder="Frequency (e.g. Quarterly)"
              value={amcForm.frequency}
              onChange={(e) => setAmcForm({ ...amcForm, frequency: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={amcForm.startDate}
                onChange={(e) => setAmcForm({ ...amcForm, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Next Service Date</label>
              <input
                type="date"
                value={amcForm.nextServiceDate}
                onChange={(e) => setAmcForm({ ...amcForm, nextServiceDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Expiry Date</label>
              <input
                type="date"
                value={amcForm.expiryDate}
                onChange={(e) => setAmcForm({ ...amcForm, expiryDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <input
              type="number"
              placeholder="Contract Value (INR)"
              value={amcForm.contractValue}
              onChange={(e) => setAmcForm({ ...amcForm, contractValue: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              placeholder="Notes"
              value={amcForm.notes}
              onChange={(e) => setAmcForm({ ...amcForm, notes: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              Save AMC
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4">Contract No.</th>
                  <th className="py-3 px-4">Customer &amp; Equipment</th>
                  <th className="py-3 px-4">Next Service</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {amcRecords.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-700">{a.contractNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{a.equipmentName}</p>
                      <p className="text-slate-500">{a.customerName} · {a.frequency}</p>
                    </td>
                    <td className="py-3 px-4 tabular-nums">{a.nextServiceDate}</td>
                    <td className="py-3 px-4 tabular-nums">{a.expiryDate}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-medium">{formatINR(a.contractValue)}</td>
                    <td className="py-3 px-4">
                      <select
                        value={a.status}
                        onChange={(e) => updateAmcStatus(a.id, e.target.value)}
                        className="px-2 py-1 rounded border border-slate-300 text-xs"
                      >
                        {['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED'].map((st) => (
                          <option key={st} value={st}>
                            {formatStatus(st)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminReportsTab({ notify }: { notify: (type: 'success' | 'error', text: string) => void }) {
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [reportType, setReportType] = useState<
    'customers' | 'sales' | 'projects' | 'revenue' | 'pending-payments' | 'employees'
  >('customers');

  useEffect(() => {
    apiRequest<any>('/reports/analytics')
      .then(setAnalytics)
      .catch((err) => notify('error', err.message));
  }, [notify]);

  const exportCsv = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/reports/export/${reportType}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('CSV export failed.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newedge-${reportType}-report.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('success', `Downloaded newedge-${reportType}-report.csv`);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  if (!analytics) {
    return <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />;
  }

  const rows: any[] =
    reportType === 'customers'
      ? analytics.customerReports
      : reportType === 'sales'
      ? analytics.salesReports
      : reportType === 'projects'
      ? analytics.projectReports
      : reportType === 'revenue'
      ? analytics.revenueReports
      : reportType === 'pending-payments'
      ? analytics.pendingPaymentsReport
      : analytics.employeeReports;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          {[
            ['customers', 'Customers'],
            ['sales', 'Sales / Quotes'],
            ['projects', 'Projects'],
            ['revenue', 'Revenue'],
            ['pending-payments', 'Pending Payments'],
            ['employees', 'Employee Performance'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setReportType(id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                reportType === id ? 'bg-[#0A1628] text-white' : 'text-slate-700 hover:bg-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No records in this report.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key} className="py-3 px-4 font-semibold capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([k, val]) => (
                      <td key={k} className="py-3 px-4 tabular-nums text-slate-800">
                        {typeof val === 'boolean'
                          ? val
                            ? 'Sample'
                            : 'Live'
                          : k.toLowerCase().includes('amount') || k.toLowerCase().includes('billed') || k.toLowerCase().includes('paid') || k.toLowerCase().includes('cost')
                          ? formatINR(Number(val))
                          : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminSettingsTab({
  companyConfig,
  onSaved,
  notify,
}: {
  companyConfig: CompanyConfig | null;
  onSaved: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [form, setForm] = useState<CompanyConfig | null>(companyConfig);

  useEffect(() => {
    if (companyConfig) setForm(companyConfig);
  }, [companyConfig]);

  if (!form) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      await onSaved();
      notify('success', 'NewEdgeEngineeringAndWorks configuration & verified certifications updated.');
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-slate-900">
          Configurable Contact &amp; Company Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number (digits)</label>
            <input
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
            <input
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Office Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-slate-900">
          Verified Company Credentials (Public Display Control)
        </h3>
        <p className="text-xs text-slate-500">
          Only certifications marked as verified are shown on the NewEdgeEngineeringAndWorks public website.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {form.certifications.map((cert, idx) => (
            <div key={cert.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">{cert.name}</span>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cert.verified}
                    onChange={(e) => {
                      const next = [...form.certifications];
                      next[idx] = { ...cert, verified: e.target.checked };
                      setForm({ ...form, certifications: next });
                    }}
                    className="accent-teal-600"
                  />
                  Verified
                </label>
              </div>
              <input
                value={cert.code}
                onChange={(e) => {
                  const next = [...form.certifications];
                  next[idx] = { ...cert, code: e.target.value };
                  setForm({ ...form, certifications: next });
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-slate-900">Configurable Homepage Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {form.heroStats.map((st, idx) => (
            <div key={st.id} className="p-4 rounded-xl border border-slate-200 space-y-2">
              <input
                value={st.label}
                onChange={(e) => {
                  const next = [...form.heroStats];
                  next[idx] = { ...st, label: e.target.value };
                  setForm({ ...form, heroStats: next });
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs font-semibold"
              />
              <input
                value={st.value}
                onChange={(e) => {
                  const next = [...form.heroStats];
                  next[idx] = { ...st, value: e.target.value };
                  setForm({ ...form, heroStats: next });
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-sm font-bold"
              />
              <input
                value={st.sublabel}
                onChange={(e) => {
                  const next = [...form.heroStats];
                  next[idx] = { ...st, sublabel: e.target.value };
                  setForm({ ...form, heroStats: next });
                }}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="px-6 py-2.5 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-sm font-semibold">
        Save All Settings
      </button>
    </form>
  );
}

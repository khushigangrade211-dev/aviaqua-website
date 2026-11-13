import React, { useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { apiRequest, formatINR, formatStatus } from '../../lib/api';
import { downloadInvoicePdf, downloadQuotationPdf, downloadReceiptPdf } from '../../lib/pdf';
import { CompanyConfig, Customer, Employee, Invoice, Payment, Product, Project, Quotation } from '../../lib/types';

const PROJECT_STATUSES = [
  'PLANNING',
  'SITE_INSPECTION',
  'QUOTATION_APPROVED',
  'MATERIAL_PROCUREMENT',
  'INSTALLATION',
  'TESTING',
  'COMPLETED',
  'ON_HOLD',
];

export function AdminQuotationsTab({
  quotations,
  customers,
  products,
  companyConfig,
  onRefresh,
  notify,
}: {
  quotations: Quotation[];
  customers: Customer[];
  products: Product[];
  companyConfig: CompanyConfig | null;
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    customerId: customers[0]?.id || '',
    title: '',
    discountAmount: 0,
    gstPercent: 18,
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    termsConditions: '50% advance with PO, 40% prior to dispatch, 10% after commissioning.',
    status: 'SENT' as 'DRAFT' | 'SENT',
    items: [{ productId: '', description: '', quantity: 1, unitPrice: 0 }],
  });

  const handleProductPick = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setForm((prev) => {
      const next = [...prev.items];
      next[idx] = {
        productId,
        description: prod ? `${prod.name} (${prod.capacity})` : next[idx].description,
        quantity: next[idx].quantity,
        unitPrice: prod ? prod.unitPrice : next[idx].unitPrice,
      };
      return { ...prev, items: next };
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          customerId: form.customerId || customers[0]?.id,
          discountAmount: Number(form.discountAmount),
          gstPercent: Number(form.gstPercent),
          items: form.items.map((i) => ({
            productId: i.productId || null,
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
          })),
        }),
      });
      notify('success', 'Quotation created.');
      setShowForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiRequest(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      notify('success', 'Quotation status updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">Create GST quotations, manage statuses, and generate NewEdgeEngineeringAndWorks PDF quotes.</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900">Create Quotation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              required
              value={form.customerId || customers[0]?.id || ''}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} {c.companyName ? `(${c.companyName})` : ''}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Quotation Title / Subject *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Line Items</p>
            {form.items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <select
                  value={item.productId}
                  onChange={(e) => handleProductPick(idx, e.target.value)}
                  className="sm:col-span-3 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="">Custom Item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const next = [...form.items];
                    next[idx].description = e.target.value;
                    setForm({ ...form, items: next });
                  }}
                  className="sm:col-span-5 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
                <input
                  required
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...form.items];
                    next[idx].quantity = Number(e.target.value);
                    setForm({ ...form, items: next });
                  }}
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
                <input
                  required
                  type="number"
                  min={0}
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => {
                    const next = [...form.items];
                    next[idx].unitPrice = Number(e.target.value);
                    setForm({ ...form, items: next });
                  }}
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  items: [...p.items, { productId: '', description: '', quantity: 1, unitPrice: 0 }],
                }))
              }
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              + Add Line Item
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Discount (INR)</label>
              <input
                type="number"
                min={0}
                value={form.discountAmount}
                onChange={(e) => setForm({ ...form, discountAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">GST (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Valid Until</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Send to Customer</option>
              </select>
            </div>
          </div>

          <textarea
            rows={2}
            value={form.termsConditions}
            onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
          />

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              Save Quotation
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">Quote No.</th>
                <th className="py-3 px-4 font-semibold">Customer &amp; Subject</th>
                <th className="py-3 px-4 font-semibold text-right">Total (incl. GST)</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-700">{q.quotationNumber}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{q.title}</p>
                    <p className="text-xs text-slate-500">{q.customerName} · Valid {q.validUntil}</p>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold">{formatINR(q.totalAmount)}</td>
                  <td className="py-3 px-4">
                    <select
                      value={q.status}
                      onChange={(e) => updateStatus(q.id, e.target.value)}
                      className="px-2 py-1 rounded border border-slate-300 text-xs"
                    >
                      {['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map((s) => (
                        <option key={s} value={s}>
                          {formatStatus(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => downloadQuotationPdf(q, companyConfig)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0A1628] text-white text-xs font-medium"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminProjectsTab({
  projects,
  customers,
  employees,
  onRefresh,
  notify,
}: {
  projects: Project[];
  customers: Customer[];
  employees: Employee[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [taskTitles, setTaskTitles] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerId: customers[0]?.id || '',
    name: '',
    serviceCategory: 'Solar Installation',
    location: 'Indore, Madhya Pradesh',
    startDate: new Date().toISOString().slice(0, 10),
    expectedCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    projectCost: 0,
    description: '',
    assignedEmployeeIds: [] as string[],
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/projects', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          customerId: form.customerId || customers[0]?.id,
          projectCost: Number(form.projectCost),
        }),
      });
      notify('success', 'Project created.');
      setShowForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const updateProject = async (id: string, patch: any) => {
    try {
      await apiRequest(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      notify('success', 'Project updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const addTask = async (projectId: string) => {
    const title = (taskTitles[projectId] || '').trim();
    if (!title) return;
    try {
      await apiRequest(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ title, status: 'PENDING' }),
      });
      setTaskTitles((prev) => ({ ...prev, [projectId]: '' }));
      notify('success', 'Task added to project.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const uploadFile = async (projectId: string, file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', projectId);
    fd.append('category', 'PROJECT_PHOTO');
    try {
      await apiRequest('/files/upload', { method: 'POST', body: fd });
      notify('success', `Uploaded ${file.name}.`);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">Manage solar, water softener, RO, and water management executions.</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900">Create Project</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={form.customerId || customers[0]?.id || ''}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Project Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <select
              value={form.serviceCategory}
              onChange={(e) => setForm({ ...form, serviceCategory: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option>Solar Installation</option>
              <option>Water Softener Installation</option>
              <option>RO Plant Installation</option>
              <option>Water Management Project</option>
            </select>
            <input
              required
              placeholder="Site Location *"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              type="date"
              value={form.expectedCompletionDate}
              onChange={(e) => setForm({ ...form, expectedCompletionDate: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              type="number"
              required
              placeholder="Project Cost (INR)"
              value={form.projectCost}
              onChange={(e) => setForm({ ...form, projectCost: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <select
              multiple
              value={form.assignedEmployeeIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  assignedEmployeeIds: Array.from(e.target.selectedOptions, (o) => o.value),
                })
              }
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-xs h-20"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.designation})
                </option>
              ))}
            </select>
          </div>
          <textarea
            required
            rows={2}
            placeholder="Scope & technical description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
            Create Project
          </button>
        </form>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono-tabular text-xs font-bold text-teal-700">
                  {p.projectCode} · {p.serviceCategory}
                </p>
                <h4 className="font-display text-base font-bold text-slate-900">{p.name}</h4>
                <p className="text-xs text-slate-600">
                  {p.customerName} · {p.location} · Cost: {formatINR(p.projectCost)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={p.status}
                  onChange={(e) => updateProject(p.id, { status: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={p.progressPercentage}
                  onChange={(e) => updateProject(p.id, { progressPercentage: Number(e.target.value) })}
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs tabular-nums"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={taskTitles[p.id] || ''}
                onChange={(e) => setTaskTitles((prev) => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="Add milestone task..."
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs flex-1 min-w-[200px]"
              />
              <button
                type="button"
                onClick={() => addTask(p.id)}
                className="px-3 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
              >
                Add Task
              </button>
              <label className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Upload File
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => uploadFile(p.id, e.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminInvoicesAndPaymentsTab({
  invoices,
  payments,
  customers,
  projects,
  companyConfig,
  onRefresh,
  notify,
}: {
  invoices: Invoice[];
  payments: Payment[];
  customers: Customer[];
  projects: Project[];
  companyConfig: CompanyConfig | null;
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showInvForm, setShowInvForm] = useState(false);
  const [invForm, setInvForm] = useState({
    customerId: customers[0]?.id || '',
    projectId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    gstPercent: 18,
    paymentTerms: 'Net 15 Days · Bank Transfer / UPI',
    description: 'Engineering Equipment & Commissioning Services',
    quantity: 1,
    unitPrice: 0,
  });

  const [payForm, setPayForm] = useState({
    invoiceId: invoices.find((i) => i.status !== 'PAID')?.id || '',
    amount: 0,
    paymentType: 'ADVANCE' as 'ADVANCE' | 'PARTIAL' | 'FINAL',
    paymentMethod: 'BANK_TRANSFER' as 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER',
    referenceNumber: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: invForm.customerId || customers[0]?.id,
          projectId: invForm.projectId || null,
          issueDate: invForm.issueDate,
          dueDate: invForm.dueDate,
          gstPercent: Number(invForm.gstPercent),
          paymentTerms: invForm.paymentTerms,
          items: [
            {
              description: invForm.description,
              quantity: Number(invForm.quantity),
              unitPrice: Number(invForm.unitPrice),
            },
          ],
        }),
      });
      notify('success', 'Tax Invoice generated.');
      setShowInvForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetInvId = payForm.invoiceId || invoices.find((i) => i.status !== 'PAID')?.id;
    if (!targetInvId) {
      notify('error', 'Select an unpaid invoice.');
      return;
    }
    try {
      await apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...payForm,
          invoiceId: targetInvId,
          amount: Number(payForm.amount),
        }),
      });
      notify('success', 'Manual payment recorded and official receipt generated.');
      setPayForm((p) => ({ ...p, amount: 0, referenceNumber: '', notes: '' }));
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await apiRequest(`/invoices/${id}`, { method: 'DELETE' });
      notify('success', 'Invoice deleted.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Invoices Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-base font-bold text-slate-900">Tax Invoices</h3>
          <button
            type="button"
            onClick={() => setShowInvForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            Generate Invoice
          </button>
        </div>

        {showInvForm && (
          <form onSubmit={handleCreateInvoice} className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={invForm.customerId || customers[0]?.id || ''}
              onChange={(e) => setInvForm({ ...invForm, customerId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
            <select
              value={invForm.projectId}
              onChange={(e) => setInvForm({ ...invForm, projectId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="">Optional: Link Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.projectCode} - {p.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={invForm.dueDate}
              onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              required
              placeholder="Line item description"
              value={invForm.description}
              onChange={(e) => setInvForm({ ...invForm, description: e.target.value })}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              required
              type="number"
              min={1}
              placeholder="Amount before GST (INR)"
              value={invForm.unitPrice}
              onChange={(e) => setInvForm({ ...invForm, unitPrice: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              placeholder="Payment terms"
              value={invForm.paymentTerms}
              onChange={(e) => setInvForm({ ...invForm, paymentTerms: e.target.value })}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              Create Invoice
            </button>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4">Invoice No.</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Pending</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-700">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">{inv.customerName}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatINR(inv.totalAmount)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-emerald-700">{formatINR(inv.paidAmount)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">
                      {formatINR(Math.max(0, inv.totalAmount - inv.paidAmount))}
                    </td>
                    <td className="py-3 px-4 font-semibold">{formatStatus(inv.status)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => downloadInvoicePdf(inv, companyConfig)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0A1628] text-white"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="inline-flex items-center px-2 py-1 rounded border border-rose-200 text-rose-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Payment Recording Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleRecordPayment} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3 h-fit">
          <h3 className="font-display text-base font-bold text-slate-900">Record Manual Payment</h3>
          <p className="text-xs text-slate-500">
            Record verified offline/UPI/bank-transfer payments manually. Never simulated.
          </p>
          <select
            required
            value={payForm.invoiceId || invoices.find((i) => i.status !== 'PAID')?.id || ''}
            onChange={(e) => setPayForm({ ...payForm, invoiceId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
          >
            <option value="">Select Invoice</option>
            {invoices
              .filter((i) => i.totalAmount - i.paidAmount > 0.01)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} · {i.customerName} (Due {formatINR(i.totalAmount - i.paidAmount)})
                </option>
              ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min={1}
              step="0.01"
              placeholder="Amount (INR)"
              value={payForm.amount || ''}
              onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <input
              required
              type="date"
              value={payForm.paymentDate}
              onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
            <select
              value={payForm.paymentType}
              onChange={(e) => setPayForm({ ...payForm, paymentType: e.target.value as any })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="ADVANCE">Advance Payment</option>
              <option value="PARTIAL">Partial Payment</option>
              <option value="FINAL">Final Payment</option>
            </select>
            <select
              value={payForm.paymentMethod}
              onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value as any })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <input
            placeholder="Transaction / UTR / Cheque Ref No."
            value={payForm.referenceNumber}
            onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
          />
          <button type="submit" className="w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
            Record Payment &amp; Issue Receipt
          </button>
        </form>

        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-display text-base font-bold text-slate-900">Payment Ledger &amp; Receipts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Customer / Invoice</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-700">{p.receiptNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{p.customerName}</p>
                      <p className="text-slate-500">{p.invoiceNumber} · {p.paymentDate}</p>
                    </td>
                    <td className="py-3 px-4">{formatStatus(p.paymentMethod)}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => downloadReceiptPdf(p, companyConfig)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0A1628] text-white"
                      >
                        <Download className="w-3 h-3" />
                        Receipt
                      </button>
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

import React, { useState } from 'react';
import { Eye, Plus, Search, Trash2, Upload, Edit3, X } from 'lucide-react';
import { apiRequest, formatINR, formatStatus } from '../../lib/api';
import { Customer, Employee, Enquiry, Product, ProductCategory } from '../../lib/types';
import { SafeImage } from '../BrandLogo';

const ENQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'SITE_VISIT_SCHEDULED',
  'QUOTATION_SENT',
  'APPROVED',
  'REJECTED',
  'CONVERTED_TO_PROJECT',
];

export function AdminCustomersTab({
  customers,
  onRefresh,
  notify,
}: {
  customers: Customer[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: 'Indore, Madhya Pradesh',
    gstNumber: '',
    notes: '',
  });

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase().trim();
    const okQ =
      !q ||
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.companyName || '').toLowerCase().includes(q);
    const okCity = !cityFilter || c.city.toLowerCase().includes(cityFilter.toLowerCase());
    return okQ && okCity;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      address: '',
      city: 'Indore, Madhya Pradesh',
      gstNumber: '',
      notes: '',
    });
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      companyName: c.companyName || '',
      address: c.address || '',
      city: c.city || '',
      gstNumber: c.gstNumber || '',
      notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiRequest(`/customers/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('success', 'Customer updated.');
      } else {
        await apiRequest('/customers', { method: 'POST', body: JSON.stringify(form) });
        notify('success', 'Customer added.');
      }
      setShowForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDelete = async (c: Customer) => {
    try {
      await apiRequest(`/customers/${c.id}`, { method: 'DELETE' });
      notify('success', 'Customer removed.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const viewHistory = async (id: string) => {
    try {
      const res = await apiRequest<any>(`/customers/${id}`);
      setHistoryData(res);
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, company..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
            />
          </div>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs w-44"
          />
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900">
              {editing ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="Full Name *"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              required
              placeholder="Phone *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              placeholder="Company Name"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              placeholder="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              placeholder="GST Number"
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              {editing ? 'Update Customer' : 'Save Customer'}
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
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Company</th>
                <th className="py-3 px-4 font-semibold">Contact</th>
                <th className="py-3 px-4 font-semibold">City</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {c.fullName}
                    {c.isSample && <span className="ml-2 text-[10px] text-amber-700 font-medium">[SAMPLE]</span>}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{c.companyName || '-'}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {c.phone} · {c.email}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{c.city}</td>
                  <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => viewHistory(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer History Modal */}
      {historyData && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  {historyData.customer.fullName} — Complete Account History
                </h3>
                <p className="text-xs text-slate-500">
                  {historyData.customer.companyName} · {historyData.customer.city} · {historyData.customer.phone}
                </p>
              </div>
              <button type="button" onClick={() => setHistoryData(null)} className="p-1 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Enquiries</p>
                <p className="text-lg font-bold tabular-nums">{historyData.history.enquiries.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Quotations</p>
                <p className="text-lg font-bold tabular-nums">{historyData.history.quotations.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Projects</p>
                <p className="text-lg font-bold tabular-nums">{historyData.history.projects.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Invoices</p>
                <p className="text-lg font-bold tabular-nums">{historyData.history.invoices.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Payments</p>
                <p className="text-lg font-bold tabular-nums">{historyData.history.payments.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500">AMC &amp; Tickets</p>
                <p className="text-lg font-bold tabular-nums">
                  {historyData.history.amcRecords.length} / {historyData.history.serviceRequests.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminEmployeesTab({
  employees,
  onRefresh,
  notify,
}: {
  employees: Employee[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    designation: 'Field Engineer',
    department: 'Water Treatment & RO',
    specialty: '',
    role: 'EMPLOYEE' as 'EMPLOYEE' | 'ADMIN',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/employees', { method: 'POST', body: JSON.stringify(form) });
      notify('success', 'Employee account created with login access.');
      setShowForm(false);
      setForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        designation: 'Field Engineer',
        department: 'Water Treatment & RO',
        specialty: '',
        role: 'EMPLOYEE',
      });
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const toggleActive = async (emp: Employee) => {
    try {
      await apiRequest(`/employees/${emp.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !emp.isActive }),
      });
      notify('success', 'Employee status updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-600">
          Create staff accounts, assign roles, and monitor project &amp; task execution.
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            required
            placeholder="Full Name *"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Login Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            required
            placeholder="Phone *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            required
            type="password"
            minLength={6}
            placeholder="Initial Password (min 6 chars) *"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            required
            placeholder="Designation *"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            required
            placeholder="Department *"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <input
            placeholder="Specialty (e.g. Solar / RO)"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as any })}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
          >
            <option value="EMPLOYEE">Employee Role</option>
            <option value="ADMIN">Admin Role</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              Create Account
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
                <th className="py-3 px-4 font-semibold">Code</th>
                <th className="py-3 px-4 font-semibold">Employee</th>
                <th className="py-3 px-4 font-semibold">Department / Role</th>
                <th className="py-3 px-4 font-semibold text-right">Projects</th>
                <th className="py-3 px-4 font-semibold text-right">Tasks (Done / Open)</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((e) => (
                <tr key={e.id}>
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-teal-700">{e.employeeCode}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{e.fullName}</p>
                    <p className="text-xs text-slate-500">{e.email} · {e.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {e.designation} · {e.department} ({e.userRole})
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{e.assignedProjectCount || 0}</td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    {e.completedTasks || 0} / {e.pendingTasks || 0}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => toggleActive(e)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold ${
                        e.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {e.isActive ? 'Active' : 'Inactive'}
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

export function AdminEnquiriesTab({
  enquiries,
  employees,
  onRefresh,
  notify,
}: {
  enquiries: Enquiry[];
  employees: Employee[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = enquiries.filter((e) => {
    const okS = statusFilter === 'ALL' || e.status === statusFilter;
    const q = search.toLowerCase().trim();
    const okQ =
      !q ||
      e.referenceNumber.toLowerCase().includes(q) ||
      e.fullName.toLowerCase().includes(q) ||
      e.serviceRequired.toLowerCase().includes(q);
    return okS && okQ;
  });

  const updateEnquiry = async (id: string, patch: Partial<Enquiry>) => {
    try {
      await apiRequest(`/enquiries/${id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      notify('success', 'Enquiry updated.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref no, customer, service..."
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs min-w-[240px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
        >
          <option value="ALL">All Statuses</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((enq) => (
          <div key={enq.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono-tabular text-xs font-bold text-teal-700">
                  {enq.referenceNumber} · {enq.createdAt.slice(0, 10)}
                </p>
                <h3 className="text-sm font-bold text-slate-900">
                  {enq.fullName} {enq.companyName ? `(${enq.companyName})` : ''}
                </h3>
                <p className="text-xs text-slate-600">
                  {enq.phone} {enq.email ? `· ${enq.email}` : ''} · {enq.city} · Service:{' '}
                  <strong>{enq.serviceRequired}</strong>
                </p>
                {enq.projectDetails && <p className="text-xs text-slate-700 mt-1.5">{enq.projectDetails}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={enq.assignedEmployeeId || ''}
                  onChange={(e) => updateEnquiry(enq.id, { assignedEmployeeId: e.target.value || null })}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
                <select
                  value={enq.status}
                  onChange={(e) => updateEnquiry(enq.id, { status: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                >
                  {ENQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminProductsTab({
  products,
  categories,
  onRefresh,
  notify,
}: {
  products: Product[];
  categories: ProductCategory[];
  onRefresh: () => Promise<void>;
  notify: (type: 'success' | 'error', text: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [form, setForm] = useState({
    categoryId: categories[0]?.id || '',
    name: '',
    description: '',
    capacity: '',
    unitPrice: 0,
    gstRate: 18,
    featuresText: '',
    imageUrl: '',
    isActive: true,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      categoryId: categories[0]?.id || '',
      name: '',
      description: '',
      capacity: '',
      unitPrice: 0,
      gstRate: 18,
      featuresText: '',
      imageUrl: '',
      isActive: true,
    });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      categoryId: p.categoryId,
      name: p.name,
      description: p.description,
      capacity: p.capacity,
      unitPrice: p.unitPrice,
      gstRate: p.gstRate,
      featuresText: p.features.join('\n'),
      imageUrl: p.imageUrl || '',
      isActive: p.isActive,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', 'PRODUCT_IMAGE');
    try {
      const uploaded = await apiRequest<{ url: string }>('/files/upload', { method: 'POST', body: fd });
      setForm((prev) => ({ ...prev, imageUrl: uploaded.url }));
      notify('success', 'Product image uploaded persistently.');
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      description: form.description,
      capacity: form.capacity,
      unitPrice: Number(form.unitPrice),
      gstRate: Number(form.gstRate),
      features: form.featuresText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await apiRequest(`/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify('success', 'Product updated.');
      } else {
        await apiRequest('/products', { method: 'POST', body: JSON.stringify(payload) });
        notify('success', 'Product created.');
      }
      setShowForm(false);
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await apiRequest(`/products/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      notify('success', 'Product deleted.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await apiRequest('/categories', { method: 'POST', body: JSON.stringify({ name: newCategoryName.trim() }) });
      setNewCategoryName('');
      notify('success', 'Category added.');
      await onRefresh();
    } catch (err: any) {
      notify('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleAddCategory} className="flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
          />
          <button type="submit" className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold">
            Add Category
          </button>
        </form>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-xs font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900">
            {editing ? 'Edit Product' : 'Create Product'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Product Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              required
              placeholder="Capacity (e.g. 1,000 LPH) *"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              required
              type="number"
              placeholder="Base Unit Price (INR)"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              required
              type="number"
              step="0.1"
              placeholder="GST %"
              value={form.gstRate}
              onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer hover:bg-slate-50">
              <Upload className="w-4 h-4" />
              Upload Product Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <textarea
            required
            rows={2}
            placeholder="Product description..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <textarea
            rows={3}
            placeholder="Key features (one per line)..."
            value={form.featuresText}
            onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
              Save Product
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="h-40 bg-slate-100">
                <SafeImage src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <p className="text-xs text-slate-500">
                  {p.categoryName} · {p.capacity}
                </p>
                <h4 className="font-display text-sm font-bold text-slate-900 mt-1">{p.name}</h4>
                <p className="text-xs font-bold text-teal-700 mt-1 tabular-nums">{formatINR(p.unitPrice)}</p>
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleActive(p)}
                className={`px-2.5 py-1 rounded text-xs font-semibold ${
                  p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {p.isActive ? 'Active' : 'Inactive'}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="px-2.5 py-1 rounded border border-rose-200 text-xs text-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

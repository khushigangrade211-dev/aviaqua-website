import React, { useEffect, useState, useCallback } from 'react';
import {
  ClipboardList,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  Wrench,
} from 'lucide-react';
import { PortalLayout, SidebarNavItem } from '../components/PortalLayout';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatINR, formatStatus } from '../lib/api';
import { downloadInvoicePdf, downloadQuotationPdf, downloadReceiptPdf } from '../lib/pdf';
import { AMCRecord, Enquiry, Invoice, Payment, Project, Quotation, ServiceRequest } from '../lib/types';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Dashboard Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'enquiries', label: 'My Enquiries', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'quotations', label: 'My Quotations', icon: <FileText className="w-4 h-4" /> },
  { id: 'projects', label: 'Projects & Progress', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'invoices', label: 'Invoices', icon: <FileCheck className="w-4 h-4" /> },
  { id: 'payments', label: 'Payment History', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'service', label: 'Service Requests', icon: <Wrench className="w-4 h-4" /> },
  { id: 'amc', label: 'Maintenance & AMC', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'profile', label: 'Profile Management', icon: <UserCog className="w-4 h-4" /> },
];

export default function CustomerPortal() {
  const { user, customer, companyConfig, refreshSession } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<any>({});
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [amcRecords, setAmcRecords] = useState<AMCRecord[]>([]);

  // New Service Request Form
  const [srForm, setSrForm] = useState({
    subject: '',
    equipmentCategory: 'Water Softener',
    description: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Urgent',
    preferredDate: '',
  });

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    companyName: customer?.companyName || '',
    address: customer?.address || '',
    city: customer?.city || '',
    gstNumber: customer?.gstNumber || '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      companyName: customer?.companyName || '',
      address: customer?.address || '',
      city: customer?.city || '',
      gstNumber: customer?.gstNumber || '',
    });
  }, [user, customer]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, enq, qts, prj, inv, pay, srv, amc] = await Promise.all([
        apiRequest<any>('/reports/overview'),
        apiRequest<Enquiry[]>('/enquiries'),
        apiRequest<Quotation[]>('/quotations'),
        apiRequest<Project[]>('/projects'),
        apiRequest<Invoice[]>('/invoices'),
        apiRequest<Payment[]>('/payments'),
        apiRequest<ServiceRequest[]>('/service-requests'),
        apiRequest<AMCRecord[]>('/amc'),
      ]);
      setOverview(ov);
      setEnquiries(enq);
      setQuotations(qts);
      setProjects(prj);
      setInvoices(inv);
      setPayments(pay);
      setServiceRequests(srv);
      setAmcRecords(amc);
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to load portal data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleQuotationRespond = async (id: string, decision: 'ACCEPTED' | 'REJECTED') => {
    try {
      await apiRequest(`/quotations/${id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setBanner({ type: 'success', text: `Quotation ${decision.toLowerCase()} successfully.` });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/service-requests', {
        method: 'POST',
        body: JSON.stringify(srForm),
      });
      setBanner({ type: 'success', text: 'Service request submitted. NewEdgeEngineeringAndWorks support will assign a technician.' });
      setSrForm({
        subject: '',
        equipmentCategory: 'Water Softener',
        description: '',
        priority: 'Medium',
        preferredDate: '',
      });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      await refreshSession();
      setBanner({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(pwForm),
      });
      setPwForm({ currentPassword: '', newPassword: '' });
      setBanner({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  return (
    <PortalLayout
      portalTitle="Customer Portal"
      navItems={NAV_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {banner && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="font-bold ml-4">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500 font-medium">My Enquiries</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">
                    {overview.enquiriesCount ?? enquiries.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500 font-medium">Active Projects</p>
                  <p className="text-2xl font-display font-bold text-teal-700 mt-1 tabular-nums">
                    {overview.activeProjectsCount ?? 0}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500 font-medium">Pending Invoice Balance</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">
                    {formatINR(overview.pendingBalance ?? 0)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs text-slate-500 font-medium">Active AMC Contracts</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">
                    {overview.amcCount ?? amcRecords.length}
                  </p>
                </div>
              </div>

              {/* Installation Progress Snapshot */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-slate-900">
                    Current Installation Progress
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    View All Projects
                  </button>
                </div>
                {projects.length === 0 ? (
                  <p className="text-sm text-slate-500">No active installations assigned to your account yet.</p>
                ) : (
                  <div className="space-y-4">
                    {projects.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-mono-tabular text-teal-700 font-semibold">{p.projectCode}</p>
                            <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            {formatStatus(p.status)} · {p.progressPercentage}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${p.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'enquiries' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">My Enquiries</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Reference</th>
                      <th className="py-3 px-4 font-semibold">Service Required</th>
                      <th className="py-3 px-4 font-semibold">City</th>
                      <th className="py-3 px-4 font-semibold">Preferred Visit</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enquiries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No enquiries found.
                        </td>
                      </tr>
                    ) : (
                      enquiries.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                            {e.referenceNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-800">{e.serviceRequired}</td>
                          <td className="py-3 px-4 text-slate-600">{e.city || '-'}</td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">
                            {e.preferredSiteVisitDate || '-'}
                          </td>
                          <td className="py-3 px-4 font-medium text-teal-700">{formatStatus(e.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'quotations' && (
            <div className="space-y-4">
              {quotations.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                  No quotations shared with your account yet.
                </div>
              ) : (
                quotations.map((q) => (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono-tabular text-teal-700 font-semibold">
                          {q.quotationNumber} · Valid until {q.validUntil}
                        </p>
                        <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">{q.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700 mr-2">
                          Status: {formatStatus(q.status)}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadQuotationPdf(q, companyConfig)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-teal-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                          <tr>
                            <th className="py-2 px-3 text-left">Item</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Unit Price</th>
                            <th className="py-2 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {q.items.map((item, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-slate-800">{item.description}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{item.quantity}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{formatINR(item.unitPrice)}</td>
                              <td className="py-2 px-3 text-right tabular-nums font-medium">
                                {formatINR(item.lineTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      <p className="text-xs text-slate-600 max-w-xl">{q.termsConditions}</p>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          Subtotal {formatINR(q.subtotal)} · GST ({q.gstPercent}%) {formatINR(q.gstAmount)}
                        </p>
                        <p className="text-lg font-display font-bold text-slate-900 tabular-nums">
                          Total: {formatINR(q.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {q.status === 'SENT' && (
                      <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuotationRespond(q.id, 'ACCEPTED')}
                          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
                        >
                          Accept Quotation
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuotationRespond(q.id, 'REJECTED')}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-5">
              {projects.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                  No projects found for your account.
                </div>
              ) : (
                projects.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono-tabular text-teal-700 font-semibold">
                          {p.projectCode} · {p.serviceCategory}
                        </p>
                        <h3 className="font-display text-lg font-bold text-slate-900 mt-0.5">{p.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Location: {p.location} · Expected Completion: {p.expectedCompletionDate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-slate-700">{formatStatus(p.status)}</p>
                        <p className="text-lg font-bold text-teal-700 tabular-nums">{p.progressPercentage}%</p>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all"
                        style={{ width: `${p.progressPercentage}%` }}
                      />
                    </div>

                    <p className="text-sm text-slate-700">{p.description}</p>

                    {p.installationNotes && (
                      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Site Installation Notes: </span>
                        {p.installationNotes}
                      </div>
                    )}

                    {p.completionReport && (
                      <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                        <span className="font-semibold">Completion Report: </span>
                        {p.completionReport}
                      </div>
                    )}

                    {p.files && p.files.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Project Photos &amp; Reports</p>
                        <div className="flex flex-wrap gap-2">
                          {p.files.map((f) => (
                            <a
                              key={f.id}
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-teal-700 hover:bg-slate-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {f.fileName}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">Invoices</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Invoice No.</th>
                      <th className="py-3 px-4 font-semibold">Issue / Due</th>
                      <th className="py-3 px-4 font-semibold text-right">Total</th>
                      <th className="py-3 px-4 font-semibold text-right">Paid</th>
                      <th className="py-3 px-4 font-semibold text-right">Pending</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No invoices issued yet.
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 tabular-nums">
                            {inv.issueDate} → {inv.dueDate}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium">
                            {formatINR(inv.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-700">
                            {formatINR(inv.paidAmount)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-semibold text-slate-900">
                            {formatINR(Math.max(0, inv.totalAmount - inv.paidAmount))}
                          </td>
                          <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                            {formatStatus(inv.status)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => downloadInvoicePdf(inv, companyConfig)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0A1628] text-white text-xs font-medium hover:bg-teal-700"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">Payment History &amp; Receipts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Receipt No.</th>
                      <th className="py-3 px-4 font-semibold">Invoice</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Method &amp; Type</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No payments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                            {pay.receiptNumber}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600">
                            {pay.invoiceNumber || pay.invoiceId}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-600">{pay.paymentDate}</td>
                          <td className="py-3 px-4 text-xs text-slate-700">
                            {formatStatus(pay.paymentMethod)} · {formatStatus(pay.paymentType)}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700">
                            {formatINR(pay.amount)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => downloadReceiptPdf(pay, companyConfig)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0A1628] text-white text-xs font-medium hover:bg-teal-700"
                            >
                              <Download className="w-3 h-3" />
                              Receipt
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'service' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display text-base font-bold text-slate-900 mb-4">
                  Submit Service / Maintenance Request
                </h2>
                <form onSubmit={handleCreateServiceRequest} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={srForm.subject}
                      onChange={(e) => setSrForm({ ...srForm, subject: e.target.value })}
                      placeholder="e.g. RO membrane pressure drop"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Equipment</label>
                      <select
                        value={srForm.equipmentCategory}
                        onChange={(e) => setSrForm({ ...srForm, equipmentCategory: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option>Water Softener</option>
                        <option>Industrial RO Plant</option>
                        <option>Solar Rooftop Plant</option>
                        <option>Sand & Carbon Filter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                      <select
                        value={srForm.priority}
                        onChange={(e) => setSrForm({ ...srForm, priority: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Visit Date</label>
                    <input
                      type="date"
                      value={srForm.preferredDate}
                      onChange={(e) => setSrForm({ ...srForm, preferredDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Description *</label>
                    <textarea
                      rows={3}
                      required
                      value={srForm.description}
                      onChange={(e) => setSrForm({ ...srForm, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-sm font-semibold"
                  >
                    Submit Service Ticket
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-slate-900">My Service Tickets</h2>
                {serviceRequests.length === 0 ? (
                  <p className="text-sm text-slate-500">No service requests logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {serviceRequests.map((s) => (
                      <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono-tabular text-xs font-bold text-teal-700">
                            {s.ticketNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {formatStatus(s.status)} · {s.priority} Priority
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1">{s.subject}</h3>
                        <p className="text-xs text-slate-600 mt-1">{s.description}</p>
                        {s.technicianName && (
                          <p className="text-xs text-slate-700 mt-2">
                            Assigned Technician: <strong>{s.technicianName}</strong>
                          </p>
                        )}
                        {s.resolutionNotes && (
                          <p className="text-xs text-emerald-800 mt-1">Resolution: {s.resolutionNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'amc' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Annual Maintenance Contracts (AMC)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Contract No.</th>
                      <th className="py-3 px-4 font-semibold">Equipment</th>
                      <th className="py-3 px-4 font-semibold">Frequency</th>
                      <th className="py-3 px-4 font-semibold">Next Service</th>
                      <th className="py-3 px-4 font-semibold">Expiry Date</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {amcRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No AMC contracts active yet.
                        </td>
                      </tr>
                    ) : (
                      amcRecords.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                            {a.contractNumber}
                          </td>
                          <td className="py-3 px-4 text-slate-800">{a.equipmentName}</td>
                          <td className="py-3 px-4 text-slate-600">{a.frequency}</td>
                          <td className="py-3 px-4 tabular-nums text-teal-700 font-medium">
                            {a.nextServiceDate}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-600">{a.expiryDate}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{formatStatus(a.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-slate-900">Account &amp; Company Profile</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={profileForm.gstNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, gstNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <textarea
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-sm font-semibold"
                >
                  Save Profile
                </button>
              </form>

              <form onSubmit={handleChangePassword} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
                <h2 className="font-display text-base font-bold text-slate-900">Change Password</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
                >
                  Update Password
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}

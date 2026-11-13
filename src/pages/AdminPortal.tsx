import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Wrench,
} from 'lucide-react';
import { PortalLayout, SidebarNavItem } from '../components/PortalLayout';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatINR } from '../lib/api';
import {
  AMCRecord,
  Customer,
  Employee,
  Enquiry,
  Invoice,
  Payment,
  Product,
  ProductCategory,
  Project,
  Quotation,
  ServiceRequest,
} from '../lib/types';
import {
  AdminCustomersTab,
  AdminEmployeesTab,
  AdminEnquiriesTab,
  AdminProductsTab,
} from '../components/admin/AdminCatalogAndCrm';
import {
  AdminInvoicesAndPaymentsTab,
  AdminProjectsTab,
  AdminQuotationsTab,
} from '../components/admin/AdminBillingAndProjects';
import {
  AdminReportsTab,
  AdminServiceAndAmcTab,
  AdminSettingsTab,
} from '../components/admin/AdminServiceReportsSettings';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
  { id: 'employees', label: 'Employees', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'enquiries', label: 'Enquiries', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'products', label: 'Products & Catalog', icon: <Package className="w-4 h-4" /> },
  { id: 'quotations', label: 'Quotations', icon: <FileText className="w-4 h-4" /> },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'billing', label: 'Invoices & Payments', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'service', label: 'Service & AMC', icon: <Wrench className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports & CSV', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'settings', label: 'Credentials & Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminPortal() {
  const { companyConfig, refreshConfig } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<any>({});
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [amcRecords, setAmcRecords] = useState<AMCRecord[]>([]);

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [ov, cust, emp, enq, cats, prod, qts, prj, inv, pay, srv, amc] = await Promise.all([
        apiRequest<any>('/reports/overview'),
        apiRequest<Customer[]>('/customers'),
        apiRequest<Employee[]>('/employees'),
        apiRequest<Enquiry[]>('/enquiries'),
        apiRequest<ProductCategory[]>('/categories'),
        apiRequest<Product[]>('/products'),
        apiRequest<Quotation[]>('/quotations'),
        apiRequest<Project[]>('/projects'),
        apiRequest<Invoice[]>('/invoices'),
        apiRequest<Payment[]>('/payments'),
        apiRequest<ServiceRequest[]>('/service-requests'),
        apiRequest<AMCRecord[]>('/amc'),
      ]);
      setOverview(ov);
      setCustomers(cust);
      setEmployees(emp);
      setEnquiries(enq);
      setCategories(cats);
      setProducts(prod);
      setQuotations(qts);
      setProjects(prj);
      setInvoices(inv);
      setPayments(pay);
      setServiceRequests(srv);
      setAmcRecords(amc);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <PortalLayout
      portalTitle="NewEdgeEngineeringAndWorks Admin"
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  ['Total Customers', overview.totalCustomers ?? 0],
                  ['Total Employees', overview.totalEmployees ?? 0],
                  ['Total Enquiries', overview.totalEnquiries ?? 0],
                  ['Pending Enquiries', overview.pendingEnquiries ?? 0],
                  ['Active Projects', overview.activeProjects ?? 0],
                  ['Completed Projects', overview.completedProjects ?? 0],
                  ['Total Quotations', overview.totalQuotations ?? 0],
                  ['Pending Payments', formatINR(overview.pendingPayments ?? 0)],
                  ['Total Revenue', formatINR(overview.totalRevenue ?? 0)],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">{val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-sm font-bold text-slate-900">Latest Enquiries</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('enquiries')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Manage All
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {enquiries.slice(0, 5).map((e) => (
                      <div key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{e.fullName}</p>
                          <p className="text-slate-500">{e.referenceNumber} · {e.serviceRequired}</p>
                        </div>
                        <span className="font-semibold text-teal-700">{e.status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-sm font-bold text-slate-900">Active Projects</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('projects')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      View Projects
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {projects.slice(0, 5).map((p) => (
                      <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <p className="text-slate-500">{p.projectCode} · {p.customerName}</p>
                        </div>
                        <span className="font-bold text-slate-800 tabular-nums">{p.progressPercentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <AdminCustomersTab customers={customers} onRefresh={loadAll} notify={notify} />
          )}
          {activeTab === 'employees' && (
            <AdminEmployeesTab employees={employees} onRefresh={loadAll} notify={notify} />
          )}
          {activeTab === 'enquiries' && (
            <AdminEnquiriesTab enquiries={enquiries} employees={employees} onRefresh={loadAll} notify={notify} />
          )}
          {activeTab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              onRefresh={loadAll}
              notify={notify}
            />
          )}
          {activeTab === 'quotations' && (
            <AdminQuotationsTab
              quotations={quotations}
              customers={customers}
              products={products}
              companyConfig={companyConfig}
              onRefresh={loadAll}
              notify={notify}
            />
          )}
          {activeTab === 'projects' && (
            <AdminProjectsTab
              projects={projects}
              customers={customers}
              employees={employees}
              onRefresh={loadAll}
              notify={notify}
            />
          )}
          {activeTab === 'billing' && (
            <AdminInvoicesAndPaymentsTab
              invoices={invoices}
              payments={payments}
              customers={customers}
              projects={projects}
              companyConfig={companyConfig}
              onRefresh={loadAll}
              notify={notify}
            />
          )}
          {activeTab === 'service' && (
            <AdminServiceAndAmcTab
              serviceRequests={serviceRequests}
              amcRecords={amcRecords}
              customers={customers}
              employees={employees}
              onRefresh={loadAll}
              notify={notify}
            />
          )}
          {activeTab === 'reports' && <AdminReportsTab notify={notify} />}
          {activeTab === 'settings' && (
            <AdminSettingsTab companyConfig={companyConfig} onSaved={refreshConfig} notify={notify} />
          )}
        </>
      )}
    </PortalLayout>
  );
}

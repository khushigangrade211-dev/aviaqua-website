import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarCheck,
  CheckSquare,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  Upload,
  Users,
  Wrench,
} from 'lucide-react';
import { PortalLayout, SidebarNavItem } from '../components/PortalLayout';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatStatus } from '../lib/api';
import { Customer, Enquiry, Project, ServiceRequest, SiteVisit } from '../lib/types';

const NAV_ITEMS: SidebarNavItem[] = [
  { id: 'overview', label: 'Employee Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'projects', label: 'Assigned Projects', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'tasks', label: 'Project Tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'enquiries', label: 'Assigned Enquiries', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'visits', label: 'Site Visits', icon: <CalendarCheck className="w-4 h-4" /> },
  { id: 'service', label: 'Service Requests', icon: <Wrench className="w-4 h-4" /> },
  { id: 'customers', label: 'Assigned Customers', icon: <Users className="w-4 h-4" /> },
];

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

export default function EmployeePortal() {
  const { employee } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<any>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Active project edit state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState({
    status: 'INSTALLATION',
    progressPercentage: 0,
    installationNotes: '',
    completionReport: '',
  });

  // New Site Visit Form
  const [visitForm, setVisitForm] = useState({
    scheduledDate: '',
    location: '',
    purpose: '',
    enquiryId: '',
    projectId: '',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, prj, enq, sv, sr, cust] = await Promise.all([
        apiRequest<any>('/reports/overview'),
        apiRequest<Project[]>('/projects'),
        apiRequest<Enquiry[]>('/enquiries'),
        apiRequest<SiteVisit[]>('/site-visits'),
        apiRequest<ServiceRequest[]>('/service-requests'),
        apiRequest<Customer[]>('/customers'),
      ]);
      setOverview(ov);
      setProjects(prj);
      setEnquiries(enq);
      setVisits(sv);
      setServiceRequests(sr);
      setCustomers(cust);
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message || 'Failed to load employee workspace.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleProjectUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjectId) return;
    try {
      await apiRequest(`/projects/${editingProjectId}`, {
        method: 'PUT',
        body: JSON.stringify(projectDraft),
      });
      setBanner({ type: 'success', text: 'Project progress and field notes updated.' });
      setEditingProjectId(null);
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUploadProjectFile = async (projectId: string, category: string, file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', projectId);
    fd.append('category', category);
    try {
      await apiRequest('/files/upload', { method: 'POST', body: fd });
      setBanner({ type: 'success', text: `Uploaded ${file.name} persistently to project record.` });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUpdateTask = async (taskId: string, status: string) => {
    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      setBanner({ type: 'success', text: 'Task status updated.' });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUpdateEnquiry = async (id: string, status: string, internalNotes: string) => {
    try {
      await apiRequest(`/enquiries/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, internalNotes }),
      });
      setBanner({ type: 'success', text: 'Enquiry updated.' });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;
    try {
      await apiRequest('/site-visits', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: employee.id,
          scheduledDate: visitForm.scheduledDate,
          location: visitForm.location,
          purpose: visitForm.purpose,
          enquiryId: visitForm.enquiryId || null,
          projectId: visitForm.projectId || null,
        }),
      });
      setVisitForm({ scheduledDate: '', location: '', purpose: '', enquiryId: '', projectId: '' });
      setBanner({ type: 'success', text: 'Site visit logged.' });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleCompleteVisit = async (visitId: string, findings: string) => {
    try {
      await apiRequest(`/site-visits/${visitId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Completed', findings }),
      });
      setBanner({ type: 'success', text: 'Site visit findings saved.' });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const handleUpdateService = async (id: string, status: string, visitNotes: string, resolutionNotes: string) => {
    try {
      await apiRequest(`/service-requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status, visitNotes, resolutionNotes }),
      });
      setBanner({ type: 'success', text: 'Service visit details updated.' });
      await loadAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err.message });
    }
  };

  const allTasks = projects.flatMap((p) =>
    (p.tasks || []).map((t) => ({ ...t, projectName: p.name, projectCode: p.projectCode }))
  );

  return (
    <PortalLayout
      portalTitle="Employee Field Portal"
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  ['Assigned Projects', overview.assignedProjects ?? projects.length],
                  ['Assigned Enquiries', overview.assignedEnquiries ?? enquiries.length],
                  ['Upcoming Site Visits', overview.upcomingSiteVisits ?? 0],
                  ['Pending Tasks', overview.pendingTasks ?? 0],
                  ['Completed Tasks', overview.completedTasks ?? 0],
                  ['Service Requests', overview.serviceRequests ?? serviceRequests.length],
                ].map(([label, val]) => (
                  <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-2xl font-display font-bold text-slate-900 mt-1 tabular-nums">{val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="font-display text-base font-bold text-slate-900 mb-3">
                  Active Assigned Projects
                </h2>
                {projects.length === 0 ? (
                  <p className="text-sm text-slate-500">No projects currently assigned to you.</p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-mono-tabular text-teal-700 font-semibold">{p.projectCode}</p>
                          <p className="text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-600">{p.customerName} · {p.location}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('projects')}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
                        >
                          Update Progress ({p.progressPercentage}%)
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-5">
              {projects.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono-tabular text-teal-700 font-semibold">
                        {p.projectCode} · {p.serviceCategory}
                      </p>
                      <h3 className="font-display text-lg font-bold text-slate-900">{p.name}</h3>
                      <p className="text-xs text-slate-600">
                        Client: {p.customerName} {p.customerCompany ? `(${p.customerCompany})` : ''} · {p.location}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProjectId(p.id);
                        setProjectDraft({
                          status: p.status,
                          progressPercentage: p.progressPercentage,
                          installationNotes: p.installationNotes || '',
                          completionReport: p.completionReport || '',
                        });
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-xs font-semibold"
                    >
                      Update Status &amp; Report
                    </button>
                  </div>

                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600" style={{ width: `${p.progressPercentage}%` }} />
                  </div>
                  <p className="text-xs text-slate-600">
                    Status: <strong>{formatStatus(p.status)}</strong> · Progress: <strong>{p.progressPercentage}%</strong>
                  </p>

                  {editingProjectId === p.id && (
                    <form onSubmit={handleProjectUpdate} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Project Status</label>
                          <select
                            value={projectDraft.status}
                            onChange={(e) => setProjectDraft({ ...projectDraft, status: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                          >
                            {PROJECT_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {formatStatus(s)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Progress ({projectDraft.progressPercentage}%)
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={projectDraft.progressPercentage}
                            onChange={(e) =>
                              setProjectDraft({ ...projectDraft, progressPercentage: Number(e.target.value) })
                            }
                            className="w-full mt-2 accent-teal-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Installation Notes</label>
                        <textarea
                          rows={2}
                          value={projectDraft.installationNotes}
                          onChange={(e) => setProjectDraft({ ...projectDraft, installationNotes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Completion / Commissioning Report Summary
                        </label>
                        <textarea
                          rows={2}
                          value={projectDraft.completionReport}
                          onChange={(e) => setProjectDraft({ ...projectDraft, completionReport: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold">
                          Save Update
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Persistent Photo & Report Uploads */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Site Photo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUploadProjectFile(p.id, 'PROJECT_PHOTO', e.target.files?.[0] || null)}
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload Report (PDF/Img)
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadProjectFile(p.id, 'INSTALLATION_REPORT', e.target.files?.[0] || null)
                        }
                      />
                    </label>
                    {p.files?.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-700 underline"
                      >
                        {f.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">Project Tasks</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {allTasks.length === 0 ? (
                  <p className="p-6 text-sm text-slate-500">No tasks assigned.</p>
                ) : (
                  allTasks.map((t) => (
                    <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono-tabular text-teal-700 font-semibold">
                          {t.projectCode} · Due {t.dueDate || 'N/A'}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{t.title}</p>
                        <p className="text-xs text-slate-600">{t.description}</p>
                      </div>
                      <select
                        value={t.status}
                        onChange={(e) => handleUpdateTask(t.id, e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              {enquiries.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                  No enquiries assigned to you.
                </div>
              ) : (
                enquiries.map((e) => (
                  <EnquiryRowCard key={e.id} enquiry={e} onSave={handleUpdateEnquiry} />
                ))
              )}
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form onSubmit={handleCreateVisit} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
                <h2 className="font-display text-base font-bold text-slate-900">Record / Schedule Site Visit</h2>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visit Date *</label>
                  <input
                    type="date"
                    required
                    value={visitForm.scheduledDate}
                    onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={visitForm.location}
                    onChange={(e) => setVisitForm({ ...visitForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose *</label>
                  <textarea
                    rows={2}
                    required
                    value={visitForm.purpose}
                    onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg bg-[#0A1628] text-white text-sm font-semibold">
                  Log Site Visit
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {visits.map((v) => (
                  <SiteVisitCard key={v.id} visit={v} onComplete={handleCompleteVisit} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'service' && (
            <div className="space-y-4">
              {serviceRequests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
                  No service requests assigned to you.
                </div>
              ) : (
                serviceRequests.map((sr) => (
                  <ServiceTicketCard key={sr.id} ticket={sr} onUpdate={handleUpdateService} />
                ))
              )}
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">Assigned Customers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Company</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">City</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-semibold text-slate-900">{c.fullName}</td>
                        <td className="py-3 px-4 text-slate-700">{c.companyName || '-'}</td>
                        <td className="py-3 px-4 text-slate-600">{c.phone}</td>
                        <td className="py-3 px-4 text-slate-600">{c.city}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </PortalLayout>
  );
}

function EnquiryRowCard({
  enquiry,
  onSave,
}: {
  enquiry: Enquiry;
  onSave: (id: string, status: string, notes: string) => void;
}) {
  const [status, setStatus] = useState(enquiry.status);
  const [notes, setNotes] = useState(enquiry.internalNotes || '');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono-tabular text-xs font-bold text-teal-700">{enquiry.referenceNumber}</span>
          <h3 className="text-sm font-bold text-slate-900">
            {enquiry.fullName} · {enquiry.serviceRequired}
          </h3>
          <p className="text-xs text-slate-600">{enquiry.phone} · {enquiry.city}</p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
        >
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
          <option value="QUOTATION_SENT">Quotation Sent</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>
      <p className="text-xs text-slate-700">{enquiry.projectDetails}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add site inspection / follow-up notes..."
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
        />
        <button
          type="button"
          onClick={() => onSave(enquiry.id, status, notes)}
          className="px-3.5 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SiteVisitCard({
  visit,
  onComplete,
}: {
  visit: SiteVisit;
  onComplete: (id: string, findings: string) => void;
}) {
  const [findings, setFindings] = useState(visit.findings || '');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900">{visit.location}</p>
        <span className="text-xs font-semibold text-teal-700">{visit.status} · {visit.scheduledDate}</span>
      </div>
      <p className="text-xs text-slate-600">{visit.purpose}</p>
      <div className="flex gap-2 pt-2">
        <input
          type="text"
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          placeholder="Site findings (TDS, hardness, roof area...)"
          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
        />
        <button
          type="button"
          onClick={() => onComplete(visit.id, findings)}
          className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold"
        >
          Mark Completed
        </button>
      </div>
    </div>
  );
}

function ServiceTicketCard({
  ticket,
  onUpdate,
}: {
  ticket: ServiceRequest;
  onUpdate: (id: string, status: string, visitNotes: string, resolutionNotes: string) => void;
}) {
  const [status, setStatus] = useState(ticket.status);
  const [visitNotes, setVisitNotes] = useState(ticket.visitNotes || '');
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolutionNotes || '');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-mono-tabular text-xs font-bold text-teal-700">{ticket.ticketNumber}</span>
          <h3 className="text-sm font-bold text-slate-900">{ticket.subject}</h3>
          <p className="text-xs text-slate-600">
            {ticket.customerName} ({ticket.customerPhone}) · {ticket.equipmentCategory}
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold"
        >
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>
      <p className="text-xs text-slate-700">{ticket.description}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={visitNotes}
          onChange={(e) => setVisitNotes(e.target.value)}
          placeholder="Visit notes..."
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
        />
        <input
          type="text"
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Resolution summary..."
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
        />
      </div>
      <button
        type="button"
        onClick={() => onUpdate(ticket.id, status, visitNotes, resolutionNotes)}
        className="px-4 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold"
      >
        Update Ticket
      </button>
    </div>
  );
}

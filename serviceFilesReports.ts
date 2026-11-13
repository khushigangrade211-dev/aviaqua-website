import { Router } from 'express';
import { z } from 'zod';
import { getDb, saveDb, generateId, nextSequence, createNotification } from '../db/store.ts';
import { requireAuth, requireRole, validateBody, uploadMiddleware, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// ---------------- SERVICE REQUESTS ----------------
const serviceRequestSchema = z.object({
  customerId: z.string().optional(),
  subject: z.string().trim().min(3),
  equipmentCategory: z.string().trim().min(2),
  description: z.string().trim().min(5),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  preferredDate: z.string().optional().or(z.literal('')),
});

router.get('/service-requests', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  let list = db.serviceRequests;

  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((s) => s.customerId === cust.id) : [];
  } else if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    list = emp ? list.filter((s) => s.assignedTechnicianId === emp.id) : [];
  }

  const custMap = new Map(db.customers.map((c) => [c.id, c]));
  const empMap = new Map(
    db.employees.map((e) => {
      const u = db.users.find((usr) => usr.id === e.userId);
      return [e.id, u?.fullName || e.employeeCode];
    })
  );

  res.json(
    list.map((s) => ({
      ...s,
      customerName: custMap.get(s.customerId)?.fullName || '',
      customerCompany: custMap.get(s.customerId)?.companyName || '',
      customerPhone: custMap.get(s.customerId)?.phone || '',
      technicianName: s.assignedTechnicianId ? empMap.get(s.assignedTechnicianId) || '' : '',
    }))
  );
});

router.post('/service-requests', requireAuth, validateBody(serviceRequestSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof serviceRequestSchema>;
  const now = new Date().toISOString();

  let customerId = body.customerId;
  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    if (!cust) {
      res.status(400).json({ error: 'Customer profile not found.' });
      return;
    }
    customerId = cust.id;
  }

  if (!customerId) {
    res.status(400).json({ error: 'Customer is required.' });
    return;
  }

  const ticketNumber = nextSequence(db, 'srv', 'AVQ-SRV');
  const sr = {
    id: generateId('srv'),
    ticketNumber,
    customerId,
    assignedTechnicianId: null,
    subject: body.subject,
    equipmentCategory: body.equipmentCategory,
    description: body.description,
    priority: body.priority,
    preferredDate: body.preferredDate || '',
    status: 'OPEN' as const,
    visitNotes: '',
    resolutionNotes: '',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.serviceRequests.unshift(sr);

  createNotification(db, {
    targetRole: 'ADMIN',
    type: 'SERVICE_REQUEST',
    title: `Service Ticket ${ticketNumber}`,
    message: `${body.subject} (${body.priority} priority)`,
    link: '/admin/service',
  });

  saveDb(db);
  res.status(201).json(sr);
});

router.put('/service-requests/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req: AuthRequest, res) => {
  const db = getDb();
  const sr = db.serviceRequests.find((s) => s.id === req.params.id);
  if (!sr) {
    res.status(404).json({ error: 'Service request not found' });
    return;
  }

  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    if (!emp || sr.assignedTechnicianId !== emp.id) {
      res.status(403).json({ error: 'You are not assigned to this service request.' });
      return;
    }
  }

  const { status, assignedTechnicianId, visitNotes, resolutionNotes } = req.body || {};
  if (status) sr.status = status;
  if (req.auth!.role === 'ADMIN' && assignedTechnicianId !== undefined) {
    sr.assignedTechnicianId = assignedTechnicianId;
  }
  if (visitNotes !== undefined) sr.visitNotes = visitNotes;
  if (resolutionNotes !== undefined) sr.resolutionNotes = resolutionNotes;
  sr.updatedAt = new Date().toISOString();

  if (assignedTechnicianId) {
    const emp = db.employees.find((e) => e.id === assignedTechnicianId);
    if (emp) {
      createNotification(db, {
        userId: emp.userId,
        type: 'SERVICE_ASSIGNED',
        title: `Service Assigned: ${sr.ticketNumber}`,
        message: `${sr.subject} · ${sr.equipmentCategory}`,
        link: '/employee/service',
      });
    }
  }

  const cust = db.customers.find((c) => c.id === sr.customerId);
  if (cust?.userId) {
    createNotification(db, {
      userId: cust.userId,
      type: 'SERVICE_UPDATE',
      title: `Service Ticket Update: ${sr.ticketNumber}`,
      message: `Status changed to ${sr.status.replace(/_/g, ' ')}.`,
      link: '/customer/service',
    });
  }

  saveDb(db);
  res.json(sr);
});

// ---------------- AMC RECORDS ----------------
const amcSchema = z.object({
  customerId: z.string().min(1),
  projectId: z.string().nullable().optional(),
  equipmentName: z.string().trim().min(2),
  frequency: z.string().trim().min(2),
  startDate: z.string().min(4),
  expiryDate: z.string().min(4),
  nextServiceDate: z.string().min(4),
  contractValue: z.number().nonnegative(),
  status: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED']).default('ACTIVE'),
  notes: z.string().optional().or(z.literal('')),
});

router.get('/amc', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  let list = db.amcRecords;
  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((a) => a.customerId === cust.id) : [];
  }
  const custMap = new Map(db.customers.map((c) => [c.id, c]));
  res.json(
    list.map((a) => ({
      ...a,
      customerName: custMap.get(a.customerId)?.fullName || '',
      customerCompany: custMap.get(a.customerId)?.companyName || '',
    }))
  );
});

router.post('/amc', requireAuth, requireRole('ADMIN'), validateBody(amcSchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof amcSchema>;
  const now = new Date().toISOString();
  const contractNumber = nextSequence(db, 'amc', 'AVQ-AMC');

  const record = {
    id: generateId('amc'),
    contractNumber,
    customerId: body.customerId,
    projectId: body.projectId || null,
    equipmentName: body.equipmentName,
    frequency: body.frequency,
    startDate: body.startDate,
    expiryDate: body.expiryDate,
    nextServiceDate: body.nextServiceDate,
    lastServiceDate: null,
    contractValue: body.contractValue,
    status: body.status,
    notes: body.notes || '',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.amcRecords.unshift(record);
  const cust = db.customers.find((c) => c.id === body.customerId);
  if (cust?.userId) {
    createNotification(db, {
      userId: cust.userId,
      type: 'AMC_REMINDER',
      title: `AMC Activated: ${contractNumber}`,
      message: `${body.equipmentName} · Next scheduled visit: ${body.nextServiceDate}`,
      link: '/customer/amc',
    });
  }

  saveDb(db);
  res.status(201).json(record);
});

router.put('/amc/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const record = db.amcRecords.find((a) => a.id === req.params.id);
  if (!record) {
    res.status(404).json({ error: 'AMC record not found' });
    return;
  }
  Object.assign(record, req.body, { updatedAt: new Date().toISOString() });
  saveDb(db);
  res.json(record);
});

router.delete('/amc/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.amcRecords.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'AMC record not found' });
    return;
  }
  db.amcRecords.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'AMC record deleted' });
});

// ---------------- NOTIFICATIONS ----------------
router.get('/notifications', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const list = db.notifications.filter(
    (n) => n.userId === req.auth!.userId || (n.targetRole === req.auth!.role && !n.userId)
  );
  res.json(list.slice(0, 50));
});

router.put('/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif && (notif.userId === req.auth!.userId || notif.targetRole === req.auth!.role)) {
    notif.isRead = true;
    saveDb(db);
  }
  res.json({ ok: true });
});

router.put('/notifications/read-all', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  for (const n of db.notifications) {
    if (n.userId === req.auth!.userId || (n.targetRole === req.auth!.role && !n.userId)) {
      n.isRead = true;
    }
  }
  saveDb(db);
  res.json({ ok: true });
});

// ---------------- PERSISTENT FILE UPLOADS ----------------
router.post('/files/upload', requireAuth, uploadMiddleware.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file attached.' });
    return;
  }

  const category = (req.body?.category || 'PROJECT_PHOTO') as
    | 'PRODUCT_IMAGE'
    | 'PROJECT_PHOTO'
    | 'CUSTOMER_DOCUMENT'
    | 'INSTALLATION_REPORT';

  const db = getDb();
  const base64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
  const id = generateId('file');

  const fileRecord = {
    id,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    category,
    dataUrl,
    uploadedById: req.auth!.userId,
    projectId: req.body?.projectId || null,
    customerId: req.body?.customerId || null,
    createdAt: new Date().toISOString(),
  };

  db.uploadedFiles.unshift(fileRecord);
  saveDb(db);

  res.status(201).json({
    id: fileRecord.id,
    fileName: fileRecord.fileName,
    mimeType: fileRecord.mimeType,
    sizeBytes: fileRecord.sizeBytes,
    category: fileRecord.category,
    projectId: fileRecord.projectId,
    url: `/api/files/${fileRecord.id}`,
    createdAt: fileRecord.createdAt,
  });
});

router.get('/files', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  let files = db.uploadedFiles;
  if (typeof req.query.projectId === 'string') {
    files = files.filter((f) => f.projectId === req.query.projectId);
  }
  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    const custProjIds = new Set(db.projects.filter((p) => cust && p.customerId === cust.id).map((p) => p.id));
    files = files.filter((f) => (cust && f.customerId === cust.id) || (f.projectId && custProjIds.has(f.projectId)));
  }
  res.json(
    files.map(({ dataUrl: _omit, ...meta }) => ({
      ...meta,
      url: `/api/files/${meta.id}`,
    }))
  );
});

router.get('/files/:id', (req, res) => {
  const db = getDb();
  const file = db.uploadedFiles.find((f) => f.id === req.params.id);
  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  const base64Part = file.dataUrl.split(',')[1] || '';
  const buffer = Buffer.from(base64Part, 'base64');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${file.fileName.replace(/"/g, '')}"`);
  res.send(buffer);
});

router.delete('/files/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req, res) => {
  const db = getDb();
  const idx = db.uploadedFiles.findIndex((f) => f.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'File not found' });
    return;
  }
  db.uploadedFiles.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'File deleted' });
});

// ---------------- REPORTS & OVERVIEW ----------------
router.get('/reports/overview', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();

  if (req.auth!.role === 'ADMIN') {
    const totalRevenue = db.payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayments = db.invoices.reduce(
      (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
      0
    );

    res.json({
      totalCustomers: db.customers.length,
      totalEmployees: db.employees.length,
      totalEnquiries: db.enquiries.length,
      pendingEnquiries: db.enquiries.filter((e) => !['CONVERTED_TO_PROJECT', 'REJECTED'].includes(e.status)).length,
      activeProjects: db.projects.filter((p) => !['COMPLETED', 'ON_HOLD'].includes(p.status)).length,
      completedProjects: db.projects.filter((p) => p.status === 'COMPLETED').length,
      totalQuotations: db.quotations.length,
      pendingPayments: Number(pendingPayments.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      openServiceRequests: db.serviceRequests.filter((s) => s.status !== 'CLOSED' && s.status !== 'RESOLVED').length,
      activeAmcs: db.amcRecords.filter((a) => a.status === 'ACTIVE' || a.status === 'EXPIRING_SOON').length,
    });
    return;
  }

  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    const assignedProjects = emp ? db.projects.filter((p) => p.assignedEmployeeIds.includes(emp.id)) : [];
    const assignedEnquiries = emp ? db.enquiries.filter((e) => e.assignedEmployeeId === emp.id) : [];
    const upcomingVisits = emp ? db.siteVisits.filter((v) => v.employeeId === emp.id && v.status === 'Scheduled') : [];
    const tasks = emp ? db.projectTasks.filter((t) => t.assignedToEmployeeId === emp.id) : [];
    const serviceRequests = emp ? db.serviceRequests.filter((s) => s.assignedTechnicianId === emp.id) : [];

    res.json({
      assignedProjects: assignedProjects.length,
      assignedEnquiries: assignedEnquiries.length,
      upcomingSiteVisits: upcomingVisits.length,
      pendingTasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      serviceRequests: serviceRequests.length,
    });
    return;
  }

  const cust = db.customers.find((c) => c.userId === req.auth!.userId);
  const custId = cust?.id || '';
  const enquiries = db.enquiries.filter((e) => e.customerId === custId);
  const quotations = db.quotations.filter((q) => q.customerId === custId && q.status !== 'DRAFT');
  const projects = db.projects.filter((p) => p.customerId === custId);
  const invoices = db.invoices.filter((i) => i.customerId === custId);
  const serviceRequests = db.serviceRequests.filter((s) => s.customerId === custId);
  const amcRecords = db.amcRecords.filter((a) => a.customerId === custId);
  const pendingBalance = invoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount), 0);

  res.json({
    enquiriesCount: enquiries.length,
    quotationsCount: quotations.length,
    projectsCount: projects.length,
    activeProjectsCount: projects.filter((p) => p.status !== 'COMPLETED').length,
    invoicesCount: invoices.length,
    pendingBalance: Number(pendingBalance.toFixed(2)),
    serviceRequestsCount: serviceRequests.length,
    amcCount: amcRecords.length,
  });
});

router.get('/reports/analytics', requireAuth, requireRole('ADMIN'), (_req, res) => {
  const db = getDb();

  const customerReports = db.customers.map((c) => {
    const projects = db.projects.filter((p) => p.customerId === c.id);
    const invoices = db.invoices.filter((i) => i.customerId === c.id);
    const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
    return {
      id: c.id,
      fullName: c.fullName,
      companyName: c.companyName || '-',
      city: c.city,
      projectCount: projects.length,
      totalBilled,
      totalPaid,
      pendingAmount: Math.max(0, totalBilled - totalPaid),
      isSample: !!c.isSample,
    };
  });

  const salesReports = db.quotations.map((q) => {
    const c = db.customers.find((cust) => cust.id === q.customerId);
    return {
      quotationNumber: q.quotationNumber,
      customerName: c?.fullName || '-',
      title: q.title,
      totalAmount: q.totalAmount,
      status: q.status,
      validUntil: q.validUntil,
      isSample: !!q.isSample,
    };
  });

  const projectReports = db.projects.map((p) => {
    const c = db.customers.find((cust) => cust.id === p.customerId);
    return {
      projectCode: p.projectCode,
      name: p.name,
      customerName: c?.fullName || '-',
      serviceCategory: p.serviceCategory,
      status: p.status,
      progressPercentage: p.progressPercentage,
      projectCost: p.projectCost,
      isSample: !!p.isSample,
    };
  });

  const pendingPaymentsReport = db.invoices
    .filter((i) => i.totalAmount - i.paidAmount > 0.01)
    .map((i) => {
      const c = db.customers.find((cust) => cust.id === i.customerId);
      return {
        invoiceNumber: i.invoiceNumber,
        customerName: c?.fullName || '-',
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        totalAmount: i.totalAmount,
        paidAmount: i.paidAmount,
        pendingAmount: Number((i.totalAmount - i.paidAmount).toFixed(2)),
        status: i.status,
      };
    });

  const employeeReports = db.employees.map((e) => {
    const u = db.users.find((usr) => usr.id === e.userId);
    const projects = db.projects.filter((p) => p.assignedEmployeeIds.includes(e.id));
    const tasks = db.projectTasks.filter((t) => t.assignedToEmployeeId === e.id);
    const visits = db.siteVisits.filter((v) => v.employeeId === e.id);
    return {
      employeeCode: e.employeeCode,
      fullName: u?.fullName || '-',
      department: e.department,
      assignedProjects: projects.length,
      completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      pendingTasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
      siteVisits: visits.length,
    };
  });

  res.json({
    customerReports,
    salesReports,
    projectReports,
    revenueReports: db.payments.map((p) => ({
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      paymentType: p.paymentType,
      amount: p.amount,
      recordedBy: p.recordedBy,
    })),
    pendingPaymentsReport,
    employeeReports,
  });
});

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return 'No records\n';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

router.get('/reports/export/:type', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const type = req.params.type;
  let rows: Record<string, unknown>[] = [];

  if (type === 'customers') {
    rows = db.customers.map((c) => ({
      ID: c.id,
      Name: c.fullName,
      Company: c.companyName || '',
      Email: c.email,
      Phone: c.phone,
      City: c.city,
      GST: c.gstNumber || '',
    }));
  } else if (type === 'sales') {
    rows = db.quotations.map((q) => ({
      QuotationNumber: q.quotationNumber,
      Title: q.title,
      Subtotal: q.subtotal,
      Discount: q.discountAmount,
      GST: q.gstAmount,
      Total: q.totalAmount,
      Status: q.status,
      ValidUntil: q.validUntil,
    }));
  } else if (type === 'projects') {
    rows = db.projects.map((p) => ({
      ProjectCode: p.projectCode,
      Name: p.name,
      Category: p.serviceCategory,
      Location: p.location,
      Status: p.status,
      ProgressPercent: p.progressPercentage,
      Cost: p.projectCost,
    }));
  } else if (type === 'revenue') {
    rows = db.payments.map((p) => ({
      ReceiptNumber: p.receiptNumber,
      PaymentDate: p.paymentDate,
      Amount: p.amount,
      Type: p.paymentType,
      Method: p.paymentMethod,
      Reference: p.referenceNumber || '',
      RecordedBy: p.recordedBy,
    }));
  } else if (type === 'pending-payments') {
    rows = db.invoices
      .filter((i) => i.totalAmount - i.paidAmount > 0.01)
      .map((i) => ({
        InvoiceNumber: i.invoiceNumber,
        IssueDate: i.issueDate,
        DueDate: i.dueDate,
        Total: i.totalAmount,
        Paid: i.paidAmount,
        Pending: Number((i.totalAmount - i.paidAmount).toFixed(2)),
        Status: i.status,
      }));
  } else if (type === 'employees') {
    rows = db.employees.map((e) => {
      const u = db.users.find((usr) => usr.id === e.userId);
      const tasks = db.projectTasks.filter((t) => t.assignedToEmployeeId === e.id);
      return {
        Code: e.employeeCode,
        Name: u?.fullName || '',
        Department: e.department,
        Designation: e.designation,
        CompletedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
        PendingTasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
      };
    });
  } else {
    res.status(400).json({ error: 'Unknown report type' });
    return;
  }

  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="newedge-${type}-report.csv"`);
  res.send(csv);
});

export default router;

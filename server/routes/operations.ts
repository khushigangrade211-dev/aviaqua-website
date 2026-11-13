import { Router } from 'express';
import { z } from 'zod';
import { getDb, saveDb, generateId, nextSequence, createNotification } from '../db/store.ts';
import { requireAuth, requireRole, validateBody, AuthRequest } from '../middleware/auth.ts';
import { sendEmailNotification } from '../utils/mailer.ts';

const router = Router();

// ---------------- QUOTATIONS ----------------
const lineItemSchema = z.object({
  productId: z.string().nullable().optional(),
  description: z.string().trim().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const quotationSchema = z.object({
  customerId: z.string().min(1),
  enquiryId: z.string().nullable().optional(),
  title: z.string().trim().min(2),
  discountAmount: z.number().nonnegative().default(0),
  gstPercent: z.number().min(0).max(28).default(18),
  validUntil: z.string().min(4),
  termsConditions: z.string().trim().min(2),
  notes: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});

router.get('/quotations', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  let list = db.quotations;

  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((q) => q.customerId === cust.id && q.status !== 'DRAFT') : [];
  } else if (req.auth!.role === 'EMPLOYEE') {
    res.status(403).json({ error: 'Employees do not have permission to access billing quotations.' });
    return;
  }

  const custMap = new Map(db.customers.map((c) => [c.id, c]));
  res.json(
    list.map((q) => ({
      ...q,
      customerName: custMap.get(q.customerId)?.fullName || 'Unknown Customer',
      customerCompany: custMap.get(q.customerId)?.companyName || '',
      customerEmail: custMap.get(q.customerId)?.email || '',
      customerPhone: custMap.get(q.customerId)?.phone || '',
      customerCity: custMap.get(q.customerId)?.city || '',
      customerAddress: custMap.get(q.customerId)?.address || '',
    }))
  );
});

router.post('/quotations', requireAuth, requireRole('ADMIN'), validateBody(quotationSchema), async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof quotationSchema>;
  const customer = db.customers.find((c) => c.id === body.customerId);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const now = new Date().toISOString();
  const qtId = generateId('qt');
  const quotationNumber = nextSequence(db, 'qt', 'AVQ-QT');

  const items = body.items.map((item) => ({
    id: generateId('qti'),
    quotationId: qtId,
    productId: item.productId || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
  }));

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);
  const taxable = Math.max(0, subtotal - body.discountAmount);
  const gstAmount = Number(((taxable * body.gstPercent) / 100).toFixed(2));
  const totalAmount = Number((taxable + gstAmount).toFixed(2));

  const quotation = {
    id: qtId,
    quotationNumber,
    customerId: body.customerId,
    enquiryId: body.enquiryId || null,
    title: body.title,
    subtotal,
    discountAmount: body.discountAmount,
    gstPercent: body.gstPercent,
    gstAmount,
    totalAmount,
    validUntil: body.validUntil,
    termsConditions: body.termsConditions,
    notes: body.notes || '',
    status: body.status,
    items,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.quotations.unshift(quotation);

  if (body.enquiryId) {
    const enq = db.enquiries.find((e) => e.id === body.enquiryId);
    if (enq && body.status === 'SENT') {
      enq.status = 'QUOTATION_SENT';
      enq.updatedAt = now;
    }
  }

  if (customer.userId && body.status === 'SENT') {
    createNotification(db, {
      userId: customer.userId,
      type: 'QUOTATION_CREATED',
      title: `New Quotation: ${quotationNumber}`,
      message: `${body.title} · Total INR ${totalAmount.toLocaleString('en-IN')}`,
      link: '/customer/quotations',
    });
  }

  saveDb(db);

  if (body.status === 'SENT' && customer.email) {
    await sendEmailNotification({
      to: customer.email,
      subject: `[NewEdgeEngineeringAndWorks] Quotation ${quotationNumber} - ${body.title}`,
      text: `Dear ${customer.fullName}, your quotation ${quotationNumber} totaling INR ${totalAmount.toLocaleString('en-IN')} is available in your NewEdgeEngineeringAndWorks Customer Portal.`,
    });
  }

  res.status(201).json(quotation);
});

router.put('/quotations/:id', requireAuth, requireRole('ADMIN'), validateBody(quotationSchema.partial()), (req, res) => {
  const db = getDb();
  const qt = db.quotations.find((q) => q.id === req.params.id);
  if (!qt) {
    res.status(404).json({ error: 'Quotation not found' });
    return;
  }

  const body = req.body as Partial<z.infer<typeof quotationSchema>>;
  const now = new Date().toISOString();

  if (body.items) {
    qt.items = body.items.map((item) => ({
      id: generateId('qti'),
      quotationId: qt.id,
      productId: item.productId || null,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
    }));
  }

  if (body.title !== undefined) qt.title = body.title;
  if (body.discountAmount !== undefined) qt.discountAmount = body.discountAmount;
  if (body.gstPercent !== undefined) qt.gstPercent = body.gstPercent;
  if (body.validUntil !== undefined) qt.validUntil = body.validUntil;
  if (body.termsConditions !== undefined) qt.termsConditions = body.termsConditions;
  if (body.notes !== undefined) qt.notes = body.notes;
  if (body.status !== undefined) qt.status = body.status;

  qt.subtotal = qt.items.reduce((acc, i) => acc + i.lineTotal, 0);
  const taxable = Math.max(0, qt.subtotal - qt.discountAmount);
  qt.gstAmount = Number(((taxable * qt.gstPercent) / 100).toFixed(2));
  qt.totalAmount = Number((taxable + qt.gstAmount).toFixed(2));
  qt.updatedAt = now;

  if (qt.status === 'SENT') {
    const cust = db.customers.find((c) => c.id === qt.customerId);
    if (cust?.userId) {
      createNotification(db, {
        userId: cust.userId,
        type: 'QUOTATION_CREATED',
        title: `Quotation Ready: ${qt.quotationNumber}`,
        message: `${qt.title} has been shared for your review.`,
        link: '/customer/quotations',
      });
    }
  }

  saveDb(db);
  res.json(qt);
});

router.post('/quotations/:id/respond', requireAuth, requireRole('CUSTOMER'), (req: AuthRequest, res) => {
  const db = getDb();
  const cust = db.customers.find((c) => c.userId === req.auth!.userId);
  const qt = db.quotations.find((q) => q.id === req.params.id);

  if (!qt || !cust || qt.customerId !== cust.id) {
    res.status(404).json({ error: 'Quotation not found' });
    return;
  }

  const decision = req.body?.decision;
  if (decision !== 'ACCEPTED' && decision !== 'REJECTED') {
    res.status(400).json({ error: 'Decision must be ACCEPTED or REJECTED' });
    return;
  }

  qt.status = decision;
  qt.updatedAt = new Date().toISOString();

  createNotification(db, {
    targetRole: 'ADMIN',
    type: 'QUOTATION_RESPONSE',
    title: `Quotation ${decision}: ${qt.quotationNumber}`,
    message: `${cust.fullName} ${decision.toLowerCase()} quotation ${qt.quotationNumber}.`,
    link: '/admin/quotations',
  });

  saveDb(db);
  res.json(qt);
});

router.delete('/quotations/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.quotations.findIndex((q) => q.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Quotation not found' });
    return;
  }
  db.quotations.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Quotation deleted' });
});

// ---------------- PROJECTS & TASKS ----------------
const projectSchema = z.object({
  customerId: z.string().min(1),
  quotationId: z.string().nullable().optional(),
  name: z.string().trim().min(2),
  serviceCategory: z.string().trim().min(2),
  location: z.string().trim().min(2),
  startDate: z.string().min(4),
  expectedCompletionDate: z.string().min(4),
  projectCost: z.number().nonnegative(),
  status: z
    .enum([
      'PLANNING',
      'SITE_INSPECTION',
      'QUOTATION_APPROVED',
      'MATERIAL_PROCUREMENT',
      'INSTALLATION',
      'TESTING',
      'COMPLETED',
      'ON_HOLD',
    ])
    .default('PLANNING'),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  description: z.string().trim().min(2),
  installationNotes: z.string().optional().or(z.literal('')),
  completionReport: z.string().optional().or(z.literal('')),
  assignedEmployeeIds: z.array(z.string()).default([]),
});

router.get('/projects', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  let list = db.projects;

  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((p) => p.customerId === cust.id) : [];
  } else if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    list = emp ? list.filter((p) => p.assignedEmployeeIds.includes(emp.id)) : [];
  }

  const custMap = new Map(db.customers.map((c) => [c.id, c]));
  const empMap = new Map(
    db.employees.map((e) => {
      const u = db.users.find((usr) => usr.id === e.userId);
      return [e.id, { id: e.id, fullName: u?.fullName || e.employeeCode, designation: e.designation }];
    })
  );

  res.json(
    list.map((p) => ({
      ...p,
      customerName: custMap.get(p.customerId)?.fullName || 'Unknown',
      customerCompany: custMap.get(p.customerId)?.companyName || '',
      assignedEmployees: p.assignedEmployeeIds.map((id) => empMap.get(id)).filter(Boolean),
      tasks: db.projectTasks.filter((t) => t.projectId === p.id),
      files: db.uploadedFiles
        .filter((f) => f.projectId === p.id)
        .map(({ dataUrl: _omit, ...meta }) => ({ ...meta, url: `/api/files/${meta.id}` })),
    }))
  );
});

router.post('/projects', requireAuth, requireRole('ADMIN'), validateBody(projectSchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof projectSchema>;
  const customer = db.customers.find((c) => c.id === body.customerId);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const now = new Date().toISOString();
  const projectCode = nextSequence(db, 'prj', 'AVQ-PRJ');
  const projectId = generateId('prj');

  const project = {
    id: projectId,
    projectCode,
    customerId: body.customerId,
    quotationId: body.quotationId || null,
    name: body.name,
    serviceCategory: body.serviceCategory,
    location: body.location,
    startDate: body.startDate,
    expectedCompletionDate: body.expectedCompletionDate,
    actualCompletionDate: body.status === 'COMPLETED' ? now.slice(0, 10) : null,
    projectCost: body.projectCost,
    status: body.status,
    progressPercentage: body.progressPercentage,
    description: body.description,
    installationNotes: body.installationNotes || '',
    completionReport: body.completionReport || '',
    assignedEmployeeIds: body.assignedEmployeeIds,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.projects.unshift(project);

  for (const empId of body.assignedEmployeeIds) {
    db.projectAssignments.push({
      id: generateId('pa'),
      projectId,
      employeeId: empId,
      roleOnSite: 'Project Engineer',
      assignedAt: now,
    });
    const emp = db.employees.find((e) => e.id === empId);
    if (emp) {
      createNotification(db, {
        userId: emp.userId,
        type: 'PROJECT_ASSIGNED',
        title: `Assigned to ${projectCode}`,
        message: `${body.name} · ${body.location}`,
        link: '/employee/projects',
      });
    }
  }

  if (customer.userId) {
    createNotification(db, {
      userId: customer.userId,
      type: 'PROJECT_UPDATE',
      title: `Project Created: ${projectCode}`,
      message: `${body.name} is now in ${body.status.replace(/_/g, ' ')}.`,
      link: '/customer/projects',
    });
  }

  saveDb(db);
  res.status(201).json(project);
});

router.put('/projects/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req: AuthRequest, res) => {
  const db = getDb();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    if (!emp || !project.assignedEmployeeIds.includes(emp.id)) {
      res.status(403).json({ error: 'You are not assigned to this project.' });
      return;
    }
  }

  const now = new Date().toISOString();
  const body = req.body || {};

  if (req.auth!.role === 'ADMIN') {
    if (body.name !== undefined) project.name = body.name;
    if (body.serviceCategory !== undefined) project.serviceCategory = body.serviceCategory;
    if (body.location !== undefined) project.location = body.location;
    if (body.startDate !== undefined) project.startDate = body.startDate;
    if (body.expectedCompletionDate !== undefined) project.expectedCompletionDate = body.expectedCompletionDate;
    if (body.projectCost !== undefined) project.projectCost = Number(body.projectCost);
    if (body.description !== undefined) project.description = body.description;
    if (Array.isArray(body.assignedEmployeeIds)) project.assignedEmployeeIds = body.assignedEmployeeIds;
  }

  if (body.status !== undefined) project.status = body.status;
  if (body.progressPercentage !== undefined) {
    project.progressPercentage = Math.max(0, Math.min(100, Number(body.progressPercentage)));
  }
  if (body.installationNotes !== undefined) project.installationNotes = body.installationNotes;
  if (body.completionReport !== undefined) project.completionReport = body.completionReport;
  if (project.status === 'COMPLETED' && !project.actualCompletionDate) {
    project.actualCompletionDate = now.slice(0, 10);
    project.progressPercentage = 100;
  }
  project.updatedAt = now;

  const cust = db.customers.find((c) => c.id === project.customerId);
  if (cust?.userId) {
    createNotification(db, {
      userId: cust.userId,
      type: 'PROJECT_UPDATE',
      title: `Project Update: ${project.projectCode}`,
      message: `${project.name} is at ${project.progressPercentage}% (${project.status.replace(/_/g, ' ')}).`,
      link: '/customer/projects',
    });
  }

  if (req.auth!.role === 'EMPLOYEE') {
    createNotification(db, {
      targetRole: 'ADMIN',
      type: 'PROJECT_UPDATE',
      title: `Field Update on ${project.projectCode}`,
      message: `${req.auth!.fullName} updated progress to ${project.progressPercentage}% (${project.status.replace(/_/g, ' ')}).`,
      link: '/admin/projects',
    });
  }

  saveDb(db);
  res.json(project);
});

router.delete('/projects/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  db.projects.splice(idx, 1);
  db.projectTasks = db.projectTasks.filter((t) => t.projectId !== req.params.id);
  saveDb(db);
  res.json({ message: 'Project deleted' });
});

// Tasks
const taskSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().optional().or(z.literal('')),
  assignedToEmployeeId: z.string().nullable().optional(),
  dueDate: z.string().optional().or(z.literal('')),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).default('PENDING'),
  notes: z.string().optional().or(z.literal('')),
});

router.post('/projects/:id/tasks', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), validateBody(taskSchema), (req, res) => {
  const db = getDb();
  const project = db.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const now = new Date().toISOString();
  const body = req.body as z.infer<typeof taskSchema>;
  const task = {
    id: generateId('tsk'),
    projectId: project.id,
    assignedToEmployeeId: body.assignedToEmployeeId || null,
    title: body.title,
    description: body.description || '',
    status: body.status,
    dueDate: body.dueDate || '',
    notes: body.notes || '',
    completedAt: body.status === 'COMPLETED' ? now : null,
    createdAt: now,
    updatedAt: now,
  };
  db.projectTasks.push(task);
  saveDb(db);
  res.status(201).json(task);
});

router.put('/tasks/:taskId', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req: AuthRequest, res) => {
  const db = getDb();
  const task = db.projectTasks.find((t) => t.id === req.params.taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  const now = new Date().toISOString();
  const { status, notes, title, dueDate, assignedToEmployeeId } = req.body || {};
  if (status) {
    task.status = status;
    task.completedAt = status === 'COMPLETED' ? now : null;
  }
  if (notes !== undefined) task.notes = notes;
  if (title !== undefined) task.title = title;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (assignedToEmployeeId !== undefined) task.assignedToEmployeeId = assignedToEmployeeId;
  task.updatedAt = now;
  saveDb(db);
  res.json(task);
});

router.delete('/tasks/:taskId', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.projectTasks.findIndex((t) => t.id === req.params.taskId);
  if (idx === -1) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  db.projectTasks.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Task deleted' });
});

// ---------------- SITE VISITS ----------------
const siteVisitSchema = z.object({
  enquiryId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  employeeId: z.string().min(1),
  scheduledDate: z.string().min(4),
  location: z.string().trim().min(2),
  purpose: z.string().trim().min(2),
  findings: z.string().optional().or(z.literal('')),
  status: z.enum(['Scheduled', 'Completed', 'Rescheduled', 'Cancelled']).default('Scheduled'),
});

router.get('/site-visits', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req: AuthRequest, res) => {
  const db = getDb();
  let list = db.siteVisits;
  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    list = emp ? list.filter((s) => s.employeeId === emp.id) : [];
  }
  const empMap = new Map(
    db.employees.map((e) => {
      const u = db.users.find((usr) => usr.id === e.userId);
      return [e.id, u?.fullName || e.employeeCode];
    })
  );
  res.json(list.map((s) => ({ ...s, employeeName: empMap.get(s.employeeId) || '' })));
});

router.post('/site-visits', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), validateBody(siteVisitSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof siteVisitSchema>;
  const now = new Date().toISOString();
  const visit = {
    id: generateId('sv'),
    enquiryId: body.enquiryId || null,
    projectId: body.projectId || null,
    employeeId: body.employeeId,
    scheduledDate: body.scheduledDate,
    location: body.location,
    purpose: body.purpose,
    findings: body.findings || '',
    status: body.status,
    createdAt: now,
    updatedAt: now,
  };
  db.siteVisits.unshift(visit);
  saveDb(db);
  res.status(201).json(visit);
});

router.put('/site-visits/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req, res) => {
  const db = getDb();
  const visit = db.siteVisits.find((s) => s.id === req.params.id);
  if (!visit) {
    res.status(404).json({ error: 'Site visit not found' });
    return;
  }
  Object.assign(visit, req.body, { updatedAt: new Date().toISOString() });
  saveDb(db);
  res.json(visit);
});

// ---------------- INVOICES & PAYMENTS ----------------
const invoiceSchema = z.object({
  customerId: z.string().min(1),
  projectId: z.string().nullable().optional(),
  quotationId: z.string().nullable().optional(),
  issueDate: z.string().min(4),
  dueDate: z.string().min(4),
  gstPercent: z.number().min(0).max(28).default(18),
  paymentTerms: z.string().trim().min(2),
  notes: z.string().optional().or(z.literal('')),
  items: z.array(lineItemSchema).min(1),
});

router.get('/invoices', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  if (req.auth!.role === 'EMPLOYEE') {
    res.status(403).json({ error: 'Employees do not have permission to access billing invoices.' });
    return;
  }
  let list = db.invoices;
  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((i) => i.customerId === cust.id) : [];
  }
  const custMap = new Map(db.customers.map((c) => [c.id, c]));
  res.json(
    list.map((inv) => ({
      ...inv,
      pendingAmount: Math.max(0, Number((inv.totalAmount - inv.paidAmount).toFixed(2))),
      customerName: custMap.get(inv.customerId)?.fullName || 'Unknown',
      customerCompany: custMap.get(inv.customerId)?.companyName || '',
      customerEmail: custMap.get(inv.customerId)?.email || '',
      customerPhone: custMap.get(inv.customerId)?.phone || '',
      customerAddress: custMap.get(inv.customerId)?.address || '',
      customerCity: custMap.get(inv.customerId)?.city || '',
      customerGst: custMap.get(inv.customerId)?.gstNumber || '',
    }))
  );
});

router.post('/invoices', requireAuth, requireRole('ADMIN'), validateBody(invoiceSchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof invoiceSchema>;
  const customer = db.customers.find((c) => c.id === body.customerId);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const now = new Date().toISOString();
  const invId = generateId('inv');
  const invoiceNumber = nextSequence(db, 'inv', 'AVQ-INV');

  const items = body.items.map((item) => ({
    id: generateId('invi'),
    invoiceId: invId,
    productId: item.productId || null,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: Number((item.quantity * item.unitPrice).toFixed(2)),
  }));

  const subtotal = items.reduce((acc, i) => acc + i.lineTotal, 0);
  const gstAmount = Number(((subtotal * body.gstPercent) / 100).toFixed(2));
  const totalAmount = Number((subtotal + gstAmount).toFixed(2));

  const invoice = {
    id: invId,
    invoiceNumber,
    customerId: body.customerId,
    projectId: body.projectId || null,
    quotationId: body.quotationId || null,
    issueDate: body.issueDate,
    dueDate: body.dueDate,
    subtotal,
    gstPercent: body.gstPercent,
    gstAmount,
    totalAmount,
    paidAmount: 0,
    paymentTerms: body.paymentTerms,
    notes: body.notes || '',
    status: 'UNPAID' as const,
    items,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.invoices.unshift(invoice);

  if (customer.userId) {
    createNotification(db, {
      userId: customer.userId,
      type: 'INVOICE_ISSUED',
      title: `New Invoice: ${invoiceNumber}`,
      message: `Amount INR ${totalAmount.toLocaleString('en-IN')} · Due ${body.dueDate}`,
      link: '/customer/invoices',
    });
  }

  saveDb(db);
  res.status(201).json(invoice);
});

router.put('/invoices/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const inv = db.invoices.find((i) => i.id === req.params.id);
  if (!inv) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  const { status, dueDate, paymentTerms, notes } = req.body || {};
  if (status) inv.status = status;
  if (dueDate) inv.dueDate = dueDate;
  if (paymentTerms) inv.paymentTerms = paymentTerms;
  if (notes !== undefined) inv.notes = notes;
  inv.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json(inv);
});

router.delete('/invoices/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.invoices.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  db.invoices.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Invoice deleted' });
});

// Payments (Manual Recording ONLY — no simulated online payments)
const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
  paymentType: z.enum(['ADVANCE', 'PARTIAL', 'FINAL']),
  paymentMethod: z.enum(['UPI', 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
  referenceNumber: z.string().optional().or(z.literal('')),
  paymentDate: z.string().min(4),
  notes: z.string().optional().or(z.literal('')),
});

router.get('/payments', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  if (req.auth!.role === 'EMPLOYEE') {
    res.status(403).json({ error: 'Employees do not have permission to access financial payments.' });
    return;
  }
  let list = db.payments;
  if (req.auth!.role === 'CUSTOMER') {
    const cust = db.customers.find((c) => c.userId === req.auth!.userId);
    list = cust ? list.filter((p) => p.customerId === cust.id) : [];
  }
  const invMap = new Map(db.invoices.map((i) => [i.id, i]));
  const custMap = new Map(db.customers.map((c) => [c.id, c]));

  res.json(
    list.map((p) => ({
      ...p,
      invoiceNumber: invMap.get(p.invoiceId)?.invoiceNumber || '',
      customerName: custMap.get(p.customerId)?.fullName || '',
      customerCompany: custMap.get(p.customerId)?.companyName || '',
    }))
  );
});

router.post('/payments', requireAuth, requireRole('ADMIN'), validateBody(paymentSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof paymentSchema>;
  const invoice = db.invoices.find((i) => i.id === body.invoiceId);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const remaining = Number((invoice.totalAmount - invoice.paidAmount).toFixed(2));
  if (body.amount > remaining + 0.01) {
    res.status(400).json({ error: `Payment exceeds pending invoice balance (INR ${remaining.toLocaleString('en-IN')}).` });
    return;
  }

  const now = new Date().toISOString();
  const receiptNumber = nextSequence(db, 'rcpt', 'AVQ-RCPT');

  const payment = {
    id: generateId('pay'),
    receiptNumber,
    invoiceId: invoice.id,
    customerId: invoice.customerId,
    amount: body.amount,
    paymentType: body.paymentType,
    paymentMethod: body.paymentMethod,
    referenceNumber: body.referenceNumber || '',
    paymentDate: body.paymentDate,
    notes: body.notes || '',
    recordedBy: req.auth!.fullName,
    isSample: false,
    createdAt: now,
  };

  db.payments.unshift(payment);
  invoice.paidAmount = Number((invoice.paidAmount + body.amount).toFixed(2));
  invoice.status = invoice.paidAmount >= invoice.totalAmount - 0.01 ? 'PAID' : 'PARTIALLY_PAID';
  invoice.updatedAt = now;

  const customer = db.customers.find((c) => c.id === invoice.customerId);
  if (customer?.userId) {
    createNotification(db, {
      userId: customer.userId,
      type: 'PAYMENT_RECORDED',
      title: `Payment Receipt ${receiptNumber}`,
      message: `INR ${body.amount.toLocaleString('en-IN')} recorded against ${invoice.invoiceNumber} via ${body.paymentMethod}.`,
      link: '/customer/payments',
    });
  }

  saveDb(db);
  res.status(201).json({ payment, invoice });
});

export default router;

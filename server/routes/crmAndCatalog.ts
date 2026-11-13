import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb, saveDb, generateId, nextSequence, createNotification } from '../db/store.ts';
import { requireAuth, requireRole, validateBody, AuthRequest } from '../middleware/auth.ts';
import { EnquiryStatus } from '../types.ts';

const router = Router();

// ---------------- CUSTOMERS ----------------
const customerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8),
  companyName: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  gstNumber: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
});

router.get('/customers', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req: AuthRequest, res) => {
  const db = getDb();
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';
  const city = typeof req.query.city === 'string' ? req.query.city.toLowerCase().trim() : '';

  let list = db.customers;
  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    const assignedProjectCustomerIds = new Set(
      db.projects
        .filter((p) => emp && p.assignedEmployeeIds.includes(emp.id))
        .map((p) => p.customerId)
    );
    const assignedEnquiryCustomerIds = new Set(
      db.enquiries
        .filter((enq) => emp && enq.assignedEmployeeId === emp.id && enq.customerId)
        .map((enq) => enq.customerId as string)
    );
    list = list.filter((c) => assignedProjectCustomerIds.has(c.id) || assignedEnquiryCustomerIds.has(c.id));
  }

  if (search) {
    list = list.filter(
      (c) =>
        c.fullName.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.toLowerCase().includes(search) ||
        (c.companyName || '').toLowerCase().includes(search)
    );
  }
  if (city) {
    list = list.filter((c) => c.city.toLowerCase().includes(city));
  }

  res.json(list);
});

router.get('/customers/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (req, res) => {
  const db = getDb();
  const customer = db.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const enquiries = db.enquiries.filter((e) => e.customerId === customer.id);
  const quotations = db.quotations.filter((q) => q.customerId === customer.id);
  const projects = db.projects.filter((p) => p.customerId === customer.id);
  const invoices = db.invoices.filter((i) => i.customerId === customer.id);
  const payments = db.payments.filter((p) => p.customerId === customer.id);
  const serviceRequests = db.serviceRequests.filter((s) => s.customerId === customer.id);
  const amcRecords = db.amcRecords.filter((a) => a.customerId === customer.id);

  res.json({
    customer,
    history: {
      enquiries,
      quotations,
      projects,
      invoices,
      payments,
      serviceRequests,
      amcRecords,
    },
  });
});

router.post('/customers', requireAuth, requireRole('ADMIN'), validateBody(customerSchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof customerSchema>;
  const now = new Date().toISOString();

  const customer = {
    id: generateId('cust'),
    userId: null,
    fullName: body.fullName,
    email: body.email.toLowerCase(),
    phone: body.phone,
    companyName: body.companyName || '',
    address: body.address || '',
    city: body.city || 'Indore, Madhya Pradesh',
    gstNumber: body.gstNumber || '',
    notes: body.notes || '',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.customers.unshift(customer);
  saveDb(db);
  res.status(201).json(customer);
});

router.put('/customers/:id', requireAuth, requireRole('ADMIN'), validateBody(customerSchema), (req, res) => {
  const db = getDb();
  const customer = db.customers.find((c) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const body = req.body as z.infer<typeof customerSchema>;
  Object.assign(customer, {
    fullName: body.fullName,
    email: body.email.toLowerCase(),
    phone: body.phone,
    companyName: body.companyName || '',
    address: body.address || '',
    city: body.city || customer.city,
    gstNumber: body.gstNumber || '',
    notes: body.notes || '',
    updatedAt: new Date().toISOString(),
  });
  saveDb(db);
  res.json(customer);
});

router.delete('/customers/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.customers.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  db.customers.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Customer deleted' });
});

// ---------------- EMPLOYEES ----------------
const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(8),
  password: z.string().min(6),
  designation: z.string().trim().min(2),
  department: z.string().trim().min(2),
  specialty: z.string().trim().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'EMPLOYEE']).default('EMPLOYEE'),
});

router.get('/employees', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), (_req, res) => {
  const db = getDb();
  const enriched = db.employees.map((emp) => {
    const user = db.users.find((u) => u.id === emp.userId);
    const assignedProjects = db.projects.filter((p) => p.assignedEmployeeIds.includes(emp.id));
    const tasks = db.projectTasks.filter((t) => t.assignedToEmployeeId === emp.id);
    return {
      ...emp,
      fullName: user?.fullName || 'Staff Member',
      email: user?.email || '',
      phone: user?.phone || '',
      userRole: user?.role || 'EMPLOYEE',
      assignedProjectCount: assignedProjects.length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
      pendingTasks: tasks.filter((t) => t.status !== 'COMPLETED').length,
    };
  });
  res.json(enriched);
});

router.post('/employees', requireAuth, requireRole('ADMIN'), validateBody(createEmployeeSchema), async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof createEmployeeSchema>;
  const email = body.email.toLowerCase();

  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    res.status(409).json({ error: 'A user with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = generateId('usr');
  const passwordHash = await bcrypt.hash(body.password, 10);

  db.users.push({
    id: userId,
    email,
    passwordHash,
    fullName: body.fullName,
    phone: body.phone,
    role: body.role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const empCount = (db.counters.emp || db.employees.length) + 1;
  db.counters.emp = empCount;

  const employee = {
    id: generateId('emp'),
    userId,
    employeeCode: `AVQ-EMP-${String(empCount).padStart(3, '0')}`,
    designation: body.designation,
    department: body.department,
    specialty: body.specialty || '',
    joiningDate: now.slice(0, 10),
    isActive: true,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.employees.push(employee);
  saveDb(db);

  res.status(201).json({
    ...employee,
    fullName: body.fullName,
    email,
    phone: body.phone,
    userRole: body.role,
  });
});

const updateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(8).optional(),
  designation: z.string().trim().min(2).optional(),
  department: z.string().trim().min(2).optional(),
  specialty: z.string().trim().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
});

router.put('/employees/:id', requireAuth, requireRole('ADMIN'), validateBody(updateEmployeeSchema), (req, res) => {
  const db = getDb();
  const emp = db.employees.find((e) => e.id === req.params.id);
  if (!emp) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  const body = req.body as z.infer<typeof updateEmployeeSchema>;
  const user = db.users.find((u) => u.id === emp.userId);
  const now = new Date().toISOString();

  if (user) {
    if (body.fullName) user.fullName = body.fullName;
    if (body.phone) user.phone = body.phone;
    if (body.role) user.role = body.role;
    if (body.isActive !== undefined) user.isActive = body.isActive;
    user.updatedAt = now;
  }

  if (body.designation) emp.designation = body.designation;
  if (body.department) emp.department = body.department;
  if (body.specialty !== undefined) emp.specialty = body.specialty;
  if (body.isActive !== undefined) emp.isActive = body.isActive;
  emp.updatedAt = now;

  saveDb(db);
  res.json({
    ...emp,
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    userRole: user?.role || 'EMPLOYEE',
  });
});

router.delete('/employees/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.employees.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Employee not found' });
    return;
  }
  const [emp] = db.employees.splice(idx, 1);
  const user = db.users.find((u) => u.id === emp.userId);
  if (user) user.isActive = false;
  saveDb(db);
  res.json({ message: 'Employee deactivated and removed' });
});

// ---------------- CATEGORIES & PRODUCTS ----------------
const categorySchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional().or(z.literal('')),
  sortOrder: z.number().int().optional(),
});

router.get('/categories', requireAuth, (_req, res) => {
  const db = getDb();
  res.json([...db.categories].sort((a, b) => a.sortOrder - b.sortOrder));
});

router.post('/categories', requireAuth, requireRole('ADMIN'), validateBody(categorySchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof categorySchema>;
  const now = new Date().toISOString();
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const category = {
    id: generateId('cat'),
    name: body.name,
    slug,
    description: body.description || '',
    sortOrder: body.sortOrder ?? db.categories.length + 1,
    createdAt: now,
    updatedAt: now,
  };
  db.categories.push(category);
  saveDb(db);
  res.status(201).json(category);
});

router.delete('/categories/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  if (db.products.some((p) => p.categoryId === req.params.id)) {
    res.status(400).json({ error: 'Cannot delete category while products are assigned to it.' });
    return;
  }
  const idx = db.categories.findIndex((c) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  db.categories.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Category deleted' });
});

const productSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2),
  description: z.string().trim().min(5),
  capacity: z.string().trim().min(1),
  unitPrice: z.number().nonnegative(),
  gstRate: z.number().min(0).max(28).default(18),
  features: z.array(z.string()).default([]),
  specifications: z.record(z.string(), z.string()).optional(),
  imageUrl: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

router.get('/products', requireAuth, (_req, res) => {
  const db = getDb();
  const catMap = new Map(db.categories.map((c) => [c.id, c]));
  res.json(
    db.products.map((p) => ({
      ...p,
      categoryName: catMap.get(p.categoryId)?.name || 'General',
    }))
  );
});

router.post('/products', requireAuth, requireRole('ADMIN'), validateBody(productSchema), (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof productSchema>;
  const now = new Date().toISOString();
  const slug = `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

  const product = {
    id: generateId('prod'),
    categoryId: body.categoryId,
    name: body.name,
    slug,
    description: body.description,
    capacity: body.capacity,
    unitPrice: body.unitPrice,
    gstRate: body.gstRate,
    features: body.features,
    specifications: body.specifications || {},
    imageUrl: body.imageUrl || '/src/assets/images/service_ro_plant_1794558282836.jpg',
    isActive: body.isActive,
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.products.unshift(product);
  saveDb(db);
  res.status(201).json(product);
});

router.put('/products/:id', requireAuth, requireRole('ADMIN'), validateBody(productSchema.partial()), (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  Object.assign(product, req.body, { updatedAt: new Date().toISOString() });
  saveDb(db);
  res.json(product);
});

router.delete('/products/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  db.products.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Product deleted' });
});

// ---------------- ENQUIRIES ----------------
router.get('/enquiries', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';

  let list = db.enquiries;
  if (req.auth!.role === 'CUSTOMER') {
    const customer = db.customers.find((c) => c.userId === req.auth!.userId);
    list = customer ? list.filter((e) => e.customerId === customer.id || e.email?.toLowerCase() === customer.email.toLowerCase()) : [];
  } else if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    list = emp ? list.filter((e) => e.assignedEmployeeId === emp.id) : [];
  }

  if (statusFilter && statusFilter !== 'ALL') {
    list = list.filter((e) => e.status === statusFilter);
  }
  if (search) {
    list = list.filter(
      (e) =>
        e.referenceNumber.toLowerCase().includes(search) ||
        e.fullName.toLowerCase().includes(search) ||
        (e.companyName || '').toLowerCase().includes(search) ||
        e.serviceRequired.toLowerCase().includes(search)
    );
  }

  const empMap = new Map(
    db.employees.map((e) => {
      const u = db.users.find((usr) => usr.id === e.userId);
      return [e.id, u?.fullName || e.employeeCode];
    })
  );

  res.json(
    list.map((e) => ({
      ...e,
      assignedEmployeeName: e.assignedEmployeeId ? empMap.get(e.assignedEmployeeId) || '' : '',
    }))
  );
});

const enquiryUpdateSchema = z.object({
  status: z
    .enum(['NEW', 'CONTACTED', 'SITE_VISIT_SCHEDULED', 'QUOTATION_SENT', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PROJECT'])
    .optional(),
  assignedEmployeeId: z.string().nullable().optional(),
  internalNotes: z.string().optional(),
  customerId: z.string().nullable().optional(),
  preferredSiteVisitDate: z.string().optional(),
});

router.put('/enquiries/:id', requireAuth, requireRole('ADMIN', 'EMPLOYEE'), validateBody(enquiryUpdateSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const enq = db.enquiries.find((e) => e.id === req.params.id);
  if (!enq) {
    res.status(404).json({ error: 'Enquiry not found' });
    return;
  }

  if (req.auth!.role === 'EMPLOYEE') {
    const emp = db.employees.find((e) => e.userId === req.auth!.userId);
    if (!emp || enq.assignedEmployeeId !== emp.id) {
      res.status(403).json({ error: 'You can only update enquiries assigned to you.' });
      return;
    }
  }

  const body = req.body as z.infer<typeof enquiryUpdateSchema>;
  const prevAssignee = enq.assignedEmployeeId;

  if (body.status) enq.status = body.status as EnquiryStatus;
  if (req.auth!.role === 'ADMIN' && body.assignedEmployeeId !== undefined) {
    enq.assignedEmployeeId = body.assignedEmployeeId;
  }
  if (body.internalNotes !== undefined) enq.internalNotes = body.internalNotes;
  if (body.customerId !== undefined) enq.customerId = body.customerId;
  if (body.preferredSiteVisitDate !== undefined) enq.preferredSiteVisitDate = body.preferredSiteVisitDate;
  enq.updatedAt = new Date().toISOString();

  if (enq.assignedEmployeeId && enq.assignedEmployeeId !== prevAssignee) {
    const emp = db.employees.find((e) => e.id === enq.assignedEmployeeId);
    if (emp) {
      createNotification(db, {
        userId: emp.userId,
        type: 'ENQUIRY_ASSIGNED',
        title: `Enquiry Assigned: ${enq.referenceNumber}`,
        message: `${enq.fullName} · ${enq.serviceRequired} (${enq.city || 'MP'})`,
        link: '/employee/enquiries',
      });
    }
  }

  saveDb(db);
  res.json(enq);
});

router.delete('/enquiries/:id', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const idx = db.enquiries.findIndex((e) => e.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Enquiry not found' });
    return;
  }
  db.enquiries.splice(idx, 1);
  saveDb(db);
  res.json({ message: 'Enquiry deleted' });
});

// ---------------- COMPANY CONFIG / CREDENTIALS ----------------
router.put('/settings', requireAuth, requireRole('ADMIN'), (req, res) => {
  const db = getDb();
  const { phone, email, whatsappNumber, address, location, gstNumber, businessHours, certifications, heroStats } = req.body || {};

  if (phone) db.companyConfig.phone = String(phone);
  if (email) db.companyConfig.email = String(email);
  if (whatsappNumber) db.companyConfig.whatsappNumber = String(whatsappNumber);
  if (address) db.companyConfig.address = String(address);
  if (location) db.companyConfig.location = String(location);
  if (gstNumber !== undefined) db.companyConfig.gstNumber = String(gstNumber);
  if (businessHours) db.companyConfig.businessHours = String(businessHours);
  if (Array.isArray(certifications)) db.companyConfig.certifications = certifications;
  if (Array.isArray(heroStats)) db.companyConfig.heroStats = heroStats;
  db.companyConfig.updatedAt = new Date().toISOString();

  saveDb(db);
  res.json(db.companyConfig);
});

export default router;

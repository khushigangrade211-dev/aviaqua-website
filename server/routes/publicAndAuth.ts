import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getDb, saveDb, generateId, nextSequence, createNotification } from '../db/store.ts';
import { authRateLimiter, requireAuth, signToken, validateBody, AuthRequest } from '../middleware/auth.ts';
import { sendEmailNotification } from '../utils/mailer.ts';

const router = Router();

router.get('/health', (_req, res) => {
  const db = getDb();
  res.json({
    status: 'ok',
    service: 'NewEdgeEngineeringAndWorks API',
    timestamp: new Date().toISOString(),
    records: {
      products: db.products.length,
      customers: db.customers.length,
      projects: db.projects.length,
    },
  });
});

router.get('/public/config', (_req, res) => {
  const db = getDb();
  const cfg = db.companyConfig;
  res.json({
    ...cfg,
    verifiedCertifications: cfg.certifications.filter((c) => c.verified),
  });
});

router.get('/public/products', (req, res) => {
  const db = getDb();
  const categorySlug = typeof req.query.category === 'string' ? req.query.category : '';
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';

  const categories = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  let products = db.products.filter((p) => p.isActive);
  if (categorySlug && categorySlug !== 'all') {
    const matchedCat = categories.find((c) => c.slug === categorySlug || c.id === categorySlug);
    if (matchedCat) {
      products = products.filter((p) => p.categoryId === matchedCat.id);
    }
  }
  if (search) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search) ||
        p.capacity.toLowerCase().includes(search)
    );
  }

  res.json({
    categories,
    products: products.map((p) => ({
      ...p,
      categoryName: catMap.get(p.categoryId)?.name || 'General',
      categorySlug: catMap.get(p.categoryId)?.slug || 'general',
    })),
  });
});

const publicEnquirySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: z.string().trim().min(8, 'Valid phone number is required'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  companyName: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  serviceRequired: z.string().trim().min(2, 'Service selection is required'),
  projectDetails: z.string().trim().optional().or(z.literal('')),
  preferredSiteVisitDate: z.string().trim().optional().or(z.literal('')),
});

router.post('/public/enquiries', validateBody(publicEnquirySchema), async (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const body = req.body as z.infer<typeof publicEnquirySchema>;

  const matchedCustomer = db.customers.find(
    (c) =>
      (body.email && c.email.toLowerCase() === body.email.toLowerCase()) ||
      c.phone.replace(/\D/g, '') === body.phone.replace(/\D/g, '')
  );

  const referenceNumber = nextSequence(db, 'enq', 'AVQ-ENQ');
  const enquiry = {
    id: generateId('enq'),
    referenceNumber,
    customerId: matchedCustomer?.id || null,
    assignedEmployeeId: null,
    fullName: body.fullName,
    phone: body.phone,
    email: body.email || '',
    companyName: body.companyName || '',
    city: body.city || 'Indore',
    serviceRequired: body.serviceRequired,
    projectDetails: body.projectDetails || '',
    preferredSiteVisitDate: body.preferredSiteVisitDate || '',
    status: 'NEW' as const,
    internalNotes: '',
    isSample: false,
    createdAt: now,
    updatedAt: now,
  };

  db.enquiries.unshift(enquiry);

  createNotification(db, {
    targetRole: 'ADMIN',
    type: 'NEW_ENQUIRY',
    title: `New Quote Enquiry: ${referenceNumber}`,
    message: `${body.fullName} requested ${body.serviceRequired}${body.city ? ` in ${body.city}` : ''}.`,
    link: '/admin/enquiries',
  });

  if (matchedCustomer?.userId) {
    createNotification(db, {
      userId: matchedCustomer.userId,
      type: 'NEW_ENQUIRY',
      title: `Enquiry Received: ${referenceNumber}`,
      message: `Your enquiry for ${body.serviceRequired} has been logged by NewEdgeEngineeringAndWorks.`,
      link: '/customer/enquiries',
    });
  }

  saveDb(db);

  await sendEmailNotification({
    to: db.companyConfig.email,
    subject: `[NewEdgeEngineeringAndWorks] New Enquiry ${referenceNumber} - ${body.serviceRequired}`,
    text: `New enquiry from ${body.fullName} (${body.phone}). Service: ${body.serviceRequired}. City: ${body.city || 'N/A'}. Details: ${body.projectDetails || 'N/A'}`,
  });

  res.status(201).json({
    message: 'Your quote & site inspection request has been submitted.',
    enquiry,
  });
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Valid email address is required'),
  phone: z.string().trim().min(8, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
});

router.post('/auth/register', authRateLimiter, validateBody(registerSchema), async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof registerSchema>;
  const normalizedEmail = body.email.toLowerCase();

  if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const userId = generateId('usr');

  const user = {
    id: userId,
    email: normalizedEmail,
    passwordHash,
    fullName: body.fullName,
    phone: body.phone,
    role: 'CUSTOMER' as const,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  db.users.push(user);

  let customer = db.customers.find((c) => c.email.toLowerCase() === normalizedEmail && !c.userId);
  if (customer) {
    customer.userId = userId;
    customer.fullName = body.fullName;
    customer.phone = body.phone;
    if (body.companyName) customer.companyName = body.companyName;
    if (body.address) customer.address = body.address;
    if (body.city) customer.city = body.city;
    customer.updatedAt = now;
  } else {
    customer = {
      id: generateId('cust'),
      userId,
      fullName: body.fullName,
      email: normalizedEmail,
      phone: body.phone,
      companyName: body.companyName || '',
      address: body.address || '',
      city: body.city || 'Indore, Madhya Pradesh',
      gstNumber: '',
      notes: '',
      isSample: false,
      createdAt: now,
      updatedAt: now,
    };
    db.customers.push(customer);
  }

  // Link any matching enquiries made before registration
  for (const enq of db.enquiries) {
    if (!enq.customerId && enq.email && enq.email.toLowerCase() === normalizedEmail) {
      enq.customerId = customer.id;
    }
  }

  createNotification(db, {
    targetRole: 'ADMIN',
    type: 'NEW_CUSTOMER',
    title: 'New Customer Registered',
    message: `${body.fullName}${body.companyName ? ` (${body.companyName})` : ''} created a customer portal account.`,
    link: '/admin/customers',
  });

  saveDb(db);

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    },
    customer,
  });
});

const loginSchema = z.object({
  email: z.string().trim().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/auth/login', authRateLimiter, validateBody(loginSchema), async (req, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof loginSchema>;
  const user = db.users.find((u) => u.email.toLowerCase() === body.email.toLowerCase());

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  });

  const customer = db.customers.find((c) => c.userId === user.id) || null;
  const employee = db.employees.find((e) => e.userId === user.id) || null;

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    },
    customer,
    employee,
  });
});

router.get('/auth/me', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const customer = db.customers.find((c) => c.userId === user.id) || null;
  const employee = db.employees.find((e) => e.userId === user.id) || null;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    },
    customer,
    employee,
  });
});

const profileSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(8),
  companyName: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  city: z.string().trim().optional().or(z.literal('')),
  gstNumber: z.string().trim().optional().or(z.literal('')),
});

router.put('/auth/profile', requireAuth, validateBody(profileSchema), (req: AuthRequest, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof profileSchema>;
  const now = new Date().toISOString();

  const user = db.users.find((u) => u.id === req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  user.fullName = body.fullName;
  user.phone = body.phone;
  user.updatedAt = now;

  const customer = db.customers.find((c) => c.userId === user.id);
  if (customer) {
    customer.fullName = body.fullName;
    customer.phone = body.phone;
    if (body.companyName !== undefined) customer.companyName = body.companyName;
    if (body.address !== undefined) customer.address = body.address;
    if (body.city !== undefined) customer.city = body.city;
    if (body.gstNumber !== undefined) customer.gstNumber = body.gstNumber;
    customer.updatedAt = now;
  }

  saveDb(db);
  res.json({
    message: 'Profile updated successfully.',
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
    },
    customer: customer || null,
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

router.post('/auth/change-password', requireAuth, validateBody(changePasswordSchema), async (req: AuthRequest, res) => {
  const db = getDb();
  const body = req.body as z.infer<typeof changePasswordSchema>;
  const user = db.users.find((u) => u.id === req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!ok) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }
  user.passwordHash = await bcrypt.hash(body.newPassword, 10);
  user.updatedAt = new Date().toISOString();
  saveDb(db);
  res.json({ message: 'Password updated successfully.' });
});

export default router;

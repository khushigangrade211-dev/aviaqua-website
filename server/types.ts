export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';

export type EnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'SITE_VISIT_SCHEDULED'
  | 'QUOTATION_SENT'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PROJECT';

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type ProjectStatus =
  | 'PLANNING'
  | 'SITE_INSPECTION'
  | 'QUOTATION_APPROVED'
  | 'MATERIAL_PROCUREMENT'
  | 'INSTALLATION'
  | 'TESTING'
  | 'COMPLETED'
  | 'ON_HOLD';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export type PaymentType = 'ADVANCE' | 'PARTIAL' | 'FINAL';

export type PaymentMethod = 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';

export type ServiceRequestStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type AMCStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  address?: string;
  city: string;
  gstNumber?: string;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  designation: string;
  department: string;
  specialty?: string;
  joiningDate: string;
  isActive: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  capacity: string;
  unitPrice: number;
  gstRate: number;
  features: string[];
  specifications?: Record<string, string>;
  imageUrl?: string;
  isActive: boolean;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  referenceNumber: string;
  customerId?: string | null;
  assignedEmployeeId?: string | null;
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  city?: string;
  serviceRequired: string;
  projectDetails?: string;
  preferredSiteVisitDate?: string;
  status: EnquiryStatus;
  internalNotes?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  enquiryId?: string | null;
  title: string;
  subtotal: number;
  discountAmount: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  validUntil: string;
  termsConditions: string;
  notes?: string;
  status: QuotationStatus;
  items: QuotationItem[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  roleOnSite: string;
  assignedAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  assignedToEmployeeId?: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  notes?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  projectCode: string;
  customerId: string;
  quotationId?: string | null;
  name: string;
  serviceCategory: string;
  location: string;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string | null;
  projectCost: number;
  status: ProjectStatus;
  progressPercentage: number;
  description: string;
  installationNotes?: string;
  completionReport?: string;
  assignedEmployeeIds: string[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  projectId?: string | null;
  quotationId?: string | null;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentTerms: string;
  notes?: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  customerId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  paymentDate: string;
  notes?: string;
  recordedBy: string;
  isSample?: boolean;
  createdAt: string;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  customerId: string;
  assignedTechnicianId?: string | null;
  subject: string;
  equipmentCategory: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  preferredDate?: string;
  status: ServiceRequestStatus;
  visitNotes?: string;
  resolutionNotes?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AMCRecord {
  id: string;
  contractNumber: string;
  customerId: string;
  projectId?: string | null;
  equipmentName: string;
  frequency: string;
  startDate: string;
  expiryDate: string;
  nextServiceDate: string;
  lastServiceDate?: string | null;
  contractValue: number;
  status: AMCStatus;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteVisit {
  id: string;
  enquiryId?: string | null;
  projectId?: string | null;
  employeeId: string;
  scheduledDate: string;
  location: string;
  purpose: string;
  findings?: string;
  status: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId?: string | null;
  targetRole?: UserRole | null;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: 'PRODUCT_IMAGE' | 'PROJECT_PHOTO' | 'CUSTOMER_DOCUMENT' | 'INSTALLATION_REPORT';
  dataUrl: string;
  uploadedById?: string | null;
  projectId?: string | null;
  customerId?: string | null;
  createdAt: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  code: string;
  issuer: string;
  description: string;
  verified: boolean;
}

export interface HeroStatItem {
  id: string;
  label: string;
  value: string;
  sublabel: string;
}

export interface CompanyConfig {
  companyName: string;
  tagline: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  whatsappNumber: string;
  gstNumber: string;
  businessHours: string;
  certifications: CertificationItem[];
  heroStats: HeroStatItem[];
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  employees: Employee[];
  categories: ProductCategory[];
  products: Product[];
  enquiries: Enquiry[];
  quotations: Quotation[];
  projects: Project[];
  projectAssignments: ProjectAssignment[];
  projectTasks: ProjectTask[];
  invoices: Invoice[];
  payments: Payment[];
  serviceRequests: ServiceRequest[];
  amcRecords: AMCRecord[];
  siteVisits: SiteVisit[];
  notifications: Notification[];
  uploadedFiles: UploadedFile[];
  companyConfig: CompanyConfig;
  counters: Record<string, number>;
}

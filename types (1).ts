export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
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
}

export interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  specialty?: string;
  userRole: UserRole;
  isActive: boolean;
  assignedProjectCount?: number;
  completedTasks?: number;
  pendingTasks?: number;
  isSample?: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
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
}

export interface Enquiry {
  id: string;
  referenceNumber: string;
  customerId?: string | null;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string;
  fullName: string;
  phone: string;
  email?: string;
  companyName?: string;
  city?: string;
  serviceRequired: string;
  projectDetails?: string;
  preferredSiteVisitDate?: string;
  status: string;
  internalNotes?: string;
  isSample?: boolean;
  createdAt: string;
}

export interface LineItem {
  id?: string;
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
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCity?: string;
  customerAddress?: string;
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
  status: string;
  items: LineItem[];
  isSample?: boolean;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  assignedToEmployeeId?: string | null;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  dueDate?: string;
  notes?: string;
  completedAt?: string | null;
}

export interface UploadedFileMeta {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  projectId?: string | null;
  url: string;
  createdAt: string;
}

export interface Project {
  id: string;
  projectCode: string;
  customerId: string;
  customerName?: string;
  customerCompany?: string;
  quotationId?: string | null;
  name: string;
  serviceCategory: string;
  location: string;
  startDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string | null;
  projectCost: number;
  status: string;
  progressPercentage: number;
  description: string;
  installationNotes?: string;
  completionReport?: string;
  assignedEmployeeIds: string[];
  assignedEmployees?: { id: string; fullName: string; designation: string }[];
  tasks?: ProjectTask[];
  files?: UploadedFileMeta[];
  isSample?: boolean;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerGst?: string;
  projectId?: string | null;
  quotationId?: string | null;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount?: number;
  paymentTerms: string;
  notes?: string;
  status: string;
  items: LineItem[];
  isSample?: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerId: string;
  customerName?: string;
  customerCompany?: string;
  amount: number;
  paymentType: 'ADVANCE' | 'PARTIAL' | 'FINAL';
  paymentMethod: 'UPI' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
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
  customerName?: string;
  customerCompany?: string;
  customerPhone?: string;
  assignedTechnicianId?: string | null;
  technicianName?: string;
  subject: string;
  equipmentCategory: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  preferredDate?: string;
  status: string;
  visitNotes?: string;
  resolutionNotes?: string;
  isSample?: boolean;
  createdAt: string;
}

export interface AMCRecord {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName?: string;
  customerCompany?: string;
  projectId?: string | null;
  equipmentName: string;
  frequency: string;
  startDate: string;
  expiryDate: string;
  nextServiceDate: string;
  lastServiceDate?: string | null;
  contractValue: number;
  status: string;
  notes?: string;
  isSample?: boolean;
}

export interface SiteVisit {
  id: string;
  enquiryId?: string | null;
  projectId?: string | null;
  employeeId: string;
  employeeName?: string;
  scheduledDate: string;
  location: string;
  purpose: string;
  findings?: string;
  status: 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
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
  verifiedCertifications?: CertificationItem[];
  heroStats: HeroStatItem[];
}

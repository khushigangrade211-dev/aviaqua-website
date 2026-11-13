import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DatabaseSchema, Notification, UserRole } from '../types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'aviaqua-db.json');
const isProduction = process.env.NODE_ENV === 'production';
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ...(process.env.PGSSLMODE === 'require' ? { ssl: { rejectUnauthorized: false } } : {}) }) : null;
let writeQueue: Promise<void> = Promise.resolve();
let memoryStore: DatabaseSchema | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

export function nextSequence(db: DatabaseSchema, key: string, prefix: string): string {
  const current = (db.counters[key] || 0) + 1;
  db.counters[key] = current;
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(current).padStart(4, '0')}`;
}

function createInitialSeed(): DatabaseSchema {
  const ts = nowIso();
  if (isProduction && !process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD must be set before initializing the production database.');
  }
  const adminPass = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'LocalDevOnly!ChangeMe', 12);
  // Sample accounts receive random, undisclosed passwords and cannot be accessed with public defaults.
  const staffPass = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);
  const clientPass = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 12);

  const adminUserId = 'usr_admin_01';
  const empUserId1 = 'usr_emp_01';
  const empUserId2 = 'usr_emp_02';
  const custUserId1 = 'usr_cust_01';

  const catSoftenerId = 'cat_softeners';
  const catRoId = 'cat_ro_plants';
  const catSolarId = 'cat_solar_systems';
  const catFiltrationId = 'cat_filtration_systems';

  return {
    users: [
      {
        id: adminUserId,
        email: process.env.ADMIN_EMAIL || 'admin@aviaqua.in',
        passwordHash: adminPass,
        fullName: 'NewEdgeEngineeringAndWorks Admin',
        phone: '+91 81096 03077',
        role: 'ADMIN',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: empUserId1,
        email: 'engineer@aviaqua.in',
        passwordHash: staffPass,
        fullName: 'Rajesh Verma (Sample Engineer)',
        phone: '+91 98260 11223',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: empUserId2,
        email: 'solar.tech@aviaqua.in',
        passwordHash: staffPass,
        fullName: 'Ankit Sharma (Sample Solar Lead)',
        phone: '+91 98260 44556',
        role: 'EMPLOYEE',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: custUserId1,
        email: 'customer@aviaqua.in',
        passwordHash: clientPass,
        fullName: 'Vikram Patel (Sample Client)',
        phone: '+91 98270 77889',
        role: 'CUSTOMER',
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    customers: [
      {
        id: 'cust_01',
        userId: custUserId1,
        fullName: 'Vikram Patel (Sample Client)',
        email: 'customer@aviaqua.in',
        phone: '+91 98270 77889',
        companyName: 'Malwa Precision Packaging Pvt. Ltd. (Sample)',
        address: 'Plot 42, Sector B, Sanwer Road Industrial Area',
        city: 'Indore, Madhya Pradesh',
        gstNumber: '23AABCM1234F1Z5',
        notes: 'Sample test account for evaluating the Customer Portal.',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'cust_02',
        userId: null,
        fullName: 'Meera Joshi (Sample Client)',
        email: 'procurement@narmadadiary.example',
        phone: '+91 94250 33441',
        companyName: 'Narmada Agro Dairy Plant (Sample)',
        address: 'Industrial Growth Center, Pithampur Phase II',
        city: 'Dhar, Madhya Pradesh',
        gstNumber: '23AAACN9876E1Z2',
        notes: 'Sample commercial RO & softener client.',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    employees: [
      {
        id: 'emp_01',
        userId: empUserId1,
        employeeCode: 'AVQ-EMP-001',
        designation: 'Senior Water Treatment Engineer',
        department: 'Water Treatment & RO',
        specialty: 'Industrial RO & Softeners',
        joiningDate: '2024-04-01',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'emp_02',
        userId: empUserId2,
        employeeCode: 'AVQ-EMP-002',
        designation: 'Solar Project Lead',
        department: 'Solar Rooftop & Energy',
        specialty: 'On-Grid Commercial Solar',
        joiningDate: '2024-06-15',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    categories: [
      {
        id: catSoftenerId,
        name: 'Water Softeners',
        slug: 'water-softeners',
        description: 'Industrial and commercial ion-exchange water softening systems.',
        sortOrder: 1,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: catRoId,
        name: 'RO Plants',
        slug: 'ro-plants',
        description: 'High-recovery stainless steel and FRP industrial reverse osmosis plants.',
        sortOrder: 2,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: catSolarId,
        name: 'Solar Systems',
        slug: 'solar-systems',
        description: 'Commercial on-grid rooftop solar arrays and solar pumping units.',
        sortOrder: 3,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: catFiltrationId,
        name: 'Filtration Systems',
        slug: 'filtration-systems',
        description: 'Multi-grade pressure sand and activated carbon filtration vessels.',
        sortOrder: 4,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    products: [
      {
        id: 'prod_01',
        categoryId: catSoftenerId,
        name: 'Commercial Automatic Water Softener',
        slug: 'commercial-automatic-water-softener',
        description:
          'Microprocessor-controlled twin/simplex FRP resin vessel softener engineered to prevent scale formation in boilers, chillers, and commercial plumbing.',
        capacity: '1,000 – 10,000 LPH',
        unitPrice: 85000,
        gstRate: 18,
        features: [
          'Digital timer or meter-based automatic regeneration',
          'High-capacity food-grade cation exchange resin',
          'Corrosion-resistant FRP pressure vessel with top/side mount MPV',
          'Reduces total hardness below 5 ppm CaCO3',
        ],
        specifications: {
          'Operating Pressure': '2.0 – 3.5 kg/cm²',
          'Valve Type': 'Automatic Multiport Valve',
          'Resin Grade': 'Strong Acid Cation (SAC)',
        },
        imageUrl: '/src/assets/images/service_water_softener_1794558282943.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_02',
        categoryId: catSoftenerId,
        name: 'Manual FRP Water Softener',
        slug: 'manual-frp-water-softener',
        description:
          'Heavy-duty manual multiport valve FRP water softener designed for textile units, hotels, hospitals, and residential societies.',
        capacity: '500 – 5,000 LPH',
        unitPrice: 48000,
        gstRate: 18,
        features: [
          'Easy-operate 5-cycle manual multiport valve',
          'Includes HDPE brine tank with ejector assembly',
          'Compact footprint with inline hardness test kit',
          'Low salt and rinse water consumption',
        ],
        specifications: {
          'Vessel Material': 'Wound FRP Composite',
          'Brine Tank': '100L – 300L HDPE',
          'Operating Temp': 'Up to 45°C',
        },
        imageUrl: '/src/assets/images/service_water_softener_1794558282943.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_03',
        categoryId: catRoId,
        name: '1,000 LPH Industrial RO Plant',
        slug: '1000-lph-industrial-ro-plant',
        description:
          'Skid-mounted SS-304 1,000 LPH Reverse Osmosis plant featuring high-pressure multistage pump, antiscalant dosing, and automated PLC protection.',
        capacity: '1,000 LPH',
        unitPrice: 245000,
        gstRate: 18,
        features: [
          'SS-304 corrosion-proof skid frame and high-pressure piping',
          'TFC polyamide spiral-wound 8040 RO membranes',
          'Dual online TDS meter, rotameters & pressure gauges',
          'Auto low-pressure & dry-run protection panel',
        ],
        specifications: {
          'Permeate Flow': '1,000 Liters/Hour',
          'Recovery Rate': '60% – 70%',
          'Max Feed TDS': 'Up to 3,000 ppm',
        },
        imageUrl: '/src/assets/images/service_ro_plant_1794558282836.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_04',
        categoryId: catRoId,
        name: '5,000+ LPH Turnkey RO Plant',
        slug: '5000-lph-turnkey-ro-plant',
        description:
          'Custom-engineered high-capacity industrial RO plant with dual-stage pre-filtration, CIP cleaning skid, and SCADA-ready control automation.',
        capacity: '5,000 – 25,000 LPH',
        unitPrice: 920000,
        gstRate: 18,
        features: [
          'Complete pre-treatment (PSF, ACF, Micron & Dosing)',
          'VFD-controlled high-pressure pump for energy efficiency',
          'Dedicated Clean-In-Place (CIP) membrane flushing loop',
          'Turnkey piping, commissioning & operator training',
        ],
        specifications: {
          'Permeate Flow': '5,000+ Liters/Hour',
          'Automation': 'PLC + HMI Control Panel',
          'Membrane Elements': '8" x 40" High-Rejection',
        },
        imageUrl: '/src/assets/images/service_ro_plant_1794558282836.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_05',
        categoryId: catSolarId,
        name: 'Commercial On-Grid Solar System',
        slug: 'commercial-on-grid-solar-system',
        description:
          'Grid-tied industrial rooftop solar photovoltaic plant with Mono-PERC / TOPCon modules, string inverters, net-metering liaison, and remote generation monitoring.',
        capacity: '10 kWp – 500 kWp',
        unitPrice: 440000,
        gstRate: 13.8,
        features: [
          'Tier-1 Mono-PERC / Bifacial solar PV modules',
          'Hot-dip galvanized elevated mounting structure',
          'IP65 smart string inverters with surge protection',
          'End-to-end DISCOM net metering documentation',
        ],
        specifications: {
          'Module Efficiency': '21.5%+',
          'Inverter Warranty': '5 – 10 Years',
          'Performance Warranty': '25 Years Linear Output',
        },
        imageUrl: '/src/assets/images/service_solar_rooftop_1794558283554.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_06',
        categoryId: catSolarId,
        name: 'Solar Water Pumping System',
        slug: 'solar-water-pumping-system',
        description:
          'Off-grid DC/AC solar-powered submersible and surface water pumping solution for industrial campuses, agriculture, and remote water supply.',
        capacity: '3 HP – 25 HP',
        unitPrice: 215000,
        gstRate: 13.8,
        features: [
          'MPPT solar pump controller with dry-run protection',
          'Zero diesel or grid dependency during daylight hours',
          'Stainless steel submersible / centrifugal pump options',
          'Heavy-duty wind-rated module support structure',
        ],
        specifications: {
          'Pump Rating': '3 HP – 25 HP',
          'Head Range': '20m – 150m',
          'Controller': 'MPPT VFD Drive',
        },
        imageUrl: '/src/assets/images/service_solar_rooftop_1794558283554.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_07',
        categoryId: catFiltrationId,
        name: 'Pressure Sand Filter',
        slug: 'pressure-sand-filter',
        description:
          'Multi-layered graded quartz sand and pebble bed filtration vessel engineered to remove suspended solids, turbidity, and particulate matter.',
        capacity: '1,000 – 50,000 LPH',
        unitPrice: 42000,
        gstRate: 18,
        features: [
          'Multi-grade silica quartz & silex media bed',
          'FRP or MSRL (Mild Steel Rubber Lined) tank options',
          'Butterfly or multiport valve backwash arrangement',
          'Protects downstream RO membranes and resin beds',
        ],
        specifications: {
          'Output Turbidity': '< 5 NTU',
          'Flow Velocity': '12 – 15 m³/m²/hr',
          'Shell Options': 'FRP / MSRL / MSEP',
        },
        imageUrl: '/src/assets/images/service_filtration_system_1794558282653.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'prod_08',
        categoryId: catFiltrationId,
        name: 'Activated Carbon Filter',
        slug: 'activated-carbon-filter',
        description:
          'High-iodine-value coconut-shell granular activated carbon vessel for dechlorination, color removal, odor elimination, and organic reduction.',
        capacity: '1,000 – 50,000 LPH',
        unitPrice: 49000,
        gstRate: 18,
        features: [
          '900+ IV coconut-shell Granular Activated Carbon',
          'Removes free chlorine, VOCs, odor, and color',
          'Pre-wired with pressure gauges and sampling ports',
          'Ideal pre-treatment before RO & process lines',
        ],
        specifications: {
          'Carbon Iodine Value': '900 – 1100 mg/g',
          'Dechlorination': '> 99%',
          'Backwash': 'Manual / Automatic MPV',
        },
        imageUrl: '/src/assets/images/service_filtration_system_1794558282653.jpg',
        isActive: true,
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    enquiries: [
      {
        id: 'enq_01',
        referenceNumber: 'AVQ-ENQ-2026-0001',
        customerId: 'cust_01',
        assignedEmployeeId: 'emp_01',
        fullName: 'Vikram Patel (Sample Client)',
        phone: '+91 98270 77889',
        email: 'customer@aviaqua.in',
        companyName: 'Malwa Precision Packaging Pvt. Ltd. (Sample)',
        city: 'Indore, Madhya Pradesh',
        serviceRequired: 'Industrial RO Plant',
        projectDetails: '[SAMPLE DATA] Requirement for 2,000 LPH boiler & process water RO + softener skid.',
        preferredSiteVisitDate: '2026-11-20',
        status: 'QUOTATION_SENT',
        internalNotes: 'Sample site water TDS measured at 1,450 ppm; hardness 480 ppm.',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'enq_02',
        referenceNumber: 'AVQ-ENQ-2026-0002',
        customerId: 'cust_02',
        assignedEmployeeId: 'emp_02',
        fullName: 'Meera Joshi (Sample Client)',
        phone: '+91 94250 33441',
        email: 'procurement@narmadadiary.example',
        companyName: 'Narmada Agro Dairy Plant (Sample)',
        city: 'Pithampur, Madhya Pradesh',
        serviceRequired: 'Solar Installation',
        projectDetails: '[SAMPLE DATA] 50 kWp commercial rooftop on-grid solar feasibility request.',
        preferredSiteVisitDate: '2026-11-25',
        status: 'SITE_VISIT_SCHEDULED',
        internalNotes: 'Roof inspection scheduled for structural load & shadow analysis.',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    quotations: [
      {
        id: 'qt_01',
        quotationNumber: 'AVQ-QT-2026-0001',
        customerId: 'cust_01',
        enquiryId: 'enq_01',
        title: '[SAMPLE] 1,000 LPH RO Plant & Automatic Softener Package',
        subtotal: 330000,
        discountAmount: 15000,
        gstPercent: 18,
        gstAmount: 56700,
        totalAmount: 371700,
        validUntil: '2026-12-15',
        termsConditions:
          '50% advance with PO, 40% prior to dispatch, 10% after commissioning. Warranty: 12 months against manufacturing defects.',
        notes: 'Sample quotation generated for portal demonstration.',
        status: 'SENT',
        items: [
          {
            id: 'qti_01',
            quotationId: 'qt_01',
            productId: 'prod_03',
            description: '1,000 LPH Industrial RO Plant (SS-304 Skid)',
            quantity: 1,
            unitPrice: 245000,
            lineTotal: 245000,
          },
          {
            id: 'qti_02',
            quotationId: 'qt_01',
            productId: 'prod_01',
            description: 'Commercial Automatic Water Softener (3,000 LPH)',
            quantity: 1,
            unitPrice: 85000,
            lineTotal: 85000,
          },
        ],
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    projects: [
      {
        id: 'prj_01',
        projectCode: 'AVQ-PRJ-2026-0001',
        customerId: 'cust_01',
        quotationId: 'qt_01',
        name: '[SAMPLE] Process Water Softening & RO Utility Upgrade',
        serviceCategory: 'Industrial RO Plant',
        location: 'Sanwer Road Industrial Area, Indore, MP',
        startDate: '2026-10-15',
        expectedCompletionDate: '2026-11-30',
        actualCompletionDate: null,
        projectCost: 371700,
        status: 'INSTALLATION',
        progressPercentage: 65,
        description: 'Supply, erection, piping, and commissioning of 1,000 LPH RO + Softener utility bay.',
        installationNotes: 'Skid anchored; raw water feed header and brine tank manifold completed.',
        completionReport: '',
        assignedEmployeeIds: ['emp_01'],
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    projectAssignments: [
      {
        id: 'pa_01',
        projectId: 'prj_01',
        employeeId: 'emp_01',
        roleOnSite: 'Lead Commissioning Engineer',
        assignedAt: ts,
      },
    ],
    projectTasks: [
      {
        id: 'tsk_01',
        projectId: 'prj_01',
        assignedToEmployeeId: 'emp_01',
        title: 'Raw water quality test & civil pad inspection',
        description: 'Verify foundation level and power point near utility room.',
        status: 'COMPLETED',
        dueDate: '2026-10-20',
        notes: 'Pad level verified; 3-phase 415V supply ready.',
        completedAt: ts,
        createdAt: ts,
        updatedAt: ts,
      },
      {
        id: 'tsk_02',
        projectId: 'prj_01',
        assignedToEmployeeId: 'emp_01',
        title: 'RO membrane loading & electrical control panel termination',
        description: 'Load TFC 8040 membranes and test pressure switch interlocks.',
        status: 'IN_PROGRESS',
        dueDate: '2026-11-22',
        notes: 'High-pressure pump alignment completed.',
        completedAt: null,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    invoices: [
      {
        id: 'inv_01',
        invoiceNumber: 'AVQ-INV-2026-0001',
        customerId: 'cust_01',
        projectId: 'prj_01',
        quotationId: 'qt_01',
        issueDate: '2026-10-18',
        dueDate: '2026-11-25',
        subtotal: 315000,
        gstPercent: 18,
        gstAmount: 56700,
        totalAmount: 371700,
        paidAmount: 185850,
        paymentTerms: '50% Advance, 40% Dispatch, 10% Commissioning',
        notes: 'Sample tax invoice for testing invoice PDF & payment ledger.',
        status: 'PARTIALLY_PAID',
        items: [
          {
            id: 'invi_01',
            invoiceId: 'inv_01',
            productId: 'prod_03',
            description: '1,000 LPH Industrial RO Plant (Discounted Package)',
            quantity: 1,
            unitPrice: 230000,
            lineTotal: 230000,
          },
          {
            id: 'invi_02',
            invoiceId: 'inv_01',
            productId: 'prod_01',
            description: 'Commercial Automatic Water Softener',
            quantity: 1,
            unitPrice: 85000,
            lineTotal: 85000,
          },
        ],
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    payments: [
      {
        id: 'pay_01',
        receiptNumber: 'AVQ-RCPT-2026-0001',
        invoiceId: 'inv_01',
        customerId: 'cust_01',
        amount: 185850,
        paymentType: 'ADVANCE',
        paymentMethod: 'BANK_TRANSFER',
        referenceNumber: 'NEFT-SAMPLE-998812',
        paymentDate: '2026-10-19',
        notes: '50% advance payment recorded manually (sample record).',
        recordedBy: 'NewEdgeEngineeringAndWorks Admin',
        isSample: true,
        createdAt: ts,
      },
    ],
    serviceRequests: [
      {
        id: 'srv_01',
        ticketNumber: 'AVQ-SRV-2026-0001',
        customerId: 'cust_01',
        assignedTechnicianId: 'emp_01',
        subject: '[SAMPLE] Quarterly Hardness Check & Brine Valve Calibration',
        equipmentCategory: 'Water Softener',
        description: 'Routine pre-commissioning hardness verification and brine draw check.',
        priority: 'Medium',
        preferredDate: '2026-11-28',
        status: 'ASSIGNED',
        visitNotes: 'Scheduled along with RO commissioning.',
        resolutionNotes: '',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    amcRecords: [
      {
        id: 'amc_01',
        contractNumber: 'AVQ-AMC-2026-0001',
        customerId: 'cust_01',
        projectId: 'prj_01',
        equipmentName: '[SAMPLE] 1,000 LPH RO & Softener Preventive Maintenance',
        frequency: 'Quarterly (4 Visits / Year)',
        startDate: '2026-10-15',
        expiryDate: '2027-10-14',
        nextServiceDate: '2027-01-15',
        lastServiceDate: '2026-10-15',
        contractValue: 28000,
        status: 'ACTIVE',
        notes: 'Includes membrane chemical cleaning, resin health test, and dosing calibration.',
        isSample: true,
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    siteVisits: [
      {
        id: 'sv_01',
        enquiryId: 'enq_02',
        projectId: null,
        employeeId: 'emp_02',
        scheduledDate: '2026-11-25',
        location: 'Pithampur Phase II, MP',
        purpose: 'Rooftop solar structural & shading assessment',
        findings: '',
        status: 'Scheduled',
        createdAt: ts,
        updatedAt: ts,
      },
    ],
    notifications: [
      {
        id: 'notif_01',
        userId: null,
        targetRole: 'ADMIN',
        type: 'SYSTEM',
        title: 'NewEdgeEngineeringAndWorks Platform Initialized',
        message: 'Sample records are labeled [SAMPLE] so you can distinguish test data from live business entries.',
        link: '/admin',
        isRead: false,
        createdAt: ts,
      },
    ],
    uploadedFiles: [],
    companyConfig: {
      companyName: 'NewEdgeEngineeringAndWorks',
      tagline: 'Advanced Water & Energy Engineering Solutions',
      location: 'Indore, Madhya Pradesh, India',
      address: 'Scheme No. 78, Vijay Nagar, Indore, Madhya Pradesh 452010',
      phone: process.env.COMPANY_PHONE || '+91 81096 03077',
      email: process.env.COMPANY_EMAIL || 'newedgeengineeringandworks@gmail.com',
      whatsappNumber: process.env.WHATSAPP_NUMBER || '918109603077',
      gstNumber: '23AVIAQ0000A1Z0',
      businessHours: 'Mon – Sat · 9:30 AM – 6:30 PM IST',
      certifications: [
        {
          id: 'cert_gem',
          name: 'GeM Registered',
          code: 'GeM Seller Portal',
          issuer: 'Government e-Marketplace (India)',
          description: 'Registered supplier profile for institutional and government procurement.',
          verified: false,
        },
        {
          id: 'cert_trustseal',
          name: 'TrustSEAL Pro',
          code: 'Verified Business Badge',
          issuer: 'IndiaMART TrustSEAL',
          description: 'Business identity and industrial trade compliance verification.',
          verified: false,
        },
        {
          id: 'cert_iso',
          name: 'ISO Compliant',
          code: 'ISO 9001 Quality Processes',
          issuer: 'Quality Management Standard',
          description: 'Standardized engineering, testing, and commissioning quality procedures.',
          verified: true,
        },
        {
          id: 'cert_turnkey',
          name: 'Turnkey Services',
          code: 'EPC & AMC Execution',
          issuer: 'NewEdgeEngineeringAndWorks Engineering Division',
          description: 'End-to-end site audit, fabrication, installation, and lifecycle AMC.',
          verified: true,
        },
      ],
      heroStats: [
        {
          id: 'stat_projects',
          label: 'Projects Executed',
          value: 'Configure in Admin',
          sublabel: 'Water & Solar EPC across MP',
        },
        {
          id: 'stat_compliance',
          label: 'GeM & ISO Compliance',
          value: 'Verified Standards',
          sublabel: 'Manage credentials in Admin',
        },
        {
          id: 'stat_support',
          label: 'Engineering Support',
          value: 'Indore HQ Team',
          sublabel: 'Site inspection & AMC service',
        },
      ],
      updatedAt: ts,
    },
    counters: {
      enq: 2,
      qt: 1,
      prj: 1,
      inv: 1,
      rcpt: 1,
      srv: 1,
      amc: 1,
      emp: 2,
    },
  };
}

export async function initializeStore(): Promise<void> {
  if (memoryStore) return;

  if (pool) {
    await pool.query(`CREATE TABLE IF NOT EXISTS aviaqua_app_store (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const result = await pool.query('SELECT payload FROM aviaqua_app_store WHERE id = 1');
    if (result.rows.length) {
      memoryStore = result.rows[0].payload as DatabaseSchema;
    } else {
      memoryStore = createInitialSeed();
      await pool.query(
        'INSERT INTO aviaqua_app_store (id, payload) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
        [JSON.stringify(memoryStore)]
      );
    }
    console.log('[DB] Connected to PostgreSQL; application data is persistent.');
    return;
  }

  if (isProduction) {
    throw new Error('DATABASE_URL is required in production. Refusing to start with temporary local storage.');
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) {
    memoryStore = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DatabaseSchema;
  } else {
    memoryStore = createInitialSeed();
    saveDb(memoryStore);
  }
}

export function getDb(): DatabaseSchema {
  if (!memoryStore) {
    throw new Error('Database has not been initialized. Call initializeStore() before serving requests.');
  }
  return memoryStore;
}

export function saveDb(db: DatabaseSchema): void {
  memoryStore = db;
  if (pool) {
    // Preserve write order because existing route handlers use the synchronous saveDb API.
    const snapshot = JSON.stringify(db);
    writeQueue = writeQueue.then(async () => {
      await pool.query(
        `INSERT INTO aviaqua_app_store (id, payload, updated_at) VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [snapshot]
      );
    }).catch((err) => {
      console.error('[DB] PostgreSQL persistence failed:', err);
    });
    return;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  } catch (err) {
    console.error('[DB] Failed to persist local development store:', err);
  }
}

export async function flushStore(): Promise<void> {
  await writeQueue;
}

export function createNotification(
  db: DatabaseSchema,
  params: {
    userId?: string | null;
    targetRole?: UserRole | null;
    type: string;
    title: string;
    message: string;
    link?: string;
  }
): Notification {
  const notif: Notification = {
    id: generateId('notif'),
    userId: params.userId ?? null,
    targetRole: params.targetRole ?? null,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
    isRead: false,
    createdAt: nowIso(),
  };
  db.notifications.unshift(notif);
  return notif;
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Droplets,
  Factory,
  Filter,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { BrandLogo, SafeImage } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import { apiRequest, formatINR } from '../lib/api';
import { Product, ProductCategory } from '../lib/types';

const HERO_IMG = '/src/assets/images/hero_aviaqua_plant_1794558281339.jpg';
const SOFTENER_IMG = '/src/assets/images/service_water_softener_1794558282943.jpg';
const RO_IMG = '/src/assets/images/service_ro_plant_1794558282836.jpg';
const SOLAR_IMG = '/src/assets/images/service_solar_rooftop_1794558283554.jpg';
const FILTRATION_IMG = '/src/assets/images/service_filtration_system_1794558282653.jpg';

const SERVICES_DATA = [
  {
    id: 'softeners',
    title: 'Water Softener Systems',
    image: SOFTENER_IMG,
    description:
      'Industrial and commercial ion-exchange water softeners protecting boilers, cooling towers, chillers, and process lines from hard-water scaling.',
    features: [
      'Automatic & manual multiport valve FRP / MSRL vessels',
      'High-capacity strong acid cation exchange resin beds',
      'Reduces hardness below 5 ppm CaCO3 consistently',
    ],
  },
  {
    id: 'ro',
    title: 'Industrial RO Plants',
    image: RO_IMG,
    description:
      'Custom stainless steel skid-mounted reverse osmosis plants from 500 LPH to 25,000+ LPH engineered for high recovery and low energy draw.',
    features: [
      'SS-304 frames with multistage high-pressure pumps',
      'TFC spiral-wound membranes & antiscalant dosing',
      'Automated PLC control, online TDS & CIP cleaning loop',
    ],
  },
  {
    id: 'solar',
    title: 'Solar Rooftop Plants',
    image: SOLAR_IMG,
    description:
      'Turnkey on-grid commercial and industrial rooftop photovoltaic power systems designed for rapid payback and DISCOM net-metering.',
    features: [
      'Tier-1 Mono-PERC & Bifacial PV modules',
      'Hot-dip galvanized wind-certified mounting structures',
      'Smart string inverters & remote generation telemetry',
    ],
  },
  {
    id: 'filtration',
    title: 'Sand & Carbon Filtration',
    image: FILTRATION_IMG,
    description:
      'Multi-grade pressure sand filters and coconut-shell activated carbon units for turbidity, suspended solids, chlorine, and odor removal.',
    features: [
      'Graded quartz silica & 900+ IV activated carbon media',
      'FRP / MSRL pressure vessels with butterfly valve manifolds',
      'Essential pre-treatment for RO membranes & process water',
    ],
  },
];

const SERVICE_OPTIONS = [
  'Solar Installation',
  'Water Softener',
  'Industrial RO Plant',
  'Water Management',
  'Sand & Carbon Filtration',
  'Maintenance and AMC',
  'Other',
];

export default function PublicWebsite() {
  const { user, companyConfig } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Products state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);

  // Solar Calculator state
  const [monthlyBill, setMonthlyBill] = useState<number>(45000);
  const [tariff, setTariff] = useState<number>(8.5);
  const [rooftopArea, setRooftopArea] = useState<string>('2500');

  // Softener Sizing Guide state
  const [dailyConsumption, setDailyConsumption] = useState<number>(15000);
  const [waterHardness, setWaterHardness] = useState<number>(450);
  const [operatingHours, setOperatingHours] = useState<number>(8);
  const [requiredFlow, setRequiredFlow] = useState<number>(2000);

  // Quote Form state
  const [quoteForm, setQuoteForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    companyName: '',
    city: 'Indore',
    serviceRequired: 'Water Softener',
    projectDetails: '',
    preferredSiteVisitDate: '',
  });
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [quoteSuccess, setQuoteSuccess] = useState<{ referenceNumber: string; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest<{ categories: ProductCategory[]; products: Product[] }>('/public/products');
        if (active) {
          setCategories(res.categories);
          setProducts(res.products);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        if (active) setProductsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const catOk = selectedCategory === 'all' || p.categorySlug === selectedCategory || p.categoryId === selectedCategory;
      const q = productSearch.toLowerCase().trim();
      const searchOk =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.capacity.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [products, selectedCategory, productSearch]);

  // Solar Calculations (Preliminary Estimate)
  const solarEstimate = useMemo(() => {
    const safeBill = Math.max(0, monthlyBill || 0);
    const safeTariff = Math.max(1, tariff || 8);
    const monthlyUnits = safeBill / safeTariff;
    // Avg Indore solar generation ~125 kWh / kWp / month
    let recommendedKw = Math.max(1, Math.round((monthlyUnits / 125) * 10) / 10);
    const areaSqFt = Number(rooftopArea);
    if (areaSqFt > 0) {
      const maxByArea = Math.floor((areaSqFt / 90) * 10) / 10;
      if (maxByArea > 0 && recommendedKw > maxByArea) {
        recommendedKw = maxByArea;
      }
    }
    const monthlySavings = Math.round(recommendedKw * 125 * safeTariff);
    const annualSavings = monthlySavings * 12;
    const estimatedCapex = recommendedKw * 44000;
    const paybackYears = annualSavings > 0 ? (estimatedCapex / annualSavings).toFixed(1) : '0';
    const annualCo2Kg = Math.round(recommendedKw * 1500 * 0.82); // ~0.82 kg CO2/kWh India grid factor
    return {
      recommendedKw,
      monthlySavings,
      annualSavings,
      paybackYears,
      annualCo2Kg,
    };
  }, [monthlyBill, tariff, rooftopArea]);

  // Softener Sizing Calculations (Preliminary Estimate)
  const softenerEstimate = useMemo(() => {
    const dailyLiters = Math.max(500, dailyConsumption || 0);
    const hardnessPpm = Math.max(50, waterHardness || 0);
    const hours = Math.max(1, operatingHours || 8);
    const calcFlow = Math.ceil(dailyLiters / hours / 100) * 100;
    const suggestedFlowRate = Math.max(calcFlow, requiredFlow || 0);

    // Ion exchange calculation: Hardness load (kg CaCO3/day) = (dailyLiters * hardnessPpm) / 1,000,000
    // Typical SAC resin capacity ~ 50g CaCO3 / liter of resin
    const dailyHardnessGrams = (dailyLiters * hardnessPpm) / 1000;
    const recommendedResinLiters = Math.max(25, Math.ceil((dailyHardnessGrams / 45) / 25) * 25);

    let suggestedSystem = 'Manual FRP Water Softener';
    if (suggestedFlowRate >= 2500 || recommendedResinLiters >= 200) {
      suggestedSystem = 'Commercial Automatic Twin / Simplex Water Softener';
    } else if (suggestedFlowRate >= 1200) {
      suggestedSystem = 'Commercial Automatic Water Softener';
    }

    return {
      suggestedFlowRate,
      recommendedResinLiters,
      suggestedSystem,
    };
  }, [dailyConsumption, waterHardness, operatingHours, requiredFlow]);

  const handleProductEnquiry = (product: Product) => {
    const mapService: Record<string, string> = {
      'water-softeners': 'Water Softener',
      'ro-plants': 'Industrial RO Plant',
      'solar-systems': 'Solar Installation',
      'filtration-systems': 'Sand & Carbon Filtration',
    };
    setQuoteForm((prev) => ({
      ...prev,
      serviceRequired: mapService[product.categorySlug || ''] || 'Other',
      projectDetails: `Enquiry for: ${product.name} (${product.capacity}). Please share technical specifications and quotation.`,
    }));
    const el = document.getElementById('contact');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError('');
    setQuoteSuccess(null);

    if (quoteForm.fullName.trim().length < 2) {
      setQuoteError('Please enter your full name.');
      return;
    }
    if (quoteForm.phone.trim().length < 8) {
      setQuoteError('Please enter a valid 10-digit phone number.');
      return;
    }

    setQuoteSubmitting(true);
    try {
      const res = await apiRequest<{ message: string; enquiry: { referenceNumber: string } }>('/public/enquiries', {
        method: 'POST',
        body: JSON.stringify(quoteForm),
      });
      setQuoteSuccess({
        referenceNumber: res.enquiry.referenceNumber,
        message: res.message,
      });
      setQuoteForm({
        fullName: '',
        phone: '',
        email: '',
        companyName: '',
        city: 'Indore',
        serviceRequired: 'Water Softener',
        projectDetails: '',
        preferredSiteVisitDate: '',
      });
    } catch (err: any) {
      setQuoteError(err.message || 'Unable to submit enquiry. Please try again.');
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const phoneDisplay = companyConfig?.phone || '+91 81096 03077';
  const emailDisplay = companyConfig?.email || 'newedgeengineeringandworks@gmail.com';
  const locationDisplay = companyConfig?.location || 'Indore, Madhya Pradesh, India';
  const whatsappClean = (companyConfig?.whatsappNumber || '918109603077').replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
    'Hello NewEdgeEngineeringAndWorks Team, I would like to discuss a Water Treatment / Solar Rooftop requirement.'
  )}`;
  const verifiedCerts = companyConfig?.verifiedCertifications || [];

  const portalHref = user
    ? user.role === 'ADMIN'
      ? '/admin'
      : user.role === 'EMPLOYEE'
      ? '/employee'
      : '/customer'
    : '/login';

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Navigation Bar — 3-Zone Contract */}
      <header className="sticky top-0 z-40 bg-[#0A1628]/95 backdrop-blur border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a href="#home" className="focus-visible:outline-none shrink-0">
            <BrandLogo dark />
          </a>

          {/* Zone 2: Single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="#home" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Home
            </a>
            <a href="#services" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Services
            </a>
            <a href="#products" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Products
            </a>
            <a href="#calculator" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Savings Calculator
            </a>
            <a href="#about" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              About Us
            </a>
            <a href="#contact" className="hover:text-teal-300 transition-colors whitespace-nowrap shrink-0">
              Contact
            </a>
            <Link to={portalHref} className="text-teal-300 hover:text-teal-200 transition-colors whitespace-nowrap shrink-0">
              {user ? 'My Portal' : 'Portal Login'}
            </Link>
          </nav>

          {/* Zone 3: Primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              Get a Free Quote
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#0F2038] border-t border-slate-800 px-4 py-4 space-y-2 text-sm">
            {[
              ['#home', 'Home'],
              ['#services', 'Services'],
              ['#products', 'Products'],
              ['#calculator', 'Savings Calculator'],
              ['#about', 'About Us'],
              ['#contact', 'Contact'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg text-slate-200 hover:bg-slate-800"
              >
                {label}
              </a>
            ))}
            <Link
              to={portalHref}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 px-3 rounded-lg text-teal-300 font-medium hover:bg-slate-800"
            >
              {user ? 'Open Dashboard' : 'Customer & Staff Portal'}
            </Link>
            <a
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center py-2.5 px-4 rounded-lg bg-teal-600 text-white font-semibold"
            >
              Get a Free Quote
            </a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="relative bg-[#0A1628] text-white overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 80% 20%, rgba(20, 184, 166, 0.35), transparent 50%), radial-gradient(circle at 15% 80%, rgba(45, 212, 191, 0.2), transparent 45%)',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          {/* Regional & Direct Contact Metadata Row (clean unboxed text) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300 mb-8 pb-4 border-b border-slate-800/80">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              {locationDisplay}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a href={`tel:${phoneDisplay.replace(/\s+/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-teal-300 transition-colors">
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              {phoneDisplay}
            </a>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <a href={`mailto:${emailDisplay}`} className="inline-flex items-center gap-1.5 hover:text-teal-300 transition-colors">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              {emailDisplay}
            </a>
            {verifiedCerts.length > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-teal-300 font-medium">
                  {verifiedCerts.map((c) => c.name).join(' · ')}
                </span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Copy & CTAs */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[50px] font-extrabold leading-[1.12] tracking-tight text-balance text-white">
                Advanced Water &amp; Energy Engineering Solutions
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                Empowering industries, commercial complexes, and institutions across Madhya Pradesh with custom
                Commercial Water Softeners, High-capacity RO Plants, and Turnkey Solar Rooftop Systems.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  Explore Products
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-600 hover:border-teal-400 text-white hover:text-teal-200 font-semibold text-sm transition-colors whitespace-nowrap"
                >
                  Request Site Inspection
                </a>
              </div>

              {/* Core Solution Spectrum Card */}
              <div className="mt-10 bg-[#0F2038] border border-slate-700/80 rounded-xl p-5">
                <p className="text-xs font-semibold text-teal-300 tracking-wide mb-3">
                  Core Solution Spectrum
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-700/70">
                  <div className="pt-2 sm:pt-0">
                    <Droplets className="w-5 h-5 text-teal-400 mb-1.5" />
                    <h3 className="text-sm font-semibold text-white">Industrial Water Softening</h3>
                    <p className="text-xs text-slate-400 mt-1">Zero-scale protection for boilers &amp; chillers</p>
                  </div>
                  <div className="pt-3 sm:pt-0 sm:pl-4">
                    <Filter className="w-5 h-5 text-teal-400 mb-1.5" />
                    <h3 className="text-sm font-semibold text-white">Commercial RO Plants</h3>
                    <p className="text-xs text-slate-400 mt-1">500 to 25,000+ LPH high-recovery skids</p>
                  </div>
                  <div className="pt-3 sm:pt-0 sm:pl-4">
                    <Sun className="w-5 h-5 text-teal-400 mb-1.5" />
                    <h3 className="text-sm font-semibold text-white">Solar Power Installations</h3>
                    <p className="text-xs text-slate-400 mt-1">Grid-tied rooftop EPC &amp; net metering</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Showcase */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative rounded-xl overflow-hidden border border-slate-700/80 h-full min-h-[280px] bg-[#0F2038]">
                <SafeImage
                  src={HERO_IMG}
                  alt="NewEdgeEngineeringAndWorks industrial water treatment RO skid and commercial rooftop solar installation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/90 via-[#0A1628]/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs font-medium text-teal-300">Indore, Madhya Pradesh · Turnkey EPC</p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    Integrated Water Treatment &amp; Solar Rooftop Engineering
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Configurable Business Statistics Strip */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(companyConfig?.heroStats || []).map((stat) => (
              <div
                key={stat.id}
                className="bg-[#0F2038]/90 border border-slate-800 rounded-xl px-5 py-4 flex flex-col justify-between"
              >
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
                <p className="text-xl font-display font-bold text-white mt-1 tabular-nums">{stat.value}</p>
                <p className="text-xs text-teal-300/90 mt-1">{stat.sublabel}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Expertise (4 Service Cards) */}
      <section id="services" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold text-teal-700 tracking-wide">Engineering Expertise</p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
              Turnkey Water &amp; Solar Systems Built for Industrial Reliability
            </h2>
            <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
              From water quality analysis and structural shading audits to fabrication, commissioning, and annual maintenance contracts.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICES_DATA.map((service, idx) => (
              <article
                key={service.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-teal-500/60 transition-colors"
              >
                <div className="sm:w-48 lg:w-56 shrink-0 bg-slate-100">
                  <SafeImage
                    src={service.image}
                    alt={service.title}
                    className="w-full h-48 sm:h-full object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div>
                    <p className="text-xs font-medium text-teal-700 mb-1">0{idx + 1}. Core Division</p>
                    <h3 className="font-display text-lg font-bold text-slate-900">{service.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{service.description}</p>
                    <ul className="mt-4 space-y-1.5">
                      {service.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href="#contact"
                      className="text-xs font-semibold text-teal-700 hover:text-teal-800 inline-flex items-center gap-1"
                    >
                      Request Consultation
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Product Catalogue */}
      <section id="products" className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-teal-700 tracking-wide">Equipment Catalogue</p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                Industrial Water Treatment &amp; Solar Equipment
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Sample indicative pricing and capacities are displayed for reference; final quotations are tailored to site requirements.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search equipment or capacity..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600"
              />
            </div>
          </div>

          {/* Interactive Category Filter Buttons */}
          <div className="mt-7 flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#0A1628] text-white'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              All Equipment
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  selectedCategory === cat.slug
                    ? 'bg-[#0A1628] text-white'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {productsLoading ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-8 p-10 text-center border border-slate-200 rounded-xl bg-slate-50">
              <p className="text-sm font-medium text-slate-700">No matching equipment found.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setProductSearch('');
                }}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-lg bg-[#0A1628] text-white"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between hover:border-teal-500/60 transition-colors"
                >
                  <div>
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-slate-500 font-medium">
                        {product.categoryName} <span aria-hidden="true">·</span> {product.capacity}
                      </p>
                      <h3 className="mt-1.5 font-display text-base font-bold text-slate-900 leading-snug">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {product.description}
                      </p>

                      <ul className="mt-3 space-y-1">
                        {product.features.slice(0, 3).map((f) => (
                          <li key={f} className="text-xs text-slate-700 flex items-start gap-1.5">
                            <span className="text-teal-600 font-bold">·</span>
                            <span className="line-clamp-1">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] text-slate-500">Indicative Base</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums">
                        {formatINR(product.unitPrice)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleProductEnquiry(product)}
                      className="px-3.5 py-2 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      Enquire Now
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Interactive Savings Calculator & Sizing Guide */}
      <section id="calculator" className="py-16 sm:py-20 bg-[#0A1628] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-teal-300 tracking-wide">Interactive Engineering Tools</p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white text-balance">
              Solar Savings Estimator &amp; Water Softener Sizing Guide
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              All values generated below are <strong className="text-teal-300 font-semibold">preliminary estimates</strong> for initial budgeting. Final plant engineering follows an on-site audit by NewEdgeEngineeringAndWorks engineers.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calculator 1: Solar Energy Savings Estimator */}
            <div className="bg-[#0F2038] border border-slate-700/80 rounded-xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <Sun className="w-5 h-5 text-teal-400" />
                  <h3 className="font-display text-lg font-bold text-white">Solar Energy Savings Estimator</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Monthly Bill (INR)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      value={monthlyBill}
                      onChange={(e) => setMonthlyBill(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Tariff (INR/kWh)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={20}
                      step={0.5}
                      value={tariff}
                      onChange={(e) => setTariff(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Rooftop Area (sq.ft, opt.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={rooftopArea}
                      onChange={(e) => setRooftopArea(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-700/80">
                  <div>
                    <p className="text-xs text-slate-400">Recommended Capacity</p>
                    <p className="text-xl font-bold text-teal-300 tabular-nums mt-1">
                      {solarEstimate.recommendedKw} kWp
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Est. Monthly Savings</p>
                    <p className="text-xl font-bold text-white tabular-nums mt-1">
                      {formatINR(solarEstimate.monthlySavings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Est. Annual Savings</p>
                    <p className="text-xl font-bold text-white tabular-nums mt-1">
                      {formatINR(solarEstimate.annualSavings)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Annual CO2 Reduction</p>
                    <p className="text-base font-semibold text-slate-200 tabular-nums mt-1">
                      {(solarEstimate.annualCo2Kg / 1000).toFixed(1)} tonnes/yr
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <p className="text-xs text-slate-400">Est. Simple Payback Period</p>
                    <p className="text-base font-semibold text-slate-200 tabular-nums mt-1">
                      ~{solarEstimate.paybackYears} Years
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                <span className="text-[11px] text-slate-400">
                  Preliminary estimate based on 125 kWh/kWp/mo avg yield.
                </span>
                <a
                  href="#contact"
                  onClick={() =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      serviceRequired: 'Solar Installation',
                      projectDetails: `Solar Estimator Result: ${solarEstimate.recommendedKw} kWp system for monthly bill INR ${monthlyBill}.`,
                    }))
                  }
                  className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Request Solar Audit
                </a>
              </div>
            </div>

            {/* Calculator 2: Water Softener Sizing Guide */}
            <div className="bg-[#0F2038] border border-slate-700/80 rounded-xl p-6 sm:p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <Droplets className="w-5 h-5 text-teal-400" />
                  <h3 className="font-display text-lg font-bold text-white">Water Softener Sizing Guide</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Daily Water Consumption (Liters/day)
                    </label>
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={dailyConsumption}
                      onChange={(e) => setDailyConsumption(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Water Hardness (ppm CaCO3)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={25}
                      value={waterHardness}
                      onChange={(e) => setWaterHardness(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Operating Hours / Day
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={operatingHours}
                      onChange={(e) => setOperatingHours(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Required Peak Flow (LPH)
                    </label>
                    <input
                      type="number"
                      min={250}
                      step={250}
                      value={requiredFlow}
                      onChange={(e) => setRequiredFlow(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#0A1628] border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-700/80">
                  <div>
                    <p className="text-xs text-slate-400">Suggested Flow Rate</p>
                    <p className="text-xl font-bold text-teal-300 tabular-nums mt-1">
                      {softenerEstimate.suggestedFlowRate.toLocaleString('en-IN')} LPH
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Recommended Resin</p>
                    <p className="text-xl font-bold text-white tabular-nums mt-1">
                      {softenerEstimate.recommendedResinLiters} Liters
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Suggested System</p>
                    <p className="text-sm font-semibold text-white mt-1 leading-snug">
                      {softenerEstimate.suggestedSystem}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-4">
                <span className="text-[11px] text-slate-400">
                  Preliminary estimate; subject to raw water lab test.
                </span>
                <a
                  href="#contact"
                  onClick={() =>
                    setQuoteForm((prev) => ({
                      ...prev,
                      serviceRequired: 'Water Softener',
                      projectDetails: `Softener Sizing Guide: ${softenerEstimate.suggestedFlowRate} LPH flow, ${softenerEstimate.recommendedResinLiters}L resin (${waterHardness} ppm hardness, ${dailyConsumption} LPD).`,
                    }))
                  }
                  className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Request Water Test
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Credentials & About Us */}
      <section id="about" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-14">
          {/* Verified Credentials */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold text-teal-700 tracking-wide">Company Credentials</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                  Verified Engineering Compliance &amp; Execution Standards
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Only admin-verified certifications are displayed publicly.
              </p>
            </div>

            {verifiedCerts.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">
                Certifications are currently being updated by the NewEdgeEngineeringAndWorks administration team.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {verifiedCerts.map((cert) => (
                  <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-5">
                    <ShieldCheck className="w-6 h-6 text-teal-600 mb-3" />
                    <h3 className="font-display text-base font-bold text-slate-900">{cert.name}</h3>
                    <p className="text-xs text-teal-700 font-medium mt-0.5">{cert.code}</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cert.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* About NewEdgeEngineeringAndWorks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start pt-4 border-t border-slate-200">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-semibold text-teal-700 tracking-wide">About NewEdgeEngineeringAndWorks</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                Engineering Clean Water &amp; Solar Independence in Indore &amp; Central India
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Headquartered in Indore, Madhya Pradesh, <strong>NewEdgeEngineeringAndWorks</strong> delivers specialized water treatment plants and commercial solar rooftop installations. Our engineering team handles the full lifecycle — raw water characterization, structural &amp; electrical sizing, fabrication, site commissioning, and scheduled Preventive Maintenance (AMC).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-display text-base font-bold text-slate-900">Our Mission</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Deliver dependable, low-maintenance water purification and renewable solar infrastructure that lowers industrial utility costs and protects critical process equipment.
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="font-display text-base font-bold text-slate-900">Our Vision</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    To be Madhya Pradesh&apos;s most trusted single-partner engineering firm for industrial water management, high-recovery RO, and clean solar power.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-teal-600" />
                  Industries Served
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Pharmaceutical &amp; Formulation Units · Food, Dairy &amp; Beverage Plants · Textile &amp; Dyeing Mills · Hospitals &amp; Medical Campuses · Hotels, Resorts &amp; Commercial Complexes · Educational Institutions.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-display text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  Why Choose NewEdgeEngineeringAndWorks
                </h3>
                <ul className="mt-2.5 space-y-2 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Custom sizing based on actual feed TDS, hardness, and load profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Dedicated Customer &amp; Service Portal for project &amp; AMC transparency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>Indore-based field engineers for rapid site visits and preventive AMC</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Quote Request Section */}
      <section id="contact" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs font-semibold text-teal-700 tracking-wide">Contact &amp; Site Survey</p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 text-balance">
                  Request a Free Quote or Site Inspection
                </h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Share your plant requirements or electricity bill details. Our Indore engineering desk logs every enquiry with a tracking reference number and responds promptly.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">NewEdgeEngineeringAndWorks Office</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      {companyConfig?.address || 'Scheme No. 78, Vijay Nagar, Indore, Madhya Pradesh 452010'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Phone</p>
                    <a href={`tel:${phoneDisplay.replace(/\s+/g, '')}`} className="text-slate-600 text-xs hover:text-teal-700">
                      {phoneDisplay}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900">Email</p>
                    <a href={`mailto:${emailDisplay}`} className="text-slate-600 text-xs hover:text-teal-700">
                      {emailDisplay}
                    </a>
                  </div>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp with NewEdgeEngineeringAndWorks
              </a>
            </div>

            <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8">
              <h3 className="font-display text-lg font-bold text-slate-900 mb-5">
                Project Enquiry &amp; Quote Form
              </h3>

              {quoteSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
                  <p className="font-semibold">{quoteSuccess.message}</p>
                  <p className="mt-1 text-xs">
                    Reference Number:{' '}
                    <span className="font-mono-tabular font-bold">{quoteSuccess.referenceNumber}</span>
                  </p>
                </div>
              )}

              {quoteError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                  {quoteError}
                </div>
              )}

              <form onSubmit={handleQuoteSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quoteForm.fullName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, fullName: e.target.value })}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={quoteForm.phone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                    placeholder="+91 98260 XXXXX"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={quoteForm.email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company / Organization</label>
                  <input
                    type="text"
                    value={quoteForm.companyName}
                    onChange={(e) => setQuoteForm({ ...quoteForm, companyName: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">City</label>
                  <input
                    type="text"
                    value={quoteForm.city}
                    onChange={(e) => setQuoteForm({ ...quoteForm, city: e.target.value })}
                    placeholder="Indore, Pithampur, Dewas..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Service Required <span className="text-rose-600">*</span>
                  </label>
                  <select
                    required
                    value={quoteForm.serviceRequired}
                    onChange={(e) => setQuoteForm({ ...quoteForm, serviceRequired: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  >
                    {SERVICE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Preferred Site Visit Date
                  </label>
                  <input
                    type="date"
                    value={quoteForm.preferredSiteVisitDate}
                    onChange={(e) => setQuoteForm({ ...quoteForm, preferredSiteVisitDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Details</label>
                  <textarea
                    rows={3}
                    value={quoteForm.projectDetails}
                    onChange={(e) => setQuoteForm({ ...quoteForm, projectDetails: e.target.value })}
                    placeholder="Share required capacity (LPH / kWp), raw water TDS/hardness, or rooftop area..."
                    className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div className="sm:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={quoteSubmitting}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    {quoteSubmitting ? 'Submitting Request...' : 'Submit Quote Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Industrial Footer */}
      <footer className="bg-[#0A1628] text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <BrandLogo dark />
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Industrial &amp; Commercial Water Treatment Plants, Water Softeners, Filtration Skids, Solar Rooftop EPC, and Preventive Maintenance Services in Indore, Madhya Pradesh.
            </p>
            <p className="text-xs text-slate-400">
              {locationDisplay} · {phoneDisplay} · {emailDisplay}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#services" className="hover:text-teal-300">Services</a></li>
              <li><a href="#products" className="hover:text-teal-300">Products</a></li>
              <li><a href="#calculator" className="hover:text-teal-300">Savings Calculator</a></li>
              <li><a href="#about" className="hover:text-teal-300">About Us</a></li>
              <li><a href="#contact" className="hover:text-teal-300">Contact &amp; Quote</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-white mb-3">Business Portals</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><Link to="/login" className="hover:text-teal-300">Customer Login</Link></li>
              <li><Link to="/register" className="hover:text-teal-300">Customer Registration</Link></li>
              <li><Link to="/login" className="hover:text-teal-300">Employee &amp; Admin Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/80 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} NewEdgeEngineeringAndWorks. All rights reserved. Indore, Madhya Pradesh, India.
        </div>
      </footer>
    </div>
  );
}

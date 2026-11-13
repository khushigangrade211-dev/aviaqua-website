import { jsPDF } from 'jspdf';
import { CompanyConfig, Invoice, Payment, Quotation } from './types';

function drawHeader(doc: jsPDF, docTitle: string, docNumber: string, config?: CompanyConfig | null) {
  // Navy top banner
  doc.setFillColor(10, 22, 40); // #0A1628
  doc.rect(0, 0, 210, 38, 'F');

  // Teal accent bar
  doc.setFillColor(13, 148, 136); // #0D9488
  doc.rect(0, 38, 210, 2.5, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('NewEdgeEngineeringAndWorks', 14, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(config?.tagline || 'Water Treatment & Solar Energy Engineering', 14, 24);
  doc.text(
    `${config?.address || 'Indore, Madhya Pradesh, India'} | ${config?.phone || '+91 81096 03077'} | ${config?.email || 'newedgeengineeringandworks@gmail.com'}`,
    14,
    30
  );
  if (config?.gstNumber) {
    doc.text(`GSTIN: ${config.gstNumber}`, 14, 35);
  }

  // Document type on right
  doc.setTextColor(45, 212, 191);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(docTitle.toUpperCase(), 196, 17, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(docNumber, 196, 25, { align: 'right' });
}

function drawFooter(doc: jsPDF) {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 275, 196, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('NewEdgeEngineeringAndWorks · Indore, Madhya Pradesh, India · Computer-generated official document.', 14, 282);
  doc.text('Thank you for choosing NewEdgeEngineeringAndWorks.', 196, 282, { align: 'right' });
}

export function downloadQuotationPdf(quotation: Quotation, config?: CompanyConfig | null) {
  const doc = new jsPDF();
  drawHeader(doc, 'Quotation', quotation.quotationNumber, config);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Prepared For:', 14, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(quotation.customerName || 'Valued Client', 14, 58);
  if (quotation.customerCompany) doc.text(quotation.customerCompany, 14, 63);
  if (quotation.customerAddress || quotation.customerCity) {
    doc.text([quotation.customerAddress, quotation.customerCity].filter(Boolean).join(', '), 14, 68, { maxWidth: 95 });
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Quote Details:', 130, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${quotation.createdAt.slice(0, 10)}`, 130, 58);
  doc.text(`Valid Until: ${quotation.validUntil}`, 130, 63);
  doc.text(`Status: ${quotation.status}`, 130, 68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Subject: ${quotation.title}`, 14, 82);

  // Table header
  let y = 90;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('#', 17, y + 6);
  doc.text('Description', 26, y + 6);
  doc.text('Qty', 130, y + 6, { align: 'right' });
  doc.text('Unit Price', 162, y + 6, { align: 'right' });
  doc.text('Total (INR)', 193, y + 6, { align: 'right' });

  y += 14;
  doc.setFont('helvetica', 'normal');
  quotation.items.forEach((item, idx) => {
    const lines = doc.splitTextToSize(item.description, 92);
    doc.text(String(idx + 1), 17, y);
    doc.text(lines, 26, y);
    doc.text(String(item.quantity), 130, y, { align: 'right' });
    doc.text(item.unitPrice.toLocaleString('en-IN'), 162, y, { align: 'right' });
    doc.text(item.lineTotal.toLocaleString('en-IN'), 193, y, { align: 'right' });
    y += Math.max(8, lines.length * 5 + 3);
  });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(120, y, 196, y);
  y += 7;

  doc.text('Subtotal:', 130, y);
  doc.text(`INR ${quotation.subtotal.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 6;

  if (quotation.discountAmount > 0) {
    doc.text('Discount:', 130, y);
    doc.text(`- INR ${quotation.discountAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
    y += 6;
  }

  doc.text(`GST (${quotation.gstPercent}%):`, 130, y);
  doc.text(`INR ${quotation.gstAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Grand Total:', 130, y);
  doc.text(`INR ${quotation.totalAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });

  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Terms & Conditions:', 14, y);
  doc.setFont('helvetica', 'normal');
  const tcLines = doc.splitTextToSize(quotation.termsConditions, 180);
  doc.text(tcLines, 14, y + 6);

  drawFooter(doc);
  doc.save(`${quotation.quotationNumber}.pdf`);
}

export function downloadInvoicePdf(invoice: Invoice, config?: CompanyConfig | null) {
  const doc = new jsPDF();
  drawHeader(doc, 'Tax Invoice', invoice.invoiceNumber, config);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill To:', 14, 52);

  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customerName || 'Client', 14, 58);
  if (invoice.customerCompany) doc.text(invoice.customerCompany, 14, 63);
  if (invoice.customerAddress || invoice.customerCity) {
    doc.text([invoice.customerAddress, invoice.customerCity].filter(Boolean).join(', '), 14, 68, { maxWidth: 95 });
  }
  if (invoice.customerGst) doc.text(`Customer GSTIN: ${invoice.customerGst}`, 14, 75);

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Summary:', 130, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`Issue Date: ${invoice.issueDate}`, 130, 58);
  doc.text(`Due Date: ${invoice.dueDate}`, 130, 63);
  doc.text(`Status: ${invoice.status.replace(/_/g, ' ')}`, 130, 68);

  let y = 88;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('#', 17, y + 6);
  doc.text('Item / Engineering Scope', 26, y + 6);
  doc.text('Qty', 130, y + 6, { align: 'right' });
  doc.text('Rate', 162, y + 6, { align: 'right' });
  doc.text('Amount (INR)', 193, y + 6, { align: 'right' });

  y += 14;
  doc.setFont('helvetica', 'normal');
  invoice.items.forEach((item, idx) => {
    const lines = doc.splitTextToSize(item.description, 92);
    doc.text(String(idx + 1), 17, y);
    doc.text(lines, 26, y);
    doc.text(String(item.quantity), 130, y, { align: 'right' });
    doc.text(item.unitPrice.toLocaleString('en-IN'), 162, y, { align: 'right' });
    doc.text(item.lineTotal.toLocaleString('en-IN'), 193, y, { align: 'right' });
    y += Math.max(8, lines.length * 5 + 3);
  });

  y += 4;
  doc.setDrawColor(203, 213, 225);
  doc.line(120, y, 196, y);
  y += 7;

  doc.text('Subtotal:', 130, y);
  doc.text(`INR ${invoice.subtotal.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 6;
  doc.text(`GST (${invoice.gstPercent}%):`, 130, y);
  doc.text(`INR ${invoice.gstAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Total Invoice:', 130, y);
  doc.text(`INR ${invoice.totalAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('Paid to Date:', 130, y);
  doc.text(`INR ${invoice.paidAmount.toLocaleString('en-IN')}`, 193, y, { align: 'right' });
  y += 6;
  const balance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  doc.setFont('helvetica', 'bold');
  doc.text('Balance Due:', 130, y);
  doc.text(`INR ${balance.toLocaleString('en-IN')}`, 193, y, { align: 'right' });

  y += 14;
  doc.setFontSize(9);
  doc.text('Payment Terms:', 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(doc.splitTextToSize(invoice.paymentTerms, 180), 14, y + 6);

  drawFooter(doc);
  doc.save(`${invoice.invoiceNumber}.pdf`);
}

export function downloadReceiptPdf(payment: Payment, config?: CompanyConfig | null) {
  const doc = new jsPDF();
  drawHeader(doc, 'Payment Receipt', payment.receiptNumber, config);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Official Payment Acknowledgement', 14, 54);

  doc.setFillColor(248, 250, 252);
  doc.rect(14, 62, 182, 74, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 62, 182, 74, 'S');

  doc.setFontSize(10);
  const rows: [string, string][] = [
    ['Receipt Number', payment.receiptNumber],
    ['Payment Date', payment.paymentDate],
    ['Received From', `${payment.customerName || 'Client'}${payment.customerCompany ? ` (${payment.customerCompany})` : ''}`],
    ['Against Invoice', payment.invoiceNumber || payment.invoiceId],
    ['Payment Type', payment.paymentType],
    ['Payment Method', payment.paymentMethod.replace(/_/g, ' ')],
    ['Transaction / Ref No.', payment.referenceNumber || 'N/A'],
    ['Recorded By', payment.recordedBy],
  ];

  let y = 72;
  rows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 72, y);
    y += 7.5;
  });

  doc.setFillColor(13, 148, 136);
  doc.rect(14, 146, 182, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Amount Received: INR ${payment.amount.toLocaleString('en-IN')}`, 20, 156);

  if (payment.notes) {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Notes: ${payment.notes}`, 14, 174, { maxWidth: 180 });
  }

  drawFooter(doc);
  doc.save(`${payment.receiptNumber}.pdf`);
}

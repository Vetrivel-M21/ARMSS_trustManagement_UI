import jsPDF from 'jspdf';
import { assetUrl } from '../api/client';
import type { Voucher } from '../types';

const TRUST_NAME = 'ARMSS CHARITABLE TRUST';
const TRUST_ADDRESS = 'No:281/6B2, First Floor, Mullur, Pudukkottai, 622004, Tamil Nadu';

const fmtAmount = (n: number) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** Loads an image (same-origin or absolute URL) as a data URL plus its
 * natural pixel size, or null if it can't be loaded — callers must degrade
 * gracefully (e.g. skip drawing a missing QR) rather than fail the PDF.
 * Fetches the bytes directly instead of drawing into a <canvas>: a
 * crossOrigin Image load can be served from a plain <img>'s non-CORS cache
 * entry and taint the canvas, which silently drops the QR from the PDF even
 * though it displays fine on screen. */
async function loadImage(url: string): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  try {
    // no-store: the same URL is very likely already in the HTTP cache from a
    // plain <img src> load elsewhere on the page (e.g. VoucherView's on-screen
    // QR/logo). That earlier request was made in "no-cors" mode and cached
    // without CORS metadata — if this fetch() (which requires CORS) reused
    // that cache entry, the browser rejects it with a false "no
    // Access-Control-Allow-Origin header" error even though the server does
    // send one on a fresh request. Forcing a real network request avoids it.
    // Authorization header is required for /uploads (the QR image); harmless
    // no-op for the frontend-served /trust-logo.png.
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      console.warn(`voucherPdf: failed to fetch image ${url} (status ${res.status})`);
      return null;
    }
    const blob = await res.blob();
    // jsPDF decodes addImage's payload according to the format string passed
    // in — mislabeling a JPEG as PNG (or vice versa) makes it fail to decode
    // into a visible image, so derive the real format from the blob's MIME
    // type rather than assuming PNG for every image.
    const format = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : blob.type.includes('webp') ? 'WEBP' : 'PNG';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const objectUrl = URL.createObjectURL(blob);
    try {
      const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('image decode failed'));
        img.src = objectUrl;
      });
      return { dataUrl, width, height, format };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (err) {
    console.warn(`voucherPdf: failed to load image ${url}`, err);
    return null;
  }
}

/** Draws the receipt directly via jsPDF's drawing primitives — never a
 * screenshot of the DOM (spec section 30) — matching the on-screen
 * VoucherView layout: green header with logo, particulars table, amount in
 * words, and a QR code when the relevant bank account has one on file. */
export async function downloadVoucherPdf(voucher: Voucher) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = 0;

  const [logo, qr] = await Promise.all([
    loadImage('/trust-logo.png'),
    voucher.bank_account?.qr_code_path ? loadImage(assetUrl(voucher.bank_account.qr_code_path)) : Promise.resolve(null),
  ]);

  // Green header
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 24, 'F');
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 4, 16, 16, 1.5, 1.5, 'F');
    // Contain the logo within the box regardless of its aspect ratio
    // (matches the on-screen VoucherView's `object-contain`) — fixing the
    // height and deriving width from it overflowed the box for logos wider
    // than they are tall.
    const boxInner = 13;
    const ratio = logo.width / logo.height;
    const w = ratio >= 1 ? boxInner : boxInner * ratio;
    const h = ratio >= 1 ? boxInner / ratio : boxInner;
    doc.addImage(logo.dataUrl, logo.format, margin + (16 - w) / 2, 4 + (16 - h) / 2, w, h);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(TRUST_NAME, margin + 20, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const addrLines = doc.splitTextToSize(TRUST_ADDRESS, pageWidth - margin * 2 - 20);
  doc.text(addrLines, margin + 20, 16);
  y = 30;

  // Date / Invoice No
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text('DATE', margin, y);
  doc.text('INVOICE NO', pageWidth / 2 + 4, y);
  y += 4;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(fmtDate(voucher.business_date), margin, y);
  doc.setTextColor(5, 120, 90);
  doc.text(voucher.voucher_number, pageWidth / 2 + 4, y);
  y += 6;
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Received From / Paid To
  const isDonation = voucher.voucher_type === 'DONATION_RECEIPT';
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(7);
  doc.text(isDonation ? 'RECEIVED FROM / DONOR' : 'PAID TO / VENDOR', margin, y);
  y += 4;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(voucher.payee_or_donor_name, margin, y);
  y += 5;

  // Particulars table header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('SL', margin + 2, y + 4);
  doc.text('PARTICULARS', margin + 12, y + 4);
  doc.text('AMOUNT (RS)', pageWidth - margin - 2, y + 4, { align: 'right' });
  y += 6;

  const particularsMain = voucher.purpose || (isDonation ? 'General Donation' : 'Expense Payment');
  const particularsSub = [voucher.category, voucher.food_type && voucher.food_type !== 'NA' ? voucher.food_type : null, voucher.meal_type && voucher.meal_type !== 'NA' ? voucher.meal_type : null]
    .filter(Boolean)
    .join(' · ');

  doc.setDrawColor(230, 230, 230);
  const rowHeight = particularsSub ? 14 : 10;
  doc.rect(margin, y, pageWidth - margin * 2, rowHeight);
  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('1', margin + 2, y + 5);
  doc.setTextColor(5, 120, 90);
  doc.setFont('helvetica', 'bold');
  doc.text(particularsMain, margin + 12, y + 5);
  if (particularsSub) {
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(particularsSub, margin + 12, y + 10);
  }
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(fmtAmount(voucher.amount), pageWidth - margin - 2, y + 5, { align: 'right' });
  y += rowHeight + 4;

  // Total Cost bar
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Total Cost', margin + 3, y + 4.8);
  doc.text(fmtAmount(voucher.amount), pageWidth - margin - 3, y + 4.8, { align: 'right' });
  y += 10;

  // Amount in words
  doc.setFillColor(255, 251, 235);
  const wrapped = doc.splitTextToSize(`Amount in Words: ${voucher.amount_in_words}`, pageWidth - margin * 2 - 6);
  const wordsHeight = wrapped.length * 3.6 + 4;
  doc.rect(margin, y, pageWidth - margin * 2, wordsHeight, 'F');
  doc.setTextColor(120, 90, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(wrapped, margin + 3, y + 4);
  y += wordsHeight + 6;

  // Footer: Payment Details | QR (or placeholder) | For-Trust/Signatory —
  // three columns matching the on-screen VoucherView layout exactly, instead
  // of leaving the left/middle columns blank when there's no QR to show.
  const colWidth = (pageWidth - margin * 2) / 3;
  const footerTop = y;
  const footerHeight = 26;
  doc.setDrawColor(230, 230, 230);
  doc.rect(margin, footerTop, pageWidth - margin * 2, footerHeight);
  doc.line(margin + colWidth, footerTop, margin + colWidth, footerTop + footerHeight);
  doc.line(margin + colWidth * 2, footerTop, margin + colWidth * 2, footerTop + footerHeight);

  // Column 1: Payment Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text('PAYMENT DETAILS', margin + 3, footerTop + 6);
  doc.setFontSize(7);
  doc.setTextColor(5, 120, 90);
  doc.text(voucher.payment_mode === 'CASH' ? 'Cash Payment Received' : 'Bank Transfer Received', margin + 3, footerTop + 12);
  doc.setTextColor(180, 130, 20);
  doc.text('Thanks for Your Support', margin + 3, footerTop + 17);
  doc.setFont('helvetica', 'normal');

  // Column 2: QR code, or a placeholder when the account has none on file
  const col2CenterX = margin + colWidth + colWidth / 2;
  if (qr) {
    const qrSize = 20;
    doc.addImage(qr.dataUrl, qr.format, col2CenterX - qrSize / 2, footerTop + 2, qrSize, qrSize);
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text('Scan to pay/verify', col2CenterX, footerTop + qrSize + 5, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    const noQrLines = doc.splitTextToSize('No QR code on file for this account', colWidth - 6);
    doc.text(noQrLines, col2CenterX, footerTop + footerHeight / 2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }

  // Column 3: For Trust / Authorized Signatory
  const col3X = margin + colWidth * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(`For: ${TRUST_NAME}`, col3X + colWidth - 3, footerTop + 6, { align: 'right' });
  doc.setDrawColor(120, 120, 120);
  doc.line(col3X + 6, footerTop + 18, col3X + colWidth - 3, footerTop + 18);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Authorized Signatory', col3X + colWidth / 2 + 1.5, footerTop + 22, { align: 'center' });

  y = footerTop + footerHeight + 4;

  // Footer bar
  doc.setFillColor(30, 41, 59);
  doc.rect(0, y, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text(`Thank you for choosing ${TRUST_NAME} — we appreciate your support!`, pageWidth / 2, y + 6, { align: 'center' });

  doc.save(`${voucher.voucher_number.replace(/\//g, '-')}.pdf`);
}

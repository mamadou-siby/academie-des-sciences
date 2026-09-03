const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const CFG = require('./_invoice-config');

function formatEUR(n) {
  return (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatDateFr(date) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Construit les lignes de la facture (désignation + montant) à partir
// d'une commande. Un abonnement facture l'acompte et la première
// mensualité séparément, un pack facture une seule ligne.
function buildLineItems(commande) {
  if (commande.type_offre === 'abonnement') {
    const items = [];
    if (commande.montant_acompte) {
      items.push({ label: `${commande.formule_label} — acompte`, amount: commande.montant_acompte });
    }
    items.push({ label: `${commande.formule_label} — 1re mensualité`, amount: commande.prix_total });
    return items;
  }
  return [{ label: commande.formule_label, amount: commande.prix_total }];
}

async function generateInvoicePdf(commande, numeroFacture) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const INK = rgb(0.09, 0.09, 0.11);
  const MUTED = rgb(0.36, 0.37, 0.45);
  const ACCENT = rgb(0.31, 0.27, 0.9); // #4F46E5

  let y = 800;
  const left = 50;
  const right = 545;

  function text(str, x, yy, opts = {}) {
    page.drawText(String(str), {
      x, y: yy,
      size: opts.size || 10,
      font: opts.bold ? fontBold : font,
      color: opts.color || INK
    });
  }
  function textRight(str, xEnd, yy, opts = {}) {
    const size = opts.size || 10;
    const f = opts.bold ? fontBold : font;
    const w = f.widthOfTextAtSize(String(str), size);
    text(str, xEnd - w, yy, opts);
  }

  // En-tête
  text('AVEN & CO', left, y, { size: 20, bold: true, color: ACCENT });
  text("L'Académie des Sciences", left, y - 16, { size: 10, color: MUTED });

  textRight('FACTURE', right, y, { size: 20, bold: true });
  textRight(numeroFacture, right, y - 18, { size: 11, color: MUTED });
  textRight(`Date : ${formatDateFr(commande.date_paiement || new Date())}`, right, y - 33, { size: 10, color: MUTED });

  y -= 70;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) });
  y -= 30;

  // Émetteur / Client, deux colonnes
  text('Émetteur', left, y, { size: 9, bold: true, color: MUTED });
  text('Client', 320, y, { size: 9, bold: true, color: MUTED });
  y -= 16;

  const sellerLines = [
    `${CFG.SELLER_LEGAL_NAME} (${CFG.SELLER_LEGAL_FORM})`,
    CFG.SELLER_TRADE_NAME,
    CFG.SELLER_ADDRESS_LINE1,
    CFG.SELLER_ADDRESS_LINE2,
    `SIRET : ${CFG.SELLER_SIRET}`,
    CFG.SELLER_EMAIL
  ];
  const clientNameLine = `${commande.prenom_parent || ''} ${commande.nom_parent || ''}`.trim() || 'Client';
  const clientLines = [clientNameLine];
  if (commande.adresse_facturation) {
    // L'adresse est saisie en un seul champ libre : on la répartit sur
    // plusieurs lignes si elle est longue, sans découpage strict.
    clientLines.push(commande.adresse_facturation);
  }
  clientLines.push(commande.email_parent || '');

  let ySeller = y, yClient = y;
  sellerLines.forEach((l) => { text(l, left, ySeller, { size: 9.5 }); ySeller -= 13; });
  clientLines.forEach((l) => { text(l, 320, yClient, { size: 9.5 }); yClient -= 13; });

  y = Math.min(ySeller, yClient) - 25;

  // Tableau des lignes facturées
  page.drawRectangle({ x: left, y: y - 4, width: right - left, height: 20, color: rgb(0.97, 0.97, 0.98) });
  text('Désignation', left + 8, y + 2, { size: 9, bold: true, color: MUTED });
  textRight('Montant', right - 8, y + 2, { size: 9, bold: true, color: MUTED });
  y -= 24;

  const items = buildLineItems(commande);
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += Number(item.amount) || 0;
    text(item.label, left + 8, y, { size: 10 });
    textRight(formatEUR(item.amount), right - 8, y, { size: 10 });
    y -= 20;
    page.drawLine({ start: { x: left, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: 0.5, color: rgb(0.92, 0.92, 0.94) });
  });

  y -= 10;

  // Total + mention TVA
  if (CFG.VAT_APPLICABLE) {
    const ht = subtotal / (1 + CFG.VAT_RATE);
    const tva = subtotal - ht;
    text('Total HT', left + 8, y, { size: 10, color: MUTED });
    textRight(formatEUR(ht), right - 8, y, { size: 10 });
    y -= 16;
    text(`TVA (${Math.round(CFG.VAT_RATE * 100)} %)`, left + 8, y, { size: 10, color: MUTED });
    textRight(formatEUR(tva), right - 8, y, { size: 10 });
    y -= 20;
    text('Total TTC', left + 8, y, { size: 12, bold: true });
    textRight(formatEUR(subtotal), right - 8, y, { size: 12, bold: true });
  } else {
    text('Total', left + 8, y, { size: 12, bold: true });
    textRight(formatEUR(subtotal), right - 8, y, { size: 12, bold: true });
    y -= 18;
    text(CFG.VAT_EXEMPTION_MENTION, left + 8, y, { size: 8.5, color: MUTED });
  }

  y -= 30;
  page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: rgb(0.85, 0.85, 0.88) });
  y -= 20;
  text('Facture acquittée — paiement reçu en ligne par carte bancaire (Stripe).', left, y, { size: 9, color: MUTED });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

module.exports = { generateInvoicePdf };

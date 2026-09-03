// Informations de l'émetteur, utilisées pour générer les factures PDF.
//
// TVA — confirmé le 04/09/2026 : AVEN SASU n'est pas exonérée, la TVA
// s'applique. Le taux ci-dessous (20 %) est le taux standard français ;
// si votre expert-comptable indique qu'un taux réduit s'applique à une
// partie de votre activité, ajustez VAT_RATE en conséquence.

module.exports = {
  SELLER_TRADE_NAME: "Aven & Co — L'Académie des Sciences",
  SELLER_LEGAL_NAME: 'AVEN',
  SELLER_LEGAL_FORM: 'SASU',
  SELLER_SIRET: '934 294 299 00011',
  SELLER_ADDRESS_LINE1: '122 rue Amelot',
  SELLER_ADDRESS_LINE2: '75011 Paris',
  SELLER_EMAIL: 'contact@aven-co.com',

  // ⚠️ Voir l'avertissement ci-dessus avant de modifier ces deux lignes.
  VAT_APPLICABLE: true,
  VAT_RATE: 0.20,
  VAT_EXEMPTION_MENTION: 'TVA non applicable, article 293 B du Code général des impôts.'
};

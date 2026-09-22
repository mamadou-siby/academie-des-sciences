(function () {
  var API_BASE = '/api';

  // Catalogue d'affichage uniquement (aucun prix envoyé au serveur : le
  // serveur revalide tout via code_offre, voir _offers-config.js). Ces
  // valeurs doivent rester synchronisées avec cours.html si les tarifs
  // changent — elles ne servent qu'à l'affichage avant paiement.
  var PACK_FORMULES = {
    primaire_6e: [
      { code: 'PACK_PRIMAIRE_3H', badge: '3 h / semaine', organisation: '2 × 1 h 30', volume: '21 heures', prix: 420 },
      { code: 'PACK_PRIMAIRE_4H', badge: '4 h / semaine', organisation: '2 × 2 h', volume: '28 heures', prix: 560 },
      { code: 'PACK_PRIMAIRE_4H30', badge: '4 h 30 / semaine', organisation: '3 × 1 h 30', volume: '31h30', prix: 630 }
    ],
    '4e_terminale': [
      { code: 'PACK_LYCEE_3H', badge: '3 h / semaine', organisation: '2 × 1 h 30', volume: '21 heures', prix: 504 },
      { code: 'PACK_LYCEE_4H', badge: '4 h / semaine', organisation: '2 × 2 h', volume: '28 heures', prix: 672 },
      { code: 'PACK_LYCEE_4H30', badge: '4 h 30 / semaine', organisation: '3 × 1 h 30', volume: '31h30', prix: 756 }
    ]
  };

  var ABONNEMENT_INFO = {
    ABONNEMENT_75: { label: 'Abonnement — Formule 1h/semaine', prix: 75, acompte: 45, organisation: '1h / semaine', duree: '30 séances sur l’année (10 mensualités)' },
    ABONNEMENT_90: { label: 'Abonnement — Formule 1h30/semaine', prix: 90, acompte: 60, organisation: '1h30 / semaine', duree: '30 séances sur l’année (10 mensualités)' },
    // École d'Anglais : même modèle tarifaire que l'Académie des Sciences (mêmes montants)
    ABONNEMENT_ANGLAIS_75: { label: 'École d’Anglais — Formule 1h/semaine', prix: 75, acompte: 45, organisation: '1h / semaine', duree: '30 séances sur l’année (10 mensualités)', matiere: 'Anglais' },
    ABONNEMENT_ANGLAIS_90: { label: 'École d’Anglais — Formule 1h30/semaine', prix: 90, acompte: 60, organisation: '1h30 / semaine', duree: '30 séances sur l’année (10 mensualités)', matiere: 'Anglais' }
  };

  var state = {
    typeOffre: null,     // 'pack_7_semaines' | 'abonnement'
    niveau: null,
    cycle: null,          // 'primaire_6e' | '4e_terminale'
    codeOffre: null,
    formule: null         // objet formule sélectionné (pack ou abonnement)
  };

  var currentStep = 1;

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function goToStep(step) {
    currentStep = step;
    qsa('.commande-panel').forEach(function (p) {
      p.classList.toggle('active', Number(p.dataset.panel) === step);
    });
    qsa('#steps-indicator span').forEach(function (s) {
      var n = Number(s.dataset.step);
      s.classList.toggle('active', n === step);
      s.classList.toggle('done', n < step);
    });
    if (step === 3) applyDisciplineHints();
    window.scrollTo({ top: qs('.commande-steps').offsetTop - 90, behavior: 'smooth' });
  }

  // Exemples de saisie adaptés à l'offre choisie (École d'Anglais ou Académie des Sciences).
  function applyDisciplineHints() {
    var english = !!(state.formule && state.formule.matiere === 'Anglais');
    var obj = $('eleve_objectif'), ech = $('eleve_echeance'), mat = $('eleve_matieres');
    if (obj) obj.placeholder = english ? 'Ex. gagner en aisance à l’oral, préparer un examen Cambridge' : 'Ex. consolider les bases, préparer le Baccalauréat';
    if (ech) ech.placeholder = english ? 'Ex. examen en juin, séjour à l’étranger' : 'Ex. contrôle le 15 novembre';
    if (mat) mat.placeholder = english ? 'Anglais (renseigné automatiquement)' : 'Ex. mathématiques, physique-chimie';
  }

  qsa('[data-back]').forEach(function (btn) {
    btn.addEventListener('click', function () { goToStep(Number(btn.dataset.back)); });
  });

  // ---------- Étape 1 : type d'offre ----------
  qsa('.offer-choice-card').forEach(function (card) {
    card.addEventListener('click', function () {
      qsa('.offer-choice-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      state.typeOffre = card.dataset.type;
      $('next-1').disabled = false;
    });
  });

  $('next-1').addEventListener('click', function () {
    $('pack-niveau-block').style.display = state.typeOffre === 'pack_7_semaines' ? 'block' : 'none';
    $('pack-formule-block').style.display = 'none';
    $('abonnement-formule-block').style.display = state.typeOffre === 'abonnement' ? 'block' : 'none';
    $('next-2').disabled = true;
    goToStep(2);
  });

  // ---------- Étape 2 : niveau (packs) ----------
  qsa('.niveau-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      qsa('.niveau-pill').forEach(function (p) { p.classList.remove('selected'); });
      pill.classList.add('selected');
      state.niveau = pill.dataset.niveau;
      state.cycle = pill.dataset.cycle;
      renderPackFormules();
      $('pack-formule-block').style.display = 'block';
    });
  });

  function renderPackFormules() {
    var grid = $('pack-formule-grid');
    grid.innerHTML = '';
    var formules = PACK_FORMULES[state.cycle] || [];
    formules.forEach(function (f) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'formule-choice-card';
      card.dataset.code = f.code;
      card.innerHTML =
        '<span class="badge">' + f.badge + '</span>' +
        '<div class="price">' + f.prix + ' €</div>' +
        '<div class="detail">' + f.organisation + ' · ' + f.volume + ' sur 7 semaines</div>';
      card.addEventListener('click', function () {
        qsa('.formule-choice-card', grid).forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        state.codeOffre = f.code;
        state.formule = f;
        $('next-2').disabled = false;
      });
      grid.appendChild(card);
    });
  }

  // ---------- Étape 2 : formule (abonnement) ----------
  qsa('#abonnement-formule-block .formule-choice-card').forEach(function (card) {
    card.addEventListener('click', function () {
      qsa('#abonnement-formule-block .formule-choice-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      state.codeOffre = card.dataset.code;
      state.formule = ABONNEMENT_INFO[card.dataset.code];
      $('next-2').disabled = false;
    });
  });

  $('next-2').addEventListener('click', function () { goToStep(3); });

  // ---------- Étape 3 : élève ----------
  function validateRequired(panelSelector) {
    var valid = true;
    qsa('[data-field]', qs(panelSelector)).forEach(function (field) {
      if (!field.value.trim()) {
        field.style.borderColor = '#e0483e';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });
    return valid;
  }

  $('next-3').addEventListener('click', function () {
    if (!validateRequired('[data-panel="3"]')) return;
    goToStep(4);
  });

  // ---------- Étape 4 : parent ----------
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isValidPhone(v) {
    var digits = v.replace(/[\s.\-()]/g, '');
    return /^(\+33|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
  }

  $('next-4').addEventListener('click', function () {
    if (!validateRequired('[data-panel="4"]')) return;
    var email = $('parent_email').value.trim();
    var tel = $('parent_telephone').value.trim();
    if (!isValidEmail(email)) { $('parent_email').style.borderColor = '#e0483e'; return; }
    if (!isValidPhone(tel)) { $('parent_telephone').style.borderColor = '#e0483e'; return; }
    renderRecap();
    goToStep(5);
  });

  // ---------- Étape 5 : récapitulatif ----------
  function renderRecap() {
    var eleveNom = $('eleve_prenom').value.trim() + ' ' + $('eleve_nom').value.trim();
    var parentNom = $('parent_prenom').value.trim() + ' ' + $('parent_nom').value.trim();

    $('recap-eleve').textContent = eleveNom;
    $('recap-parent').textContent = parentNom;
    $('recap-email').textContent = $('parent_email').value.trim();

    if (state.typeOffre === 'pack_7_semaines') {
      $('recap-formule').textContent = (state.niveau) + ' · ' + state.formule.badge;
      $('recap-niveau-row').style.display = 'flex';
      $('recap-niveau').textContent = state.niveau;
      $('recap-rythme-row').style.display = 'flex';
      $('recap-rythme').textContent = state.formule.organisation + ' (' + state.formule.volume + ')';
      $('recap-duree-row').style.display = 'flex';
      $('recap-duree').textContent = 'Cycle de 7 semaines';
      $('recap-type-paiement').textContent = 'Paiement unique';
      $('recap-total-label').textContent = 'Total à payer aujourd’hui';
      $('recap-total-amount').textContent = state.formule.prix + ' €';
      $('recap-abonnement-note').style.display = 'none';
    } else {
      $('recap-formule').textContent = state.formule.label;
      $('recap-niveau-row').style.display = 'none';
      $('recap-rythme-row').style.display = 'flex';
      $('recap-rythme').textContent = state.formule.organisation;
      $('recap-duree-row').style.display = 'flex';
      $('recap-duree').textContent = state.formule.duree;
      $('recap-type-paiement').textContent = 'Paiement mensuel récurrent (10 mensualités)';
      $('recap-total-label').textContent = 'Montant débité aujourd’hui';
      $('recap-total-amount').textContent = (state.formule.acompte + state.formule.prix) + ' €';
      $('recap-abonnement-note').style.display = 'block';
      $('recap-abonnement-note').textContent =
        'Détail : ' + state.formule.acompte + ' € d’acompte + ' + state.formule.prix + ' € (1re mensualité). ' +
        'Il y aura ensuite 9 mensualités supplémentaires de ' + state.formule.prix + ' €, prélevées automatiquement chaque mois. Aucun renouvellement automatique au-delà des 10 mensualités.';
    }
  }

  $('pay-btn').addEventListener('click', function () {
    var btn = $('pay-btn');
    btn.disabled = true;
    btn.textContent = 'Redirection en cours…';

    var payload = {
      code_offre: state.codeOffre,
      eleve: {
        prenom: $('eleve_prenom').value.trim(),
        nom: $('eleve_nom').value.trim(),
        classe: $('eleve_classe').value.trim(),
        etablissement: $('eleve_etablissement').value.trim(),
        matieres: $('eleve_matieres').value.trim() || (state.formule && state.formule.matiere) || '',
        objectif: $('eleve_objectif').value.trim(),
        difficultes: $('eleve_difficultes').value.trim(),
        echeance: $('eleve_echeance').value.trim(),
        niveau: state.niveau
      },
      parent: {
        prenom: $('parent_prenom').value.trim(),
        nom: $('parent_nom').value.trim(),
        email: $('parent_email').value.trim(),
        telephone: $('parent_telephone').value.trim(),
        adresse_facturation: $('parent_adresse').value.trim()
      }
    };

    fetch(API_BASE + '/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');
          return data;
        });
      })
      .then(function (data) {
        window.location.href = data.url;
      })
      .catch(function (err) {
        $('api-warning').style.display = 'block';
        $('api-warning').textContent = 'Impossible de démarrer le paiement : ' + err.message;
        btn.disabled = false;
        btn.textContent = 'Procéder au paiement sécurisé';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
  });

  // Préselection depuis l'URL, pour permettre à un lien externe (page
  // tarifs, accueil...) de lancer le tunnel déjà rempli :
  //   ?pack=PACK_LYCEE_4H        → offre + niveau + formule choisis, saut direct à l'étape 3
  //   ?abonnement=ABONNEMENT_75  → offre + formule choisies, saut direct à l'étape 3
  //   ?abonnement=ABONNEMENT_ANGLAIS_75 (ou _90) → idem pour l'École d'Anglais
  //   ?cycle=primaire_6e         → offre "pack" + volet niveau affiché, l'utilisateur choisit ensuite
  (function preselectFromQuery() {
    var params = new URLSearchParams(window.location.search);
    var packCode = params.get('pack');
    var abonnementCode = params.get('abonnement');
    var cycle = params.get('cycle');

    function selectOfferType(type) {
      state.typeOffre = type;
      var card = qs('.offer-choice-card[data-type="' + type + '"]');
      if (card) card.classList.add('selected');
      $('next-1').disabled = false;
    }

    function revealStep2Blocks() {
      $('pack-niveau-block').style.display = state.typeOffre === 'pack_7_semaines' ? 'block' : 'none';
      $('abonnement-formule-block').style.display = state.typeOffre === 'abonnement' ? 'block' : 'none';
    }

    if (packCode) {
      var found = null, foundCycle = null;
      Object.keys(PACK_FORMULES).forEach(function (c) {
        PACK_FORMULES[c].forEach(function (f) { if (f.code === packCode) { found = f; foundCycle = c; } });
      });
      if (found) {
        selectOfferType('pack_7_semaines');
        revealStep2Blocks();
        state.cycle = foundCycle;
        var pill = qsa('.niveau-pill').filter(function (p) { return p.dataset.cycle === foundCycle; })[0];
        if (pill) {
          pill.classList.add('selected');
          state.niveau = pill.dataset.niveau;
        }
        renderPackFormules();
        $('pack-formule-block').style.display = 'block';
        var card = qs('.formule-choice-card[data-code="' + packCode + '"]', $('pack-formule-grid'));
        if (card) {
          card.classList.add('selected');
          state.codeOffre = packCode;
          state.formule = found;
        }
        goToStep(3);
        return;
      }
    }

    if (abonnementCode && ABONNEMENT_INFO[abonnementCode]) {
      selectOfferType('abonnement');
      revealStep2Blocks();
      var aCard = qs('.formule-choice-card[data-code="' + abonnementCode + '"]');
      if (aCard) aCard.classList.add('selected');
      state.codeOffre = abonnementCode;
      state.formule = ABONNEMENT_INFO[abonnementCode];
      goToStep(3);
      return;
    }

    if (cycle && PACK_FORMULES[cycle]) {
      selectOfferType('pack_7_semaines');
      revealStep2Blocks();
      goToStep(2);
    }
  })();
})();

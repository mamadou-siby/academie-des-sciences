// ============================================================================
// VERSION TEMPORAIRE du formulaire d'inscription — mode « à recontacter »
//
// Pas de date ni de créneau : le parent choisit l'académie, le lieu et le
// niveau, renseigne ses coordonnées, clique sur « Valider », et le message de
// confirmation lui indique qu'il sera recontacté pour fixer la date et le
// créneau. La demande part vers /api/temporaire-recontact (e-mail d'alerte à
// contact@aven-co.com + enregistrement dans l'admin).
//
// La version normale (avec dates et créneaux) est assets/js/inscription.js.
// Voir temporaire/LISEZ-MOI.md.
// ============================================================================
(function () {
  var API_BASE = '/api';

  var form = document.getElementById('inscription-form');
  var lieuSelect = document.getElementById('lieu');
  var niveauSelect = document.getElementById('niveau');
  var loadingEl = document.getElementById('form-loading');
  var apiErrorEl = document.getElementById('form-api-error');
  var successEl = document.getElementById('form-success');
  var recapList = document.getElementById('recap-list');
  var submitBtn = document.getElementById('submit-btn');

  var academieCards = document.querySelectorAll('[data-academie]');
  var kickerEl = document.getElementById('inscr-kicker');
  var titleEl = document.getElementById('inscr-title');
  var leadEl = document.getElementById('inscr-lead');
  var allNiveaux = [];
  var academie = 'sciences';
  var usingFallback = false;

  var TEXTS = {
    sciences: {
      label: 'Académie des Sciences',
      kicker: 'Atelier découverte · Gratuit',
      title: 'Inscription à l’atelier découverte',
      lead: 'Inscrivez votre enfant à l’atelier découverte : choisissez un lieu et un niveau, puis renseignez vos coordonnées.'
    },
    langues: {
      label: 'Académie des Langues · Anglais',
      kicker: 'Cours d’essai · Académie des Langues',
      title: 'Réserver un cours d’essai d’anglais',
      lead: 'Découvrez l’École d’Anglais avant de vous engager : choisissez un lieu et un niveau, puis renseignez vos coordonnées.'
    }
  };

  // Niveaux proposés pour l'anglais tant qu'aucun niveau « Anglais… » n'existe dans l'admin
  var STATIC_LANGUES_NIVEAUX = [
    { id: 'libre-1', nom: 'Anglais — Maternelle (MS/GS)' },
    { id: 'libre-2', nom: 'Anglais — Primaire' },
    { id: 'libre-3', nom: 'Anglais — Collège' },
    { id: 'libre-4', nom: 'Anglais — Lycée' }
  ];

  // Données de secours si l'API n'est pas joignable (prévisualisation sans backend)
  var FALLBACK = {
    lieux: [
      { id: 'demo-1', nom: 'Paris' },
      { id: 'demo-2', nom: 'Versailles' },
      { id: 'demo-3', nom: 'Boulogne' }
    ],
    niveaux: [
      { id: 'demo-1', nom: 'Cycle 1 (MS, GS)' },
      { id: 'demo-2', nom: 'Cycle 2 (CP, CE1, CE2)' },
      { id: 'demo-3', nom: 'Cycle 3 (CM1, CM2, 6e)' },
      { id: 'demo-4', nom: 'Cycle 4 (5e, 4e, 3e)' },
      { id: 'demo-5', nom: 'Lycée (2nde, 1re, Terminale)' }
    ]
  };

  function isEnglishNiveau(n) { return /^\s*anglais/i.test((n && n.nom) || ''); }
  function niveauxForAcademie() {
    return allNiveaux.filter(function (n) { return academie === 'langues' ? isEnglishNiveau(n) : !isEnglishNiveau(n); });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fetchJSON(path) {
    return fetch(API_BASE + path).then(function (res) {
      if (!res.ok) throw new Error('Réponse API invalide (' + path + ')');
      return res.json();
    });
  }

  function fillSelect(select, items, placeholder) {
    select.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    items.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.nom;
      select.appendChild(opt);
    });
  }

  function setAcademie(next) {
    academie = next === 'langues' ? 'langues' : 'sciences';
    Array.prototype.forEach.call(academieCards, function (card) {
      var on = card.dataset.academie === academie;
      card.classList.toggle('selected', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var t = TEXTS[academie];
    if (kickerEl) kickerEl.textContent = t.kicker;
    if (titleEl) titleEl.textContent = t.title;
    if (leadEl) leadEl.textContent = t.lead;
    var list = niveauxForAcademie();
    if (academie === 'langues' && !list.length) list = STATIC_LANGUES_NIVEAUX;
    fillSelect(niveauSelect, list, 'Sélectionner un niveau');
  }

  Array.prototype.forEach.call(academieCards, function (card) {
    card.addEventListener('click', function () { setAcademie(card.dataset.academie); });
  });

  function loadOptions() {
    Promise.all([fetchJSON('/lieux'), fetchJSON('/niveaux')])
      .then(function (results) {
        fillSelect(lieuSelect, results[0], 'Sélectionner un lieu');
        allNiveaux = results[1];
      })
      .catch(function () {
        usingFallback = true;
        fillSelect(lieuSelect, FALLBACK.lieux, 'Sélectionner un lieu');
        allNiveaux = FALLBACK.niveaux;
        apiErrorEl.style.display = 'block';
      })
      .then(function () {
        var wanted = new URLSearchParams(window.location.search).get('academie');
        setAcademie(wanted === 'langues' ? 'langues' : 'sciences');
        loadingEl.style.display = 'none';
        form.style.display = 'block';
      });
  }

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isValidPhone(v) {
    var digits = v.replace(/[\s.\-()]/g, '');
    return /^(\+33|0)[1-9]\d{8}$/.test(digits) || /^\+?\d{8,15}$/.test(digits);
  }

  function setError(group, message) {
    var err = group.querySelector('.field-error');
    if (message) {
      group.classList.add('invalid');
      err.textContent = message;
    } else {
      group.classList.remove('invalid');
    }
  }

  function validate() {
    var valid = true;
    form.querySelectorAll('[data-field]').forEach(function (field) {
      var group = field.closest('.form-group');
      var value = field.value.trim();
      if (!value) { setError(group, 'Ce champ est obligatoire.'); valid = false; return; }
      if (field.type === 'email' && !isValidEmail(value)) { setError(group, 'Adresse email invalide.'); valid = false; return; }
      if (field.type === 'tel' && !isValidPhone(value)) { setError(group, 'Numéro de téléphone invalide.'); valid = false; return; }
      setError(group, null);
    });
    return valid;
  }

  // Le message « nous vous recontacterons… » n'apparaît qu'ici, après « Valider ».
  function showSuccess(recap) {
    form.style.display = 'none';
    successEl.style.display = 'block';
    var rows = [
      ['Académie', TEXTS[academie].label],
      ['Lieu', recap.lieu],
      ['Niveau', recap.niveau],
      ['Date et créneau', 'À fixer avec vous'],
      ['Élève', recap.eleve],
      ['Parent', recap.parent]
    ];
    recapList.innerHTML = rows.map(function (row) {
      return '<li><span>' + escapeHtml(row[0]) + '</span><span>' + escapeHtml(row[1]) + '</span></li>';
    }).join('');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    var niveauLibre = niveauSelect.value.indexOf('libre-') === 0;
    var payload = {
      academie: academie,
      lieu_id: lieuSelect.value,
      niveau_id: niveauLibre ? null : niveauSelect.value,
      niveau_libre: niveauLibre ? niveauSelect.options[niveauSelect.selectedIndex].textContent : null,
      prenom_eleve: document.getElementById('prenom_eleve').value.trim(),
      nom_eleve: document.getElementById('nom_eleve').value.trim(),
      age_eleve: document.getElementById('age_eleve').value.trim(),
      nom_prenom_parent: document.getElementById('nom_prenom_parent').value.trim(),
      email_parent: document.getElementById('email_parent').value.trim(),
      telephone_parent: document.getElementById('telephone_parent').value.trim(),
      code_suivi: document.getElementById('code_suivi').value.trim() || null
    };

    var recapBase = {
      lieu: lieuSelect.options[lieuSelect.selectedIndex].textContent,
      niveau: niveauSelect.options[niveauSelect.selectedIndex].textContent,
      eleve: payload.prenom_eleve + ' ' + payload.nom_eleve,
      parent: payload.nom_prenom_parent
    };

    if (usingFallback) {
      // Backend non connecté (prévisualisation) : on simule l'enregistrement.
      setTimeout(function () { showSuccess(recapBase); }, 300);
      return;
    }

    fetch(API_BASE + '/temporaire-recontact', {
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
        showSuccess({ lieu: recapBase.lieu, niveau: recapBase.niveau, eleve: data.eleve, parent: data.parent });
      })
      .catch(function (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Valider';
      });
  });

  loadOptions();
})();

(function () {
  var API_BASE = '/api';

  var form = document.getElementById('inscription-form');
  var lieuSelect = document.getElementById('lieu');
  var niveauSelect = document.getElementById('niveau');
  var dateSelect = document.getElementById('date');
  var creneauSelect = document.getElementById('creneau');
  var loadingEl = document.getElementById('form-loading');
  var apiErrorEl = document.getElementById('form-api-error');
  var successEl = document.getElementById('form-success');
  var recapList = document.getElementById('recap-list');
  var submitBtn = document.getElementById('submit-btn');

  // --- Choix de l'académie (Langues = anglais / Sciences = maths, sciences, logique) ---
  // Les niveaux de l'École d'Anglais sont créés dans l'admin avec un nom qui
  // commence par « Anglais » (ex. « Anglais — collège »). Les autres niveaux
  // restent ceux de l'Académie des Sciences. Aucune modification de la base.
  var academieCards = document.querySelectorAll('[data-academie]');
  var noticeEl = document.getElementById('niveau-notice');
  var kickerEl = document.getElementById('inscr-kicker');
  var titleEl = document.getElementById('inscr-title');
  var leadEl = document.getElementById('inscr-lead');
  var allNiveaux = [];
  var academie = 'sciences';
  var datesToken = 0;
  var TEXTS = {
    sciences: {
      label: 'Académie des Sciences',
      kicker: 'Atelier découverte · Gratuit',
      title: 'Inscription à l’atelier découverte',
      lead: 'Réservez une séance découverte pour votre enfant : choisissez un lieu, un niveau, une date et un créneau, puis renseignez vos coordonnées.'
    },
    langues: {
      label: 'Académie des Langues · Anglais',
      kicker: 'Cours d’essai · Académie des Langues',
      title: 'Réserver un cours d’essai d’anglais',
      lead: 'Découvrez l’École d’Anglais avant de vous engager : choisissez un lieu, un niveau, une date et un créneau, puis renseignez vos coordonnées.'
    }
  };
  function isEnglishNiveau(n) { return /^\s*anglais/i.test((n && n.nom) || ''); }
  function niveauxForAcademie() {
    return allNiveaux.filter(function (n) { return academie === 'langues' ? isEnglishNiveau(n) : !isEnglishNiveau(n); });
  }

  // Données de secours utilisées UNIQUEMENT si l'API (/api/lieux, /api/niveaux,
  // /api/dates, /api/creneaux) n'est pas joignable — par exemple si ce site
  // est prévisualisé sans que les Netlify Functions / la base de données ne
  // soient encore connectées. Une fois le backend en place (voir
  // README-inscription.md), ces données de secours ne sont jamais utilisées :
  // le fetch réussit et les vraies données administrées les remplacent.
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
      { id: 'demo-5', nom: 'Lycée (2nde, 1re, Terminale)' },
      { id: 'demo-a1', nom: 'Anglais — dès 4 ans' },
      { id: 'demo-a2', nom: 'Anglais — collège' },
      { id: 'demo-a3', nom: 'Anglais — lycée' }
    ],
    dates: [
      { id: 'demo-1', date: nextSaturdayISO(0) },
      { id: 'demo-2', date: nextSaturdayISO(1) },
      { id: 'demo-3', date: nextSaturdayISO(2) }
    ],
    creneaux: [
      { id: 'demo-1', nom: '9h - 10h' },
      { id: 'demo-2', nom: '10h - 11h' },
      { id: 'demo-3', nom: '14h - 15h' },
      { id: 'demo-4', nom: '16h - 17h' },
      { id: 'demo-5', nom: '17h - 18h' },
      { id: 'demo-6', nom: '18h - 19h' }
    ]
  };

  function nextSaturdayISO(weeksAhead) {
    var d = new Date();
    var offset = (6 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + offset + weeksAhead * 7);
    return d.toISOString().slice(0, 10);
  }

  var usingFallback = false;

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

  function formatDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    var text = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function fillSelect(select, items, placeholder, isDate) {
    select.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    items.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = isDate ? formatDate(item.date) : item.nom;
      select.appendChild(opt);
    });
  }

  function resetCreneau() {
    creneauSelect.disabled = true;
    fillSelect(creneauSelect, [], 'Sélectionnez d’abord une date', false);
  }

  function resetDates(message) {
    datesToken++;
    dateSelect.disabled = true;
    fillSelect(dateSelect, [], message || 'Choisissez d’abord un niveau', true);
    resetCreneau();
  }

  // Les dates dépendent du niveau (et du lieu) : l'admin peut réserver une date
  // à un niveau précis, par exemple un atelier d'anglais.
  function refreshDates() {
    if (!niveauSelect.value) { resetDates(); return; }
    if (usingFallback) {
      fillSelect(dateSelect, FALLBACK.dates, 'Sélectionner une date', true);
      dateSelect.disabled = false;
      resetCreneau();
      return;
    }
    var token = ++datesToken;
    dateSelect.disabled = true;
    fillSelect(dateSelect, [], 'Chargement des dates…', true);
    resetCreneau();
    var query = '?niveau_id=' + encodeURIComponent(niveauSelect.value) +
      (lieuSelect.value ? '&lieu_id=' + encodeURIComponent(lieuSelect.value) : '');
    fetchJSON('/dates' + query)
      .then(function (dates) {
        if (token !== datesToken) return;
        if (!dates.length) {
          fillSelect(dateSelect, [], 'Aucune date disponible pour ce choix', true);
          return;
        }
        fillSelect(dateSelect, dates, 'Sélectionner une date', true);
        dateSelect.disabled = false;
      })
      .catch(function () {
        if (token !== datesToken) return;
        fillSelect(dateSelect, [], 'Dates indisponibles', true);
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
    fillSelect(niveauSelect, list, 'Sélectionner un niveau', false);
    if (!list.length) {
      noticeEl.textContent = academie === 'langues'
        ? 'Aucun créneau de cours d’essai d’anglais n’est ouvert pour le moment. Écrivez-nous à contact@aven-co.com : nous vous répondrons dès l’ouverture des prochaines dates.'
        : 'Aucun niveau n’est ouvert pour le moment.';
      noticeEl.style.display = 'block';
    } else {
      noticeEl.style.display = 'none';
    }
    resetDates();
  }

  Array.prototype.forEach.call(academieCards, function (card) {
    card.addEventListener('click', function () { setAcademie(card.dataset.academie); });
  });
  niveauSelect.addEventListener('change', refreshDates);
  lieuSelect.addEventListener('change', function () { if (niveauSelect.value) refreshDates(); });

  function loadOptions() {
    Promise.all([fetchJSON('/lieux'), fetchJSON('/niveaux')])
      .then(function (results) {
        fillSelect(lieuSelect, results[0], 'Sélectionner un lieu', false);
        allNiveaux = results[1];
      })
      .catch(function () {
        usingFallback = true;
        fillSelect(lieuSelect, FALLBACK.lieux, 'Sélectionner un lieu', false);
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

  // Le créneau dépend de la date choisie : un même horaire peut être
  // proposé un jour donné et pas un autre. Tant qu'aucune date n'est
  // sélectionnée, le champ reste désactivé.
  dateSelect.addEventListener('change', function () {
    var dateId = dateSelect.value;
    if (!dateId) {
      creneauSelect.disabled = true;
      fillSelect(creneauSelect, [], 'Sélectionnez d’abord une date', false);
      return;
    }

    if (usingFallback) {
      fillSelect(creneauSelect, FALLBACK.creneaux, 'Sélectionner un créneau', false);
      creneauSelect.disabled = false;
      return;
    }

    creneauSelect.disabled = true;
    fillSelect(creneauSelect, [], 'Chargement des créneaux…', false);
    fetchJSON('/creneaux?date_id=' + encodeURIComponent(dateId))
      .then(function (creneaux) {
        fillSelect(creneauSelect, creneaux, 'Sélectionner un créneau', false);
        creneauSelect.disabled = false;
      })
      .catch(function () {
        fillSelect(creneauSelect, [], 'Aucun créneau disponible', false);
      });
  });

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
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
    var fields = form.querySelectorAll('[data-field]');
    fields.forEach(function (field) {
      var group = field.closest('.form-group');
      var value = field.value.trim();
      if (!value) {
        setError(group, 'Ce champ est obligatoire.');
        valid = false;
        return;
      }
      if (field.type === 'email' && !isValidEmail(value)) {
        setError(group, 'Adresse email invalide.');
        valid = false;
        return;
      }
      if (field.type === 'tel' && !isValidPhone(value)) {
        setError(group, 'Numéro de téléphone invalide.');
        valid = false;
        return;
      }
      setError(group, null);
    });
    return valid;
  }

  function showSuccess(recap) {
    form.style.display = 'none';
    successEl.style.display = 'block';
    var rows = [
      ['Académie', TEXTS[academie].label],
      ['Lieu', recap.lieu],
      ['Niveau', recap.niveau],
      ['Date', recap.date],
      ['Créneau', recap.creneau],
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

    var common = {
      prenom_eleve: document.getElementById('prenom_eleve').value.trim(),
      nom_eleve: document.getElementById('nom_eleve').value.trim(),
      age_eleve: document.getElementById('age_eleve').value.trim(),
      nom_prenom_parent: document.getElementById('nom_prenom_parent').value.trim(),
      email_parent: document.getElementById('email_parent').value.trim(),
      telephone_parent: document.getElementById('telephone_parent').value.trim(),
      code_suivi: document.getElementById('code_suivi').value.trim() || null
    };
    var payload = {
      lieu_id: lieuSelect.value,
      niveau_id: niveauSelect.value,
      date_id: dateSelect.value,
      creneau_id: creneauSelect.value,
      prenom_eleve: common.prenom_eleve,
      nom_eleve: common.nom_eleve,
      age_eleve: common.age_eleve,
      nom_prenom_parent: common.nom_prenom_parent,
      email_parent: common.email_parent,
      telephone_parent: common.telephone_parent,
      code_suivi: common.code_suivi
    };

    var recapBase = {
      lieu: lieuSelect.options[lieuSelect.selectedIndex].textContent,
      niveau: niveauSelect.options[niveauSelect.selectedIndex].textContent,
      date: dateSelect.options[dateSelect.selectedIndex].textContent,
      creneau: creneauSelect.options[creneauSelect.selectedIndex].textContent,
      eleve: payload.prenom_eleve + ' ' + payload.nom_eleve,
      parent: payload.nom_prenom_parent
    };

    if (usingFallback) {
      // Backend non connecté dans cette prévisualisation : on simule
      // l'enregistrement pour pouvoir démontrer le parcours de bout en bout.
      setTimeout(function () { showSuccess(recapBase); }, 300);
      return;
    }

    fetch(API_BASE + '/inscriptions', {
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
        showSuccess({
          lieu: recapBase.lieu,
          niveau: recapBase.niveau,
          date: formatDate(data.date),
          creneau: recapBase.creneau,
          eleve: data.eleve,
          parent: data.parent
        });
      })
      .catch(function (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Valider';
      });
  });

  loadOptions();
})();

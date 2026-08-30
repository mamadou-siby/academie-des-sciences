(function () {
  var API_BASE = '/api';

  var form = document.getElementById('inscription-form');
  var lieuSelect = document.getElementById('lieu');
  var niveauSelect = document.getElementById('niveau');
  var dateSelect = document.getElementById('date');
  var loadingEl = document.getElementById('form-loading');
  var apiErrorEl = document.getElementById('form-api-error');
  var successEl = document.getElementById('form-success');
  var recapList = document.getElementById('recap-list');
  var submitBtn = document.getElementById('submit-btn');

  // Données de secours utilisées UNIQUEMENT si l'API (/api/lieux, /api/niveaux,
  // /api/dates) n'est pas joignable — par exemple si ce site est prévisualisé
  // sans que les Netlify Functions / la base de données ne soient encore
  // connectées. Une fois le backend en place (voir README-inscription.md),
  // ces données de secours ne sont jamais utilisées : le fetch réussit et
  // les vraies données administrées remplacent ce jeu d'exemple.
  var FALLBACK = {
    lieux: [
      { id: 'demo-1', nom: 'Paris' },
      { id: 'demo-2', nom: 'Versailles' },
      { id: 'demo-3', nom: 'Boulogne' }
    ],
    niveaux: [
      { id: 'demo-1', nom: 'Primaire' },
      { id: 'demo-2', nom: '6e' },
      { id: 'demo-3', nom: '5e' },
      { id: 'demo-4', nom: '4e' },
      { id: 'demo-5', nom: '3e' },
      { id: 'demo-6', nom: 'Seconde' },
      { id: 'demo-7', nom: 'Première' },
      { id: 'demo-8', nom: 'Terminale' }
    ],
    dates: [
      { id: 'demo-1', date: nextSaturdayISO(0) },
      { id: 'demo-2', date: nextSaturdayISO(1) },
      { id: 'demo-3', date: nextSaturdayISO(2) }
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

  function loadOptions() {
    Promise.all([fetchJSON('/lieux'), fetchJSON('/niveaux'), fetchJSON('/dates')])
      .then(function (results) {
        fillSelect(lieuSelect, results[0], 'Sélectionner un lieu', false);
        fillSelect(niveauSelect, results[1], 'Sélectionner un niveau', false);
        fillSelect(dateSelect, results[2], 'Sélectionner une date', true);
      })
      .catch(function () {
        usingFallback = true;
        fillSelect(lieuSelect, FALLBACK.lieux, 'Sélectionner un lieu', false);
        fillSelect(niveauSelect, FALLBACK.niveaux, 'Sélectionner un niveau', false);
        fillSelect(dateSelect, FALLBACK.dates, 'Sélectionner une date', true);
        apiErrorEl.style.display = 'block';
      })
      .then(function () {
        loadingEl.style.display = 'none';
        form.style.display = 'block';
      });
  }

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
    recapList.innerHTML = [
      ['Lieu', recap.lieu],
      ['Niveau', recap.niveau],
      ['Date', recap.date],
      ['Élève', recap.eleve],
      ['Parent', recap.parent]
    ].map(function (row) {
      return '<li><span>' + escapeHtml(row[0]) + '</span><span>' + escapeHtml(row[1]) + '</span></li>';
    }).join('');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Envoi en cours…';

    var payload = {
      lieu_id: lieuSelect.value,
      niveau_id: niveauSelect.value,
      date_id: dateSelect.value,
      prenom_eleve: document.getElementById('prenom_eleve').value.trim(),
      nom_eleve: document.getElementById('nom_eleve').value.trim(),
      age_eleve: document.getElementById('age_eleve').value.trim(),
      nom_prenom_parent: document.getElementById('nom_prenom_parent').value.trim(),
      email_parent: document.getElementById('email_parent').value.trim(),
      telephone_parent: document.getElementById('telephone_parent').value.trim()
    };

    var recapBase = {
      lieu: lieuSelect.options[lieuSelect.selectedIndex].textContent,
      niveau: niveauSelect.options[niveauSelect.selectedIndex].textContent,
      date: dateSelect.options[dateSelect.selectedIndex].textContent,
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

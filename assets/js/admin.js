(function () {
  var API_BASE = '/api';
  var TOKEN_KEY = 'ads_admin_token';

  var loginEl = document.getElementById('admin-login');
  var appEl = document.getElementById('admin-app');
  var tokenInput = document.getElementById('admin-token-input');
  var loginBtn = document.getElementById('admin-login-btn');
  var loginError = document.getElementById('admin-login-error');
  var logoutBtn = document.getElementById('admin-logout');

  var lieuxCache = [];
  var niveauxCache = [];
  var datesCache = [];

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }

  function authFetch(path, options) {
    options = options || {};
    options.headers = Object.assign({}, options.headers, {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    });
    return fetch(API_BASE + path, options).then(function (res) {
      if (res.status === 401) throw new Error('Non autorisé — jeton invalide.');
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Erreur serveur.');
        return data;
      });
    });
  }

  // ---------- Connexion ----------
  function tryEnter() {
    loginError.style.display = 'none';
    authFetch('/lieux')
      .then(function () {
        loginEl.style.display = 'none';
        appEl.style.display = 'block';
        loadAll();
      })
      .catch(function () {
        loginError.style.display = 'block';
        sessionStorage.removeItem(TOKEN_KEY);
      });
  }

  loginBtn.addEventListener('click', function () {
    sessionStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
    tryEnter();
  });
  tokenInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });
  logoutBtn.addEventListener('click', function () {
    sessionStorage.removeItem(TOKEN_KEY);
    appEl.style.display = 'none';
    loginEl.style.display = 'block';
    tokenInput.value = '';
  });

  if (getToken()) tryEnter();

  // ---------- Onglets ----------
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  function loadAll() {
    loadTable('lieux');
    loadTable('niveaux');
    loadTable('dates');
    loadTable('creneaux');
    loadInscriptions();
    loadCommandes();
  }

  // ---------- Lieux / Niveaux (structure identique) ----------
  function renderSimpleTable(kind, items) {
    var tbody = document.getElementById(kind + '-tbody');
    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="admin-empty">Aucun élément.</td></tr>';
      return;
    }
    tbody.innerHTML = items.map(function (item) {
      return '<tr data-id="' + item.id + '">' +
        '<td><input type="number" class="ordre-input" value="' + item.ordre + '" style="width:60px;border:1px solid var(--line);border-radius:8px;padding:6px"></td>' +
        '<td>' + escapeHtml(item.nom) + '</td>' +
        '<td><input type="checkbox" class="actif-input" ' + (item.actif ? 'checked' : '') + '></td>' +
        '<td class="admin-actions">' +
          '<button class="save-btn">Enregistrer</button>' +
          '<button class="danger delete-btn">Supprimer</button>' +
        '</td></tr>';
    }).join('');

    tbody.querySelectorAll('tr').forEach(function (row) {
      var id = row.dataset.id;
      row.querySelector('.save-btn').addEventListener('click', function () {
        var ordre = parseInt(row.querySelector('.ordre-input').value, 10) || 0;
        var actif = row.querySelector('.actif-input').checked;
        authFetch('/' + kind, { method: 'PATCH', body: JSON.stringify({ id: id, ordre: ordre, actif: actif }) })
          .then(function () { loadTable(kind); })
          .catch(function (err) { alert(err.message); });
      });
      row.querySelector('.delete-btn').addEventListener('click', function () {
        if (!confirm('Supprimer cet élément ?')) return;
        authFetch('/' + kind, { method: 'DELETE', body: JSON.stringify({ id: id }) })
          .then(function () { loadTable(kind); })
          .catch(function (err) { alert(err.message); });
      });
    });
  }

  function loadTable(kind) {
    if (kind === 'dates') return loadDatesTable();
    if (kind === 'creneaux') return loadCreneauxTable();
    authFetch('/' + kind)
      .then(function (items) {
        if (kind === 'lieux') { lieuxCache = items; fillOptionSelects('lieu'); }
        if (kind === 'niveaux') { niveauxCache = items; fillOptionSelects('niveau'); }
        renderSimpleTable(kind, items);
      })
      .catch(function (err) { alert(err.message); });
  }

  function fillOptionSelects(kind) {
    var cache = kind === 'lieu' ? lieuxCache : niveauxCache;
    var selects = kind === 'lieu'
      ? [document.getElementById('dates-lieu-select'), document.getElementById('filter-lieu')]
      : [document.getElementById('dates-niveau-select'), document.getElementById('filter-niveau')];
    selects.forEach(function (select) {
      if (!select) return;
      var keepFirst = select.options[0];
      select.innerHTML = '';
      select.appendChild(keepFirst);
      cache.forEach(function (item) {
        var opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.nom;
        select.appendChild(opt);
      });
    });
  }

  document.querySelector('[data-add-form="lieux"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    authFetch('/lieux', { method: 'POST', body: JSON.stringify({ nom: fd.get('nom'), ordre: parseInt(fd.get('ordre'), 10) || 0 }) })
      .then(function () { e.target.reset(); loadTable('lieux'); })
      .catch(function (err) { alert(err.message); });
  });

  document.querySelector('[data-add-form="niveaux"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    authFetch('/niveaux', { method: 'POST', body: JSON.stringify({ nom: fd.get('nom'), ordre: parseInt(fd.get('ordre'), 10) || 0 }) })
      .then(function () { e.target.reset(); loadTable('niveaux'); })
      .catch(function (err) { alert(err.message); });
  });

  // ---------- Dates ----------
  function nameFor(cache, id) {
    if (!id) return '—';
    var found = cache.find(function (i) { return String(i.id) === String(id); });
    return found ? found.nom : '—';
  }

  function loadDatesTable() {
    authFetch('/dates')
      .then(function (items) {
        datesCache = items;
        fillCreneauxDateSelect();
        var tbody = document.getElementById('dates-tbody');
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Aucune date.</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(function (item) {
          return '<tr data-id="' + item.id + '">' +
            '<td>' + item.date + '</td>' +
            '<td>' + escapeHtml(nameFor(lieuxCache, item.lieu_id)) + '</td>' +
            '<td>' + escapeHtml(nameFor(niveauxCache, item.niveau_id)) + '</td>' +
            '<td><input type="checkbox" class="actif-input" ' + (item.actif ? 'checked' : '') + '></td>' +
            '<td class="admin-actions"><button class="save-btn">Enregistrer</button><button class="danger delete-btn">Supprimer</button></td></tr>';
        }).join('');

        tbody.querySelectorAll('tr').forEach(function (row) {
          var id = row.dataset.id;
          row.querySelector('.save-btn').addEventListener('click', function () {
            var actif = row.querySelector('.actif-input').checked;
            authFetch('/dates', { method: 'PATCH', body: JSON.stringify({ id: id, actif: actif }) })
              .then(function () { loadDatesTable(); })
              .catch(function (err) { alert(err.message); });
          });
          row.querySelector('.delete-btn').addEventListener('click', function () {
            if (!confirm('Supprimer cette date ?')) return;
            authFetch('/dates', { method: 'DELETE', body: JSON.stringify({ id: id }) })
              .then(function () { loadDatesTable(); })
              .catch(function (err) { alert(err.message); });
          });
        });
      })
      .catch(function (err) { alert(err.message); });
  }

  document.querySelector('[data-add-form="dates"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    authFetch('/dates', {
      method: 'POST',
      body: JSON.stringify({
        date: fd.get('date'),
        lieu_id: fd.get('lieu_id') || null,
        niveau_id: fd.get('niveau_id') || null
      })
    })
      .then(function () { e.target.reset(); loadDatesTable(); })
      .catch(function (err) { alert(err.message); });
  });

  // ---------- Créneaux (liés à une date, ou valables pour toutes) ----------
  function fillCreneauxDateSelect() {
    var select = document.getElementById('creneaux-date-select');
    if (!select) return;
    var keepFirst = select.options[0];
    select.innerHTML = '';
    select.appendChild(keepFirst);
    datesCache.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.date;
      select.appendChild(opt);
    });
  }

  function dateStrFor(id) {
    if (!id) return 'Toutes les dates';
    var found = datesCache.find(function (i) { return String(i.id) === String(id); });
    return found ? found.date : '—';
  }

  function loadCreneauxTable() {
    authFetch('/creneaux')
      .then(function (items) {
        var tbody = document.getElementById('creneaux-tbody');
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="5" class="admin-empty">Aucun créneau.</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(function (item) {
          return '<tr data-id="' + item.id + '">' +
            '<td><input type="number" class="ordre-input" value="' + item.ordre + '" style="width:60px;border:1px solid var(--line);border-radius:8px;padding:6px"></td>' +
            '<td>' + escapeHtml(item.nom) + '</td>' +
            '<td>' + escapeHtml(dateStrFor(item.date_id)) + '</td>' +
            '<td><input type="checkbox" class="actif-input" ' + (item.actif ? 'checked' : '') + '></td>' +
            '<td class="admin-actions"><button class="save-btn">Enregistrer</button><button class="danger delete-btn">Supprimer</button></td></tr>';
        }).join('');

        tbody.querySelectorAll('tr').forEach(function (row) {
          var id = row.dataset.id;
          row.querySelector('.save-btn').addEventListener('click', function () {
            var ordre = parseInt(row.querySelector('.ordre-input').value, 10) || 0;
            var actif = row.querySelector('.actif-input').checked;
            authFetch('/creneaux', { method: 'PATCH', body: JSON.stringify({ id: id, ordre: ordre, actif: actif }) })
              .then(function () { loadCreneauxTable(); })
              .catch(function (err) { alert(err.message); });
          });
          row.querySelector('.delete-btn').addEventListener('click', function () {
            if (!confirm('Supprimer ce créneau ?')) return;
            authFetch('/creneaux', { method: 'DELETE', body: JSON.stringify({ id: id }) })
              .then(function () { loadCreneauxTable(); })
              .catch(function (err) { alert(err.message); });
          });
        });
      })
      .catch(function (err) { alert(err.message); });
  }

  document.querySelector('[data-add-form="creneaux"]').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    authFetch('/creneaux', {
      method: 'POST',
      body: JSON.stringify({
        nom: fd.get('nom'),
        ordre: parseInt(fd.get('ordre'), 10) || 0,
        date_id: fd.get('date_id') || null
      })
    })
      .then(function () { e.target.reset(); loadCreneauxTable(); })
      .catch(function (err) { alert(err.message); });
  });

  // ---------- Inscriptions ----------
  function loadInscriptions() {
    var params = new URLSearchParams();
    var statut = document.getElementById('filter-statut').value;
    var lieu = document.getElementById('filter-lieu').value;
    var niveau = document.getElementById('filter-niveau').value;
    if (statut) params.set('statut', statut);
    if (lieu) params.set('lieu_id', lieu);
    if (niveau) params.set('niveau_id', niveau);

    authFetch('/inscriptions?' + params.toString())
      .then(function (items) {
        var tbody = document.getElementById('inscriptions-tbody');
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="11" class="admin-empty">Aucune demande.</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(function (item) {
          var lieuNom = item.lieux ? item.lieux.nom : '—';
          var niveauNom = item.niveaux ? item.niveaux.nom : '—';
          var dateNom = item.dates_disponibles ? item.dates_disponibles.date : '—';
          var creneauNom = item.creneaux ? item.creneaux.nom : '—';
          var created = new Date(item.date_creation).toLocaleDateString('fr-FR');
          return '<tr data-id="' + item.id + '">' +
            '<td>' + created + '</td>' +
            '<td>' + escapeHtml(lieuNom) + '</td>' +
            '<td>' + escapeHtml(niveauNom) + '</td>' +
            '<td>' + dateNom + '</td>' +
            '<td>' + escapeHtml(creneauNom) + '</td>' +
            '<td>' + escapeHtml(item.prenom_eleve + ' ' + item.nom_eleve) + ' (' + escapeHtml(item.age_eleve) + ' ans)</td>' +
            '<td>' + escapeHtml(item.nom_prenom_parent) + '</td>' +
            '<td>' + escapeHtml(item.email_parent) + '</td>' +
            '<td>' + escapeHtml(item.telephone_parent) + '</td>' +
            '<td>' + (item.code_suivi ? escapeHtml(item.code_suivi) : '<span style="color:var(--muted)">—</span>') + '</td>' +
            '<td><select class="statut-select">' +
              ['Nouvelle', 'Contactée', 'Confirmée', 'Annulée'].map(function (s) {
                return '<option ' + (s === item.statut ? 'selected' : '') + '>' + s + '</option>';
              }).join('') +
            '</select></td></tr>';
        }).join('');

        tbody.querySelectorAll('tr').forEach(function (row) {
          var id = row.dataset.id;
          row.querySelector('.statut-select').addEventListener('change', function (e) {
            authFetch('/inscriptions', { method: 'PATCH', body: JSON.stringify({ id: id, statut: e.target.value }) })
              .catch(function (err) { alert(err.message); loadInscriptions(); });
          });
        });
      })
      .catch(function (err) { alert(err.message); });
  }

  ['filter-statut', 'filter-lieu', 'filter-niveau'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', loadInscriptions);
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Commandes (packs & abonnements Stripe) ----------
  var STATUTS_INSCRIPTION = ['a_planifier', 'creneaux_a_confirmer', 'confirmee', 'en_cours', 'terminee', 'annulee'];
  var STATUT_LABELS = {
    a_planifier: 'À planifier', creneaux_a_confirmer: 'Créneaux à confirmer', confirmee: 'Confirmée',
    en_cours: 'En cours', terminee: 'Terminée', annulee: 'Annulée',
    en_attente: 'En attente', paye: 'Payé', echoue: 'Échoué', rembourse: 'Remboursé', annule: 'Annulé'
  };

  function loadCommandes() {
    var params = new URLSearchParams();
    var type = document.getElementById('cmd-filter-type').value;
    var pay = document.getElementById('cmd-filter-paiement').value;
    var insc = document.getElementById('cmd-filter-inscription').value;
    if (type) params.set('type_offre', type);
    if (pay) params.set('statut_paiement', pay);
    if (insc) params.set('statut_inscription', insc);

    authFetch('/commandes?' + params.toString())
      .then(function (items) {
        var tbody = document.getElementById('commandes-tbody');
        if (!items.length) {
          tbody.innerHTML = '<tr><td colspan="7" class="admin-empty">Aucune commande.</td></tr>';
          return;
        }
        tbody.innerHTML = items.map(function (item) {
          var created = new Date(item.date_creation).toLocaleDateString('fr-FR');
          var montant = item.type_offre === 'abonnement'
            ? item.prix_total + ' €/mois (acompte ' + item.montant_acompte + ' €)'
            : item.prix_total + ' €';
          return '<tr data-id="' + item.id + '">' +
            '<td>' + created + '</td>' +
            '<td>' + escapeHtml(item.formule_label) + '</td>' +
            '<td>' + escapeHtml(item.prenom_eleve + ' ' + item.nom_eleve) + '</td>' +
            '<td>' + escapeHtml(item.prenom_parent + ' ' + item.nom_parent) + '<br><span style="color:var(--muted);font-size:12px">' + escapeHtml(item.email_parent) + '</span></td>' +
            '<td>' + montant + '</td>' +
            '<td><span class="status-pill status-' + item.statut_paiement + '">' + STATUT_LABELS[item.statut_paiement] + '</span></td>' +
            '<td>' + (item.numero_facture ? escapeHtml(item.numero_facture) : '<span style="color:var(--muted)">—</span>') + '</td>' +
            '<td><select class="statut-select">' +
              STATUTS_INSCRIPTION.map(function (s) {
                return '<option value="' + s + '" ' + (s === item.statut_inscription ? 'selected' : '') + '>' + STATUT_LABELS[s] + '</option>';
              }).join('') +
            '</select></td></tr>';
        }).join('');

        tbody.querySelectorAll('tr').forEach(function (row) {
          var id = row.dataset.id;
          row.querySelector('.statut-select').addEventListener('change', function (e) {
            authFetch('/commandes', { method: 'PATCH', body: JSON.stringify({ id: id, statut_inscription: e.target.value }) })
              .catch(function (err) { alert(err.message); loadCommandes(); });
          });
        });
      })
      .catch(function (err) { alert(err.message); });
  }

  ['cmd-filter-type', 'cmd-filter-paiement', 'cmd-filter-inscription'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', loadCommandes);
  });
})();

(function () {
  // Barre de progression de lecture
  var bar = document.getElementById('progress-bar');
  if (bar) {
    var update = function () {
      var el = document.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      var pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
      bar.style.width = Math.min(Math.max(pct, 0), 100) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // Sommaire généré à partir des h2 / h3 de l'article
  var body = document.getElementById('article-body');
  var nav = document.getElementById('toc-nav');
  if (body && nav) {
    var headings = Array.prototype.slice.call(body.querySelectorAll('h2, h3'));
    if (!headings.length) {
      var p = document.createElement('p');
      p.className = 'toc-empty';
      p.textContent = 'Pas de sommaire disponible.';
      nav.appendChild(p);
    } else {
      var links = [];
      headings.forEach(function (h, i) {
        if (!h.id) h.id = 'section-' + i;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.dataset.id = h.id;
        a.textContent = h.textContent || '';
        if (h.tagName === 'H3') a.className = 'sub';
        nav.appendChild(a);
        links.push(a);
      });
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (l) { l.classList.toggle('active', l.dataset.id === entry.target.id); });
          });
        }, { rootMargin: '-20% 0px -70% 0px' });
        headings.forEach(function (h) { observer.observe(h); });
      }
    }
  }

  // Copier le lien de l'article
  var copyBtn = document.getElementById('copy-url-btn');
  var copyLabel = document.getElementById('copy-label');
  if (copyBtn && copyLabel) {
    copyBtn.addEventListener('click', function () {
      var url = copyBtn.dataset.url || window.location.href;
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(url).then(function () {
        copyLabel.textContent = 'Copié !';
        setTimeout(function () { copyLabel.textContent = 'Copier le lien'; }, 2000);
      }).catch(function () {});
    });
  }
})();

(function () {
  // Barre de progression de lecture
  var bar = document.getElementById('progress-bar');
  if (bar) {
    window.addEventListener('scroll', function () {
      var el = document.documentElement;
      var pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      bar.style.width = Math.min(Math.max(pct, 0), 100) + '%';
    }, { passive: true });
  }

  // Sommaire généré automatiquement à partir des h2/h3 de l'article
  var body = document.getElementById('article-body');
  var nav = document.getElementById('toc-nav');
  if (body && nav) {
    var headings = Array.prototype.slice.call(body.querySelectorAll('h2, h3'));
    if (headings.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'text-[12px] text-ink-soft/60 italic';
      empty.textContent = 'Pas de sommaire disponible.';
      nav.appendChild(empty);
    } else {
      var links = [];
      headings.forEach(function (h, i) {
        if (!h.id) h.id = 'section-' + i;
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.dataset.id = h.id;
        a.textContent = h.textContent || '';
        a.className = [
          'toc-link block py-1.5 text-[13px] leading-snug transition-colors duration-200',
          'border-l-2 border-cream-300 hover:border-indigo hover:text-indigo text-ink-soft',
          h.tagName === 'H3' ? 'pl-5' : 'pl-3 font-medium'
        ].join(' ');
        nav.appendChild(a);
        links.push(a);
      });
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var active = nav.querySelector('[data-id="' + entry.target.id + '"]');
          if (!active) return;
          links.forEach(function (l) {
            l.classList.remove('text-indigo');
            l.classList.add('text-ink-soft');
            l.style.borderLeftColor = '';
          });
          active.classList.remove('text-ink-soft');
          active.classList.add('text-indigo');
          active.style.borderLeftColor = '#2454FF';
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      headings.forEach(function (h) { observer.observe(h); });
    }
  }

  // Copier le lien de l'article
  var copyBtn = document.getElementById('copy-url-btn');
  var copyLabel = document.getElementById('copy-label');
  if (copyBtn && copyLabel) {
    copyBtn.addEventListener('click', function () {
      var url = copyBtn.dataset.url || window.location.href;
      navigator.clipboard.writeText(url).then(function () {
        copyLabel.textContent = 'Copié !';
        setTimeout(function () { copyLabel.textContent = 'Copier le lien'; }, 2000);
      }).catch(function () {});
    });
  }
})();

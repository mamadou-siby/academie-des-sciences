#!/usr/bin/env python3
"""Référencement (SEO) du site Aven & Co.

Relancez ce script après avoir ajouté ou modifié des pages :
    python3 scripts/seo.py

Il (ré)écrit, de façon idempotente :
  - dans le <head> de chaque page publique : balise canonique, Open Graph,
    Twitter Card, favicon, et données structurées (JSON-LD) ;
  - robots.txt et sitemap.xml.
Si votre domaine principal est différent (ex. https://www.aven-co.com), changez
BASE ci-dessous puis relancez le script.
"""
import glob, html, json, os, re

BASE = 'https://aven-co.com'
LASTMOD = '2026-09-21'
SITE_NAME = 'Aven & Co'
# Vérification Google Search Console (méthode « balise HTML »), placée sur la page d'accueil.
# Ne la supprimez pas : Google la revérifie régulièrement.
GOOGLE_SITE_VERIFICATION = 'MgDyUEdJKSrZh3wK7XEgM6jIGTlDqUgGj0k3wuBo30s'
GUIDE_FOLDERS = ['methodes-pedagogiques', 'memorisation', 'organisation', 'choisir-ecole', 'bien-etre', 'maternelle', 'anglais']
NOINDEX = {'admin.html', 'commande.html', 'inscription-confirmee.html'}   # pages privées / transactionnelles
SKIP = {'admin.html'}
TEMPORARY = {'temporaire/inscription-temporaire.html': 'inscription.html'}  # page temporaire : canonique = page normale

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)

ORG = {
    '@type': ['Organization', 'EducationalOrganization'],
    '@id': BASE + '/#organisation',
    'name': SITE_NAME,
    'alternateName': ['Aven-co', 'Aven Co', 'aven-co.com', 'L’Académie'],
    'legalName': 'AVEN',
    'url': BASE + '/',
    'logo': BASE + '/assets/img/logo.png',
    'image': BASE + '/assets/img/og-image.png',
    'email': 'contact@aven-co.com',
    'description': 'Aven & Co propose deux académies : l’Académie des Langues (École d’Anglais pour les 4–18 ans, avec des professeurs anglophones) et l’Académie des Sciences (mathématiques, sciences, logique et informatique), ainsi que des ressources pédagogiques gratuites.',
    'address': {'@type': 'PostalAddress', 'streetAddress': '122 rue Amelot', 'postalCode': '75011', 'addressLocality': 'Paris', 'addressCountry': 'FR'},
    'areaServed': 'FR',
}
WEBSITE = {'@type': 'WebSite', '@id': BASE + '/#website', 'url': BASE + '/', 'name': SITE_NAME,
           'alternateName': ['Aven-co', 'Aven Co', 'aven-co.com'], 'inLanguage': 'fr-FR', 'publisher': {'@id': BASE + '/#organisation'}}

def url_for(path):
    return BASE + '/' if path == 'index.html' else BASE + '/' + path

def read(path):
    return open(path, encoding='utf-8').read()

def meta(s, name):
    m = re.search(r'<meta name="%s" content="([^"]*)"' % name, s)
    return html.unescape(m.group(1)) if m else ''

def title_of(s):
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    return html.unescape(m.group(1).strip()) if m else SITE_NAME

def block(path, s):
    canon_path = TEMPORARY.get(path, path)
    url = url_for(canon_path)
    title, desc = title_of(s), meta(s, 'description')
    folder = path.split('/')[0] if '/' in path else ''
    is_guide = folder in GUIDE_FOLDERS
    lines = ['<!-- seo:start -->']
    lines.append('<link rel="canonical" href="%s">' % url)
    if path == 'index.html' and GOOGLE_SITE_VERIFICATION:
        lines.append('<meta name="google-site-verification" content="%s">' % GOOGLE_SITE_VERIFICATION)
    if path in NOINDEX and 'name="robots"' not in s:
        lines.append('<meta name="robots" content="noindex, follow">')
    lines.append('<link rel="icon" href="/favicon.ico" sizes="any">')
    lines.append('<link rel="icon" href="/favicon.svg" type="image/svg+xml">')
    lines.append('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')
    lines.append('<meta name="theme-color" content="#2454FF">')
    lines.append('<meta property="og:site_name" content="%s">' % html.escape(SITE_NAME))
    lines.append('<meta property="og:locale" content="fr_FR">')
    lines.append('<meta property="og:type" content="%s">' % ('article' if is_guide else 'website'))
    lines.append('<meta property="og:title" content="%s">' % html.escape(title))
    if desc:
        lines.append('<meta property="og:description" content="%s">' % html.escape(desc))
    lines.append('<meta property="og:url" content="%s">' % url)
    lines.append('<meta property="og:image" content="%s/assets/img/og-image.png">' % BASE)
    lines.append('<meta name="twitter:card" content="summary_large_image">')
    graph = []
    if path == 'index.html':
        graph = [ORG, WEBSITE]
    elif is_guide:
        h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
        headline = html.unescape(re.sub(r'<[^>]+>', '', h1.group(1)).strip()) if h1 else title
        d = re.search(r'<time datetime="([^"]+)"', s)
        crumbs = re.findall(r'<div class="breadcrumb">(.*?)</div>', s, re.S)
        cat = re.search(r'<a href="((?:\.\./)?[a-z\-]+\.html)">([^<]+)</a>\s*/\s*<a href="[^"]*">([^<]+)</a>', crumbs[0] if crumbs else '')
        art = {'@type': 'Article', 'headline': headline, 'description': desc, 'inLanguage': 'fr-FR',
               'mainEntityOfPage': url, 'image': BASE + '/assets/img/og-image.png',
               'author': {'@id': BASE + '/#organisation'}, 'publisher': {'@id': BASE + '/#organisation'}}
        if d:
            art['datePublished'] = d.group(1); art['dateModified'] = d.group(1)
        graph = [art]
        m = re.search(r'<a href="\.\./index\.html">Accueil</a>\s*/\s*<a href="\.\./([a-z\-]+\.html)">([^<]+)</a>', crumbs[0] if crumbs else '')
        if m:
            graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': BASE + '/'},
                {'@type': 'ListItem', 'position': 2, 'name': html.unescape(m.group(2)), 'item': BASE + '/' + m.group(1)},
                {'@type': 'ListItem', 'position': 3, 'name': headline, 'item': url}]})
        graph.append({'@type': 'Organization', '@id': BASE + '/#organisation', 'name': SITE_NAME, 'url': BASE + '/', 'logo': BASE + '/assets/img/logo.png'})
    if graph:
        data = {'@context': 'https://schema.org', '@graph': graph}
        lines.append('<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>')
    lines.append('<!-- seo:end -->')
    return '\n'.join(lines)

pages = []
files = sorted(glob.glob('*.html')) + sorted(glob.glob('temporaire/*.html'))
for g in GUIDE_FOLDERS:
    files += sorted(glob.glob(g + '/*.html'))
for path in files:
    if path in SKIP:
        continue
    s = read(path)
    s = re.sub(r'\n?<!-- seo:start -->.*?<!-- seo:end -->\n?', '\n', s, flags=re.S)
    s = s.replace('</head>', block(path, s) + '\n</head>', 1)
    open(path, 'w', encoding='utf-8').write(s)
    if path not in NOINDEX and path not in TEMPORARY:
        pages.append(path)

# ---- sitemap.xml ----
def priority(p):
    if p == 'index.html': return '1.0'
    if p in ('anglais.html', 'cours.html'): return '0.9'
    if '/' not in p: return '0.7'
    return '0.6'
order = ['index.html', 'anglais.html', 'cours.html']
pages_sorted = order + [p for p in pages if p not in order]
urls = ''.join('  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>\n' % (url_for(p), LASTMOD, priority(p)) for p in pages_sorted)
open('sitemap.xml', 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')

# ---- robots.txt ----
open('robots.txt', 'w', encoding='utf-8').write('User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /temporaire/\n\nSitemap: %s/sitemap.xml\n' % BASE)
print('pages référencées :', len(pages_sorted), '| fichiers mis à jour :', len(files) - len(SKIP & set(files)))

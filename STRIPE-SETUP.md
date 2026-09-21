# Guide Stripe — Création des produits (à recopier tel quel)

Ce guide contient **toutes les valeurs exactes** à saisir dans votre Dashboard
Stripe. Je n'ai pas accès à votre compte Stripe (aucune clé, aucun réseau
dans mon environnement), donc cette étape reste à faire manuellement — mais
chaque champ ci-dessous est déjà rempli : il n'y a plus qu'à recopier.

Faites tout ceci d'abord en **mode Test** (bouton en haut à droite du
Dashboard Stripe, « Afficher les données de test » / « Test mode »), pour
vérifier que tout fonctionne avant de passer en mode Live.

---

## Avant de commencer

1. Connectez-vous sur [dashboard.stripe.com](https://dashboard.stripe.com).
2. Vérifiez en haut à droite que le bandeau **« Mode test »** est actif.
3. Dans le menu de gauche : **Produits** → **Catalogue de produits**.

---

## PARTIE 1 — Les 6 packs de 7 semaines (paiement unique)

Pour chaque produit ci-dessous : cliquez **« + Ajouter un produit »**, puis
remplissez exactement les champs indiqués.

### Produit 1 — Pack Primaire 3h/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack Primaire→5e — 3h/semaine — 7 semaines` |
| **Description** (optionnel mais recommandé) | `2 × 1h30 par semaine · 21 heures sur 7 semaines · Tarif indicatif 20 €/h` |
| **Image** | Aucune nécessaire |
| **Modèle de tarification** | ☑️ **Standard pricing** (prix unique et fixe) |
| **Prix** | `420` |
| **Devise** | `EUR — Euro` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** — *ne pas cocher « Récurrent »* |
| Bouton final | **Enregistrer le produit** |

➡️ Une fois enregistré, cliquez sur le prix créé, copiez son **Price ID**
(commence par `price_...`). Notez-le : il ira dans la variable
`STRIPE_PRICE_PACK_PRIMAIRE_3H`.

---

### Produit 2 — Pack Primaire 4h/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack Primaire→5e — 4h/semaine — 7 semaines` |
| **Description** | `2 × 2h par semaine · 28 heures sur 7 semaines · Tarif indicatif 20 €/h` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `560` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |

➡️ Price ID → variable `STRIPE_PRICE_PACK_PRIMAIRE_4H`.

---

### Produit 3 — Pack Primaire 4h30/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack Primaire→5e — 4h30/semaine — 7 semaines` |
| **Description** | `3 × 1h30 par semaine · 31h30 sur 7 semaines · Tarif indicatif 20 €/h` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `630` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |

➡️ Price ID → variable `STRIPE_PRICE_PACK_PRIMAIRE_4H30`.

---

### Produit 4 — Pack Lycée 3h/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack 4e→Terminale — 3h/semaine — 7 semaines` |
| **Description** | `2 × 1h30 par semaine · 21 heures sur 7 semaines · Tarif indicatif 24 €/h` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `504` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |

➡️ Price ID → variable `STRIPE_PRICE_PACK_LYCEE_3H`.

> Note : si Stripe limite la longueur du champ Nom, vous pouvez raccourcir
> en `Accompagnement Performance – 4e à Terminale – 3h/semaine – 7 semaines`
> (le nom complet reste utilisé côté site, indépendamment du nom Stripe).

---

### Produit 5 — Pack Lycée 4h/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack 4e→Terminale — 4h/semaine — 7 semaines` |
| **Description** | `2 × 2h par semaine · 28 heures sur 7 semaines · Tarif indicatif 24 €/h` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `672` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |

➡️ Price ID → variable `STRIPE_PRICE_PACK_LYCEE_4H`.

---

### Produit 6 — Pack Lycée 4h30/semaine

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Pack 4e→Terminale — 4h30/semaine — 7 semaines` |
| **Description** | `3 × 1h30 par semaine · 31h30 sur 7 semaines · Tarif indicatif 24 €/h` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `756` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |

➡️ Price ID → variable `STRIPE_PRICE_PACK_LYCEE_4H30`.

---

## PARTIE 2 — Les 2 abonnements (acompte + 10 mensualités)

⚠️ Point important : sur le site, ces formules ne sont **pas** de vrais
abonnements Stripe à renouvellement infini. Ce sont des **10 mensualités
puis arrêt automatique** — le code déjà en place (`create-checkout-
session.js`) gère cet arrêt automatique tout seul via le paramètre
`cancel_at`. Vous n'avez donc **rien de spécial à configurer côté Stripe**
pour l'arrêt automatique : créez simplement un prix récurrent mensuel
classique, le code se charge du reste.

Chaque abonnement a besoin de **deux prix distincts sur le même produit** :
un prix récurrent (la mensualité) et un prix ponctuel (l'acompte).

### Produit 7 — Abonnement Formule 75 €/mois

**Étape A — Créer le produit avec son prix récurrent :**

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Abonnement – Formule 75 €/mois` |
| **Description** | `Formule 1h/semaine · 30 séances sur l'année · acompte + 10 mensualités, sans renouvellement automatique` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `75` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Récurrent** |
| **Période de facturation** | `Mensuel` |

➡️ Price ID de ce premier prix → variable `STRIPE_PRICE_ABONNEMENT_75`.

**Étape B — Ajouter le prix de l'acompte sur ce MÊME produit :**

Une fois le produit enregistré, restez sur sa fiche et cliquez
**« + Ajouter un autre prix »** (« Add another price ») :

| Champ Stripe | Valeur à saisir |
|---|---|
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `45` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |
| **Surnom du prix (optionnel)** | `Acompte initial – Formule 75 €` |

➡️ Price ID de ce second prix (l'acompte) → variable
`STRIPE_PRICE_ACOMPTE_75`.

---

### Produit 8 — Abonnement Formule 90 €/mois

**Étape A — Créer le produit avec son prix récurrent :**

| Champ Stripe | Valeur à saisir |
|---|---|
| **Nom** | `Abonnement – Formule 90 €/mois` |
| **Description** | `Formule 1h30/semaine · 30 séances sur l'année · acompte + 10 mensualités, sans renouvellement automatique` |
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `90` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Récurrent** |
| **Période de facturation** | `Mensuel` |

➡️ Price ID de ce premier prix → variable `STRIPE_PRICE_ABONNEMENT_90`.

**Étape B — Ajouter le prix de l'acompte sur ce MÊME produit :**

| Champ Stripe | Valeur à saisir |
|---|---|
| **Modèle de tarification** | ☑️ **Standard pricing** |
| **Prix** | `60` |
| **Devise** | `EUR` |
| **Type de facturation** | ☑️ **Ponctuel (Paiement unique)** |
| **Surnom du prix (optionnel)** | `Acompte initial – Formule 90 €` |

➡️ Price ID de ce second prix (l'acompte) → variable
`STRIPE_PRICE_ACOMPTE_90`.

---

## PARTIE 2 bis — Les 2 abonnements de l'École d'Anglais (même modèle)

L'École d'Anglais reprend **exactement le même modèle tarifaire** que
l'abonnement 30 séances de maths (mêmes montants, même mécanique : acompte
puis 10 mensualités, arrêt automatique). Le code est déjà prêt
(`ABONNEMENT_ANGLAIS_75` et `ABONNEMENT_ANGLAIS_90` dans `_offers-config.js`) ;
il reste seulement à créer les prix dans Stripe et à renseigner 4 variables.

**Deux façons de faire, au choix :**

- **Option A (recommandée, suivi séparé dans Stripe)** : répétez les
  Produits 7 et 8 ci-dessus en les nommant `École d'Anglais – Formule 75 €/mois`
  et `École d'Anglais – Formule 90 €/mois` (mêmes prix : 75 € + acompte 45 €,
  90 € + acompte 60 €). Ce sont les Produits 9 et 10.
- **Option B (aucun nouveau produit)** : réutilisez les Price ID de l'Académie
  des Sciences. Les montants étant identiques, cela fonctionne ; seule la
  ligne de produit affichée dans Stripe sera celle des maths (la commande en
  base garde bien le code `ABONNEMENT_ANGLAIS_…` et le libellé « École
  d'Anglais »).

| Variable d'environnement Netlify | Produit Stripe correspondant (option A) |
|---|---|
| `STRIPE_PRICE_ANGLAIS_75` | Produit 9, prix récurrent 75 € |
| `STRIPE_PRICE_ACOMPTE_ANGLAIS_75` | Produit 9, prix ponctuel 45 € |
| `STRIPE_PRICE_ANGLAIS_90` | Produit 10, prix récurrent 90 € |
| `STRIPE_PRICE_ACOMPTE_ANGLAIS_90` | Produit 10, prix ponctuel 60 € |

---

## PARTIE 3 — Récupérer les Price ID

Pour chaque produit créé : **Produits → [nom du produit] → section « Tarifs »**.
Chaque ligne de prix affiche son identifiant sous la forme `price_1AbC2dEfGhIjKlMn`.
Cliquez dessus pour le copier.

Récapitulatif des 14 identifiants à récupérer (10 si vous réutilisez les prix de maths pour l'anglais — option B de la partie 2 bis) :

| Variable d'environnement Netlify | Produit Stripe correspondant |
|---|---|
| `STRIPE_PRICE_PACK_PRIMAIRE_3H` | Produit 1 |
| `STRIPE_PRICE_PACK_PRIMAIRE_4H` | Produit 2 |
| `STRIPE_PRICE_PACK_PRIMAIRE_4H30` | Produit 3 |
| `STRIPE_PRICE_PACK_LYCEE_3H` | Produit 4 |
| `STRIPE_PRICE_PACK_LYCEE_4H` | Produit 5 |
| `STRIPE_PRICE_PACK_LYCEE_4H30` | Produit 6 |
| `STRIPE_PRICE_ABONNEMENT_75` | Produit 7, prix récurrent |
| `STRIPE_PRICE_ACOMPTE_75` | Produit 7, prix ponctuel |
| `STRIPE_PRICE_ABONNEMENT_90` | Produit 8, prix récurrent |
| `STRIPE_PRICE_ACOMPTE_90` | Produit 8, prix ponctuel |
| `STRIPE_PRICE_ANGLAIS_75` | Produit 9 (École d'Anglais), prix récurrent |
| `STRIPE_PRICE_ACOMPTE_ANGLAIS_75` | Produit 9, prix ponctuel |
| `STRIPE_PRICE_ANGLAIS_90` | Produit 10 (École d'Anglais), prix récurrent |
| `STRIPE_PRICE_ACOMPTE_ANGLAIS_90` | Produit 10, prix ponctuel |

---

## PARTIE 4 — Récupérer les clés API

Dans le Dashboard Stripe : **Développeurs → Clés API** (toujours en mode Test
pour commencer).

| Élément | Où le trouver | Variable Netlify |
|---|---|---|
| Clé secrète | Bouton « Révéler la clé secrète », commence par `sk_test_...` | `STRIPE_SECRET_KEY` |
| Clé publique | Visible directement, commence par `pk_test_...` | *(non utilisée par ce code — Stripe Checkout n'en a pas besoin côté client)* |

⚠️ La clé secrète ne doit **jamais** apparaître dans un fichier du site ni
être commitée sur GitHub. Elle va uniquement dans les variables
d'environnement Netlify (voir Partie 6).

---

## PARTIE 5 — Configurer le webhook

Le webhook est ce qui permet à Stripe de prévenir votre site qu'un paiement
a réellement été confirmé — c'est la pièce la plus importante de toute
l'intégration (voir `netlify/functions/stripe-webhook.js`).

⚠️ Stripe a renommé son interface développeur **« Workbench »**. L'écran de
sélection d'événements affiche désormais de longues catégories dépliables
(Account, Charge, Checkout, Customer...) plutôt qu'une liste à cocher
directe. Le plus simple est d'ignorer ces catégories et d'utiliser la
**barre de recherche** en haut de l'écran.

1. Dans le Dashboard Stripe : **Développeurs → Workbench → onglet
   Webhooks → « + Ajouter une destination »**.
2. Étape **« Sélectionner des événements »** : dans le champ *« Trouver un
   événement à l'aide d'un nom ou d'une description... »*, tapez et cochez,
   un par un, exactement ces 4 noms :
   - ☑️ `checkout.session.completed`
   - ☑️ `invoice.payment_succeeded`
   - ☑️ `invoice.payment_failed`
   - ☑️ `customer.subscription.deleted`

   Vérifiez le total via l'onglet **« Événements sélectionnés »** (doit
   afficher **4**), puis cliquez **Continuer**.
3. Étape **« Périmètre de destination des événements »** : deux options
   apparaissent — **« Votre compte »** et « Comptes connectés ». Choisissez
   **« Votre compte »** (l'option « Comptes connectés » ne concerne que les
   plateformes qui utilisent Stripe Connect, ce qui n'est pas notre cas).
   Cliquez **Continuer**.
4. Étape **« Choisir le type de destination »** : trois options apparaissent
   (Webhook endpoint, Amazon EventBridge, Azure Event Grid). Choisissez
   **« Webhook endpoint »**.
5. **Endpoint URL** : `https://VOTRE-SITE.netlify.app/api/stripe-webhook`
   (remplacez `VOTRE-SITE` par le nom réel de votre site Netlify, visible
   dans Netlify → Site settings → Domain management).
6. **Description** (optionnel) : `Confirmation des paiements — packs et abonnements`
7. Cliquez **« Créer la destination »**.
8. Sur la page de la destination créée, cliquez **« Révéler »** à côté de
   **« Signing secret »** (commence par `whsec_...`).

➡️ Ce secret va dans la variable `STRIPE_WEBHOOK_SECRET`.

---

## PARTIE 6 — Variables d'environnement à créer sur Netlify

Dans **Netlify → Site settings → Environment variables → Add a variable**,
créez chacune des variables suivantes :

```
STRIPE_SECRET_KEY              = sk_test_...  (Partie 4)
STRIPE_WEBHOOK_SECRET           = whsec_...    (Partie 5)

STRIPE_PRICE_PACK_PRIMAIRE_3H    = price_...
STRIPE_PRICE_PACK_PRIMAIRE_4H    = price_...
STRIPE_PRICE_PACK_PRIMAIRE_4H30  = price_...
STRIPE_PRICE_PACK_LYCEE_3H       = price_...
STRIPE_PRICE_PACK_LYCEE_4H       = price_...
STRIPE_PRICE_PACK_LYCEE_4H30     = price_...
STRIPE_PRICE_ABONNEMENT_75       = price_...
STRIPE_PRICE_ACOMPTE_75          = price_...
STRIPE_PRICE_ABONNEMENT_90       = price_...
STRIPE_PRICE_ACOMPTE_90          = price_...
STRIPE_PRICE_ANGLAIS_75          = price_...   (École d'Anglais — Partie 2 bis)
STRIPE_PRICE_ACOMPTE_ANGLAIS_75  = price_...
STRIPE_PRICE_ANGLAIS_90          = price_...
STRIPE_PRICE_ACOMPTE_ANGLAIS_90  = price_...

SITE_URL                        = https://votre-site.netlify.app

# Déjà nécessaires pour le reste du site (voir README-inscription.md) :
SUPABASE_URL                    = ...
SUPABASE_SERVICE_ROLE_KEY        = ...
ADMIN_TOKEN                     = ...
```

Après avoir ajouté ces variables, **redéployez le site** (Netlify → Deploys
→ Trigger deploy) pour qu'elles soient prises en compte par les fonctions.

---

## PARTIE 7 — Tester avant de passer en mode Live

1. Vérifiez que le bandeau Stripe est toujours sur **Mode test**.
2. Sur votre site, ouvrez `commande.html`, allez au bout du tunnel jusqu'au
   bouton **« Procéder au paiement sécurisé »**.
3. Sur la page Stripe Checkout qui s'ouvre, utilisez une carte de test :

   | Numéro de carte | `4242 4242 4242 4242` |
   |---|---|
   | Date d'expiration | N'importe quelle date future, ex. `12/30` |
   | CVC | N'importe quel nombre à 3 chiffres, ex. `123` |
   | Code postal | N'importe lequel, ex. `75000` |

4. Vérifiez que :
   - vous êtes bien redirigé vers `inscription-confirmee.html` avec le
     message « Inscription confirmée » (pas « en cours de confirmation »
     qui traînerait plus de quelques secondes) ;
   - dans Stripe Dashboard → Paiements, le paiement de test apparaît ;
   - dans Stripe Dashboard → Développeurs → Workbench → Webhooks → votre
     destination, la
     ligne `checkout.session.completed` affiche un statut **200 OK** ;
   - dans votre espace `admin.html` → onglet Commandes, la commande
     apparaît avec le statut de paiement **Payé**.
5. Pour tester un paiement refusé, utilisez la carte `4000 0000 0000 0002`
   (refusée automatiquement par Stripe en mode test).

Une fois tous ces tests concluants, répétez les Parties 1 à 6 en **Mode
Live** (créer à nouveau tous les produits, anglais compris — les produits de test et
les produits réels sont toujours séparés chez Stripe ; le webhook aussi doit
être recréé en mode Live) et remplacez les
variables d'environnement par leurs équivalents `sk_live_...` /
`whsec_...` / Price ID du mode live.

---

## Récapitulatif visuel du parcours mis en place

```
Parent sur commande.html
        │
        ▼
 1. Pack 7 semaines  OU  Abonnement mensuel
        │
        ▼
 2a. Niveau + formule (pack)     2b. Formule 75€/90€ (abonnement)
                                 → École d'Anglais ou Académie des Sciences
        │
        ▼
 3. Informations élève
        │
        ▼
 4. Informations parent
        │
        ▼
 5. Récapitulatif (montant exact affiché avant paiement)
        │
        ▼
 create-checkout-session.js (serveur)
   → valide l'offre, calcule rien côté client
   → crée la commande en base (statut "en_attente")
   → crée la session Stripe Checkout avec le bon Price ID
        │
        ▼
   Stripe Checkout (page sécurisée Stripe, hors de votre site)
        │
        ▼
 Paiement → Stripe envoie l'événement au webhook
        │
        ▼
 stripe-webhook.js (serveur)
   → vérifie la signature Stripe
   → met à jour la commande : statut "payé"
   → déclenche l'email de confirmation
        │
        ▼
 inscription-confirmee.html
   → interroge /api/commande-status
   → affiche "Inscription confirmée" UNIQUEMENT si le webhook
     a bien mis à jour le statut en base
```

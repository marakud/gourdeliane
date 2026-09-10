---
title: 'technical research: Intégration Pronote (pawnote vs alternatives)'
type: 'technical'
topic: 'Intégration Pronote (pawnote vs alternatives) pour CartableFlow'
decision: 'Choisir (ou rejeter) une librairie Pronote non-officielle pour CartableFlow, compatible avec le stack Next.js/TypeScript, les paliers gratuits (Vercel/Supabase), et un risque légal acceptable.'
source: 'run'
status: complete
preset: 'standard'
validation: 'normal'
created: '2026-09-09'
updated: '2026-09-09'
claims_verified: 8
claims_unverified: 1
claims_disputed: 2
---

# technical research: Intégration Pronote (pawnote vs alternatives)

**Decision this research serves:** Choisir (ou rejeter) une librairie Pronote non-officielle pour CartableFlow, compatible avec le stack Next.js/TypeScript, les paliers gratuits (Vercel/Supabase), et un risque légal acceptable.

## Executive Summary

**Aucune des deux librairies "actives" candidates n'est dans l'état où le brief d'origine (sept. 2026) les avait laissées.** `pawnote` (TypeScript, la piste privilégiée du brief) n'a publié aucune version npm depuis 11,5 mois ; son auteur a quitté GitHub pour un hébergement auto-géré, et le projet qui en reprend le nom/la description est désormais écrit en **Rust**, pas en TypeScript — sans successeur TS maintenu identifié. `pronotepy` (Python) est, à l'inverse, réellement vivant (dernier commit il y a 6 jours) mais volontairement en **"mode maintenance"** (correctifs uniquement, pas de nouvelles fonctionnalités) et n'offre aucun pont natif vers Node.js.

**Le risque légal n'est pas théorique** : un précédent confirmé existe (fermeture de "pronote-api" en 2021 à la demande d'Index Éducation, invoquant le droit pénal français sur l'accès frauduleux aux systèmes de traitement automatisé de données). Index Éducation a depuis assoupli son discours public ("pas illégal en soi" si les identifiants sont fournis volontairement, sans usage commercial) mais reste dissuasif. La "casse" périodique (un ENT qui change son endpoint, un format qui évolue) est un motif réel et récurrent, documenté dans les deux écosystèmes.

**Recommandation : `pronotepy` via un micro-service Python léger, plutôt que `pawnote` figée.** Les deux options restent défendables (voir Verdict), mais `pronotepy` est la seule des deux à recevoir encore des correctifs quand Pronote change quelque chose — ce qui, compte tenu du risque de casse documenté, compte plus que d'éviter un second runtime.

**Plus grosse réserve :** cette recherche s'appuie en partie sur des résumés générés par IA de pages récupérées (README, TypeDoc) plutôt que sur des lectures brutes ligne à ligne, et deux points restent non résolus avec certitude (voir Contrary Evidence / Open Questions) : le support ENT réel de pawnote, et la nature exacte du projet Rust `index-education/pronote`.

## Dimension 1 — Santé de l'écosystème & paysage des candidats

Le champ des librairies non-officielles Pronote est restreint et son historique montre un motif récurrent : chaque génération de librairie finit par recommander la suivante plutôt que de continuer à évoluer elle-même.

**pronotepy** (Python, `bain3/pronotepy`) est le candidat le plus solide en activité mesurable : dernier commit le 2026-09-03, dernière release (v2.15.7) le même jour, 235 étoiles, 56 forks, 30 contributeurs, au moins 5 releases sur les 12 derniers mois [1]. Son propre README revendique cependant explicitement le "mode maintenance" : *"We will continue to fix bugs and adapt to PRONOTE changes, but will not be adding new features"* [1][3].

**pawnote** (TypeScript, historiquement `Vexcited/Pawnote` puis `LiterateInk/Pawnote.js`) est le candidat que le brief d'origine avait retenu — mais les deux dépôts GitHub renvoient désormais une erreur 404, et le paquet npm n'a reçu aucune nouvelle version depuis le 2025-09-21 (v1.6.2, ~11,5 mois) [2]. La cause n'est pas un simple abandon : le README de pronotepy lui-même recommande de migrer vers *"PRONOTE (ex. Pawnote)"*, avec un lien non pas vers GitHub mais vers un nœud **Radicle** (réseau de code décentralisé) hébergé par l'auteur [4]. Le profil GitHub de l'auteur ("Vexcited") confirme la migration volontaire : *"they've moved to my own Forgejo instance... GitHub is not a safe place anymore"* [5].

Sur l'instance auto-hébergée de l'auteur (code.vexcited.com), un dépôt reprenant le même slogan que Pawnote ("A purrfect API wrapper for PRONOTE") existe sous `index-education/pronote` — mais listé comme écrit en **Rust**, et mis à jour pour la dernière fois le 2026-06-21 [6]. Il n'existe, dans ce même espace, aucun successeur TypeScript maintenu : le seul autre dépôt lié ("pronote.build") est un outil de "datamine" du client Pronote, pas une librairie d'accès aux données [6]. *Cette identification (même projet réécrit en Rust, vs projet distinct réutilisant le slogan) n'a pas pu être confirmée avec certitude — signalé en Contrary Evidence.*

**Blocksnote** (`BlocksHub/Blocksnote`, TypeScript, MIT) est un troisième candidat, confirmé indépendant de Pawnote : 13 étoiles, 3 issues ouvertes, 4 forks [7]. Trop petit et pas assez vérifié dans le budget de cette recherche pour être autre chose qu'une option de repli.

Le précédent historique le plus significatif : **pronote-api** (Litarvan), l'ancêtre commun de tout cet écosystème, a été arrêté le 2021-04-30 à la demande directe d'Index Éducation, dépôt et paquet npm supprimés [8]. Ses forks survivants (`Androz2091/pronote-api`) sont inactifs depuis 2023.

Un candidat signalé en cours de recherche, **pronote-mcp**, a été écarté après vérification : ce n'est pas une librairie backend mais un serveur MCP pour Claude Desktop, verrouillé sur l'ENT "Monlycée" (Île-de-France, lycées uniquement — hors périmètre collège), avec une seule release depuis avril 2026 et un stockage d'identifiants en clair [21].

## Dimension 2 — Fonctionnalités exposées & réalité d'intégration dans le stack

Les deux librairies actives couvrent le même périmètre de données : devoirs (incl. marquer fait/pas fait), notes/moyennes/périodes, emploi du temps (par semaine ou plage de dates), absences/retenues/retards, discussions, et infos établissement/personnelles [9][10]. Aucune n'accède à l'API "HYPERPLANNING" (non exposée aux élèves) — les deux passent par les mêmes points d'accès web élève/parent [10].

**Intégration native au stack Next.js/Node :** `pawnote` est distribué en paquet npm pur, consommé directement depuis un backend Node.js en production — le connecteur "konnectors/pronote" (projet Cozy) l'utilise ainsi [11]. Aucune preuve qu'il nécessite un navigateur headless (Puppeteer/Playwright) pour l'authentification et la récupération de données de base [9]. **`pronotepy` est Python pur, sans pont Node natif** — son propre README renvoie les développeurs JS/TS vers pawnote/Blocksnote plutôt que d'offrir un moyen de l'appeler depuis Node [12]. Un wrapper REST tiers existe (`papillon-python`, via le framework `hug` + Docker) mais son état de maintenance n'a pas pu être vérifié [13].

**Support ENT (portails régionaux type Toutatice, Éduconnect, CAS) — point disputé, non résolu avec certitude :** les sources sur pawnote se contredisent frontalement. Une version de sa documentation affirme que le support natif des ENT *"n'est et ne sera jamais supporté"* ; une version plus récente affirme au contraire supporter *"CAS/ENT authentication, including Toutatice (via Educonnect) and generic ENTs"* [14]. Preuve empirique en faveur du support réel : le connecteur Cozy basé sur pawnote implémente bien l'authentification CAS/ENT/Toutatice en production [11]. La réconciliation la plus probable (mais non confirmée à la source) : le cœur de pawnote expose une primitive bas niveau (cookies réutilisables) plutôt que de réimplémenter chaque UI d'ENT lui-même, laissant l'appelant faire l'authentification ENT en amont [14]. `pronotepy`, de son côté, documente un support ENT réel mais maintenu au cas par cas par la communauté, pas garanti centralement [15].

**Documentation :** le domaine officiel de pawnote (docs.literate.ink et sous-domaines) a expiré et affiche désormais une page de revente de domaine parkée — une vraie perte d'accès à une documentation autoritative [16].

## Dimension 3 — Risque légal/CGU & réalité d'implémentation

Le risque légal est **réel et documenté**, pas hypothétique. Le précédent pronote-api (2021) invoquait explicitement le droit pénal français : *"la mise à disposition d'un programme informatique conçu pour permettre un accès frauduleux à un système de traitement automatisé de données (STAD)"* [8]. La position publique actuelle d'Index Éducation, formulée à propos de l'application "Papillon", est plus nuancée : *"Cette pratique n'est pas illégale en soi"* dès lors que l'utilisateur fournit volontairement ses propres identifiants et que l'app n'a pas de but commercial — mais l'entreprise met en garde contre la récupération de données par des tiers "à l'insu" de l'utilisateur et met en avant PRONOTE comme la seule solution qualifiée SecNumCloud [17]. Une clause plus générale du site corporate d'Index Éducation interdit "tout dispositif automatique... sans notre autorisation expresse écrite" — mais il n'a pas été confirmé que cette clause précise figure dans les CGU produit réellement présentées aux élèves/parents à la connexion [18].

La "casse périodique" n'est pas un risque abstrait : l'issue #334 de pronotepy documente la rupture de l'ENT ac_orleans_tours après un déplacement d'endpoint CAS, fermée "not planned" sans correctif visible [19] ; une intégration Home Assistant basée sur pronotepy échoue depuis le 2024-12-15 sur une erreur de déchiffrement AES, sans réponse mainteneur visible [19]. Un exemple d'application aval ("yNotes", construite sur les API non-officielles de Pronote et d'École Directe) est désormais archivée "NOT MAINTAINED" — illustrant le taux d'attrition réel des projets construits sur cet écosystème [20].

## Cross-Dimension Insights

- **La librairie techniquement la mieux intégrée au stack (pawnote) est aussi la moins vivante ; la librairie la plus vivante (pronotepy) est la moins bien intégrée au stack.** C'est le compromis central de cette décision — aucun candidat ne gagne sur les deux axes à la fois.
- **Le risque légal ne différencie pas les candidats entre eux** — il pèse également sur pawnote, pronotepy et tout succession future, puisqu'aucun n'a d'autorisation d'Index Éducation. Le seul levier réel est le comportement (identifiants fournis volontairement par l'utilisateur final, pas d'usage commercial, pas de republication à grande échelle) — cohérent avec la position "Papillon" d'Index Éducation, mais sans garantie.
- **Le motif "succession sans continuité"** (pronote-api → pronotepy/pawnote → pawnote recommande Blocksnote/PRONOTE-ex-Pawnote) suggère que quel que soit le choix fait aujourd'hui, un remplacement futur est probable, pas exceptionnel — un argument en faveur d'isoler cette intégration derrière une interface propre dans l'architecture CartableFlow (facile à substituer), plutôt que de la coupler profondément au reste du produit.

## Contrary Evidence

Aucune passe red-team n'a été exécutée (désactivée par défaut sur ce projet). Les points suivants, trouvés en cours de recherche, jouent contre la recommandation et sont rapportés tels quels plutôt qu'écartés :

- **Contre `pronotepy` :** il est Python-only, exigeant un second runtime (même léger) dans un projet solo actuellement 100% Next.js/Node — un coût opérationnel réel pour un projet personnel, même si Vercel propose des fonctions serverless Python (capacité non vérifiée dans cette recherche, à confirmer séparément avant implémentation).
- **Contre l'abandon de `pawnote` :** l'absence de release npm depuis 11,5 mois et les 404 GitHub ne prouvent pas un abandon total — l'auteur est démonstrablement actif ailleurs (Rust, mis à jour le 2026-06-21) ; un mainteneur qui migre d'écosystème n'est pas la même chose qu'un mainteneur qui disparaît. Il est possible qu'une version npm existante (1.6.2) reste utilisable telle quelle pendant longtemps, Pronote ne cassant pas forcément son protocole chaque année.
- **Contre le risque légal comme facteur bloquant :** aucune action d'Index Éducation contre pronotepy ou pawnote spécifiquement n'a été trouvée (seul le précédent pronote-api de 2021 est confirmé) — l'un et l'autre continuent d'être distribués publiquement 4+ ans après ce précédent, ce qui suggère un risque réel mais pas nécessairement imminent pour un usage non-commercial à faible volume.

## Recommandations

1. **Ne pas commencer l'implémentation Pronote maintenant sur la base du choix pawnote du brief d'origine — il est obsolète.** *(Confiance : haute — fondée sur des vérifications directes de repos/registre npm.)* Alimente : mise à jour du brief addendum et de l'architecture spine (AD Pronote).
2. **Retenir `pronotepy` comme candidat principal, exposé à Next.js via une petite fonction serverless Python (à valider techniquement — Vercel supporte des fonctions Python, capacité non vérifiée dans cette recherche) plutôt qu'un microservice toujours actif.** *(Confiance : moyenne — fondée sur des faits vérifiés sur pronotepy, mais la faisabilité exacte de l'hébergement serverless Python sur Vercel dans les paliers gratuits n'a pas été vérifiée cette session.)* Alimente : PRD (nouvelles FR Pronote), architecture (nouvelle contrainte opérationnelle : second runtime, même serverless).
3. **Isoler l'intégration Pronote derrière une interface interne stable** (ex. un module `domain`/`data` qui ne connaît que "devoirs, notes, EDT depuis une source externe", jamais directement `pronotepy`) — étant donné le motif de succession documenté dans cet écosystème, un remplacement futur de la librairie sous-jacente est probable. *(Confiance : haute — fondée sur le motif historique observé, pas sur une prédiction précise.)* Alimente : architecture spine.
4. **Traiter le risque légal comme un principe de conception, pas juste une note de bas de page :** identifiants saisis volontairement par l'utilisateur final (jamais collectés/centralisés au-delà de ce qui est nécessaire), chiffrement au repos (déjà acté), pas de republication/exposition des données d'un autre élève, pas de usage commercial. *(Confiance : moyenne — la position d'Index Éducation reste "pas illégale en soi" sous ces conditions, mais n'est pas une autorisation formelle.)* Alimente : PRD (contrainte de confidentialité déjà notée §Exigences non-fonctionnelles), architecture (modèle de sécurité des identifiants).
5. **Revérifier ce choix avant l'implémentation réelle** (pas seulement avant la planification) — cet écosystème a montré qu'il peut changer en quelques mois. *(Confiance : haute.)* Alimente : roadmap/estimation.

## Open Questions

- **Le dépôt Rust `index-education/pronote` (code.vexcited.com) est-il la continuation directe de "Pawnote", ou un projet distinct du même auteur réutilisant le même slogan ?** Non résolu — nécessiterait une lecture directe du dépôt (README, historique de commits) plutôt qu'une page de recherche résumée.
- **pawnote supporte-t-il réellement l'authentification ENT nativement, ou seulement via une primitive bas niveau que l'appelant doit compléter lui-même ?** Sources contradictoires non réconciliées à la source primaire — nécessiterait une lecture directe du code source de pawnote (actuellement inaccessible : dépôts GitHub à 404, docs expirées).
- **Vercel supporte-t-il des fonctions serverless Python dans le palier gratuit, avec un temps de cold-start acceptable pour un usage occasionnel (consultation quotidienne, pas temps réel) ?** Non vérifié cette session — nécessaire avant de valider la Recommandation 2.
- **Quel ENT (s'il y en a un) utilise l'établissement réel visé par CartableFlow ?** Question posée à l'utilisateur en session, réponse non encore reçue au moment de la rédaction de ce rapport — déterminant pour savoir si le problème ENT ci-dessus est même pertinent pour ce cas d'usage précis.
- **La clause CGU corporate d'Index Éducation sur l'accès automatisé figure-t-elle réellement dans les CGU produit Pronote présentées à l'élève/au parent ?** Non confirmé — seul le site corporate a été retrouvé, pas les CGU produit elles-mêmes.

## Source Appendix

| # | Claim/finding it supports | Publisher | Pub. date | Accessed | Confidence |
|---|---|---|---|---|---|
| [1] | pronotepy activité récente (commit/release 2026-09-03, 235★, 30 contributeurs) | [GitHub — bain3/pronotepy](https://github.com/bain3/pronotepy) | 2026-09-03 | 2026-09-09 | high |
| [2] | Paquet npm `pawnote` : dernière version 1.6.2 le 2025-09-21, aucune depuis | [npm registry](https://registry.npmjs.org/pawnote) | 2025-09-21 | 2026-09-09 | high |
| [3] | pronotepy README : "mode maintenance", pas de nouvelles fonctionnalités | [GitHub — bain3/pronotepy README](https://raw.githubusercontent.com/bain3/pronotepy/master/README.md) | 2026 | 2026-09-09 | high |
| [4] | Lien de succession vers "PRONOTE (ex. Pawnote)" via Radicle | [GitHub — bain3/pronotepy README](https://raw.githubusercontent.com/bain3/pronotepy/master/README.md) | 2026 | 2026-09-09 | high |
| [5] | Profil auteur "Vexcited" : projets déplacés vers Forgejo auto-hébergé | [GitHub — profil Vexcited](https://github.com/vexcited) | 2026 | 2026-09-09 | high |
| [6] | Dépôt `index-education/pronote` (Rust) et `pronote.build` (TS, outil de datamine) | [code.vexcited.com](https://code.vexcited.com) | 2026-06-21 | 2026-09-09 | medium |
| [7] | Blocksnote confirmé projet indépendant (13★, 3 issues, 4 forks) | [GitHub — BlocksHub/Blocksnote](https://github.com/BlocksHub/Blocksnote) | 2026 | 2026-09-09 | medium |
| [8] | Fermeture de pronote-api (2021-04-30) à la demande d'Index Éducation, motif STAD | [GitHub — Litarvan/pronote-api README](https://raw.githubusercontent.com/Litarvan/pronote-api/master/README.md) | 2021-04-30 | 2026-09-09 | high |
| [9] | Aucune preuve que pawnote nécessite Puppeteer/Playwright ; paquet npm pur | [npm/unpkg README mirror](https://unpkg.com/pawnote/README.md) | 2026 | 2026-09-09 | medium |
| [10] | Fonctionnalités exposées (devoirs, notes, EDT, absences, discussions, infos) | pawnote TypeDoc + pronotepy README/readthedocs | 2026 | 2026-09-09 | medium |
| [11] | Connecteur Cozy "konnectors/pronote" utilise pawnote en Node.js avec login CAS/ENT/Toutatice | [GitHub — konnectors/pronote](https://github.com/konnectors/pronote) | 2026 | 2026-09-09 | medium |
| [12] | pronotepy Python-only, pas de pont Node natif, renvoie vers pawnote/Blocksnote | [GitHub — bain3/pronotepy README](https://raw.githubusercontent.com/bain3/pronotepy/master/README.md) | 2026 | 2026-09-09 | medium |
| [13] | Wrapper REST tiers `papillon-python` (hug + Docker) sur pronotepy, maintenance non vérifiée | [GitHub — Christian-Martins/papillon-python](https://github.com/Christian-Martins/papillon-python) | 2026 | 2026-09-09 | low |
| [14] | Contradiction sur le support ENT natif de pawnote (deux versions de doc opposées) | pawnote.js.org / npm README (versions 0.7.0 et ~0.20.x, via recherche web) | 2025–2026 | 2026-09-09 | low |
| [15] | Support ENT de pronotepy réel mais maintenu par la communauté, pas garanti | [GitHub — bain3/pronotepy README](https://raw.githubusercontent.com/bain3/pronotepy/master/README.md) | 2026 | 2026-09-09 | medium |
| [16] | Domaine de documentation pawnote (docs.literate.ink) expiré, page de revente | docs.literate.ink (fetch direct) | 2026-09-09 | 2026-09-09 | high |
| [17] | Position officielle d'Index Éducation sur les apps tierces ("Papillon") : "pas illégale en soi" | [Index Éducation](https://www.index-education.com/fr/article-1760-recommandations-relatives-a-l-application-papillon.php) | date incertaine (probablement récent) | 2026-09-09 | high |
| [18] | CGU corporate Index Éducation : interdiction d'accès automatisé sans autorisation écrite | [Index Éducation — mentions légales](https://www.index-education.com/fr/article-206-mentions-leacute-gales-et-condition-geacute-neacute-rales-d-utilisation.php) | date incertaine | 2026-09-09 | medium |
| [19] | Incidents de casse documentés (issue pronotepy #334 ; hass-pronote #94) | [GitHub — bain3/pronotepy/issues/334](https://github.com/bain3/pronotepy/issues/334), [GitHub — delphiki/hass-pronote/issues/94](https://github.com/delphiki/hass-pronote/issues/94) | 2025-09 / 2024-12 | 2026-09-09 | high |
| [20] | Application aval "yNotes" désormais archivée "NOT MAINTAINED" | [GitHub — EduWireApps/ynotes](https://github.com/EduWireApps/ynotes) (via résumé de recherche) | 2026 | 2026-09-09 | medium |
| [21] | pronote-mcp : serveur MCP pour Claude Desktop, verrouillé sur l'ENT Monlycée (Île-de-France, lycées uniquement), 1 release depuis avril 2026, identifiants en clair | [PyPI — pronote-mcp](https://pypi.org/project/pronote-mcp/), [GitHub — thomasgreissler/pronote-mcp](https://github.com/thomasgreissler/pronote-mcp) | 2026-04-18 | 2026-09-09 | high |

## Staleness Map

| Classe | Fenêtre de fraîcheur (pack technical) | Ré-examiner avant |
|---|---|---|
| version/compat (versions npm/PyPI, langage du dépôt Rust) | ≤ 1 mois | Quasiment déjà obsolète — à revérifier immédiatement avant toute décision d'implémentation |
| ecosystem-signal (activité GitHub, étoiles, statut mainteneur) | ≤ 6 mois | 2027-03 |
| landscape (paysage général des candidats) | ≤ 12 mois | 2027-09 |
| pattern (motifs de casse, réconciliations) | ≤ 24 mois | 2028-09 |

**La date de ré-examen la plus proche est immédiate** : les faits "version/compat" (numéros de version npm/PyPI, langage exact du dépôt Rust) datent tous de cette session et sont, par nature du pack, déjà à la limite de leur fenêtre de fraîcheur — à revérifier explicitement au moment de commencer l'implémentation, pas seulement au moment de la planification.

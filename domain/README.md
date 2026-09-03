# domain/

Logique métier pure de CartableFlow (règles de dérivation, calculs, etc.).

Contrainte d'architecture (AD-1) : ce dossier ne doit avoir **aucune**
dépendance vers Next.js ou Prisma. Le code ici doit rester testable en
isolation, indépendamment du framework et de la base de données.

Vide pour Story 1.1 -- rien à dériver encore. Les premières règles métier
arriveront avec les epics suivants.

# domain/

Logique metier pure de CartableFlow (regles de derivation, calculs, etc.).

Contrainte d'architecture (AD-1) : ce dossier ne doit avoir **aucune**
dependance vers Next.js ou Prisma. Le code ici doit rester testable en
isolation, independamment du framework et de la base de donnees.

Vide pour Story 1.1 -- rien a deriver encore. Les premieres regles metier
arriveront avec les epics suivants.

-- AlterTable
ALTER TABLE "Devoir" ADD COLUMN "planDate" TIMESTAMP(3);
ALTER TABLE "Devoir" RENAME COLUMN "echeanceTime" TO "planTime";

-- Ce qui était saisi comme "échéance" via l'ancien calendrier fusionné était
-- en réalité une planification (retour utilisateur -- échéance et
-- planification sont deux notions distinctes) : migré vers planDate,
-- l'échéance repart à zéro (à renseigner séparément si besoin).
UPDATE "Devoir" SET "planDate" = "echeance", "echeance" = NULL WHERE "echeance" IS NOT NULL;

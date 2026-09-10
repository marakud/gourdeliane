"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Détecte la transition false -> true de `complete` survenue PENDANT la
 * session (jamais au montage initial -- une checklist déjà complète à
 * l'ouverture ne déclenche jamais de célébration) et retourne `true` pendant
 * `durationMs`, puis repasse à `false` d'elle-même.
 *
 * Extrait de `MomentSoirCard` (Story 2.7) -- même pattern maintenant partagé
 * par `FixedChecklist` (refonte visuelle) : les panneaux de `MomentTabs`
 * restent montés en permanence (`hidden`, jamais démontés), donc sans ce
 * garde-fou une animation `animate-in` laissée active rejouerait à chaque
 * retour sur l'onglet -- `durationMs` doit rester inférieur ou égal à la
 * durée réelle de l'animation CSS qui l'utilise, jamais indéfini.
 */
export function useJustCompleted(complete: boolean, durationMs = 500): boolean {
  const previousRef = useRef(complete);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (complete && !previousRef.current) {
      setJustCompleted(true);
      const timeout = setTimeout(() => setJustCompleted(false), durationMs);
      previousRef.current = complete;
      return () => clearTimeout(timeout);
    }
    previousRef.current = complete;
  }, [complete, durationMs]);

  return justCompleted;
}

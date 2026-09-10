"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mémorise la clé (sourceId, ou clé composite) qui vient d'être cochée --
 * refonte visuelle, micro-animation de coche (pop) + flash de couleur bref
 * sur la ligne, partagée par `FixedChecklist`, `SacChecklist` et
 * `RevisionsChecklist`. S'efface après `durationMs`, jamais laissée
 * indéfiniment : une classe `animate-in` restée active resterait "armée" sur
 * cette ligne et pourrait rejouer si l'élément redevient visible après un
 * `hidden` (même risque que celui déjà corrigé pour les célébrations de
 * moment, `useJustCompleted`).
 */
export function useJustToggled(durationMs = 300) {
  const [justToggledKey, setJustToggledKey] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function markJustToggled(key: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setJustToggledKey(key);
    timeoutRef.current = setTimeout(() => setJustToggledKey(null), durationMs);
  }

  return { justToggledKey, markJustToggled };
}

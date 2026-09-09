import { describe, expect, it } from "vitest";
import { computeSoirCompletion, type SoirCompletionInput } from "./day-completion";

const EMPTY: SoirCompletionInput = {
  sacGroups: [],
  revisionsItems: [],
  devoirsARendreDemain: [],
};

describe("computeSoirCompletion (Story 2.7, FR-20 -- I/O matrix spec 2.7)", () => {
  it("is complete when Sac, Révisions and devoirs à rendre demain are all checked/done", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }, { checked: true }] }],
      revisionsItems: [{ checked: true }],
      devoirsARendreDemain: [{ done: true }],
    };

    expect(computeSoirCompletion(input)).toBe(true);
  });

  it("is incomplete when a single Sac item is unchecked", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }, { checked: false }] }],
      revisionsItems: [{ checked: true }],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });

  it("is incomplete when a Révisions item is unchecked", () => {
    const input: SoirCompletionInput = {
      sacGroups: [],
      revisionsItems: [{ checked: true }, { checked: false }],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });

  it("is incomplete when a devoir à rendre demain is not done", () => {
    const input: SoirCompletionInput = {
      sacGroups: [],
      revisionsItems: [],
      devoirsARendreDemain: [{ done: true }, { done: false }],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });

  it("treats an empty Sac (no course tomorrow) as trivially complete", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [] }],
      revisionsItems: [{ checked: true }],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(true);
  });

  it("treats an empty Révisions (no course today) as trivially complete", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }] }],
      revisionsItems: [],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(true);
  });

  it("is complete with nothing at all to do (jour sans cours + aucun devoir à rendre)", () => {
    expect(computeSoirCompletion(EMPTY)).toBe(true);
  });

  it("stays complete regardless of a devoir with no échéance or a later échéance -- caller never passes it here (PRD §9 confirmed by epics 2.7 AC#3)", () => {
    // Un devoir sans échéance/échéant plus tard n'atteint jamais
    // `devoirsARendreDemain` -- l'appelant (app/(accueil)/page.tsx) filtre déjà
    // sur `aRendre && echeanceIso === tomorrowIso` avant d'appeler cette
    // fonction, donc rien à tester ici au-delà de la liste déjà filtrée.
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }] }],
      revisionsItems: [{ checked: true }],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(true);
  });

  it("aggregates checked state across multiple Sac subject groups", () => {
    const input: SoirCompletionInput = {
      sacGroups: [
        { items: [{ checked: true }] },
        { items: [{ checked: true }, { checked: false }] },
      ],
      revisionsItems: [],
      devoirsARendreDemain: [],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });

  it("un devoir à rendre injecté dans le Sac exige les DEUX cases -- devoir fait mais objet Sac non préparé reste incomplet", () => {
    // Le devoir apparaît deux fois : comme objet cochable dans son groupe
    // Sac (ici non coché) ET comme entrée `devoirsARendreDemain` (ici fait).
    // Les deux sont des états indépendants (correctif de revue, cf. Design
    // Notes -- une seule case cochée ne suffit jamais).
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: false }] }],
      revisionsItems: [],
      devoirsARendreDemain: [{ done: true }],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });

  it("un devoir à rendre injecté dans le Sac exige les DEUX cases -- objet Sac préparé mais devoir non fait reste incomplet", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }] }],
      revisionsItems: [],
      devoirsARendreDemain: [{ done: false }],
    };

    expect(computeSoirCompletion(input)).toBe(false);
  });
});

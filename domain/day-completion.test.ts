import { describe, expect, it } from "vitest";
import {
  computeSoirCompletion,
  countBlockProgress,
  countSoirProgress,
  isBlockComplete,
  selectCurrentMomentCompletion,
  selectCurrentMomentProgress,
  type SoirCompletionInput,
} from "./day-completion";

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

describe("isBlockComplete (Story 3.2 -- exportée pour le repli visuel Matin/Retour)", () => {
  it("treats an empty block (no item configured) as trivially complete", () => {
    expect(isBlockComplete([])).toBe(true);
  });

  it("is complete when every item is checked", () => {
    expect(
      isBlockComplete([{ checked: true }, { checked: true }])
    ).toBe(true);
  });

  it("is incomplete when a single item is unchecked", () => {
    expect(
      isBlockComplete([{ checked: true }, { checked: false }])
    ).toBe(false);
  });
});

describe("selectCurrentMomentCompletion (Story 3.2 -- correctif de revue, extraite du ternaire inline de la page)", () => {
  it("selects matinComplete when currentMoment is MATIN, ignoring the other two", () => {
    expect(selectCurrentMomentCompletion("MATIN", true, false, false)).toBe(true);
    expect(selectCurrentMomentCompletion("MATIN", false, true, true)).toBe(false);
  });

  it("selects retourComplete when currentMoment is RETOUR, ignoring the other two", () => {
    expect(selectCurrentMomentCompletion("RETOUR", false, true, false)).toBe(true);
    expect(selectCurrentMomentCompletion("RETOUR", true, false, true)).toBe(false);
  });

  it("selects soirComplete when currentMoment is SOIR, ignoring the other two", () => {
    expect(selectCurrentMomentCompletion("SOIR", false, false, true)).toBe(true);
    expect(selectCurrentMomentCompletion("SOIR", true, true, false)).toBe(false);
  });
});

describe("countBlockProgress (refonte visuelle -- carte d'accueil)", () => {
  it("counts done/total in a mixed block", () => {
    expect(
      countBlockProgress([{ checked: true }, { checked: false }, { checked: true }])
    ).toEqual({ done: 2, total: 3 });
  });

  it("returns {done: 0, total: 0} for an empty block, never NaN", () => {
    expect(countBlockProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("returns {done: total, total} when everything is checked", () => {
    expect(countBlockProgress([{ checked: true }, { checked: true }])).toEqual({
      done: 2,
      total: 2,
    });
  });
});

describe("countSoirProgress (refonte visuelle -- même agrégation que computeSoirCompletion)", () => {
  it("aggregates sac + révisions + devoirs à rendre demain into one done/total", () => {
    const input: SoirCompletionInput = {
      sacGroups: [{ items: [{ checked: true }, { checked: false }] }],
      revisionsItems: [{ checked: true }],
      devoirsARendreDemain: [{ done: false }],
    };
    expect(countSoirProgress(input)).toEqual({ done: 2, total: 4 });
  });

  it("returns {done: 0, total: 0} when there is nothing at all to do", () => {
    expect(countSoirProgress(EMPTY)).toEqual({ done: 0, total: 0 });
  });
});

describe("selectCurrentMomentProgress (refonte visuelle -- carte d'accueil)", () => {
  const matin = { done: 1, total: 4 };
  const retour = { done: 2, total: 2 };
  const soir = { done: 0, total: 3 };

  it("selects matinProgress when currentMoment is MATIN, ignoring the other two", () => {
    expect(selectCurrentMomentProgress("MATIN", matin, retour, soir)).toEqual(matin);
  });

  it("selects retourProgress when currentMoment is RETOUR, ignoring the other two", () => {
    expect(selectCurrentMomentProgress("RETOUR", matin, retour, soir)).toEqual(retour);
  });

  it("selects soirProgress when currentMoment is SOIR, ignoring the other two", () => {
    expect(selectCurrentMomentProgress("SOIR", matin, retour, soir)).toEqual(soir);
  });
});

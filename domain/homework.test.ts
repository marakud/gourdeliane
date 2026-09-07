import { describe, expect, it } from "vitest";
import { filterDevoirsAFaire, type DevoirLike } from "./homework";

interface TestDevoir extends DevoirLike {
  id: string;
  description: string;
}

describe("filterDevoirsAFaire (spec 2.4 I/O matrix)", () => {
  it("keeps only devoirs with done === false, preserving the received order", () => {
    const devoirs: TestDevoir[] = [
      { id: "d1", description: "Exos maths p.42", done: false },
      { id: "d2", description: "Poésie à réciter", done: true },
      { id: "d3", description: "Relire ch.3", done: false },
    ];

    expect(filterDevoirsAFaire(devoirs)).toEqual([
      { id: "d1", description: "Exos maths p.42", done: false },
      { id: "d3", description: "Relire ch.3", done: false },
    ]);
  });

  it("returns an empty array when every devoir is done (caller shows the positive message)", () => {
    const devoirs: TestDevoir[] = [
      { id: "d1", description: "Exos maths p.42", done: true },
      { id: "d2", description: "Poésie à réciter", done: true },
    ];

    expect(filterDevoirsAFaire(devoirs)).toEqual([]);
  });

  it("returns an empty array when there are no devoirs at all", () => {
    expect(filterDevoirsAFaire([])).toEqual([]);
  });

  it("keeps an old, never-done devoir with no special treatment (aucune pénalité d'ancienneté)", () => {
    const oldUndoneDevoir: TestDevoir = {
      id: "d-old",
      description: "Fiche de lecture",
      done: false,
    };

    expect(filterDevoirsAFaire([oldUndoneDevoir])).toEqual([oldUndoneDevoir]);
  });

  it("does not mutate or reorder the input array", () => {
    const devoirs: TestDevoir[] = [
      { id: "d1", description: "A", done: true },
      { id: "d2", description: "B", done: false },
      { id: "d3", description: "C", done: false },
    ];
    const copy = [...devoirs];

    filterDevoirsAFaire(devoirs);

    expect(devoirs).toEqual(copy);
  });
});

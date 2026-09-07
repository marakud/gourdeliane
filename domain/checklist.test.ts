import { describe, expect, it } from "vitest";
import {
  CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
  deriveSacChecklist,
  type ChecklistItemStateInput,
  type ChecklistSubjectGroupInput,
} from "./checklist";

const MATHS = { id: "subject-maths", name: "Maths", colorIndex: 1 };
const EPS = { id: "subject-eps", name: "EPS", colorIndex: 2 };

describe("deriveSacChecklist (spec 2.1 I/O matrix)", () => {
  it("groups items by subject, unchecked by default when no state exists", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      {
        subject: MATHS,
        items: [
          { id: "item-cahier", label: "Cahier de maths" },
          { id: "item-calc", label: "Calculatrice" },
        ],
      },
    ];

    const result = deriveSacChecklist(groups, []);

    expect(result).toEqual([
      {
        subject: MATHS,
        items: [
          { sourceId: "item-cahier", label: "Cahier de maths", checked: false },
          { sourceId: "item-calc", label: "Calculatrice", checked: false },
        ],
      },
    ]);
  });

  it("keeps a subject with no SubjectItem defined, without error, items empty", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: EPS, items: [] },
    ];

    const result = deriveSacChecklist(groups, []);

    expect(result).toEqual([{ subject: EPS, items: [] }]);
  });

  it("returns an empty list when there are no subjects (caller shows the neutral message)", () => {
    expect(deriveSacChecklist([], [])).toEqual([]);
  });

  it("reflects an existing checked state keyed by sourceId", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Cahier de maths" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0].checked).toBe(true);
  });

  it("keeps the checked state after the SubjectItem label changes (same id -- AD-3, FR-5)", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Nouveau libellé" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0]).toEqual({
      sourceId: "item-cahier",
      label: "Nouveau libellé",
      checked: true,
    });
  });

  it("shows a newly added item unchecked while an existing item keeps its checked state", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      {
        subject: MATHS,
        items: [
          { id: "item-cahier", label: "Cahier de maths" },
          { id: "item-nouveau", label: "Trousse" },
        ],
      },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-cahier",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items).toEqual([
      { sourceId: "item-cahier", label: "Cahier de maths", checked: true },
      { sourceId: "item-nouveau", label: "Trousse", checked: false },
    ]);
  });

  it("drops a deleted SubjectItem from the output without error, its orphaned state simply unused", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-still-here", label: "Cahier" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      {
        sourceType: CHECKLIST_SOURCE_TYPE_SUBJECT_ITEM,
        sourceId: "item-deleted",
        checked: true,
      },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items).toEqual([
      { sourceId: "item-still-here", label: "Cahier", checked: false },
    ]);
  });

  it("ignores checked states of a different sourceType", () => {
    const groups: ChecklistSubjectGroupInput[] = [
      { subject: MATHS, items: [{ id: "item-cahier", label: "Cahier" }] },
    ];
    const states: ChecklistItemStateInput[] = [
      { sourceType: "FIXED_ITEM", sourceId: "item-cahier", checked: true },
    ];

    const result = deriveSacChecklist(groups, states);

    expect(result[0].items[0].checked).toBe(false);
  });
});

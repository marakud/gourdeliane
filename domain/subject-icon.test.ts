import { describe, expect, it } from "vitest";
import { matchSubjectCategory } from "./subject-icon";

describe("matchSubjectCategory (refonte visuelle -- icône par matière)", () => {
  it("reconnaît les maths sous plusieurs variantes", () => {
    expect(matchSubjectCategory("Mathématiques")).toBe("MATHS");
    expect(matchSubjectCategory("Maths")).toBe("MATHS");
    expect(matchSubjectCategory("MATH")).toBe("MATHS");
    expect(matchSubjectCategory("  maths  ")).toBe("MATHS");
  });

  it("ignore les accents et la casse", () => {
    expect(matchSubjectCategory("FRANÇAIS")).toBe("FRANCAIS");
    expect(matchSubjectCategory("français")).toBe("FRANCAIS");
    expect(matchSubjectCategory("Histoire-Géographie")).toBe("HISTOIRE_GEO");
  });

  it("reconnaît l'anglais et les sciences sous plusieurs variantes", () => {
    expect(matchSubjectCategory("Anglais")).toBe("ANGLAIS");
    expect(matchSubjectCategory("English")).toBe("ANGLAIS");
    expect(matchSubjectCategory("SVT")).toBe("SCIENCES");
    expect(matchSubjectCategory("Physique-Chimie")).toBe("SCIENCES");
  });

  it("reconnaît EPS, Technologie et Arts", () => {
    expect(matchSubjectCategory("EPS")).toBe("EPS");
    expect(matchSubjectCategory("Sport")).toBe("EPS");
    expect(matchSubjectCategory("Technologie")).toBe("TECHNOLOGIE");
    expect(matchSubjectCategory("Arts plastiques")).toBe("ARTS");
  });

  it("retombe sur GENERIC pour une matière non reconnue plutôt que de deviner", () => {
    expect(matchSubjectCategory("Espagnol")).toBe("GENERIC");
    expect(matchSubjectCategory("Musique")).toBe("GENERIC");
    expect(matchSubjectCategory("SES")).toBe("GENERIC");
    expect(matchSubjectCategory("")).toBe("GENERIC");
  });

  it("gère un nom composé sans planter (choix assumé, pas de \"bonne\" réponse unique)", () => {
    expect(matchSubjectCategory("Histoire des Arts")).toBe("HISTOIRE_GEO");
  });
});

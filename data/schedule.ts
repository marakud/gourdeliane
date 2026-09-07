import { prisma } from "./prisma";
import { assignNextColorIndex, type Weekday } from "@/domain/schedule";
import type { Prisma } from "@prisma/client";

/**
 * Normalise une date calendaire à minuit UTC. `NoSchoolDay.date` ne porte
 * aucune notion d'heure -- seule la date importe -- et cette normalisation
 * garantit que la contrainte unique `(userId, date)` fonctionne quelle que
 * soit l'heure à laquelle la valeur est envoyée par le client.
 */
export function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * Liste les créneaux, matières et jours "sans cours" d'un utilisateur --
 * tout ce dont la vue semaine (app/edt/page.tsx) a besoin en un aller-retour.
 */
export async function getScheduleForUser(userId: string) {
  const [subjects, scheduleSlots, noSchoolDays] = await Promise.all([
    prisma.subject.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.scheduleSlot.findMany({
      where: { userId },
      include: { subject: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    prisma.noSchoolDay.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
  ]);

  return { subjects, scheduleSlots, noSchoolDays };
}

export interface CreateSlotData {
  userId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subjectName: string;
}

/**
 * Crée un créneau. Si la matière n'existe pas encore pour cet utilisateur,
 * elle est créée à la volée avec le prochain `colorIndex` libre (AD-6) --
 * dans la même transaction pour éviter une course entre deux créations
 * concurrentes de la même matière.
 */
export async function createScheduleSlot(data: CreateSlotData) {
  return prisma.$transaction(async (tx) => {
    const subject = await findOrCreateSubject(tx, data.userId, data.subjectName);

    return tx.scheduleSlot.create({
      data: {
        userId: data.userId,
        subjectId: subject.id,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: { subject: true },
    });
  });
}

export interface UpdateSlotData {
  id: string;
  userId: string;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  subjectName: string;
}

/**
 * Modifie un créneau existant. Ne touche jamais au `colorIndex` d'une
 * matière : si le nom de matière saisi correspond à une matière déjà
 * existante, elle est réutilisée telle quelle ; sinon une nouvelle matière
 * est créée (même logique de création à la volée qu'à l'ajout).
 */
export async function updateScheduleSlot(data: UpdateSlotData) {
  return prisma.$transaction(async (tx) => {
    const subject = await findOrCreateSubject(tx, data.userId, data.subjectName);

    return tx.scheduleSlot.update({
      where: { id: data.id, userId: data.userId },
      data: {
        subjectId: subject.id,
        weekday: data.weekday,
        startTime: data.startTime,
        endTime: data.endTime,
      },
      include: { subject: true },
    });
  });
}

export async function deleteScheduleSlot(id: string, userId: string) {
  return prisma.scheduleSlot.delete({
    where: { id, userId },
  });
}

/**
 * Marque une date comme "sans cours". Idempotent (I/O matrix spec 1.2) :
 * si la date est déjà marquée, ne crée pas de doublon -- s'appuie sur la
 * contrainte unique `(userId, date)`.
 */
export async function setNoSchoolDay(userId: string, date: Date) {
  const normalized = toUtcMidnight(date);

  return prisma.noSchoolDay.upsert({
    where: { userId_date: { userId, date: normalized } },
    create: { userId, date: normalized },
    update: {},
  });
}

/**
 * Démarque un jour "sans cours". Ne fait rien si la date n'était pas
 * marquée (démarquage indépendant des créneaux, cf. I/O matrix).
 */
export async function unsetNoSchoolDay(userId: string, date: Date) {
  const normalized = toUtcMidnight(date);

  await prisma.noSchoolDay.deleteMany({
    where: { userId, date: normalized },
  });
}

/**
 * Trouve la matière existante correspondant à `rawName` (comparaison
 * insensible à la casse : "Maths" et "maths" désignent la même matière pour
 * l'enfant, cf. DESIGN.md subject-tag -- "toujours la même couleur pour
 * Maths") ou la crée à la volée. La comparaison se fait en JS plutôt qu'en
 * base pour se comporter à l'identique sur SQLite (dev) et Postgres (prod) :
 * `mode: "insensitive"` de Prisma n'existe que côté Postgres.
 */
async function findOrCreateSubject(
  tx: Prisma.TransactionClient,
  userId: string,
  rawName: string
) {
  const name = rawName.trim();
  const normalized = name.toLocaleLowerCase("fr-FR");

  const existingSubjects = await tx.subject.findMany({
    where: { userId },
  });
  const existing = existingSubjects.find(
    (subject) => subject.name.toLocaleLowerCase("fr-FR") === normalized
  );
  if (existing) {
    return existing;
  }

  const colorIndex = assignNextColorIndex(existingSubjects);

  return tx.subject.create({
    data: { userId, name, colorIndex },
  });
}

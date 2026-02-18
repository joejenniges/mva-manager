import { eq, ilike, asc, desc, sql, and } from "drizzle-orm";
import { getDb } from "../db/connection.js";
import { persons, personPersonRoles, personRoles } from "../db/schema/index.js";
import { AppError } from "../middleware/errors.js";
import { ERROR_CODES } from "../constants.js";
import type { PersonListParams } from "../schemas/persons.js";

export async function listPersons(eventId: string, params: PersonListParams) {
  const db = getDb();
  const { page, limit, search, isPatient } = params;
  const offset = (page - 1) * limit;

  const conditions = [eq(persons.eventId, eventId)];
  if (search) conditions.push(ilike(persons.name, `%${search}%`));
  if (isPatient !== undefined) conditions.push(eq(persons.isPatient, isPatient));
  const where = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.persons.findMany({
      where,
      with: {
        homeLocation: true,
        personPersonRoles: { with: { personRole: true } },
      },
      orderBy: [desc(persons.isPatient), asc(persons.name)],
      offset,
      limit,
    }),
    db.select({ count: sql<number>`count(*)::int` }).from(persons).where(where),
  ]);

  const total = countResult[0].count;
  return { data, total, page, limit, hasMore: offset + data.length < total };
}

export async function getPerson(eventId: string, id: string) {
  const db = getDb();
  const row = await db.query.persons.findFirst({
    where: and(eq(persons.id, id), eq(persons.eventId, eventId)),
    with: {
      homeLocation: true,
      personPersonRoles: { with: { personRole: true } },
    },
  });
  if (!row) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person not found");
  return row;
}

export async function createPerson(eventId: string, data: {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  isPatient: boolean;
  color?: string | null;
  homeLocationId?: string | null;
  roleIds: string[];
}) {
  const db = getDb();
  const { roleIds, ...personData } = data;

  const result = await db.insert(persons).values({ ...personData, eventId }).returning();
  const person = result[0];

  if (roleIds.length > 0) {
    await db.insert(personPersonRoles).values(
      roleIds.map((roleId) => ({ personId: person.id, personRoleId: roleId })),
    );
  }

  return getPerson(eventId, person.id);
}

export async function updatePerson(eventId: string, id: string, data: Partial<{
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isPatient: boolean;
  color: string | null;
  homeLocationId: string | null;
  roleIds: string[];
}>) {
  const db = getDb();
  const { roleIds, ...personData } = data;

  if (Object.keys(personData).length > 0) {
    const result = await db.update(persons).set(personData)
      .where(and(eq(persons.id, id), eq(persons.eventId, eventId))).returning();
    if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person not found");
  }

  // WHY: Delete-all-then-insert for junction tables. Simple, fine for small
  // sets like person roles. Avoids diff logic for what's added/removed.
  if (roleIds !== undefined) {
    await db.delete(personPersonRoles).where(eq(personPersonRoles.personId, id));
    if (roleIds.length > 0) {
      await db.insert(personPersonRoles).values(
        roleIds.map((roleId) => ({ personId: id, personRoleId: roleId })),
      );
    }
  }

  return getPerson(eventId, id);
}

export async function deletePerson(eventId: string, id: string) {
  const db = getDb();
  const result = await db.delete(persons)
    .where(and(eq(persons.id, id), eq(persons.eventId, eventId)))
    .returning({ id: persons.id });
  if (result.length === 0) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Person not found");
}

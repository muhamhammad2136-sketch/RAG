import { prisma } from "../config/prisma.js";

function normalizeQuery(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function searchEmployeeData(query, limit = 5) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    throw new Error("Employee query must be a non-empty string");
  }

  const normalizedLimit = Number(limit);
  if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
    throw new Error("limit must be a positive integer");
  }

  const employees = await prisma.employee.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { email: { contains: normalizedQuery, mode: "insensitive" } },
        { role: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    },
    include: {
      department: {
        select: {
          id: true,
          name: true,
          company: {
            select: {
              id: true,
              name: true,
              industry: true,
              location: true,
            },
          },
        },
      },
    },
    take: normalizedLimit,
    orderBy: [{ name: "asc" }],
  });

  return {
    query: normalizedQuery,
    total: employees.length,
    employees,
  };
}

export async function searchCompanyData(query, limit = 5) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    throw new Error("Company query must be a non-empty string");
  }

  const normalizedLimit = Number(limit);
  if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
    throw new Error("limit must be a positive integer");
  }

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { industry: { contains: normalizedQuery, mode: "insensitive" } },
        { location: { contains: normalizedQuery, mode: "insensitive" } },
        { website: { contains: normalizedQuery, mode: "insensitive" } },
      ],
    },
    include: {
      departments: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: normalizedLimit,
    orderBy: [{ name: "asc" }],
  });

  return {
    query: normalizedQuery,
    total: companies.length,
    companies,
  };
}

/**
 * Signature One - Prisma Client Instance
 * Configured with global singleton for development reloads
 */

// Note: Prisma Client will be generated when running `npx prisma generate` in environments with database access
// We provide a safe typed client handler with fallback inspection.

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: any | undefined;
}

export const getPrismaClient = () => {
  if (typeof window !== 'undefined') {
    return null; // Prisma client is server-side only
  }

  try {
    // Dynamic import pattern for Node.js server environments
    const { PrismaClient } = require('@prisma/client');
    const prisma = globalThis.prismaGlobal ?? new PrismaClient();
    if (process.env.NODE_ENV !== 'production') {
      globalThis.prismaGlobal = prisma;
    }
    return prisma;
  } catch (error) {
    console.warn("Prisma Client not initialized (run `npx prisma generate` once connected to Supabase PostgreSQL).", error);
    return null;
  }
};

export const isPrismaConfigured = () => {
  const dbUrl = typeof process !== 'undefined' ? process.env?.DATABASE_URL : undefined;
  return Boolean(dbUrl && !dbUrl.includes('[YOUR-PASSWORD]'));
};

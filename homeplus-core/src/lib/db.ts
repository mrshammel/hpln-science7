import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Prisma v7: datasource url lives in prisma.config.ts for CLI,
  // but at runtime we must pass it via the constructor.
  return new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

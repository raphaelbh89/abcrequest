import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Tối ưu hóa SQLite Engine: Bật WAL mode, busy timeout 10s và cache 64MB
async function initSqlitePragmas() {
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
    await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 10000;");
    await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
    await prisma.$queryRawUnsafe("PRAGMA cache_size = -64000;");
    await prisma.$queryRawUnsafe("PRAGMA temp_store = MEMORY;");
  } catch {
    // Ignore during build or initialization
  }
}

initSqlitePragmas();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

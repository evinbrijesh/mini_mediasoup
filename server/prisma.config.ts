import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // At build time DATABASE_URL is not set; a dummy value lets `prisma generate`
    // succeed (it only needs the provider, not a live connection).
    // At runtime the real URL is supplied via the DATABASE_URL env var.
    url: process.env["DATABASE_URL"] ?? "postgresql://build:build@localhost:5432/build",
  },
});

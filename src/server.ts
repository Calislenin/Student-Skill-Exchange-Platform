import { app } from "./app.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer(): Promise<void> {
  await prisma.$connect();

  const server = app.listen(env.PORT, () => {
    console.log(`SkillExchange API: http://localhost:${env.PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Closing the server...`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch(async (error) => {
  console.error("Could not start SkillExchange API:", error);
  await prisma.$disconnect();
  process.exit(1);
});

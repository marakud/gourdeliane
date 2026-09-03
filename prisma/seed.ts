import { ensureSeedUser } from "../data/user";
import { prisma } from "../data/prisma";

async function main() {
  const user = await ensureSeedUser();
  console.log(`Seed OK -- User id=${user.id}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

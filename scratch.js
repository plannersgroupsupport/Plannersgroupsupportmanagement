const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log(await prisma.systemSettings.findFirst());
}
main();

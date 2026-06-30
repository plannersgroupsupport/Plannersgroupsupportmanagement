const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const records = await prisma.attendance.findMany({
    where: {
      date: {
        gte: new Date('2026-06-01T00:00:00Z'),
        lte: new Date('2026-06-30T23:59:59Z')
      }
    }
  });
  console.log('Attendance Records:');
  console.log(JSON.stringify(records, null, 2));

  const holidays = await prisma.holiday.findMany();
  console.log('Holidays:');
  console.log(JSON.stringify(holidays, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

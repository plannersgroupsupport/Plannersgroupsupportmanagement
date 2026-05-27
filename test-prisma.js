const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const instructors = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: {
        id: true,
        name: true,
        facultyProfile: { include: { lab: true } },
        fileUploads: {
          where: { type: 'PHOTO' },
          take: 1,
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });
    console.log('Success!', instructors.length);
  } catch (e) {
    console.error('Prisma Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crea un turno per domani alle 18:00-19:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const end = new Date(tomorrow);
  end.setHours(19, 0, 0, 0);

  const slot = await prisma.trainingSlot.create({
    data: {
      start: tomorrow,
      end: end,
      maxAthletes: 2, // Capienza bassa per testare il limite
    },
  });

  console.log(JSON.stringify({ slotId: slot.id, start: slot.start, end: slot.end, maxAthletes: slot.maxAthletes }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

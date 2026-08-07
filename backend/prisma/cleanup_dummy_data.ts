import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up dummy data from database...");

  // Delete dummy corporate enquiries (seeded IDs or tracking IDs starting with CSR-MH-2026-0001)
  const deletedEnquiries = await prisma.corporateEnquiry.deleteMany({
    where: {
      OR: [
        { trackingId: { startsWith: "CSR-MH-2026-0001" } },
        { corporateName: { in: ["Tata Consultancy Services Ltd", "Reliance Foundation", "Mahindra & Mahindra Ltd", "Infosys Foundation", "Kieran Cross"] } }
      ]
    }
  });
  console.log(`Deleted ${deletedEnquiries.count} dummy corporate enquiries.`);

  // Delete dummy feasibility assessments
  const deletedAssessments = await prisma.feasibilityAssessment.deleteMany({});
  console.log(`Deleted ${deletedAssessments.count} feasibility assessments.`);

  // Delete dummy government pitches starting with GP-MH-2026-0005
  const deletedPitches = await prisma.governmentPitch.deleteMany({
    where: {
      OR: [
        { pitchReferenceId: { startsWith: "GP-MH-2026-0005" } },
        { officialName: "Shri Santosh Patil" }
      ]
    }
  });
  console.log(`Deleted ${deletedPitches.count} dummy government pitches.`);

  // Delete dummy chats & messages
  const deletedMessages = await prisma.message.deleteMany({});
  console.log(`Deleted ${deletedMessages.count} chat messages.`);

  const deletedChats = await prisma.chat.deleteMany({});
  console.log(`Deleted ${deletedChats.count} chats.`);

  console.log("Cleanup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Cleanup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

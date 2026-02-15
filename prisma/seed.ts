import { db } from "../lib/db";

async function main() {
  await db.post.createMany({
    data: [
      {
        text: "Just shipped a new feature. Here's what I learned...",
        status: "DRAFT",
        tags: "build,ship",
      },
      {
        text: "The one thing that changed my productivity:",
        status: "SCHEDULED",
        scheduledAt: new Date(Date.now() + 86400000),
        tags: "tips",
      },
    ],
  });
  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

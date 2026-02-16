/**
 * Script para encontrar el post que desapareció
 */
import { db } from "@/lib/db";

const prisma = db;

async function main() {
  console.log("=== Buscando post programado para las 13:29 ===\n");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buscar posts programados para hoy alrededor de las 13:29
  const targetTime = new Date();
  targetTime.setHours(13, 29, 0, 0);

  const posts = await prisma.post.findMany({
    where: {
      scheduledAt: {
        gte: new Date(targetTime.getTime() - 60 * 60 * 1000), // 1 hora antes
        lte: new Date(targetTime.getTime() + 60 * 60 * 1000), // 1 hora después
      },
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      user: {
        select: { email: true, xUsername: true },
      },
    },
  });

  console.log(`Encontrados ${posts.length} posts programados alrededor de las 13:29:\n`);

  for (const post of posts) {
    console.log(`─────────────────────────────────────────`);
    console.log(`ID: ${post.id}`);
    console.log(`Usuario: ${post.user?.email} (@${post.user?.xUsername || "N/A"})`);
    console.log(`Status: ${post.status}`);
    console.log(`Programado: ${post.scheduledAt?.toLocaleString("es-ES")}`);
    console.log(`Publicado: ${post.publishedAt?.toLocaleString("es-ES") || "No publicado"}`);
    console.log(`Tweet ID: ${post.xTweetId || "N/A"}`);
    console.log(`Texto: ${post.text.substring(0, 100)}${post.text.length > 100 ? "..." : ""}`);
    console.log(`Community: ${post.communityId || "Feed principal"}`);
  }

  console.log(`\n═════════════════════════════════════════\n`);

  // Buscar posts que cambiaron recientemente de status
  console.log("Posts que cambiaron de status en la última hora:\n");

  const recentlyUpdated = await prisma.post.findMany({
    where: {
      updatedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
      },
      OR: [
        { status: "PUBLISHED" },
        { status: "FAILED" },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    include: {
      user: {
        select: { email: true },
      },
    },
  });

  for (const post of recentlyUpdated) {
    console.log(`─────────────────────────────────────────`);
    console.log(`ID: ${post.id}`);
    console.log(`Usuario: ${post.user?.email}`);
    console.log(`Status: ${post.status}`);
    console.log(`Actualizado: ${post.updatedAt.toLocaleString("es-ES")}`);
    console.log(`Programado para: ${post.scheduledAt?.toLocaleString("es-ES") || "N/A"}`);
    console.log(`Texto: ${post.text.substring(0, 80)}...`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  prisma.$disconnect();
  process.exit(1);
});

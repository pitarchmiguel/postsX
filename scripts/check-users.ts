import { db } from "../lib/db";

async function checkUsers() {
  console.log("🔍 Verificando usuarios en la base de datos...\n");

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      supabaseUserId: true,
      xUsername: true,
      xName: true,
      xAccessToken: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`📊 Total de usuarios: ${users.length}\n`);

  users.forEach((user: typeof users[0], index: number) => {
    console.log(`Usuario ${index + 1}:`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Supabase ID: ${user.supabaseUserId}`);
    console.log(`  X Username: ${user.xUsername || "No conectado"}`);
    console.log(`  X Name: ${user.xName || "No conectado"}`);
    console.log(`  Tiene X Token: ${user.xAccessToken ? "Sí" : "No"}`);
    console.log(`  Creado: ${user.createdAt}`);
    console.log("");
  });

  // Check posts per user
  for (const user of users) {
    const postCount = await db.post.count({
      where: { userId: user.id },
    });
    console.log(`📝 ${user.email} tiene ${postCount} posts`);
  }

  await db.$disconnect();
}

checkUsers().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

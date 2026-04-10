import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Ensure freelance categories exist ────────────────────────────
  const freelanceCats = [
    { slug: "freelance", name: "Freelance", description: "Freelance areas and hotspots around Pattaya", color: "#FF2D95", icon: "💃", sortOrder: 14 },
    { slug: "ladyboy-freelance", name: "Ladyboy Freelance", description: "Ladyboy freelance areas and hotspots", color: "#A855F7", icon: "✨", sortOrder: 16 },
    { slug: "gay-freelance", name: "Gay Freelance", description: "Gay freelance areas and hotspots", color: "#3B82F6", icon: "🏳️‍🌈", sortOrder: 24 },
  ];
  for (const cat of freelanceCats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { sortOrder: cat.sortOrder },
      create: cat,
    });
    console.log("✅ Category ensured:", cat.slug);
  }

  // Get BoBo's profile
  const bobo = await prisma.profile.findUnique({
    where: { username: "bababobo" },
    select: { id: true },
  });
  if (!bobo) throw new Error("User bababobo not found");

  // Get General category
  const general = await prisma.category.findFirst({
    where: { slug: "general" },
    select: { id: true },
  });
  if (!general) throw new Error("General category not found");

  // ── Delete old announcement posts ──────────────────────────────────
  const oldSlugs = [
    "how-pattaya-vice-city-works",
    "community-hashtags-and-mentions",
    "built-for-the-community",
    "welcome-to-pattaya-vice-city",
    "about-pattaya-vice-city",
  ];
  for (const slug of oldSlugs) {
    const old = await prisma.post.findUnique({ where: { slug } });
    if (old) {
      await prisma.postCategory.deleteMany({ where: { postId: old.id } });
      await prisma.post.delete({ where: { id: old.id } });
      console.log("🗑️  Deleted old post:", slug);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // POST 1 — Welcome & The Experience
  // ══════════════════════════════════════════════════════════════════
  const post1Slug = "welcome-to-pattaya-vice-city";
  const post1 = await prisma.post.create({
    data: {
      title: "Welcome to Pattaya Vice City",
      slug: post1Slug,
      content: `Welcome to PVC — your ultimate guide to Pattaya nightlife. We want this to be the go-to reference for anyone exploring the scene, whether you're a first-timer or a seasoned regular.

**What you'll find here**
Every bar, GoGo club, massage spot, KTV, club, and freelance area in Pattaya — all in one place. Browse by category, search by name, check the map, read real reviews. Each spot has its own page with prices, hours, photos, and what the community actually thinks.

**PVC Picks**
We have our own selection of spots we personally love — you can find them using the "PVC Picks" filter. These are our honest favorites, not paid placements. No one pays us, no one sponsors us. We have zero revenue, zero ads, zero deals with any venue. What you see here is what we genuinely think.

**How to interact**
Tag topics with #hashtags to make them easy to find (e.g. #soi6, #walkingstreet, #lkmetro). Mention a spot with @its-name to link directly to it. Tag a user with !username to get their attention — they'll get a notification and can click straight to your message.

Upvote what's useful, downvote what's not. Leave reviews and rate spots you've been to. Save your favorites. The more you contribute, the better this gets for everyone.

**Always evolving**
This platform changes every single day. New spots, new features, design improvements — it never stops. What you see today will be better tomorrow.

— !bababobo`,
      categoryId: general.id,
      authorId: bobo.id,
      sourceLanguage: "en",
      score: 15,
      isPinned: true,
    },
  });
  await prisma.postCategory.create({ data: { postId: post1.id, categoryId: general.id } });
  console.log("✅ Created:", post1Slug);

  // ══════════════════════════════════════════════════════════════════
  // POST 2 — Join the Adventure
  // ══════════════════════════════════════════════════════════════════
  const post2Slug = "about-pattaya-vice-city";
  const post2 = await prisma.post.create({
    data: {
      title: "Join the Adventure",
      slug: post2Slug,
      content: `We built PVC because we love Pattaya and no site out there does this properly — no exhaustive, clean, honest guide existed for the nightlife scene. So we made one. For the community, by the community.

**100% independent — zero sponsors, zero ads, zero revenue**
Nobody pays us. Nobody influences what we write. No venue knows who we are, and that's by design. We're completely anonymous, which means we can be completely honest. Every review, every pick, every rating reflects what we actually think — not what someone paid us to say.

**Everyone is welcome**
Expats, residents, tourists, first-timers, regulars — no matter where you're from, what you're into, or how long you're staying. Straight, ladyboy, gay — every community has its place here. We don't judge, we stay open, and we built this for absolutely everyone.

**Your privacy, your choice**
You can stay anonymous or show who you are — it's entirely up to you. We respect that and we'll never force anyone to reveal their identity.

**We need you**
Every review you write, every spot you rate, every comment you drop makes this place better. You're not just a user — you're building this with us. The community is what makes PVC valuable.

**Want to be part of it?**
If you think you can bring something to the table — ideas, bug reports, content, design, anything — reach out via the contact page or drop a comment below. We read everything and we move fast.

Let's make this the best nightlife resource Pattaya has ever seen.

— !bababobo`,
      categoryId: general.id,
      authorId: bobo.id,
      sourceLanguage: "en",
      score: 12,
      isPinned: true,
    },
  });
  await prisma.postCategory.create({ data: { postId: post2.id, categoryId: general.id } });
  console.log("✅ Created:", post2Slug);

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  console.log("User ID:", bobo.id);
  console.log("Category ID:", general.id);

  // ── Post 1: Welcome ─────────────────────────────────────────
  const welcomeSlug = "welcome-to-pattaya-vice-city";
  const existingWelcome = await prisma.post.findUnique({ where: { slug: welcomeSlug } });

  if (!existingWelcome) {
    const welcome = await prisma.post.create({
      data: {
        title: "Welcome to Pattaya Vice City!",
        slug: welcomeSlug,
        content: `Hey everyone! Welcome to Pattaya Vice City — your ultimate nightlife guide to Pattaya.

We're stoked to have you here. Whether you're a first-timer or a seasoned veteran, this is the place to find the best spots, share your experiences, and connect with the community.

Got a question? Need a recommendation? Don't hesitate to reach out:
- Drop a comment right below this post
- Or hit us up via our contact form: /contact

We're here to help and we read everything. Cheers and enjoy the ride!

— BoBo & the PVC crew`,
        categoryId: general.id,
        authorId: bobo.id,
        sourceLanguage: "en",
        score: 10,
      },
    });
    await prisma.postCategory.create({
      data: { postId: welcome.id, categoryId: general.id },
    });
    console.log("✅ Created welcome post:", welcome.slug);
  } else {
    console.log("⏭️  Welcome post already exists");
  }

  // ── Post 2: Request an Establishment ──────────────────────
  const requestSlug = "request-a-new-spot";
  const existingRequest = await prisma.post.findUnique({ where: { slug: requestSlug } });

  if (!existingRequest) {
    const request = await prisma.post.create({
      data: {
        title: "Request a New Spot!",
        slug: requestSlug,
        content: `Know a spot that's not on Pattaya Vice City yet? We want to hear about it!

Drop a comment below with:
- The name of the place
- Where it's located (street, soi, area)
- What type of spot it is (bar, gogo, massage, club, etc.)
- Your honest review or experience

We'll check it out and add it to the site as soon as possible. The more details you give us, the faster we can get it listed.

Help us build the most complete Pattaya nightlife guide out there!

— BoBo`,
        categoryId: general.id,
        authorId: bobo.id,
        sourceLanguage: "en",
        score: 5,
      },
    });
    await prisma.postCategory.create({
      data: { postId: request.id, categoryId: general.id },
    });
    console.log("✅ Created request-a-spot post:", request.slug);
  } else {
    console.log("⏭️  Request post already exists");
  }

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

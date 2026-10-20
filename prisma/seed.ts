import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { syncLocation } from "../src/lib/reviews/sync";

const DOWNTOWN_NAME = "Bright Smile Dental — Downtown";
const SCARBOROUGH_NAME = "Bright Smile Dental — Scarborough";

async function main() {
  console.log("Seeding database...");

  const org = await prisma.organization.upsert({
    where: { id: "seed-org-bright-smile" },
    update: {},
    create: {
      id: "seed-org-bright-smile",
      name: "Bright Smile Dental Group",
    },
  });

  const [downtown, scarborough] = await Promise.all([
    prisma.location.upsert({
      where: { id: "seed-loc-downtown" },
      update: {},
      create: {
        id: "seed-loc-downtown",
        organizationId: org.id,
        name: DOWNTOWN_NAME,
        address: "120 Bay St, Toronto, ON",
      },
    }),
    prisma.location.upsert({
      where: { id: "seed-loc-scarborough" },
      update: {},
      create: {
        id: "seed-loc-scarborough",
        organizationId: org.id,
        name: SCARBOROUGH_NAME,
        address: "900 Markham Rd, Scarborough, ON",
      },
    }),
  ]);

  await prisma.brandVoiceProfile.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      tone: "warm, professional, concise, and reassuring — never defensive",
      talkingPoints: [
        "thank the reviewer by name",
        "invite them to call the clinic directly for anything unresolved",
        "mention that patient comfort and privacy are a top priority",
      ],
      topicsToAvoid: ["pricing specifics", "insurance claim details", "staff names in a negative context"],
      signOff: "— The Bright Smile Dental Team",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { email: "agent@brightsmile.example" },
    update: {},
    create: {
      organizationId: org.id,
      name: "Amara Osei",
      email: "agent@brightsmile.example",
      passwordHash,
      role: "AGENT",
    },
  });
  await prisma.user.upsert({
    where: { email: "manager@brightsmile.example" },
    update: {},
    create: {
      organizationId: org.id,
      name: "Daniel Reyes",
      email: "manager@brightsmile.example",
      passwordHash,
      role: "MANAGER",
    },
  });

  const existingTemplates = await prisma.replyTemplate.count({ where: { organizationId: org.id } });
  if (existingTemplates === 0) {
    await prisma.replyTemplate.createMany({
      data: [
        {
          organizationId: org.id,
          title: "Thank you — positive review",
          body:
            "Hi {{author_name}}, thank you so much for the kind words! We're thrilled to hear about your visit and look forward to seeing you again soon.\n\n{{sign_off}}",
        },
        {
          organizationId: org.id,
          title: "Apology — wait time",
          body:
            "Hi {{author_name}}, we're sorry your visit took longer than it should have. That's not the experience we want for our patients, and we're working on our scheduling to fix it. Please call the clinic directly if you'd like to discuss further.\n\n{{sign_off}}",
        },
        {
          organizationId: org.id,
          title: "Escalation — invite to contact directly",
          body:
            "Hi {{author_name}}, thank you for bringing this to our attention. We'd like to make this right — please call our clinic directly so we can look into what happened and resolve it with you personally.\n\n{{sign_off}}",
        },
      ],
    });
  }

  console.log("Organization, locations, users, brand voice, and templates ready.");

  if (!process.env.GITHUB_MODELS_TOKEN || process.env.GITHUB_MODELS_TOKEN.startsWith("ghp_xxxx")) {
    console.warn(
      "\nGITHUB_MODELS_TOKEN is not set — skipping review sync/AI triage.\n" +
        "Set it in .env and run `npm run db:seed` again, or trigger a sync from the Settings > Locations page once the app is running.\n",
    );
    return;
  }

  console.log("Syncing reviews from the mock Google Business Profile provider (this calls the AI model for triage, so it can take a minute)...");
  for (const location of [downtown, scarborough]) {
    const result = await syncLocation(location.id);
    console.log(
      `  ${location.name}: fetched ${result.fetched}, created ${result.created}, analyzed ${result.analyzed}${
        result.analysisErrors ? `, ${result.analysisErrors} triage errors` : ""
      }`,
    );
  }

  console.log("\nSeed complete. Demo logins:");
  console.log("  Agent:   agent@brightsmile.example / password123");
  console.log("  Manager: manager@brightsmile.example / password123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

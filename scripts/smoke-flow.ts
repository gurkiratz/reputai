import { prisma } from "../src/lib/prisma";
import {
  generateAIDraft,
  submitForApproval,
  approveAndPost,
  editDraft,
} from "../src/lib/reply-service";

async function main() {
  const manager = await prisma.user.findUniqueOrThrow({
    where: { email: "manager@brightsmile.example" },
  });
  const agent = await prisma.user.findUniqueOrThrow({
    where: { email: "agent@brightsmile.example" },
  });

  const sensitiveReview = await prisma.review.findFirstOrThrow({
    where: { text: { contains: "root canal" } },
  });
  console.log("Testing sensitive review:", sensitiveReview.id, sensitiveReview.authorName);

  const reply = await generateAIDraft(sensitiveReview.id, agent.id);
  console.log("Draft body:", reply.body);

  const flags = await prisma.complianceFlag.findMany({ where: { replyId: reply.id } });
  console.log("Compliance flags:", flags.map((f) => `${f.severity}:${f.rule}`));

  try {
    await submitForApproval(sensitiveReview.id);
    console.log("Submitted for approval (no BLOCK flags present).");
  } catch (err) {
    console.log("Submit blocked as expected:", (err as Error).message);
  }

  // Force a BLOCK-worthy edit to verify the compliance checker actually gates submission.
  await editDraft(reply.id, "We're sorry about your root canal treatment plan being discussed.");
  const flagsAfterEdit = await prisma.complianceFlag.findMany({ where: { replyId: reply.id } });
  console.log("Flags after bad edit:", flagsAfterEdit.map((f) => `${f.severity}:${f.rule}`));

  try {
    await submitForApproval(sensitiveReview.id);
    console.log("ERROR: submit should have been BLOCKED but succeeded");
  } catch (err) {
    console.log("Correctly blocked submission:", (err as Error).message);
  }

  // Fix it back to a safe draft and run the real approval flow end-to-end.
  await editDraft(
    reply.id,
    "We're very sorry to hear this. Please call our clinic directly so we can look into it with you.",
  );
  await submitForApproval(sensitiveReview.id);
  const approved = await approveAndPost(sensitiveReview.id, manager.id);
  console.log("Approved and posted:", approved.id, "postedAt set:", Boolean(approved.postedAt));

  const finalReview = await prisma.review.findUniqueOrThrow({ where: { id: sensitiveReview.id } });
  console.log("Final review status:", finalReview.status);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

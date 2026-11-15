import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  name?: string | null;
  role: "AGENT" | "MANAGER";
  organizationId: string;
};

/** Every server action calls one of these first (role check, T26). */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated.");
  return session.user as SessionUser;
}

export async function requireManager(message = "Only a manager can do this."): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "MANAGER") throw new Error(message);
  return user;
}

/** Stops a user from acting on another organization's review. */
export async function assertReviewInOrg(reviewId: string, organizationId: string) {
  const review = await prisma.review.findFirst({
    where: { id: reviewId, location: { organizationId } },
    select: { id: true },
  });
  if (!review) throw new Error("Review not found.");
}

export async function assertReplyInOrg(replyId: string, reviewId: string, organizationId: string) {
  const reply = await prisma.reply.findFirst({
    where: { id: replyId, reviewId, review: { location: { organizationId } } },
    select: { id: true },
  });
  if (!reply) throw new Error("Reply not found.");
}

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@stanford-press/database";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      affiliation: true,
      orcid: true,
      bio: true,
      expertiseAreas: true,
      reviewerAvailable: true,
      totalCompleted: true,
      totalDeclined: true,
      avgResponseDays: true,
      qualityScore: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <h1 className="text-lg font-heading font-bold text-navy-950">My Profile</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <ProfileForm user={user} />
      </main>
    </div>
  );
}

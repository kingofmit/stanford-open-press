import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ZodError, type ZodSchema } from "zod";
import { Prisma } from "@stanford-press/database";

export type ApiContext = {
  user: { id: string; email: string; name: string };
};

export async function withAuth(
  handler: (ctx: ApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler({ user: session.user as ApiContext["user"] });
}

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.errors.map((e) => e.message) },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Record already exists" }, { status: 409 });
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
  }
  console.error(error);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

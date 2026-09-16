import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/guards";
import { handleApi } from "@/lib/handle-api";
import { ApiError } from "@/lib/api-error";

// Lista tutti gli utenti (solo admin)
export async function GET(req: Request) {
  return handleApi(async () => {
    requireAdmin(await getSession());

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt.toISOString(),
        bookingsCount: u._count.bookings,
      })),
    });
  });
}

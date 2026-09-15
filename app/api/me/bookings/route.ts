import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/guards";
import { listMyBookings } from "@/lib/rules";
import { handleApi } from "@/lib/handle-api";

export async function GET(req: Request) {
  return handleApi(async () => {
    const user = requireUser(await getSession(req));
    const bookings = await listMyBookings(user.id);
    return NextResponse.json({ bookings });
  });
}

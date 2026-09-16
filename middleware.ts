import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth?.token;
    const isAdminArea = req.nextUrl.pathname.startsWith("/admin");

    if (isAdminArea && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/calendario", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/calendario/:path*", "/prenotazioni/:path*"],
};

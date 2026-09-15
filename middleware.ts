import { withAuthorization } from "next-auth/middleware";
import { NextResponse } from "next/server";

// /admin: solo ADMIN (no sessione -> /login; sessione non admin -> calendario)
// /calendario e /prenotazioni: chiunque sia loggato
export default withAuthorization(({ token, req }) => {
  const isAdminArea = req.nextUrl.pathname.startsWith("/admin");
  if (!token) return false;
  if (isAdminArea && token.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/calendario";
    return NextResponse.redirect(url);
  }
  return true;
});

export const config = {
  matcher: ["/admin/:path*", "/calendario/:path*", "/prenotazioni/:path*"],
};

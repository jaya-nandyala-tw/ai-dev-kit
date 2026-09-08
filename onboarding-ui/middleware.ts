import { NextResponse, type NextRequest } from "next/server";

// This tool spawns real scripts (git clone, pre-commit install, git rm) and writes to the
// parent repo checkout. It must never be reachable from anything but the machine it runs on.
// See README.md "Local-only, on purpose".
const ALLOWED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const hostname = host.split(":")[0] ?? "";

  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return NextResponse.json(
      {
        error:
          "This onboarding wizard only serves localhost. Refusing a request with " +
          `Host: "${host}". Never expose this tool beyond your own machine.`,
      },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error("AUTH_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const token = await getToken({ req, secret });

    if (!token) {
      return NextResponse.json({ error: "No token found" }, { status: 401 });
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error getting token:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}

// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

// Array of providers
const providers: Provider[] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // 🚨 CRITICAL for Vercel
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async signIn({ account }) {
      console.log("🔐 SignIn callback triggered");

      if (account?.provider === "google" && account.id_token) {
        try {
          const backendUrl = process.env.NEXT_PUBLIC_API_URL;
          if (!backendUrl) {
            console.error("❌ NEXT_PUBLIC_API_URL not set");
            return false;
          }

          const endpoint = `${backendUrl}/auth/google/login`;
          console.log("📡 Calling:", endpoint);

          // Add timeout and proper error handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "NextAuth/Vercel",
            },
            body: JSON.stringify({ token: account.id_token }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log("📊 Response status:", res.status);

          if (!res.ok) {
            const errorText = await res.text();
            console.error("❌ Backend error:", res.status, errorText);
            return false;
          }

          const data = await res.json();
          console.log("✅ Backend success");

          (account as Record<string, unknown>).backend_jwt = data.jwt_token;
          return true;
        } catch (error) {
          console.error("💥 SignIn error:", error);
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              console.error("⏰ Request timeout - backend too slow");
            } else if (error.message.includes("fetch")) {
              console.error("🌐 Network error - backend unreachable");
            }
          }
          return false;
        }
      }

      console.log("❌ Invalid provider or missing token");
      return false;
    },

    async jwt({ token, account }) {
      if (account?.backend_jwt) {
        token.backendToken = account.backend_jwt;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
      }
      return session;
    },
  },
});

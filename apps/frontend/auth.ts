// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";

// Array of providers
const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  callbacks: {
    // This callback is the bridge to your Go backend
    async signIn({ account }) {
      console.log("signIn callback triggered with account:", account);
      if (account?.provider === "google" && account.id_token) {
        try {
          console.log("Calling backend auth endpoint...");
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: account.id_token }),
            }
          );

          console.log("Backend response status:", res.status);
          if (!res.ok) {
            console.log("Backend login failed");
            return false; // Stop sign-in if backend login fails
          }

          const data = await res.json();
          console.log("Backend login successful, data:", data);
          // Store the backend JWT in a way that works with NextAuth
          (account as Record<string, unknown>).backend_jwt = data.jwt_token;
          return true;
        } catch (error) {
          console.error("Backend login error:", error);
          return false;
        }
      }
      console.log("No Google account or id_token found");
      return false; // Deny sign-in for other cases
    },

    // This persists your backend JWT into the NextAuth session token
    async jwt({ token, account }) {
      console.log("jwt callback - token:", token, "account:", account);
      if (account?.backend_jwt) {
        token.backendToken = account.backend_jwt;
        console.log("Added backendToken to JWT");
      }
      return token;
    },

    // This exposes your backend JWT to the client-side session
    async session({ session, token }) {
      console.log("session callback - session:", session, "token:", token);
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
        console.log("Added backendToken to session");
      }
      return session;
    },
  },
});

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
      if (account?.provider === "google" && account.id_token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: account.id_token }),
          });

          if (!res.ok) return false; // Stop sign-in if backend login fails

          const data = await res.json();
          // Attach your Go backend's JWT to the account object
          account.backend_jwt = data.jwt_token;
          return true;
        } catch (error) {
          console.error("Backend login error:", error);
          return false;
        }
      }
      return false; // Deny sign-in for other cases
    },

    // This persists your backend JWT into the NextAuth session token
    async jwt({ token, account }) {
      if (account?.backend_jwt) {
        token.backendToken = account.backend_jwt;
      }
      return token;
    },

    // This exposes your backend JWT to the client-side session
    async session({ session, token }) {
      if (token.backendToken) {
        session.backendToken = token.backendToken as string;
      }
      return session;
    },
  },
});
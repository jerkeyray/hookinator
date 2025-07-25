// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    backendToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    backendToken?: string;
  }
}
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "dev-nextauth-secret-key-67890-very-secure",
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`,
            {
              method: 'POST',
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
              headers: { 'Content-Type': 'application/json' },
            },
          );

          if (!res.ok) return null;

          const data = await res.json();
          if (data && data.user) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              schoolId: data.user.schoolId,
              profileImage: data.user.profileImage,
              accessToken: data.accessToken,
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.schoolId = (user as any).schoolId;
        token.profileImage = (user as any).profileImage;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).schoolId = token.schoolId;
        (session.user as any).profileImage = token.profileImage;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

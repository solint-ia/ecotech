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

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Credenciais inválidas.');
          }

          const data = await res.json();
          if (data && data.user) {
            return {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role,
              roleStatus: data.user.roleStatus,
              schoolId: data.user.schoolId,
              profileImage: data.user.profileImage,
              accessToken: data.accessToken,
            };
          }
          return null;
        } catch (error) {
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.realRole = (user as any).role;
        token.roleStatus = (user as any).roleStatus;
        
        const isPendingOrRejected = token.roleStatus === 'PENDENTE' || token.roleStatus === 'REPROVADO';
        token.role = isPendingOrRejected ? 'STUDENT' : token.realRole;
        
        token.schoolId = (user as any).schoolId;
        token.profileImage = (user as any).profileImage;
        token.accessToken = (user as any).accessToken;
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.profileImage !== undefined) token.profileImage = session.profileImage;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).realRole = token.realRole;
        (session.user as any).roleStatus = token.roleStatus;
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

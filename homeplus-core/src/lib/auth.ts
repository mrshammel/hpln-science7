import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        // Check if user exists in our database
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (!existingUser) {
          // Create new student account
          await prisma.user.create({
            data: {
              name: user.name || 'Student',
              email: user.email,
              googleId: account?.providerAccountId,
              role: 'STUDENT',
              avatar: user.image,
            },
          });
          console.log(`[Auth] Created new student: ${user.email}`);
        } else {
          // Update Google ID and avatar if not set
          if (!existingUser.googleId && account?.providerAccountId) {
            await prisma.user.update({
              where: { email: user.email },
              data: {
                googleId: account.providerAccountId,
                avatar: user.image || existingUser.avatar,
              },
            });
          }
        }

        return true;
      } catch (error) {
        console.error('[Auth] Sign-in error:', error);
        return false;
      }
    },

    async jwt({ token, user }) {
      // On initial sign-in, fetch role from DB and embed in token
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, gradeLevel: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.gradeLevel = dbUser.gradeLevel;
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Pass role/id from token to session (no extra DB query)
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).gradeLevel = token.gradeLevel;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, redirect based on role
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + '/dashboard';
    },
  },

  pages: {
    signIn: '/',  // Use Home Plus landing as sign-in page
  },

  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);

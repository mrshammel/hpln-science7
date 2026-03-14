import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: 'STUDENT' | 'TEACHER' | 'ADMIN';
      gradeLevel: number | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    gradeLevel?: number | null;
  }
}

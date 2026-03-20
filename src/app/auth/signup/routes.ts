import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, userType, primarySpokenLanguage } = body;

    if (!name || !email || !password || !userType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const created = await prisma.user.create({
      data: {
        name,
        email,
        password,
        userType, // if Prisma has enum UserType
        primarySpokenLanguage: primarySpokenLanguage || '',
      },
    });

    const { password: _pwd, ...safe } = created;
    return NextResponse.json({ user: safe }, { status: 201 });
  } catch (err) {
    console.error('api/users POST', err);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
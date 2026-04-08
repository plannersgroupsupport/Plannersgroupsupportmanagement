import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { loginId, password, role } = await req.json();

    const bcrypt = require('bcryptjs');

    const user = await prisma.user.findUnique({ where: { loginId } });

    if (!user || user.role !== role) {
      return NextResponse.json({ error: 'Invalid credentials or role mismatch' }, { status: 401 });
    }
    
    if (user.role === 'STUDENT' && !(user as any).isApproved) {
      return NextResponse.json({ error: 'Your account is pending approval by the administrator.' }, { status: 403 });
    }

    let isMatch = await bcrypt.compare(password, user.passwordHash);
    
    // Auto-Repair/Upgrade for legacy SHA-256 hashes
    if (!isMatch && user.passwordHash.length === 64 && !user.passwordHash.startsWith('$2a$')) {
        const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
        if (legacyHash === user.passwordHash) {
            isMatch = true;
            // Upgrade hash to bcrypt
            const newBcryptHash = await bcrypt.hash(password, 10);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newBcryptHash }
            });
        }
    }

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const res = NextResponse.json({ success: true, user: { id: user.id, role: user.role, name: user.name } });
    
    res.cookies.set('auth_token', JSON.stringify({ id: user.id, role: user.role, name: user.name }), {
        httpOnly: false,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

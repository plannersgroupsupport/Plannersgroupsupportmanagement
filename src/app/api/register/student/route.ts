import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// @ts-ignore
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // 1. Data Sanitization & Basic Checks
    const name = data.name?.trim();
    const admissionNo = data.admissionNo?.trim();
    const labNumber = data.labNumber?.trim() || 'LAB-1';
    const dob = data.dob; // Expected YYYY-MM-DD
    const email = data.email?.trim();
    const phone = data.phone?.trim();
    const fatherName = data.fatherName?.trim();
    const fatherPhone = data.fatherPhone?.trim();
    const address = data.address?.trim();
    const district = data.district?.trim();
    const pincode = data.pincode?.trim();
    const collegeName = data.collegeName?.trim();
    const courses = data.courses;

    if (!name || !admissionNo || !dob || !email || !phone || !fatherName || !fatherPhone || !address || !district || !pincode || !collegeName || !courses || courses.length === 0) {
      return NextResponse.json({ error: 'Every detail is mandatory. Please provide all information including academic, family, and residential data.' }, { status: 400 });
    }

    // 2. Generate Logic per User Request
    // Login ID: S + admissionNumber + labNumber (no space)
    const generatedLoginId = `S${admissionNo}${labNumber}`.replace(/\s+/g, '');

    // Password: S- + full name + - + date of birth
    const generatedPassword = `S-${name}-${dob}`;

    // 3. Unique Constraint Checks (Proactive)
    const existingUser = await prisma.user.findFirst({
       where: { OR: [{ loginId: generatedLoginId }, { email: email.includes('@example.com') ? undefined : email }] }
    });

    if (existingUser) {
       return NextResponse.json({ error: `Registration failed. The ${existingUser.loginId === generatedLoginId ? 'Admission No/Lab combo' : 'Email'} is already registered.` }, { status: 400 });
    }

    const existingProfile = await (prisma as any).studentProfile.findUnique({
      where: { admissionNo }
    });

    if (existingProfile) {
      return NextResponse.json({ error: 'Registration failed. This Admission Number is already in use by another student.' }, { status: 400 });
    }

    // 4. Create User & Profile in a Transaction
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    try {
      const result = await (prisma as any).$transaction(async (tx: any) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            phone,
            loginId: generatedLoginId,
            passwordHash: hashedPassword,
            role: 'STUDENT',
            isApproved: false,
          }
        });

        await tx.studentProfile.create({
          data: {
            userId: user.id,
            admissionNo,
            admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
            dob: dob ? new Date(dob) : null,
            sex: data.sex,
            courseName: data.courseName || 'General',
            courseStartDate: data.courseStartDate && !isNaN(Date.parse(data.courseStartDate)) ? new Date(data.courseStartDate) : new Date(),
            batch: data.batch,
            labNumber,
            collegeName: data.collegeName,
            fatherName: data.fatherName,
            fatherPhone: data.fatherPhone,
            address: data.address,
            district: data.district,
            pincode: data.pincode,
            packageType: data.packageType || 'BASIC'
          }
        });

        return { loginId: generatedLoginId, password: generatedPassword };
      });

      return NextResponse.json({
        success: true,
        loginId: result.loginId,
        password: result.password,
        message: 'Self-registration successful!'
      });

    } catch (transactionError: any) {
      console.error('Transaction failed:', transactionError);
      return NextResponse.json({ error: 'Database transaction failed. Please ensure all data is valid.' }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Registration API error:', err);
    return NextResponse.json({ error: 'A system error occurred. Please contact support.' }, { status: 500 });
  }
}

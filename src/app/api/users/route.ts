import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
// @ts-ignore
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  
  if (role) {
    const users = await prisma.user.findMany({ 
       where: { role },
       include: { 
         studentProfile: true,
         feePayments: true,
         fileUploads: true
       }
    });
    return NextResponse.json(users);
  }
  
  const allUsers = await prisma.user.findMany();
  return NextResponse.json(allUsers);
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const hash = crypto.createHash('sha256').update(data.password || 'password123').digest('hex');
    
    // Clean up empty strings to avoid unique constraint issues
    const loginId = data.loginId?.trim();
    const email = data.email?.trim() || null;
    const phone = data.phone?.trim() || null;

    if (!loginId) {
       return NextResponse.json({ error: "Login ID is required." }, { status: 400 });
    }

    // Hash with bcryptjs for consistency
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);

    const newUser = await prisma.user.create({
      data: {
        loginId,
        passwordHash: hashedPassword,
        role: data.role,
        name: data.name,
        email: email,
        phone: phone
      }
    });

    if (data.role === 'STUDENT') {
      const admissionNo = data.admissionNo?.trim() || `ADM-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await (prisma as any).studentProfile.create({
        data: {
           userId: newUser.id,
           admissionNo: admissionNo,
           admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
           dob: data.dob ? new Date(data.dob) : undefined,
           sex: data.sex,
           courseName: data.courseName || 'General',
           courseStartDate: data.courseStartDate ? new Date(data.courseStartDate) : new Date(),
           batch: data.batch,
           labNumber: data.labNumber,
           collegeName: data.collegeName,
           fatherName: data.fatherName,
           fatherPhone: data.fatherPhone,
           address: data.address,
           district: data.district,
           taluk: data.taluk,
           pincode: data.pincode,
           packageType: data.packageType || 'BASIC',
           totalCourseFee: data.packageType === 'PREMIUM' ? 65000 : 35000,
           currentStatus: data.currentStatus || 'Autocad'
        }
      });
    }

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const { id, ...updateData } = data;

    if (!id) return NextResponse.json({ error: "User ID is required." }, { status: 400 });

    let updatedUser = await prisma.user.findUnique({ where: { id }, include: { studentProfile: true } });
    if (!updatedUser) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const userUpdateFields = ['name', 'email', 'phone', 'loginId', 'isApproved', 'password'];
    const hasUserUpdates = userUpdateFields.some(key => updateData[key] !== undefined);

    if (hasUserUpdates) {
      const dataToUpdate: any = {
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        loginId: updateData.loginId,
        isApproved: updateData.isApproved !== undefined ? Boolean(updateData.isApproved) : undefined,
      };

      if (updateData.password && updateData.password.trim() !== '') {
        dataToUpdate.passwordHash = await bcrypt.hash(updateData.password, 10);
      }

      updatedUser = await (prisma as any).user.update({
        where: { id },
        data: dataToUpdate,
        include: { studentProfile: true }
      });
    }

    if (updatedUser && updatedUser.role === 'STUDENT' && updatedUser.studentProfile) {
      const studentUpdateData: any = {};
      
      const safeAssign = (key: string, value: any) => { if (value !== undefined) studentUpdateData[key] = value; };
      
      safeAssign('admissionNo', updateData.admissionNo);
      safeAssign('admissionDate', updateData.admissionDate ? new Date(updateData.admissionDate) : undefined);
      safeAssign('dob', updateData.dob ? new Date(updateData.dob) : undefined);
      safeAssign('sex', updateData.sex);
      safeAssign('courseName', updateData.courseName);
      safeAssign('courseStartDate', updateData.courseStartDate ? new Date(updateData.courseStartDate) : undefined);
      safeAssign('batch', updateData.batch);
      safeAssign('labNumber', updateData.labNumber);
      safeAssign('collegeName', updateData.collegeName);
      safeAssign('fatherName', updateData.fatherName);
      safeAssign('fatherPhone', updateData.fatherPhone);
      safeAssign('address', updateData.address);
      safeAssign('district', updateData.district);
      safeAssign('taluk', updateData.taluk);
      safeAssign('pincode', updateData.pincode);
      safeAssign('packageType', updateData.packageType);
      
      if (updateData.totalCourseFee !== undefined) {
         studentUpdateData['totalCourseFee'] = parseFloat(updateData.totalCourseFee);
      }

      if (updateData.isPlaced !== undefined) {
         studentUpdateData['isPlaced'] = Boolean(updateData.isPlaced);
      }

      safeAssign('placedAt', updateData.placedAt);
      safeAssign('currentStatus', updateData.currentStatus);

      if (Object.keys(studentUpdateData).length > 0) {
        try {
          await prisma.studentProfile.update({
            where: { userId: id },
            data: studentUpdateData
          });
        } catch (profileErr: any) {
          console.error("Student profile update error:", profileErr);
          return NextResponse.json({ error: "Failed to update student profile: " + profileErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true, message: "Updated successfully" });
  } catch (err: any) {
    console.error("Update error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
       return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: id }
    });

    return NextResponse.json({ success: true, message: 'User removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

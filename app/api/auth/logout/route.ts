import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  response.cookies.delete('auth-token');
  // ملاحظة: نُبقي على auth-verified حتى لا يُطلب رمز التحقق من نفس الجهاز
  
  return response;
}
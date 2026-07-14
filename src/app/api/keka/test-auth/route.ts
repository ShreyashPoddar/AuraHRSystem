import { NextResponse } from 'next/server';
import { getKekaAccessToken } from '@/lib/kekaAuth';

export async function GET() {
  try {
    const token = await getKekaAccessToken();
    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

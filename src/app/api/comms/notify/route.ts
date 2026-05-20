import { NextResponse } from 'next/server';
import { sendInterviewInvite } from '@/lib/aws';

export async function POST(req: Request) {
  try {
    const { email, name, role } = await req.json();
    if (!email || !name || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const jitsiLink = `https://meet.jit.si/AuraHR-${name.replace(/\s+/g, '-')}-${Date.now()}`;
    await sendInterviewInvite(email, name, role, jitsiLink);

    return NextResponse.json({ success: true, jitsiLink });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

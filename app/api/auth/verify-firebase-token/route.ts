import { NextRequest, NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAuth } from '@/lib/firebase/admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { idToken } = body as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Phone number is verified by Firebase — trust this, never the client-sent value
  const firebasePhone = decoded.phone_number;
  if (!firebasePhone) {
    return NextResponse.json({ error: 'Token has no phone number' }, { status: 400 });
  }

  // Strip +91 to match our 10-digit storage format
  const phone = firebasePhone.replace(/^\+91/, '');

  const { data: user } = await supabase
    .from('vm_users')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (user) {
    return NextResponse.json({ success: true, isNewUser: false, user });
  }

  return NextResponse.json({ success: true, isNewUser: true, phone });
}

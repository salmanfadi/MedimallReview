import { NextResponse } from 'next/server';
import { getPatients, addPatient } from '@/lib/db';
import { normalizePhone } from '@/lib/phone';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const patients = await getPatients(search);
    return NextResponse.json({ patients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, branch_id, visit_time } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }

    const phoneValidation = normalizePhone(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number' },
        { status: 400 }
      );
    }

    if (!branch_id) {
      return NextResponse.json({ error: 'Branch is required' }, { status: 400 });
    }

    const visitTime = visit_time ? new Date(visit_time).toISOString() : new Date().toISOString();

    const patient = await addPatient({
      name: name.trim(),
      phone: phoneValidation.normalized!,
      branch_id,
      visit_time: visitTime,
    });

    return NextResponse.json({ patient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

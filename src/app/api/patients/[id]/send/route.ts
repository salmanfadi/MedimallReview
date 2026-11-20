import { NextResponse } from 'next/server';
import { markPatientSent } from '@/lib/db';
import { Language } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const language = (body.language || 'en') as Language;

    const updated = await markPatientSent(id, language);
    return NextResponse.json({ patient: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

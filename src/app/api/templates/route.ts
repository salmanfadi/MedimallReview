import { NextResponse } from 'next/server';
import { getTemplates, updateTemplate } from '@/lib/db';
import { Language } from '@/lib/types';

export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ templates });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { language, body: templateBody } = body;

    if (!language || (language !== 'en' && language !== 'ml')) {
      return NextResponse.json(
        { error: 'Valid language ("en" or "ml") is required' },
        { status: 400 }
      );
    }
    if (!templateBody || !templateBody.trim()) {
      return NextResponse.json(
        { error: 'Template body cannot be empty' },
        { status: 400 }
      );
    }

    const updated = await updateTemplate(language as Language, templateBody);
    return NextResponse.json({ template: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

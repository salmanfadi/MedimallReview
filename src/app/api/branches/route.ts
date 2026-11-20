import { NextResponse } from 'next/server';
import { getBranches, addBranch, updateBranch, deleteBranch } from '@/lib/db';

export async function GET() {
  try {
    const branches = await getBranches();
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, review_link } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }
    if (!review_link || !review_link.trim()) {
      return NextResponse.json({ error: 'Google Review link is required' }, { status: 400 });
    }

    const branch = await addBranch(name, review_link);
    return NextResponse.json({ branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, review_link } = body;

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }
    if (!review_link || !review_link.trim()) {
      return NextResponse.json({ error: 'Google Review link is required' }, { status: 400 });
    }

    const branch = await updateBranch(id, name, review_link);
    return NextResponse.json({ branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
    }

    await deleteBranch(id);
    return NextResponse.json({ success: true, message: 'Branch deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

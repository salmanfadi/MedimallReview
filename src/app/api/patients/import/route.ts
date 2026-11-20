import { NextResponse } from 'next/server';
import { getBranches, addPatientsBatch } from '@/lib/db';
import { parseExcelFile } from '@/lib/excel';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Fast path: client already parsed Excel and is sending JSON array of valid rows
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const patients = body.patients;

      if (!Array.isArray(patients) || patients.length === 0) {
        return NextResponse.json(
          { error: 'No patient records provided in payload' },
          { status: 400 }
        );
      }

      const result = await addPatientsBatch(patients);
      return NextResponse.json({
        success: true,
        importedCount: result.count,
        patients: result.patients,
      });
    }

    // Standard path: multipart FormData Excel file upload
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'preview';

    const branches = await getBranches();
    if (branches.length === 0) {
      return NextResponse.json(
        { error: 'No branches configured. Please add branches before uploading patients.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Excel file (.xlsx) is required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const summary = parseExcelFile(buffer, branches);

    if (action === 'commit') {
      if (summary.validRows.length === 0) {
        return NextResponse.json(
          { error: 'No valid rows found to import.', summary },
          { status: 400 }
        );
      }

      const rowsToInsert = summary.validRows.map((r) => ({
        name: r.name,
        phone: r.phone,
        branch_id: r.branch_id!,
        visit_time: r.visit_time,
      }));

      const result = await addPatientsBatch(rowsToInsert);

      return NextResponse.json({
        success: true,
        importedCount: result.count,
        patients: result.patients,
        skippedCount: summary.skippedCount,
        totalRows: summary.totalRows,
        skippedRows: summary.skippedRows,
      });
    }

    // Default: return preview summary
    return NextResponse.json({ summary });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error processing Excel file' },
      { status: 400 }
    );
  }
}

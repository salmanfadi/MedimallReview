import { NextResponse } from 'next/server';
import { getPatients } from '@/lib/db';
import { exportPatientsToExcel } from '@/lib/excel';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const patients = await getPatients(search);
    const excelBytes = exportPatientsToExcel(patients);

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `medimall_patients_${dateStr}.xlsx`;

    return new NextResponse(Buffer.from(excelBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

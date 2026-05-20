import { NextResponse } from 'next/server';

export async function GET() {
  const currentDate = new Date();
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  const epfDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
  const esiDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15);
  const ptDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
  const tdsDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 7);

  const reminders = [
    { id: '1', title: 'EPF Contribution Filing', dueDate: epfDate.toISOString(), type: 'Central PF', isCritical: true },
    { id: '2', title: 'ESI Contribution Filing', dueDate: esiDate.toISOString(), type: 'Central Insurance', isCritical: true },
    { id: '3', title: 'Professional Tax (PT)', dueDate: ptDate.toISOString(), type: 'State Govt', isCritical: false },
    { id: '4', title: 'TDS Payment & Challan', dueDate: tdsDate.toISOString(), type: 'Income Tax', isCritical: true }
  ];

  return NextResponse.json({ success: true, reminders });
}

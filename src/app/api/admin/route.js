// This file intentionally left as a redirect
import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.redirect(new URL('/api/admin/users', 'https://grid-ledger.com'));
}

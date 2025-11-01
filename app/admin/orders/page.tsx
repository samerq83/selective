'use client';

import { Suspense } from 'react';
import AdminOrdersContent from './AdminOrdersContent';
import AdminNavbar from '@/components/AdminNavbar';

function AdminOrdersLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="spinner"></div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<AdminOrdersLoader />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
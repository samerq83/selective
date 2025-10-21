import { Suspense } from 'react';
import AdminOrdersContent from './AdminOrdersContent';
import Navbar from '@/components/Navbar';

function AdminOrdersLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
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
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FaCalendar, FaDownload, FaChartLine, FaUsers, FaBox } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx-js-style';

interface ReportData {
  dailyOrders: Array<{ date: string; count: number; items: number }>;
  topProducts: Array<{ name: string; quantity: number; orders: number }>;
  topCustomers: Array<{ name: string; phone: string; orders: number; items: number }>;
  statusDistribution: Array<{ name: string; value: number }>;
  customerProductMatrix: Array<{
    _id: {
      customerId: string;
      customerName: string;
      productId: string;
      productNameEn: string;
      productNameAr: string;
    };
    quantity: number;
  }>;
  summary: {
    totalOrders: number;
    totalItems: number;
    totalCustomers: number;
    newCustomers: number;
    averageOrderSize: number;
  };
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user && !user.isAdmin) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (user && user.isAdmin && startDate && endDate) {
      fetchReportData();
    }
  }, [user, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const res = await fetch(`/api/admin/reports?${params}`);
      const data = await res.json();

      if (res.ok) {
        setReportData(data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Define color styles matching the screenshot
    const productColors: { [key: string]: string } = {
      'Almond Milk': 'FF6B4E',
      'حليب اللوز': 'FF6B4E',
      'Coconut Milk': '4CAF50',
      'حليب جوز الهند': '4CAF50',
      'Lactose Free Milk': '5B9BD5',
      'حليب خالي من اللاكتوز': '5B9BD5',
      'Oat Milk': 'A9A9A9',
      'حليب الشوفان': 'A9A9A9',
      'Soy Milk': 'FFEB3B',
      'حليب الصويا': 'FFEB3B',
      'coco': 'FFEB3B',
    };

    // Helper function to set column widths
    const setColumnWidths = (sheet: any, widths: number[]) => {
      sheet['!cols'] = widths.map(w => ({ wch: w }));
    };

    // Customer-Product Matrix Sheet (Main Report)
    // Get unique products and customers
    const products = Array.from(
      new Set(
        reportData.customerProductMatrix.map(item => 
          language === 'ar' ? item._id.productNameAr : item._id.productNameEn
        )
      )
    ).sort();

    const customers = Array.from(
      new Set(
        reportData.customerProductMatrix.map(item => item._id.customerName || t('noName', language))
      )
    ).sort();

    // Create matrix data structure
    const matrixData: { [customer: string]: { [product: string]: number } } = {};
    
    reportData.customerProductMatrix.forEach(item => {
      const customerName = item._id.customerName || t('noName', language);
      const productName = language === 'ar' ? item._id.productNameAr : item._id.productNameEn;
      
      if (!matrixData[customerName]) {
        matrixData[customerName] = {};
      }
      matrixData[customerName][productName] = item.quantity;
    });

    // Build Excel data with styling
    const matrixSheet: any = {};
    
    // Header row with product colors
    products.forEach((product, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      const bgColor = productColors[product] || 'CCCCCC';
      matrixSheet[cellRef] = {
        v: product,
        t: 's',
        s: {
          fill: { fgColor: { rgb: bgColor } },
          font: { bold: true, color: { rgb: '000000' }, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      };
    });

    // Customer header (last column)
    const customerColIdx = products.length;
    const customerHeaderRef = XLSX.utils.encode_cell({ r: 0, c: customerColIdx });
    matrixSheet[customerHeaderRef] = {
      v: t('customer', language),
      t: 's',
      s: {
        fill: { fgColor: { rgb: 'B4C7E7' } },
        font: { bold: true, color: { rgb: '000000' }, sz: 12 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    };

    // Customer data rows
    customers.forEach((customer, rowIdx) => {
      const actualRow = rowIdx + 1;
      
      // Product quantities
      products.forEach((product, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: actualRow, c: colIdx });
        const value = matrixData[customer]?.[product] || 0;
        matrixSheet[cellRef] = {
          v: value,
          t: 'n',
          s: {
            fill: { fgColor: { rgb: 'FFFF00' } }, // Yellow background
            font: { color: { rgb: '000000' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          }
        };
      });

      // Customer name
      const customerCellRef = XLSX.utils.encode_cell({ r: actualRow, c: customerColIdx });
      matrixSheet[customerCellRef] = {
        v: customer,
        t: 's',
        s: {
          fill: { fgColor: { rgb: 'B4C7E7' } }, // Light blue background
          font: { color: { rgb: '000000' }, sz: 11 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      };
    });

    // Empty row
    const emptyRowIdx = customers.length + 1;

    // Total label row
    const totalLabelRowIdx = emptyRowIdx + 1;
    products.forEach((product, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: totalLabelRowIdx, c: colIdx });
      matrixSheet[cellRef] = {
        v: language === 'ar' ? 'اجمالي' : 'Total',
        t: 's',
        s: {
          fill: { fgColor: { rgb: 'C65D57' } }, // Red/brown background
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      };
    });

    // Grand Total label
    const grandTotalLabelRef = XLSX.utils.encode_cell({ r: totalLabelRowIdx, c: customerColIdx });
    matrixSheet[grandTotalLabelRef] = {
      v: language === 'ar' ? 'اجمالي جميع الأصناف' : 'Grand Total',
      t: 's',
      s: {
        fill: { fgColor: { rgb: 'B4C7E7' } },
        font: { bold: true, color: { rgb: '000000' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    };

    // Total values row
    const totalValuesRowIdx = totalLabelRowIdx + 1;
    let grandTotal = 0;
    
    products.forEach((product, colIdx) => {
      const total = customers.reduce((sum, customer) => {
        return sum + (matrixData[customer]?.[product] || 0);
      }, 0);
      grandTotal += total;
      
      const cellRef = XLSX.utils.encode_cell({ r: totalValuesRowIdx, c: colIdx });
      matrixSheet[cellRef] = {
        v: total,
        t: 'n',
        s: {
          fill: { fgColor: { rgb: 'FFFFFF' } },
          font: { bold: true, color: { rgb: 'FF0000' }, sz: 11 }, // Red text
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        }
      };
    });

    // Grand Total value
    const grandTotalValueRef = XLSX.utils.encode_cell({ r: totalValuesRowIdx, c: customerColIdx });
    matrixSheet[grandTotalValueRef] = {
      v: grandTotal,
      t: 'n',
      s: {
        fill: { fgColor: { rgb: 'B4C7E7' } },
        font: { bold: true, color: { rgb: '000000' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }
    };

    // Set sheet range
    matrixSheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalValuesRowIdx, c: customerColIdx }
    });

    // Set column widths
    const colWidths = products.map(() => 15);
    colWidths.push(30); // Customer column
    setColumnWidths(matrixSheet, colWidths);
    
    XLSX.utils.book_append_sheet(wb, matrixSheet, language === 'ar' ? 'تقرير المنتجات' : 'Products Report');

    // Summary Sheet
    const summaryData = [
      [t('summary', language), ''],
      [t('totalOrders', language), reportData.summary.totalOrders],
      [t('totalItems', language), reportData.summary.totalItems],
      [t('totalCustomers', language), reportData.summary.totalCustomers],
      [t('newCustomers', language), reportData.summary.newCustomers],
      [t('averageOrderSize', language), reportData.summary.averageOrderSize.toFixed(2)],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    setColumnWidths(summarySheet, [30, 20]);
    XLSX.utils.book_append_sheet(wb, summarySheet, t('summary', language));

    // Daily Orders Sheet
    const dailyOrdersData = [
      [t('date', language), t('orders', language), t('items', language)],
      ...reportData.dailyOrders.map(d => [d.date, d.count, d.items]),
    ];
    const dailySheet = XLSX.utils.aoa_to_sheet(dailyOrdersData);
    setColumnWidths(dailySheet, [20, 15, 15]);
    XLSX.utils.book_append_sheet(wb, dailySheet, t('dailyOrders', language));

    // Export
    XLSX.writeFile(wb, `report_${startDate}_to_${endDate}.xlsx`);
  };

  const COLORS = ['#DC2626', '#EF4444', '#F87171', '#FCA5A5'];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin || !reportData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <h1 className="text-3xl font-bold text-primary-black mb-2">
              {t('reports', language)}
            </h1>
            <p className="text-gray-600">
              {t('reportsDescription', language)}
            </p>
          </div>
          
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
          >
            <FaDownload className="mr-2" />
            {t('exportExcel', language)}
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaCalendar className="inline mr-2" />
                {t('startDate', language)}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field px-4"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaCalendar className="inline mr-2" />
                {t('endDate', language)}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input-field px-4"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t('totalOrders', language)}</p>
                <p className="text-3xl font-bold mt-2">{reportData.summary.totalOrders}</p>
              </div>
              <FaBox className="text-4xl opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t('totalItems', language)}</p>
                <p className="text-3xl font-bold mt-2">{reportData.summary.totalItems}</p>
              </div>
              <FaChartLine className="text-4xl opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t('totalCustomers', language)}</p>
                <p className="text-3xl font-bold mt-2">{reportData.summary.totalCustomers}</p>
              </div>
              <FaUsers className="text-4xl opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t('newCustomers', language)}</p>
                <p className="text-3xl font-bold mt-2">{reportData.summary.newCustomers}</p>
              </div>
              <FaUsers className="text-4xl opacity-50" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t('averageOrderSize', language)}</p>
                <p className="text-3xl font-bold mt-2">{reportData.summary.averageOrderSize.toFixed(1)}</p>
              </div>
              <FaChartLine className="text-4xl opacity-50" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Orders Chart */}
          <div className="card">
            <h3 className="text-xl font-bold text-primary-black mb-4">
              {t('dailyOrdersTrend', language)}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.dailyOrders}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#DC2626" name={t('orders', language)} strokeWidth={2} />
                <Line type="monotone" dataKey="items" stroke="#3B82F6" name={t('items', language)} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status Distribution */}
          <div className="card">
            <h3 className="text-xl font-bold text-primary-black mb-4">
              {t('orderStatusDistribution', language)}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reportData.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Products */}
          <div className="card">
            <h3 className="text-xl font-bold text-primary-black mb-4">
              {t('topProducts', language)}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#DC2626" name={t('quantity', language)} />
                <Bar dataKey="orders" fill="#3B82F6" name={t('orders', language)} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers */}
          <div className="card">
            <h3 className="text-xl font-bold text-primary-black mb-4">
              {t('topCustomers', language)}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t('name', language)}</th>
                    <th className="text-left py-2">{t('phone', language)}</th>
                    <th className="text-center py-2">{t('orders', language)}</th>
                    <th className="text-center py-2">{t('items', language)}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.topCustomers.map((customer, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3">{customer.name || t('noName', language)}</td>
                      <td className="py-3">{customer.phone}</td>
                      <td className="py-3 text-center font-semibold">{customer.orders}</td>
                      <td className="py-3 text-center font-semibold">{customer.items}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

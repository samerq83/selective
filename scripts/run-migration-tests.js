#!/usr/bin/env node

/**
 * سكريپت تشغيل اختبارات الترحيل - Run Migration Tests
 * 
 * هذا السكريپت يقوم بـ:
 * - تشغيل جميع اختبارات الترحيل
 * - إنشاء تقارير مفصلة
 * - التحقق من صحة النظام بعد الترحيل
 * - إنشاء ملفات سجل للمراجعة
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execPromise = util.promisify(exec);

// إعداد الألوان للطرفية
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * طباعة رسالة ملونة
 */
function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * إنشاء عنوان قسم
 */
function sectionHeader(title) {
  const separator = '='.repeat(60);
  colorLog(`\n${separator}`, 'cyan');
  colorLog(`🎯 ${title}`, 'bright');
  colorLog(separator, 'cyan');
}

/**
 * تشغيل اختبارات الترحيل
 */
async function runMigrationTests() {
  sectionHeader('بدء تشغيل اختبارات الترحيل - Starting Migration Tests');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    results: {},
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      duration: 0
    },
    details: []
  };

  const startTime = Date.now();

  try {
    // قائمة ملفات الاختبار
    const testFiles = [
      'data-migration.test.js',
      'database-operations.test.js',
      'migration-integration.test.js'
    ];

    colorLog('\n📋 ملفات الاختبار المحددة:', 'yellow');
    testFiles.forEach(file => {
      colorLog(`   ✓ ${file}`, 'green');
    });

    // تشغيل كل ملف اختبار
    for (const testFile of testFiles) {
      colorLog(`\n🧪 تشغيل: ${testFile}`, 'blue');
      
      try {
        const testPath = path.join(__dirname, '..', '__tests__', 'scripts', testFile);
        
        // التحقق من وجود الملف
        if (!fs.existsSync(testPath)) {
          colorLog(`   ❌ الملف غير موجود: ${testFile}`, 'red');
          testResults.results[testFile] = {
            status: 'failed',
            error: 'File not found'
          };
          continue;
        }

        // تشغيل الاختبار
        const command = `npm test -- --testPathPatterns=${testFile}`;
        const { stdout, stderr } = await execPromise(command);
        
        colorLog(`   ✅ نجح: ${testFile}`, 'green');
        testResults.results[testFile] = {
          status: 'passed',
          output: stdout,
          stderr: stderr
        };
        testResults.summary.passedTests++;

      } catch (error) {
        colorLog(`   ❌ فشل: ${testFile}`, 'red');
        colorLog(`   خطأ: ${error.message}`, 'red');
        
        testResults.results[testFile] = {
          status: 'failed',
          error: error.message,
          stderr: error.stderr
        };
        testResults.summary.failedTests++;
      }
    }

    testResults.summary.totalTests = testFiles.length;
    testResults.summary.duration = Date.now() - startTime;

    // إنشاء تقرير مفصل
    await generateTestReport(testResults);
    
    // عرض الملخص النهائي
    displayTestSummary(testResults);

    return testResults;

  } catch (error) {
    colorLog(`❌ خطأ عام في تشغيل الاختبارات: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * إنشاء تقرير الاختبار
 */
async function generateTestReport(testResults) {
  try {
    const reportDir = path.join(__dirname, '..', 'reports');
    
    // إنشاء مجلد التقارير إذا لم يكن موجوداً
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // تقرير JSON مفصل
    const jsonReportPath = path.join(reportDir, `migration-tests-${Date.now()}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(testResults, null, 2));

    // تقرير نصي مقروء
    const textReportPath = path.join(reportDir, `migration-tests-${Date.now()}.txt`);
    const textReport = generateTextReport(testResults);
    fs.writeFileSync(textReportPath, textReport, 'utf-8');

    colorLog(`\n📊 تم إنشاء التقارير:`, 'cyan');
    colorLog(`   📄 JSON: ${path.basename(jsonReportPath)}`, 'green');
    colorLog(`   📝 Text: ${path.basename(textReportPath)}`, 'green');

  } catch (error) {
    colorLog(`❌ خطأ في إنشاء التقرير: ${error.message}`, 'red');
  }
}

/**
 * إنشاء تقرير نصي
 */
function generateTextReport(testResults) {
  const { timestamp, summary, results } = testResults;
  
  let report = '';
  report += '=' * 80 + '\n';
  report += '          تقرير اختبارات ترحيل البيانات - Migration Tests Report\n';
  report += '=' * 80 + '\n\n';
  
  report += `التاريخ والوقت: ${new Date(timestamp).toLocaleString('ar-SA')}\n`;
  report += `المدة الإجمالية: ${(summary.duration / 1000).toFixed(2)} ثانية\n\n`;
  
  report += 'الملخص:\n';
  report += '-'.repeat(40) + '\n';
  report += `إجمالي الاختبارات: ${summary.totalTests}\n`;
  report += `اختبارات ناجحة: ${summary.passedTests}\n`;
  report += `اختبارات فاشلة: ${summary.failedTests}\n`;
  report += `معدل النجاح: ${(summary.passedTests / summary.totalTests * 100).toFixed(1)}%\n\n`;
  
  report += 'تفاصيل الاختبارات:\n';
  report += '-'.repeat(40) + '\n';
  
  Object.entries(results).forEach(([testFile, result]) => {
    report += `\n📂 ${testFile}\n`;
    report += `   الحالة: ${result.status === 'passed' ? '✅ نجح' : '❌ فشل'}\n`;
    
    if (result.error) {
      report += `   الخطأ: ${result.error}\n`;
    }
    
    if (result.stderr) {
      report += `   تفاصيل الخطأ: ${result.stderr}\n`;
    }
  });
  
  report += '\n' + '='.repeat(80) + '\n';
  report += 'انتهى التقرير\n';
  
  return report;
}

/**
 * عرض ملخص الاختبارات
 */
function displayTestSummary(testResults) {
  sectionHeader('ملخص نتائج الاختبارات - Test Results Summary');
  
  const { summary, results } = testResults;
  
  colorLog(`\n📊 الإحصائيات العامة:`, 'bright');
  colorLog(`   🎯 إجمالي الاختبارات: ${summary.totalTests}`, 'blue');
  colorLog(`   ✅ اختبارات ناجحة: ${summary.passedTests}`, 'green');
  colorLog(`   ❌ اختبارات فاشلة: ${summary.failedTests}`, 'red');
  colorLog(`   ⏱️  المدة: ${(summary.duration / 1000).toFixed(2)} ثانية`, 'cyan');
  
  const successRate = (summary.passedTests / summary.totalTests * 100).toFixed(1);
  const successColor = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
  colorLog(`   📈 معدل النجاح: ${successRate}%`, successColor);

  colorLog(`\n📂 تفاصيل كل اختبار:`, 'bright');
  Object.entries(results).forEach(([testFile, result]) => {
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const statusColor = result.status === 'passed' ? 'green' : 'red';
    colorLog(`   ${statusIcon} ${testFile}`, statusColor);
    
    if (result.error) {
      colorLog(`      🚫 ${result.error}`, 'red');
    }
  });

  // توصيات على أساس النتائج
  colorLog(`\n💡 التوصيات:`, 'bright');
  if (summary.failedTests === 0) {
    colorLog('   🎉 ممتاز! جميع الاختبارات نجحت. النظام جاهز للاستخدام.', 'green');
  } else if (summary.failedTests <= 2) {
    colorLog('   ⚠️  هناك بعض الأخطاء البسيطة. راجع التفاصيل وأصلحها.', 'yellow');
  } else {
    colorLog('   🚨 عدة اختبارات فشلت. راجع النظام قبل الاستخدام.', 'red');
  }
}

/**
 * فحص البيئة قبل الاختبار
 */
async function checkEnvironment() {
  sectionHeader('فحص البيئة - Environment Check');
  
  const checks = [];
  
  // فحص Node.js
  checks.push({
    name: 'Node.js Version',
    check: () => process.version,
    expected: 'v14+',
    status: 'info'
  });
  
  // فحص npm
  try {
    const { stdout } = await execPromise('npm --version');
    checks.push({
      name: 'npm Version',
      check: () => stdout.trim(),
      status: 'success'
    });
  } catch (error) {
    checks.push({
      name: 'npm Version',
      error: error.message,
      status: 'error'
    });
  }
  
  // فحص Jest
  try {
    const jestPath = path.join(__dirname, '..', 'node_modules', '.bin', 'jest');
    if (fs.existsSync(jestPath)) {
      checks.push({
        name: 'Jest Installation',
        check: () => 'Installed',
        status: 'success'
      });
    } else {
      checks.push({
        name: 'Jest Installation',
        error: 'Not found',
        status: 'error'
      });
    }
  } catch (error) {
    checks.push({
      name: 'Jest Installation',
      error: error.message,
      status: 'error'
    });
  }
  
  // عرض نتائج الفحص
  colorLog('\n🔍 نتائج فحص البيئة:', 'bright');
  checks.forEach(check => {
    if (check.status === 'success') {
      colorLog(`   ✅ ${check.name}: ${check.check ? check.check() : 'OK'}`, 'green');
    } else if (check.status === 'error') {
      colorLog(`   ❌ ${check.name}: ${check.error}`, 'red');
    } else {
      colorLog(`   ℹ️  ${check.name}: ${check.check ? check.check() : 'Info'}`, 'blue');
    }
  });
  
  const hasErrors = checks.some(check => check.status === 'error');
  if (hasErrors) {
    colorLog('\n⚠️  يرجى حل مشاكل البيئة قبل تشغيل الاختبارات.', 'yellow');
    return false;
  }
  
  return true;
}

/**
 * تنظيف ملفات الاختبار المؤقتة
 */
function cleanupTestFiles() {
  try {
    const tempFiles = [
      path.join(__dirname, '..', 'data', 'test-db.json'),
      path.join(__dirname, '..', 'data', 'migration-test-backup.json')
    ];
    
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        colorLog(`🗑️  تم حذف: ${path.basename(file)}`, 'yellow');
      }
    });
  } catch (error) {
    colorLog(`❌ خطأ في التنظيف: ${error.message}`, 'red');
  }
}

/**
 * الوظيفة الرئيسية
 */
async function main() {
  colorLog('\n🚀 بدء تشغيل اختبارات ترحيل البيانات', 'bright');
  colorLog('Selective Trading - Data Migration Tests\n', 'cyan');
  
  try {
    // فحص البيئة
    const environmentOk = await checkEnvironment();
    if (!environmentOk) {
      process.exit(1);
    }
    
    // تنظيف الملفات المؤقتة
    cleanupTestFiles();
    
    // تشغيل الاختبارات
    const testResults = await runMigrationTests();
    
    // تحديد رمز الخروج
    const exitCode = testResults.summary.failedTests > 0 ? 1 : 0;
    
    if (exitCode === 0) {
      colorLog('\n🎉 جميع الاختبارات نجحت! النظام جاهز للاستخدام.', 'green');
    } else {
      colorLog('\n💥 بعض الاختبارات فشلت. راجع التقارير للتفاصيل.', 'red');
    }
    
    process.exit(exitCode);
    
  } catch (error) {
    colorLog(`\n💥 خطأ فادح: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  }
}

// تشغيل السكريپت إذا تم استدعاؤه مباشرة
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigrationTests,
  checkEnvironment,
  generateTestReport,
  displayTestSummary
};
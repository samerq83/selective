# Repository Information

## Project Structure
- **Framework**: Next.js 14.2.33 with TypeScript
- **Testing Framework**: Playwright
- **Language**: TypeScript (100% TS codebase)
- **Database**: MongoDB
- **UI Components**: React with Tailwind CSS

## Key Directories
- `/app` - Next.js app directory with routes
- `/app/api` - API endpoints
- `/app/dashboard` - Customer dashboard pages
- `/app/admin` - Admin panel pages
- `/components` - Reusable React components
- `/lib` - Utility functions and helpers
- `/models` - MongoDB models/schemas
- `/contexts` - React Context providers (AuthContext, LanguageContext)
- `/public` - Static assets

## Important Technical Details

### Order Management
- Orders support multiple items with mixed unit types (cartons and pieces)
- Each OrderItem has a `selectedUnitType` field ('carton' | 'piece')
- The Order API (GET /api/orders) returns formatted orders with proper unit type handling
- Fallback to 'piece' for legacy orders without selectedUnitType

### Interfaces with selectedUnitType
Files that define OrderItem interface with `selectedUnitType` field:
- `/app/dashboard/page.tsx` - Dashboard with reorder modal
- `/app/dashboard/orders/page.tsx` - Orders list page
- `/app/dashboard/orders/[id]/page.tsx` - Order detail page
- `/app/dashboard/quick-order/page.tsx` - Quick order page

### Authentication
- Uses email-based verification (4-digit codes)
- AuthContext manages user state
- Cookie-based sessions for server-side verification
- Role-based access (admin vs customer)

### Internationalization (i18n)
- Bilingual support: English (en) and Arabic (ar)
- LanguageContext manages language selection
- Translations stored in `/lib/translations.ts`
- Direction changes based on language (LTR for English, RTL for Arabic)

### Product Management
- Products have name in both English and Arabic
- Products have availability status
- Support for images and descriptions

## Translation Keys Used
- `pieces` - "pieces" (English) / "قطعة" (Arabic)
- `carton` - "carton" (English) / "كرتون" (Arabic)
- Unit types properly localized throughout the UI

## Admin Dashboard Product Analysis Fix (Nov 2024)

### Issue
Product names were displaying in Arabic even when viewing the Admin Dashboard in English, causing UI language mismatch.

### Root Cause
The `/api/admin/stats` endpoint was not aware of the user's language preference, so the backend always selected Arabic product names first.

### Solution Implemented
**1. Frontend Changes (`/app/admin/page.tsx`)**
- Added `language` parameter to the stats API URL: `?lang=${language}`
- Added `language` to the useEffect dependency array to refetch data when language changes

**2. API Changes (`/app/api/admin/stats/route.ts`)**
- Extract `lang` parameter from query string: `const lang = searchParams.get('lang') || 'en'`
- Pass language preference to backend function

**3. Backend Changes (`/lib/admin-mongodb.ts`)**
- Modified `getAdminStatsFromMongoDB()` to accept `language` parameter
- Updated product name extraction logic to prefer the selected language:
  - If `language === 'ar'`: prioritize Arabic names, fallback to English
  - If `language === 'en'`: prioritize English names, fallback to Arabic
- Handles three product name formats:
  - Nested objects: `product.name.ar`/`product.name.en`
  - Flat properties: `product.nameAr`/`product.nameEn`
  - Order item fallback: `item.productName`

### Result
✅ Admin dashboard now displays product names in the correct language matching UI language
✅ Chart updates automatically when user switches languages
✅ Gracefully handles missing product data by filtering out "Unknown" entries

## File Storage Migration to MongoDB (Nov 2024)

### Problem
Netlify doesn't allow permanent file writes to the filesystem. Files written during API calls disappear on server restart or redeployment, causing `ERR_CONNECTION_CLOSED` errors when uploading purchase order files.

### Solution Implemented
**1. Data Model Changes (`/models/Order.ts`)**
- Extended `purchaseOrderFile` object with new fields:
  - `contentType?: string` - MIME type of the file (e.g., application/pdf)
  - `data?: string` - Base64 encoded binary file data
  - `uploadedAt?: Date` - Timestamp of file upload
- Kept `path?: string` as optional for backward compatibility with existing data

**2. API Changes (`/app/api/orders/route.ts`)**
- Removed filesystem operations (writeFile, mkdir, path imports)
- Modified file handling to convert uploaded files to Base64
- Store file data directly in MongoDB document instead of filesystem
- Files are persisted with order data in MongoDB

**3. New Download Endpoint (`/app/api/orders/download-file/route.ts`)**
- GET `/api/orders/download-file?orderId=<ORDER_ID>`
- Retrieves file from MongoDB
- Decodes Base64 data to binary
- Returns file with proper MIME type and attachment headers
- Includes authorization checks (user or admin only)
- Handles missing files gracefully

### Technical Details
- Files are Base64 encoded for MongoDB compatibility
- Binary data preserved exactly through encode/decode cycle
- No file system access required - works on Netlify
- Backward compatible with existing orders (optional fields)

### Result
✅ File uploads now work on Netlify without ERR_CONNECTION_CLOSED
✅ Files persist permanently in MongoDB with order data
✅ No temporary file cleanup issues
✅ Full backward compatibility with existing data
✅ Proper Content-Type headers for file downloads

## Admin Download Button Fix (Nov 2024)

### Issue
The "Download" button for purchase order files on the admin order details page (`/admin/orders/[id]`) was broken. It tried to download from the old filesystem path that no longer existed after the MongoDB migration.

### Root Cause
The download button code was still using the old approach:
```javascript
link.href = order.purchaseOrderFile.path;  // ❌ Path no longer exists
```

After the MongoDB migration, files are stored as Base64 data in `purchaseOrderFile.data`, and must be downloaded via the dedicated API endpoint.

### Solution Implemented
**Updated `/app/admin/orders/[id]/page.tsx`** (line 373-388)
- Changed from: `link.href = order.purchaseOrderFile.path`
- Changed to: `window.location.href = /api/orders/download-file?orderId=${order._id}`
- Uses the new MongoDB-aware download API endpoint

### Technical Details
- The `/api/orders/download-file` endpoint:
  - Accepts orderId as query parameter
  - Retrieves file from MongoDB
  - Decodes Base64 data back to binary
  - Returns file with proper MIME type headers
  - Includes authorization checks

### Testing
✅ Created E2E tests at `tests/e2e/admin-download-purchase-order.spec.ts`
✅ All 15 Playwright tests passing:
  - Button visibility and functionality tests
  - API endpoint validation tests
  - Error handling tests (missing/invalid orderId)
  - Download trigger verification

### Result
✅ Admin download button now works correctly
✅ Files download properly from MongoDB storage
✅ Full backward compatibility with new API endpoint
✅ Comprehensive E2E test coverage
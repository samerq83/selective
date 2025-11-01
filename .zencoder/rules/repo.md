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
# MahaCSR Portal Navigation Guide

## Overview
The MahaCSR portal has been redesigned with a professional government-style interface. All pages now use the new design system with consistent navigation and layout.

## 🎯 Main Entry Points

### For NGO Users
- **Login:** `http://localhost:3000/login`
- **Dashboard:** `http://localhost:3000/dashboard`
- **Onboarding:** `http://localhost:3000/onboarding`

### For Admin Users
- **Login:** `http://localhost:3000/login`
- **Admin Dashboard:** `http://localhost:3000/admin/dashboard`
- **Applications List:** `http://localhost:3000/admin/applications`
- **Review Application:** `http://localhost:3000/admin/applications/CSR-NGO-2026-00128`

### Legacy Routes (Auto-Redirect)
- `/admin` → Redirects to `/admin/dashboard`
- `/ngo-dashboard` → Redirects to `/dashboard`

## 📋 Complete Route Structure

### Public Routes
```
/                          → Home page
/login                     → Login page
/register                  → Registration page
/about                     → About page
/contact                   → Contact page
/faqs                      → FAQs page
```

### NGO Routes (Requires NGO_ADMIN or NGO_MEMBER role)
```
/dashboard                 → Unified NGO dashboard with module cards
/onboarding                → 9-step NGO onboarding wizard
/onboarding/status         → Application status tracking
/onboarding/documents      → Document upload and management
/queries                   → View and respond to reviewer queries
/csr-projects              → Manage CSR project proposals
/marketplace               → Browse CSR funding opportunities
```

### Admin Routes (Requires PORTAL_ADMIN or SUPER_ADMIN role)
```
/admin/dashboard           → Admin KPI dashboard
/admin/applications        → List of all NGO applications
/admin/applications/[id]   → Review specific application
/admin/document-review     → Document verification queue
/admin/risk-review         → Risk assessment and flags
/admin/approval-queue      → Final approval queue
/admin/users-roles         → User and role management
```

### Company Routes (Requires COMPANY_ADMIN or COMPANY_MEMBER role)
```
/company-dashboard         → Company dashboard
/marketplace               → Browse NGO projects
/chat                      → Communication with NGOs
```

## 🎨 New Government Design System

### Visual Changes
- **Colors:** Navy blue (#12325a) primary, Saffron (#d97706) accent
- **Typography:** Noto Sans font family
- **Layout:** Structured government-style cards and forms
- **Components:** Official badges, status indicators, structured tables

### Key Components
- `GovPortalLayout` - Main layout with header, sidebar, navigation
- `GovCard` - Structured card component
- `GovButton` - Government-styled buttons
- `GovInput` - Form input fields
- `GovStatusBadge` - Status indicators
- `GovAlert` - Alert messages

## 🚀 How to Navigate

### From Dashboard
1. Log in at `/login`
2. You'll be redirected to `/dashboard` (NGO) or `/admin/dashboard` (Admin)
3. Click on module cards to access different features:
   - **NGO Onboarding** → `/onboarding`
   - **Applications** (Admin) → `/admin/applications`
   - **Documents** → `/onboarding/documents`
   - etc.

### From Sidebar
The left sidebar provides quick access to all modules based on your role:
- **NGO Users:** Onboarding, Projects, Documents, Marketplace
- **Admin Users:** Dashboard, Applications, Document Review, Risk Review, Approvals

### From Header
- **Search:** Global search (top right)
- **Notifications:** Bell icon (top right)
- **Profile:** User avatar dropdown with Account and Logout options

## 📱 Module Details

### NGO Onboarding (`/onboarding`)
**9-Step Wizard:**
1. Welcome & Instructions
2. Organization Details
3. Legal & Statutory Information
4. Governance Structure
5. Financial Information
6. Experience & Impact
7. Document Upload
8. Declarations & Consent
9. Review & Submit

**Features:**
- Auto-save as draft
- Step-by-step validation
- Document upload with preview
- Conditional document requirements
- Progress tracking

### Admin Applications (`/admin/applications`)
**Features:**
- Search by NGO name or Application ID
- Filter by status
- View application details
- Risk level indicators
- Quick actions (Review, Approve, Reject)

### Application Review (`/admin/applications/[id]`)
**Sections:**
- Application Overview
- Organization Details
- Document Verification
- Risk Assessment
- Verification Checks
- Query Management
- Approval Actions

## 🔐 Authentication & Authorization

### User Roles
- `SUPER_ADMIN` - Full system access
- `PORTAL_ADMIN` - Admin dashboard and verification
- `CSR_ADMIN` - CSR-specific admin functions
- `NGO_ADMIN` - NGO organization admin
- `NGO_MEMBER` - NGO team member
- `COMPANY_ADMIN` - Company organization admin
- `COMPANY_MEMBER` - Company team member

### Protected Routes
All dashboard and module routes require authentication. Unauthenticated users are redirected to `/login`.

## 🛠️ Development URLs

### Frontend (Next.js)
```
http://localhost:3000
```

### Backend (Express API)
```
http://localhost:5000
```

### API Endpoints
```
POST /api/auth/login
POST /api/auth/register
GET  /api/onboarding/application
POST /api/onboarding/application
PUT  /api/onboarding/application/:id
GET  /api/admin/applications
GET  /api/admin/applications/:id
```

## 📊 Database Migration Status

The database schema has been synced using:
```bash
cd backend
npx prisma db push
```

This adds all missing columns including `NGO.displayName` and other onboarding fields.

## 🎯 Quick Start Checklist

1. ✅ Backend server running on port 5000
2. ✅ Frontend server running on port 3000
3. ✅ Database schema synced with Prisma
4. ✅ Redis connected (optional, for caching)
5. ✅ Environment variables configured

## 📝 Testing the New UI

### Test NGO Flow
1. Go to `http://localhost:3000/login`
2. Login with NGO credentials
3. You'll see the new government-styled dashboard
4. Click "NGO Onboarding" card
5. Complete the 9-step wizard
6. Submit application

### Test Admin Flow
1. Go to `http://localhost:3000/login`
2. Login with admin credentials
3. You'll see the admin dashboard with KPIs
4. Click "Applications" in sidebar
5. Click on an application to review
6. Verify documents, assess risk, approve/reject

## 🔄 Migration from Old UI

The old SaaS-style UI has been replaced with government-style components:
- Old: Modern cards with shadows and gradients
- New: Structured government cards with borders
- Old: Colorful badges and buttons
- New: Official navy/saffron color scheme
- Old: Sans-serif fonts
- New: Noto Sans (government standard)

All existing routes now redirect to the new government-styled pages.

## 📞 Support

For issues or questions:
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Check `DATABASE_FIX_SUMMARY.md` for database issues
- Check `QUICK_START_GUIDE.md` for setup instructions
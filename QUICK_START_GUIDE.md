# Quick Start Guide - New Government Design System

## 🎯 How to See the New Government Design

The new government-style design system has been implemented on **NEW pages**. The existing dashboard pages still use the old SaaSLayout.

### ✅ NEW Pages with Government Design (Ready to View)

1. **NGO Onboarding Wizard**
   - URL: http://localhost:3000/onboarding
   - Features: 9-step wizard, conditional documents, form validation
   - Status: ✅ Fully functional

2. **Admin Dashboard**
   - URL: http://localhost:3000/admin/dashboard
   - Features: KPIs, recent applications, pending actions
   - Status: ✅ Fully functional

3. **Application Review Page**
   - URL: http://localhost:3000/admin/applications/CSR-NGO-2026-00128
   - Features: Document verification, risk scoring, decision panel
   - Status: ✅ Fully functional

### 📋 Steps to View New Design

1. **Start the development server** (if not already running):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open your browser** and navigate to:
   - http://localhost:3000/onboarding

3. **You will see**:
   - Government-style top strip with accessibility controls
   - Official navy header with emblem
   - Sidebar navigation
   - Professional form layouts
   - Noto Sans typography
   - Navy/saffron color scheme

### 🔄 Existing Pages (Still Using Old Design)

These pages still use the old SaaSLayout and need to be migrated:
- `/` - Home page
- `/ngo-dashboard` - NGO Dashboard
- `/company-dashboard` - Company Dashboard
- `/government-portal` - Government Portal
- `/admin` - Old admin page

### 🚀 Next Steps to Apply Design Everywhere

To apply the new government design to existing pages, you need to:

1. **Replace SaaSLayout with GovPortalLayout** in each page
2. **Update component imports** to use new Gov components
3. **Update styling** to use gov-theme.css classes

Example transformation:
```tsx
// OLD
import SaaSLayout from "@/components/SaaSLayout";

export default function Page() {
  return (
    <div>Content</div>
  );
}

// NEW
import GovPortalLayout from "@/components/layout/GovPortalLayout";
import GovPageHeader from "@/components/layout/GovPageHeader";

export default function Page() {
  return (
    <GovPortalLayout>
      <GovPageHeader
        title="Page Title"
        description="Page description"
      />
      <div>Content</div>
    </GovPortalLayout>
  );
}
```

### 📁 Files Created

**Design System**:
- `frontend/src/styles/gov-theme.css` - Complete CSS design system
- `frontend/src/types/css.d.ts` - TypeScript CSS declarations

**Layout Components**:
- `frontend/src/components/layout/GovPortalLayout.tsx` - Main layout
- `frontend/src/components/layout/GovPageHeader.tsx` - Page header

**UI Components**:
- `frontend/src/components/gov/GovCard.tsx`
- `frontend/src/components/gov/GovButton.tsx`
- `frontend/src/components/gov/GovInput.tsx`
- `frontend/src/components/gov/GovSelect.tsx`
- `frontend/src/components/gov/GovTextarea.tsx`
- `frontend/src/components/gov/GovStatusBadge.tsx`
- `frontend/src/components/gov/GovAlert.tsx`

**Configuration**:
- `frontend/src/modules/onboarding/onboardingConfig.ts`

**Pages**:
- `frontend/src/app/onboarding/page.tsx` - NGO Onboarding
- `frontend/src/app/admin/dashboard/page.tsx` - Admin Dashboard
- `frontend/src/app/admin/applications/[id]/page.tsx` - Application Review

### 🎨 Design Features

✅ Government navy (#12325a) and saffron (#d97706) colors
✅ Noto Sans font family
✅ Official header with emblem
✅ Accessibility strip with font controls
✅ Role-based sidebar navigation
✅ Professional form layouts
✅ Table-based data display
✅ Status badges
✅ Risk scoring
✅ Document checklists
✅ Responsive design

### 🔧 Troubleshooting

**Issue**: "I don't see any changes"
**Solution**: Make sure you're navigating to the NEW pages:
- http://localhost:3000/onboarding
- http://localhost:3000/admin/dashboard

**Issue**: "TypeScript errors about CSS imports"
**Solution**: Already fixed with `frontend/src/types/css.d.ts`

**Issue**: "Page not found"
**Solution**: Make sure the development server is running with `npm run dev`

### 📖 Documentation

For complete implementation details, see:
- `IMPLEMENTATION_SUMMARY.md` - Full 876-line implementation guide

### 🎯 Quick Comparison

**Old Design (SaaSLayout)**:
- Modern SaaS appearance
- Purple/gradient colors
- Rounded cards
- Startup-style

**New Design (GovPortalLayout)**:
- Official government appearance
- Navy/saffron colors
- Professional forms
- Government-style

### ✨ Key Differences You'll Notice

1. **Top Strip**: Accessibility controls (A-, A, A+, हिन्दी)
2. **Header**: Navy background with official emblem
3. **Sidebar**: Structured navigation with sections
4. **Forms**: Clear labels, required indicators, help text
5. **Tables**: Government-style with borders
6. **Colors**: Navy primary, saffron accent
7. **Typography**: Noto Sans (professional)
8. **Layout**: Structured, form-focused

---

**Ready to see the new design?**
👉 Navigate to: http://localhost:3000/onboarding
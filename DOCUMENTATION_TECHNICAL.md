# MahaCSR Portal - Technical Documentation

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema](#3-database-schema)
4. [API Structure](#4-api-structure)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Workflow Engine](#7-workflow-engine)
8. [Notification System](#8-notification-system)
9. [External Integrations](#9-external-integrations)
10. [Security Implementation](#10-security-implementation)
11. [Deployment Guide](#11-deployment-guide)
12. [Development Guidelines](#12-development-guidelines)

---

## 1. Architecture Overview

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐       │
│  │   Web Portal        │  │   Mobile (Future)   │  │   Public Website    │       │
│  │   (Next.js)         │  │   (React Native)    │  │   (Next.js)         │       │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘       │
│             │                        │                        │                │
└─────────────┼────────────────────────┼────────────────────────┼────────────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes / Express Server                                    │   │
│  │  - Rate Limiting                                                        │   │
│  │  - Request Validation                                                   │   │
│  │  - Authentication Middleware                                            │   │
│  │  - CORS Configuration                                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                                      │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │  │
│  │  │ Auth Service│ │Project Svc  │ │Payment Svc  │ │Workflow Svc │         │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │  │
│  │  │Grievance Svc│ │Report Svc   │ │Notification │ │Upload Svc   │         │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘         │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   PostgreSQL          │  │   Redis             │  │   Cloudinary        │  │
│  │   (Primary DB)        │  │   (Cache/Queue)     │  │   (File Storage)    │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │   API Setu          │  │   Razorpay          │  │   Nodemailer        │     │
│  │   (Verification)    │  │   (Payments)        │  │   (Email)           │     │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  PRESENTATION LAYER                                                      │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│  │  │   Pages     │ │Components   │ │   Layouts   │ │   Modals    │        │ │
│  │  │   (Routes)  │ │   (UI)      │ │             │ │             │        │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  STATE MANAGEMENT                                                        │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐           │ │
│  │  │   Zustand       │ │   React Query   │ │   Context API   │           │ │
│  │  │   (Auth Store)  │ │   (Server State)│ │   (Local State) │           │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  UTILITY LAYER                                                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │ │
│  │  │    Hooks    │ │   Utils     │ │    Lib      │ │   Types     │        │ │
│  │  │             │ │             │ │             │ │             │        │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Frontend Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 14.x | React framework with SSR/SSG |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **UI Components** | Custom + Radix | - | Accessible component primitives |
| **State Management** | Zustand | 4.x | Global state |
| **Server State** | TanStack Query | 5.x | Data fetching & caching |
| **Animation** | Framer Motion | 11.x | Smooth animations |
| **Icons** | Lucide React | - | Icon library |
| **Forms** | React Hook Form | 7.x | Form management |
| **Validation** | Zod | 3.x | Schema validation |
| **Charts** | Recharts | 2.x | Data visualization |
| **Maps** | Three.js + Leaflet | - | GIS/Map functionality |

### 2.2 Backend Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | 20.x | JavaScript runtime |
| **Framework** | Express.js | 4.x | Web framework |
| **Database** | PostgreSQL | 15.x | Primary database |
| **ORM** | Prisma | 5.x | Database ORM |
| **Cache** | Redis | 7.x | Caching & sessions |
| **Queue** | BullMQ | - | Background jobs |
| **Auth** | JWT + bcrypt | - | Authentication |
| **Email** | Nodemailer | - | Email service |
| **SMS** | SMS Gateway | - | SMS notifications |
| **WebSocket** | Socket.io | - | Real-time updates |

### 2.3 Infrastructure

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Cloud** | AWS/Azure | Cloud hosting |
| **CDN** | Cloudflare | Content delivery |
| **File Storage** | Cloudinary | Image/document storage |
| **Monitoring** | - | Application monitoring |
| **CI/CD** | GitHub Actions | Deployment pipeline |
| **Container** | Docker | Containerization |

---

## 3. Database Schema

### 3.1 Core Entities

#### User Model
```prisma
model User {
  id                   String                    @id @default(uuid())
  organizationId       String?
  email                String                    @unique
  passwordHash         String
  role                 Role?
  accountStatus        UserAccountStatus         @default(ACTIVE)
  isVerified           Boolean                   @default(false)
  refreshToken         String?
  createdAt            DateTime                  @default(now())
  updatedAt            DateTime                  @updatedAt
  ngoId                String?
  companyId            String?
  assignedDistrict     String?
  
  // Relations
  auditLogs            AuditLog[]
  notifications        Notification[]
  
  // Convergence Framework Relations
  rmEnquiries              CorporateEnquiry[]
  rmAssessments            FeasibilityAssessment[]
  jsAssessments            FeasibilityAssessment[]
  nodalOfficerAppointments NodalOfficerAppointment[]
  nodalOfficerProjects     ConvergenceProject[]
  iaProjects               ConvergenceProject[]
  grievancesRaised         Grievance[]
}
```

#### Corporate Enquiry Model
```prisma
model CorporateEnquiry {
  id         String  @id @default(uuid())
  trackingId String  @unique // CSR-MH-YYYY-000001 format

  // Company Details
  companyName        String
  sector             String
  preferredDistricts String[]
  indicativeBudget   Decimal? @db.Decimal(15, 2)

  // Contact Details
  contactPersonName        String
  contactPersonDesignation String?
  mobile                   String
  email                    String

  // MCA21 Details
  mca21Cin String

  // CSR Proposal
  proposedCsrWork String @db.VarChar(2000)

  // Assignment & Status
  assignedRelationshipManagerId String?
  status                        CorporateEnquiryStatus @default(SUBMITTED)

  // Timeline
  submittedAt            DateTime  @default(now())
  firstResponseDueAt     DateTime?
  firstContactedAt       DateTime?

  // Relations
  interactions            CorporateEnquiryInteraction[]
  feasibilityAssessment   FeasibilityAssessment?
  nodalOfficerAppointment NodalOfficerAppointment?
  standardMou             StandardMou?
  convergenceProject      ConvergenceProject?
}
```

#### Convergence Project Model
```prisma
model ConvergenceProject {
  id        String  @id @default(uuid())
  projectId String  @unique // PRJ-MH-YYYY-000001 format

  // References
  corporateEnquiryId String?
  governmentPitchId  String?
  mouId              String  @unique

  // Project Details
  title         String
  district      String
  taluka        String
  location      String
  sector        String
  corporateName String

  // Personnel
  nodalOfficerUserId       String
  implementingAgencyUserId String?
  corporateUserId          String?

  // Progress
  approvedBudget           Decimal @db.Decimal(15, 2)
  utilizedAmount           Decimal @default(0) @db.Decimal(15, 2)
  physicalProgressPercent  Int     @default(0)
  financialProgressPercent Int     @default(0)

  // Status
  status String @default("MOU_PENDING")

  // Relations
  milestones              ProjectDeliverableMilestone[]
  utilizationCertificates UtilizationCertificate[]
  grievances              Grievance[]
  inspections             ConvergenceProjectInspection[]
}
```

### 3.2 Complete Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIP DIAGRAM                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐         ┌─────────────────────┐         ┌──────────────┐      │
│  │    User      │────────▶│  CorporateEnquiry   │◀────────│   Company    │      │
│  └──────────────┘         └──────────┬──────────┘         └──────────────┘      │
│          │                            │                                          │
│          │                    ┌───────┴────────┐                                 │
│          │                    │                │                                 │
│          │                    ▼                ▼                                 │
│          │         ┌──────────────────┐ ┌──────────────────┐                   │
│          │         │FeasibilityAssessment│NodalOfficerAppointment│              │
│          │         └─────────┬──────────┘ └─────────┬──────────┘                   │
│          │                   │                    │                              │
│          │                   └──────────┬─────────┘                              │
│          │                              ▼                                        │
│          │                    ┌──────────────────┐                              │
│          │                    │   StandardMou    │                              │
│          │                    └─────────┬──────────┘                            │
│          │                              │                                        │
│          │                              ▼                                        │
│          │                    ┌──────────────────┐                              │
│          └──────────────────▶│ ConvergenceProject│◀────────────────────────────│
│                              └──────────┬──────────┘                            │
│                                         │                                       │
│            ┌────────────────────────────┼────────────────────────────┐           │
│            │                            │                            │           │
│            ▼                            ▼                            ▼           │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐      │
│  │ProjectDeliverable│      │UtilizationCertificate│  │   Grievance      │      │
│  │   Milestone      │      │                    │      │                  │      │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘      │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| User | email | Login lookup |
| User | organizationId | Organization queries |
| CorporateEnquiry | trackingId | Public tracking |
| CorporateEnquiry | status | Status filtering |
| ConvergenceProject | projectId | Project lookup |
| ConvergenceProject | status | Dashboard queries |
| Grievance | grievanceId | Public tracking |
| Grievance | status | Queue management |

---

## 4. API Structure

### 4.1 API Routes Overview

```
/api
├── /auth                      # Authentication
│   ├── POST /login
│   ├── POST /register
│   ├── POST /refresh
│   ├── POST /logout
│   ├── GET  /me
│   ├── GET  /permissions
│   └── POST /verify-otp
│
├── /companies                 # Company management
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── GET    /:id/projects
│
├── /corporate-enquiries       # Convergence framework
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PUT    /:id
│   ├── POST   /:id/assign-rm
│   └── POST   /:id/assess
│
├── /rm                        # Relationship Manager
│   ├── GET    /dashboard
│   ├── GET    /enquiries
│   ├── POST   /enquiries/:id/contact
│   └── GET    /assessments
│
├── /js                        # Joint Secretary
│   ├── GET    /dashboard
│   ├── GET    /pending-approvals
│   ├── POST   /approve-assessment
│   └── POST   /reject-assessment
│
├── /nodal                     # Nodal Officer
│   ├── GET    /dashboard
│   ├── GET    /assigned-projects
│   ├── POST   /verify-milestone
│   └── POST   /verify-uc
│
├── /grievances                # Grievance management
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── POST   /:id/respond
│   └── POST   /:id/escalate
│
├── /analytics                 # Dashboard data
│   ├── GET    /dashboard
│   ├── GET    /stats
│   └── GET    /reports
│
└── /upload                    # File uploads
    ├── POST   /document
    └── POST   /image
```

### 4.2 API Response Format

```typescript
// Standard Success Response
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// Standard Error Response
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// Example Success
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingId": "CSR-MH-2026-000001",
    "status": "SUBMITTED"
  },
  "message": "Enquiry created successfully"
}

// Example Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Email is required"],
      "mobile": ["Mobile must be 10 digits"]
    }
  }
}
```

### 4.3 Authentication Middleware

```typescript
// middleware/auth.ts
import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export function authenticateToken(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Access token required' }
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid token' }
    });
  }
}
```

---

## 5. Frontend Architecture

### 5.1 Project Structure

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Public routes
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── marketplace/
│   │   │   ├── tracking/
│   │   │   └── helpdesk/
│   │   ├── admin/                    # Admin portal
│   │   ├── rm/                       # Relationship Manager
│   │   ├── js/                       # Joint Secretary
│   │   ├── nodal/                    # Nodal Officer
│   │   ├── district/                 # District portal
│   │   ├── partner/                  # Corporate Partner
│   │   └── api/                      # API routes
│   │
│   ├── components/
│   │   ├── ui/                       # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── ...
│   │   ├── layout/                   # Layout components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PageHeader.tsx
│   │   ├── motion/                   # Animation components
│   │   │   ├── AnimatedPage.tsx
│   │   │   ├── AnimatedCard.tsx
│   │   │   └── variants.ts
│   │   └── gov/                      # Government components
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── usePermission.ts
│   │   ├── useAuth.ts
│   │   └── useNotification.ts
│   │
│   ├── lib/                          # Utilities
│   │   ├── api.ts                    # API client
│   │   ├── utils.ts                  # Utilities
│   │   ├── roleAccess.ts             # Permission constants
│   │   └── constants.ts              # App constants
│   │
│   ├── store/                        # Zustand stores
│   │   ├── authStore.ts
│   │   └── notificationStore.ts
│   │
│   ├── types/                        # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── index.ts
│   │
│   └── styles/                       # Global styles
│       ├── globals.css
│       └── animations.css
│
├── public/                           # Static assets
├── prisma/                           # Database schema
├── tests/                            # Test files
└── package.json
```

### 5.2 State Management

#### Auth Store (Zustand)
```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  permissions: string[];
  roles: string[];
  
  // Actions
  login: (user: User, tokens: Tokens) => void;
  logout: () => void;
  setPermissions: (permissions: string[]) => void;
  refreshPermissions: () => Promise<void>;
  
  // Permission checks
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      permissions: [],
      roles: [],
      
      login: (user, tokens) => {
        set({ user, isAuthenticated: true });
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
      },
      
      logout: () => {
        set({ user: null, isAuthenticated: false, permissions: [], roles: [] });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },
      
      hasPermission: (permission) => {
        const { permissions, user } = get();
        return user?.role === 'SUPER_ADMIN' || permissions.includes(permission);
      },
      
      hasAnyPermission: (permissions) => {
        return permissions.some((p) => get().hasPermission(p));
      },
      
      hasAllPermissions: (permissions) => {
        return permissions.every((p) => get().hasPermission(p));
      },
      
      hasRole: (role) => {
        return get().roles.includes(role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        roles: state.roles,
      }),
    }
  )
);
```

### 5.3 API Client

```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
}

async function apiClient<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  const { params, ...requestConfig } = config;
  
  // Build URL with query params
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  // Add auth header
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...requestConfig.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url.toString(), {
    ...requestConfig,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data;
}

// API methods
export const api = {
  get: <T>(endpoint: string, config?: RequestConfig) =>
    apiClient<T>(endpoint, { ...config, method: 'GET' }),
    
  post: <T>(endpoint: string, body: unknown, config?: RequestConfig) =>
    apiClient<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
    }),
    
  put: <T>(endpoint: string, body: unknown, config?: RequestConfig) =>
    apiClient<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
    
  delete: <T>(endpoint: string, config?: RequestConfig) =>
    apiClient<T>(endpoint, { ...config, method: 'DELETE' }),
};
```

---

## 6. Authentication & Authorization

### 6.1 JWT Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐                                                              │
│  │    User     │                                                              │
│  │   Login     │────────┐                                                     │
│  │  Request    │        │                                                     │
│  └─────────────┘        ▼                                                     │
│                  ┌──────────────────┐                                        │
│                  │  POST /api/auth/  │                                        │
│                  │     login         │                                        │
│                  └────────┬─────────┘                                        │
│                           │                                                   │
│                           ▼                                                   │
│                  ┌──────────────────┐                                        │
│                  │ Validate         │                                        │
│                  │ Credentials      │                                        │
│                  └────────┬─────────┘                                        │
│                           │                                                   │
│                           ▼                                                   │
│                  ┌──────────────────┐                                        │
│                  │ Generate Tokens  │                                        │
│                  │ - Access Token   │                                        │
│                  │ - Refresh Token  │                                        │
│                  └────────┬─────────┘                                        │
│                           │                                                   │
│                           ▼                                                   │
│                  ┌──────────────────┐                                        │
│                  │ Store Refresh    │                                        │
│                  │ Token in DB      │                                        │
│                  └────────┬─────────┘                                        │
│                           │                                                   │
│                           ▼                                                   │
│  ┌─────────────┐  ┌──────────────────┐                                        │
│  │   Store     │◀─│ Return Tokens    │                                        │
│  │   Tokens    │  │ + User Data      │                                        │
│  │   (local)   │  └──────────────────┘                                        │
│  └─────────────┘                                                              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Permission System

```typescript
// lib/roleAccess.ts
export const PERMISSIONS = {
  // Corporate Enquiry
  CORPORATE_ENQUIRY: {
    CREATE: 'corporate-enquiry:create',
    VIEW: 'corporate-enquiry:view',
    UPDATE: 'corporate-enquiry:update',
    DELETE: 'corporate-enquiry:delete',
    ASSIGN: 'corporate-enquiry:assign',
    ASSESS: 'corporate-enquiry:assess',
    APPROVE: 'corporate-enquiry:approve',
  },
  
  // Government Pitch
  GOVERNMENT_PITCH: {
    CREATE: 'government-pitch:create',
    VIEW: 'government-pitch:view',
    UPDATE: 'government-pitch:update',
    VERIFY: 'government-pitch:verify',
    APPROVE: 'government-pitch:approve',
    PUBLISH: 'government-pitch:publish',
  },
  
  // Convergence Project
  CONVERGENCE_PROJECT: {
    CREATE: 'convergence-project:create',
    VIEW: 'convergence-project:view',
    UPDATE: 'convergence-project:update',
    MANAGE: 'convergence-project:manage',
  },
  
  // Grievance
  GRIEVANCE: {
    CREATE: 'grievance:create',
    VIEW: 'grievance:view',
    RESPOND: 'grievance:respond',
    ESCALATE: 'grievance:escalate',
    CLOSE: 'grievance:close',
  },
  
  // Admin
  ADMIN: {
    MANAGE_USERS: 'admin:manage-users',
    MANAGE_ROLES: 'admin:manage-roles',
    MANAGE_SETTINGS: 'admin:manage-settings',
    VIEW_AUDIT_LOGS: 'admin:view-audit-logs',
  },
} as const;

// Role-based access mapping
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS).flatMap(Object.values),
  
  CORPORATE_USER: [
    PERMISSIONS.CORPORATE_ENQUIRY.CREATE,
    PERMISSIONS.CORPORATE_ENQUIRY.VIEW,
    PERMISSIONS.CONVERGENCE_PROJECT.VIEW,
  ],
  
  RELATIONSHIP_MANAGER: [
    PERMISSIONS.CORPORATE_ENQUIRY.VIEW,
    PERMISSIONS.CORPORATE_ENQUIRY.ASSESS,
    PERMISSIONS.GOVERNMENT_PITCH.VIEW,
    PERMISSIONS.GOVERNMENT_PITCH.VERIFY,
  ],
  
  JOINT_SECRETARY: [
    PERMISSIONS.CORPORATE_ENQUIRY.VIEW,
    PERMISSIONS.CORPORATE_ENQUIRY.APPROVE,
    PERMISSIONS.GOVERNMENT_PITCH.VIEW,
    PERMISSIONS.GOVERNMENT_PITCH.APPROVE,
    PERMISSIONS.CONVERGENCE_PROJECT.CREATE,
  ],
  
  NODAL_OFFICER: [
    PERMISSIONS.CONVERGENCE_PROJECT.VIEW,
    PERMISSIONS.CONVERGENCE_PROJECT.MANAGE,
    PERMISSIONS.GRIEVANCE.VIEW,
    PERMISSIONS.GRIEVANCE.RESPOND,
  ],
  
  GOVERNMENT_OFFICER: [
    PERMISSIONS.GOVERNMENT_PITCH.CREATE,
    PERMISSIONS.GOVERNMENT_PITCH.VIEW,
    PERMISSIONS.GOVERNMENT_PITCH.UPDATE,
  ],
};
```

---

## 7. Workflow Engine

### 7.1 Workflow Architecture

```typescript
// Workflow Definition
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  stages: WorkflowStage[];
}

interface WorkflowStage {
  id: string;
  name: string;
  displayOrder: number;
  slaHours: number;
  rules: WorkflowRule[];
  transitions: WorkflowTransition[];
}

interface WorkflowTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  requiredPermission: string;
  conditions: WorkflowCondition[];
}

interface WorkflowInstance {
  id: string;
  definitionId: string;
  currentStageId: string;
  entityId: string;
  entityType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 SLA Escalation

```typescript
// SLA Management
interface SLAEscalation {
  id: string;
  entityType: string;      // CORPORATE_ENQUIRY, GOVERNMENT_PITCH, GRIEVANCE
  entityId: string;
  stage: SLAStage;         // RM_RESPONSE, JS_DECISION, etc.
  responsibleUserId: string;
  dueAt: Date;
  escalatedToUserId?: string;
  escalatedAt?: Date;
  isResolved: boolean;
  resolvedAt?: Date;
}

enum SLAStage {
  RM_RESPONSE = 'RM_RESPONSE',
  JS_DECISION = 'JS_DECISION',
  SECRETARY_ESCALATION = 'SECRETARY_ESCALATION',
  GRIEVANCE_LEVEL_1 = 'GRIEVANCE_LEVEL_1',
  GRIEVANCE_LEVEL_2 = 'GRIEVANCE_LEVEL_2',
}

// SLA Configuration
const SLA_CONFIG = {
  [SLAStage.RM_RESPONSE]: { hours: 120, escalationLevel: 1 },      // 5 days
  [SLAStage.JS_DECISION]: { hours: 72, escalationLevel: 2 },          // 3 days
  [SLAStage.SECRETARY_ESCALATION]: { hours: 48, escalationLevel: 3 }, // 2 days
  [SLAStage.GRIEVANCE_LEVEL_1]: { hours: 360, escalationLevel: 1 },  // 15 days
  [SLAStage.GRIEVANCE_LEVEL_2]: { hours: 360, escalationLevel: 2 },   // 15 days
};
```

---

## 8. Notification System

### 8.1 Notification Architecture

```typescript
// Notification System
interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  emailBody: string;
  smsBody: string;
  channels: NotificationChannel[];
}

type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP' | 'PUSH';

interface NotificationLog {
  id: string;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';
  retryCount: number;
  sentAt?: Date;
  correlationId: string;
}

// Notification Queue
interface NotificationJob {
  userId: string;
  template: string;
  data: Record<string, unknown>;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
}
```

### 8.2 Event-Driven Notifications

```typescript
// Notification Events
enum NotificationEvent {
  // Corporate Enquiry Events
  ENQUIRY_SUBMITTED = 'enquiry.submitted',
  ENQUIRY_ASSIGNED = 'enquiry.assigned',
  ENQUIRY_ASSESSMENT_SUBMITTED = 'enquiry.assessment_submitted',
  ENQUIRY_APPROVED = 'enquiry.approved',
  ENQUIRY_REJECTED = 'enquiry.rejected',
  
  // Government Pitch Events
  PITCH_SUBMITTED = 'pitch.submitted',
  PITCH_VERIFIED = 'pitch.verified',
  PITCH_APPROVED = 'pitch.approved',
  PITCH_PUBLISHED = 'pitch.published',
  
  // Project Events
  PROJECT_CREATED = 'project.created',
  MILESTONE_COMPLETED = 'milestone.completed',
  UC_VERIFIED = 'uc.verified',
  
  // Grievance Events
  GRIEVANCE_RAISED = 'grievance.raised',
  GRIEVANCE_RESPONDED = 'grievance.responded',
  GRIEVANCE_ESCALATED = 'grievance.escalated',
  GRIEVANCE_RESOLVED = 'grievance.resolved',
}

// Event Handlers
const notificationHandlers: Record<NotificationEvent, NotificationHandler> = {
  [NotificationEvent.ENQUIRY_SUBMITTED]: async (data) => {
    // Send email to corporate
    await sendEmail({
      to: data.corporateEmail,
      template: 'enquiry_submitted',
      data: { trackingId: data.trackingId },
    });
    
    // Send notification to RM pool
    await notifyRMPool({
      template: 'new_enquiry',
      data: { enquiryId: data.enquiryId },
    });
  },
  
  [NotificationEvent.GRIEVANCE_RAISED]: async (data) => {
    // Notify nodal officer
    await sendNotification({
      userId: data.nodalOfficerId,
      template: 'grievance_assigned',
      data: { grievanceId: data.grievanceId },
    });
    
    // Set SLA
    await createSLA({
      entityType: 'GRIEVANCE',
      entityId: data.grievanceId,
      stage: SLAStage.GRIEVANCE_LEVEL_1,
      dueAt: addDays(new Date(), 15),
    });
  },
};
```

---

## 9. External Integrations

### 9.1 API Setu Integration

```typescript
// API Setu Verification Service
interface VerificationService {
  verifyGST(gstin: string): Promise<GSTVerificationResult>;
  verifyAadhaar(aadhaar: string, otp: string): Promise<AadhaarVerificationResult>;
  verifyPAN(pan: string): Promise<PANVerificationResult>;
  verifyCIN(cin: string): Promise<CINVerificationResult>;
}

// Verification Record
interface VerificationRecord {
  id: string;
  entityType: 'COMPANY' | 'NGO' | 'USER';
  entityId: string;
  verificationType: 'GST' | 'AADHAAR' | 'PAN' | 'CIN';
  status: 'IN_PROGRESS' | 'OTP_SENT' | 'SUCCESS' | 'FAILED';
  maskedIdentifier: string;
  transactionId?: string;
  responseData?: Record<string, unknown>;
  encryptedPayload?: string;
  verifiedAt?: Date;
}

// API Setu Client
class APISetuClient {
  private baseUrl = 'https://api.api-setu.gov.in';
  
  async verifyGST(gstin: string): Promise<APIResponse> {
    const response = await fetch(`${this.baseUrl}/gst/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_SETU_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gstin }),
    });
    
    return response.json();
  }
}
```

### 9.2 Payment Gateway (Razorpay)

```typescript
// Payment Service
interface PaymentOrder {
  id: string;
  orderNumber: string;
  amount: Decimal;
  currency: string;
  status: PaymentStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
}

enum PaymentStatus {
  CREATED = 'CREATED',
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// Razorpay Integration
class PaymentService {
  async createOrder(amount: number, purpose: string): Promise<PaymentOrder> {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
    
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: generateReceipt(),
    });
    
    return await prisma.paymentOrder.create({
      data: {
        orderNumber: generateOrderNumber(),
        amount,
        currency: 'INR',
        purpose,
        gatewayOrderId: order.id,
        status: PaymentStatus.CREATED,
      },
    });
  }
  
  async verifyPayment(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    const crypto = require('crypto');
    
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');
    
    return expectedSignature === signature;
  }
}
```

---

## 10. Security Implementation

### 10.1 Security Measures

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT with refresh tokens, OTP verification |
| **Authorization** | RBAC with granular permissions |
| **Data Encryption** | AES-256-GCM for sensitive data |
| **Password Security** | bcrypt with salt rounds 12 |
| **Session Management** | Redis-based session store |
| **Rate Limiting** | Express-rate-limit |
| **CORS** | Whitelist-based CORS policy |
| **Input Validation** | Zod schemas for all inputs |
| **SQL Injection** | Prisma ORM (parameterized queries) |
| **XSS Protection** | React's built-in escaping |
| **CSRF Protection** | CSRF tokens for mutations |
| **File Upload** | Type validation, size limits, virus scan |

### 10.2 Audit Logging

```typescript
// Audit Log Schema
interface AuditLog {
  id: string;
  userId?: string;
  actorUserId?: string;
  actorRole?: string;
  action: string;           // CREATE, UPDATE, DELETE, VIEW
  entityType: string;       // User, Project, Enquiry, etc.
  entityId?: string;
  details: Record<string, unknown>;
  oldValueJson?: Record<string, unknown>;
  newValueJson?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Audit Logger
class AuditLogger {
  async log({
    userId,
    action,
    entityType,
    entityId,
    details,
    oldValue,
    newValue,
    req,
  }: AuditLogParams): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        oldValueJson: oldValue,
        newValueJson: newValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }
}
```

---

## 11. Deployment Guide

### 11.1 Environment Setup

```bash
# Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

# Installation
1. Clone repository
git clone https://github.com/mahacsr/portal.git
cd portal

2. Install dependencies
npm install

3. Setup environment variables
cp .env.example .env
# Edit .env with your configuration

4. Setup database
npx prisma migrate dev
npx prisma generate

5. Seed database (optional)
npx prisma db seed

6. Run development server
npm run dev
```

### 11.2 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mahacsr"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# API Setu
API_SETU_KEY="your-api-setu-key"
API_SETU_URL="https://api.api-setu.gov.in"

# Razorpay
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="xxx"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT="3000"
```

### 11.3 Production Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mahacsr
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mahacsr
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## 12. Development Guidelines

### 12.1 Code Standards

```typescript
// Naming Conventions
- Components: PascalCase (Button.tsx, DataTable.tsx)
- Hooks: camelCase with 'use' prefix (usePermission.ts)
- Utilities: camelCase (formatDate.ts, validateInput.ts)
- Types: PascalCase with descriptive names (CorporateEnquiryStatus)
- Constants: UPPER_SNAKE_CASE (MAX_UPLOAD_SIZE)

// File Structure
- One component per file
- Co-locate related files (component + test + styles)
- Barrel exports for component folders

// Code Style
- Use TypeScript strict mode
- Prefer explicit types over 'any'
- Use functional components with hooks
- Avoid class components
```

### 12.2 Component Patterns

```typescript
// Composable Component Pattern
// Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-white border rounded-lg", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn("px-5 py-4 border-b", className)}>{children}</div>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

// Usage
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### 12.3 Testing Guidelines

```typescript
// Component Test Example
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalled();
  });

  it('disables when loading', () => {
    render(<Button loading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 12.4 Performance Best Practices

```typescript
// 1. Use React.memo for expensive components
export const ExpensiveComponent = React.memo(function ExpensiveComponent(props) {
  // Component logic
});

// 2. Use useMemo for expensive computations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// 3. Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handle click
}, [dependency]);

// 4. Lazy load heavy components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// 5. Use next/image for optimized images
import Image from 'next/image';
<Image src="/photo.jpg" alt="Photo" width={800} height={600} />;

// 6. Use React Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: fetchProjects,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## 13. Troubleshooting

### 13.1 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Database connection fails | Wrong DATABASE_URL | Check credentials and network |
| JWT validation fails | Expired token | Refresh token or re-login |
| Permission denied | Missing permissions | Check role assignment |
| File upload fails | File too large | Check size limits |
| Email not sent | SMTP config | Verify SMTP settings |

### 13.2 Debug Mode

```bash
# Enable debug logging
DEBUG=mahacsr:* npm run dev

# Database query logging
DEBUG=prisma:* npm run dev

# Check database connection
npx prisma db execute --stdin < "SELECT 1"
```

---

## 14. Document Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | July 17, 2026 | Initial Technical Documentation | MahaCSR Team |

---

*Document: MahaCSR Portal - Technical Documentation v1.0*
*Last Updated: July 17, 2026*

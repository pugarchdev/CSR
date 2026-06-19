# Database Schema Sync Fix

## Problem
```
prisma:error 
Invalid `prisma.user.findUnique()` invocation in
D:\CSR\backend\src\controllers\authController.ts:188:36

The column `NGO.displayName` does not exist in the current database.
```

## Root Cause
The Prisma schema file (`backend/prisma/schema.prisma`) contains the `displayName` field in the NGO model (line 209), but the actual PostgreSQL database doesn't have this column yet. This happens when:

1. Schema changes are made to `schema.prisma`
2. Migrations are not run to sync the database
3. The application tries to query fields that don't exist in the database

## Solution

### Step 1: Sync Database Schema
Run Prisma DB Push to sync the schema without creating migration files:
```bash
cd backend
npx prisma db push
```

This command will:
- Compare the Prisma schema with the actual database
- Generate and execute SQL to add missing columns
- Update the Prisma Client

### Step 2: Regenerate Prisma Client (if needed)
```bash
cd backend
npx prisma generate
```

### Step 3: Restart Backend Server
The backend server (ts-node-dev) should auto-restart after the schema sync.

## Files Affected

### Backend
- `backend/prisma/schema.prisma` - Contains the NGO model with displayName field
- `backend/src/controllers/authController.ts` - Login function that queries NGO data

### Frontend (Additional Fixes)
- `frontend/src/components/layout/GovPortalLayout.tsx` - Fixed profile dropdown
- `frontend/src/components/gov/GovStatusBadge.tsx` - Added style prop support
- `frontend/src/app/dashboard/page.tsx` - New unified dashboard page

## Testing After Fix

1. **Test Login:**
   ```
   POST http://localhost:5000/api/auth/login
   {
     "email": "contact@sahyadrieco.org",
     "password": "your_password"
   }
   ```

2. **Verify NGO Data:**
   The response should include NGO data with displayName field without errors.

3. **Navigate to Dashboard:**
   - Go to `http://localhost:3000/dashboard`
   - Should see role-based modules
   - Click on "NGO Onboarding" to access the onboarding wizard

## Prevention

To prevent this issue in the future:

1. **Always run migrations after schema changes:**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Use Prisma Studio to verify database state:**
   ```bash
   npx prisma studio
   ```

3. **Keep schema.prisma in sync with database:**
   - Run `npx prisma db pull` to sync schema from database
   - Run `npx prisma db push` to sync database from schema

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma DB Push Documentation](https://www.prisma.io/docs/reference/api-reference/command-reference#db-push)
# MahaCSR Portal - Demo Credentials

## 🔐 Default Password for All Accounts
**Password:** `111111`

---

## 👨‍💼 Admin Accounts

### Super Admin (Full System Access)
- **Email:** `admin@mahacsr.gov.in`
- **Password:** `111111`
- **Role:** SUPER_ADMIN
- **Access:** Complete system administration, user management, all dashboards

### Portal Admin (NGO Verification & Approval)
- **Email:** `portal.admin@mahacsr.gov.in`
- **Password:** `111111`
- **Role:** PORTAL_ADMIN
- **Access:** NGO verification, application review, document verification

### CSR Admin (CSR Compliance & Monitoring)
- **Email:** `csr.admin@mahacsr.gov.in`
- **Password:** `111111`
- **Role:** CSR_ADMIN
- **Access:** CSR compliance monitoring, project oversight, reporting

---

## 🏛️ NGO Accounts

### 1. Sahyadri Eco Foundation (Pune) - ✅ VERIFIED
- **Email:** `contact@sahyadrieco.org`
- **Password:** `111111`
- **Role:** NGO_ADMIN
- **Organization:** Sahyadri Eco Foundation
- **Type:** Trust
- **Registration:** MH/2021/0088921
- **Darpan ID:** MH/2021/012345
- **CSR-1:** CSR00012345
- **PAN:** AAATS2345P
- **District:** Pune
- **Focus Areas:** Water Conservation, Environmental Sustainability, Rural Development
- **Projects:** 2 Active (Gadchiroli Watershed, Pune Smart Classrooms)
- **Status:** Verified & Active

### 2. Vidarbha Development Society (Nagpur) - ✅ VERIFIED
- **Email:** `info@vidarbhadev.org`
- **Password:** `111111`
- **Role:** NGO_ADMIN
- **Organization:** Vidarbha Development Society
- **Type:** Society
- **Registration:** MH/2019/0045678
- **Darpan ID:** MH/2019/045678
- **CSR-1:** CSR00045678
- **PAN:** AABVD5678K
- **District:** Nagpur
- **Focus Areas:** Education & Literacy, Skill Development, Women Empowerment
- **Projects:** 2 Active (Youth Skill Development, Women SHG)
- **Status:** Verified & Active

### 3. Mumbai Education Trust (Mumbai) - ✅ VERIFIED
- **Email:** `admin@mumbaiedu.org`
- **Password:** `111111`
- **Role:** NGO_ADMIN
- **Organization:** Mumbai Education Trust
- **Type:** Trust
- **Registration:** MH/2018/0123456
- **Darpan ID:** MH/2018/123456
- **CSR-1:** CSR00123456
- **PAN:** AAAMT1234L
- **District:** Mumbai
- **Focus Areas:** Education & Literacy, Digital Literacy, Vocational Training
- **Projects:** 1 Active (Slum Health Campaign)
- **Status:** Verified & Active

### 4. Konkan Welfare Association (Ratnagiri) - ⏳ PENDING
- **Email:** `contact@konkanwelfare.org`
- **Password:** `111111`
- **Role:** NGO_ADMIN
- **Organization:** Konkan Welfare Association
- **Type:** Society
- **Registration:** MH/2023/0098765
- **Darpan ID:** MH/2023/098765
- **PAN:** AABKW9876M
- **District:** Ratnagiri
- **Focus Areas:** Coastal Development, Fisheries, Healthcare
- **Projects:** None (Pending Verification)
- **Status:** Pending Verification

---

## 🏢 Company Accounts

### 1. Tata Motors Limited - ✅ VERIFIED
- **Email:** `csr.team@tatamotors.com`
- **Password:** `111111`
- **Role:** COMPANY_ADMIN
- **Company:** Tata Motors Limited
- **CIN:** L28920MH1945PLC004520
- **GST:** 27AAACT2727Q1ZV
- **PAN:** AAACT2727Q
- **CSR Budget:** ₹25 Crores
- **Focus Areas:** Education, Healthcare, Environmental Sustainability, Rural Development
- **Status:** Verified & Active

### 2. Infosys Limited - ✅ VERIFIED
- **Email:** `csr@infosys.com`
- **Password:** `111111`
- **Role:** COMPANY_ADMIN
- **Company:** Infosys Limited
- **CIN:** L85110KA1981PLC013115
- **GST:** 29AAACI1681G1ZK
- **PAN:** AAACI1681G
- **CSR Budget:** ₹45 Crores
- **Focus Areas:** Education, Digital Literacy, Skill Development, Healthcare
- **Status:** Verified & Active

### 3. Reliance Industries Limited - ✅ VERIFIED
- **Email:** `csr.initiatives@ril.com`
- **Password:** `111111`
- **Role:** COMPANY_ADMIN
- **Company:** Reliance Industries Limited
- **CIN:** L17110MH1973PLC019786
- **GST:** 27AAACR5055K1Z7
- **PAN:** AAACR5055K
- **CSR Budget:** ₹85 Crores
- **Focus Areas:** Rural Development, Healthcare, Education, Sports
- **Status:** Verified & Active

### 4. Mahindra & Mahindra Limited - ✅ VERIFIED
- **Email:** `csr@mahindra.com`
- **Password:** `111111`
- **Role:** COMPANY_ADMIN
- **Company:** Mahindra & Mahindra Limited
- **CIN:** L65990MH1945PLC004558
- **GST:** 27AAACM0307L1ZB
- **PAN:** AAACM0307L
- **CSR Budget:** ₹18 Crores
- **Focus Areas:** Education, Environmental Sustainability, Livelihood Enhancement
- **Status:** Verified & Active

---

## 📊 Seeded Data Summary

### NGOs
- **Total:** 4 NGOs
- **Verified:** 3 NGOs
- **Pending:** 1 NGO
- **Districts Covered:** Pune, Nagpur, Mumbai, Ratnagiri

### Companies
- **Total:** 4 Companies
- **Verified:** 4 Companies
- **Total CSR Budget:** ₹173 Crores

### Projects
- **Total:** 5 Projects
- **Funded:** 2 Projects (₹67 Lakhs)
- **Approved:** 1 Project (₹35 Lakhs)
- **Under Review:** 1 Project (₹18 Lakhs)
- **Submitted:** 1 Project (₹12 Lakhs)
- **Total Budget:** ₹132 Lakhs

### Focus Areas
- Water Conservation
- Education & Literacy
- Skill Development
- Healthcare
- Women Empowerment
- Environmental Sustainability
- Rural Development

### Districts Covered
- Pune (Haveli, Mulshi)
- Gadchiroli (Aheri) - Aspirational District
- Nagpur
- Wardha
- Mumbai
- Ratnagiri

---

## 🚀 How to Seed the Database

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Run the seed script:**
   ```bash
   npm run seed
   ```
   or
   ```bash
   npx ts-node prisma/seed.ts
   ```

3. **Verify seeding:**
   ```bash
   npx prisma studio
   ```

---

## 🎯 Demo Scenarios

### Scenario 1: NGO Onboarding
1. Login as: `contact@konkanwelfare.org`
2. Navigate to: `/onboarding`
3. Complete the 9-step wizard
4. Submit application

### Scenario 2: Admin Review
1. Login as: `portal.admin@mahacsr.gov.in`
2. Navigate to: `/admin/applications`
3. Review pending applications
4. Verify documents and approve/reject

### Scenario 3: Project Funding
1. Login as: `csr.team@tatamotors.com`
2. Navigate to: `/marketplace`
3. Browse projects
4. Fund a project

### Scenario 4: Project Management
1. Login as: `contact@sahyadrieco.org`
2. Navigate to: `/dashboard`
3. View funded projects
4. Update milestone progress

---

## 📝 Notes

- All accounts use the same password: `111111`
- All users are pre-verified (isVerified: true)
- Realistic Maharashtra data with actual districts and talukas
- Projects include aspirational districts (Gadchiroli)
- Match scores are pre-calculated for demo
- Milestones are set up for funded projects

---

## 🔒 Security Note

**⚠️ IMPORTANT:** These are demo credentials for development/testing only. 
**DO NOT use these credentials in production!**

For production:
1. Change all passwords
2. Use strong, unique passwords
3. Enable 2FA
4. Implement proper password policies
5. Use environment variables for sensitive data
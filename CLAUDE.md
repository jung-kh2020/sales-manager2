# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sales management system for tracking salespeople's performance and commissions for a review writing service business. Built with React + Vite frontend and Supabase backend.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000, auto-opens browser)
npm run build        # Build for production
npm run preview      # Preview production build
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set Supabase credentials:
   - `VITE_SUPABASE_URL` - Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Supabase anon key
3. Run `supabase_schema.sql` in Supabase SQL Editor to set up database

## Architecture

### Authentication & Authorization
- **AuthContext** ([src/context/AuthContext.jsx](src/context/AuthContext.jsx)) - Central auth state management using Supabase Auth
- Two user roles: `admin` (full access) and `employee` (limited dashboard access)
- User table links to employees table via `employee_id` foreign key
- Auth flow: Login → Fetch user profile from `users` table → Include related employee data

### Routing & Access Control
- **App.jsx** ([src/App.jsx](src/App.jsx)) - Role-based route rendering
- Admin routes: `/`, `/employees`, `/sales`, `/commissions`, `/statistics`, `/products`
- Employee routes: `/` (dashboard only)
- Public routes: `/product/:id`, `/order-success/:id` (product catalog/order confirmation)

### Database Schema
Main tables (see [supabase_schema.sql](supabase_schema.sql)):
- `employees` - Employee records with status tracking
- `products` - 5 predefined review service plans (베이직, 스탠다드, 프리미엄, 익스프레스, 엔터프라이즈)
- `sales` - Sales transactions linking employees to products
- `commissions` - Monthly commission calculations per employee
- `users` - Auth accounts with role-based access

Key relationships:
- `sales.employee_id` → `employees.id`
- `sales.product_id` → `products.id`
- `commissions.employee_id` → `employees.id`
- `users.employee_id` → `employees.id`

### Commission Calculation Logic
- Base commission: 25% of total monthly sales
- Bonus incentive: Additional 5% if monthly sales exceed ₩5,000,000
- Effective rate at goal: 30% (25% base + 5% bonus)
- Stored in `commissions` table with `year_month` format (e.g., "2024-01")

### UI Structure
- **Layout** ([src/components/Layout.jsx](src/components/Layout.jsx)) - Sidebar navigation + top header
- Role-based navigation menu rendering
- UI components in `src/components/ui/` (Button, Input, Select, Table, Modal, Badge, Card)
- Utility function `cn()` in [src/utils/cn.js](src/utils/cn.js) for Tailwind class merging

### Page Components
- `Dashboard.jsx` - Admin overview with stats
- `EmployeeDashboard.jsx` - Employee personal dashboard
- `Employees.jsx` - Employee CRUD operations
- `Sales.jsx` - Sales transaction management
- `Products.jsx` - Product management
- `Commissions.jsx` - Commission tracking and payment status
- `Statistics.jsx` - Charts and analytics (Chart.js)
- `ProductCatalog.jsx` - Public product detail page
- `OrderSuccess.jsx` - Order confirmation page

### Supabase Integration
- Client initialized in [src/services/supabase.js](src/services/supabase.js)
- Uses environment variables for credentials
- All data operations go through Supabase client
- Leverages RLS policies for row-level security (configure in Supabase dashboard)

## Key Business Rules

**Product Pricing:**
| Product | Duration | Reviews | Price | Cost |
|---------|----------|---------|-------|------|
| 베이직 플랜 | 1개월 | 60개 | ₩210,000 | ₩90,000 |
| 스탠다드 플랜 | 2개월 | 150개 | ₩480,000 | ₩225,000 |
| 프리미엄 플랜 | 3개월 | 300개 | ₩900,000 | ₩450,000 |
| 익스프레스 플랜 | 2주 | 50개 | ₩200,000 | ₩75,000 |
| 엔터프라이즈 플랜 | 6개월 | 500개 | ₩1,400,000 | ₩750,000 |

**Commission Structure:**
- Calculate monthly per employee based on `year_month`
- Base: 25% of gross sales
- Bonus: +5% if sales > ₩5,000,000
- Track payment status via `is_paid` and `paid_date` fields

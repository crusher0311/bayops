# BayOPS - Shop Management System

## Overview
BayOPS is a multi-tenant SaaS shop management system for automotive businesses with enterprise features including multi-location support, customizable workflows, digital vehicle inspections, repair order management with job/package structure, comprehensive shop configuration settings, and AI-powered service writing.

## Tech Stack
- **Frontend**: React 19, Wouter (routing), TanStack Query (data fetching), React Hook Form, Tailwind CSS v4, Radix UI components
- **Backend**: Express.js, PostgreSQL with Drizzle ORM, Passport.js authentication
- **State Management**: Zustand (minimal auth state), React Query for server state
- **AI**: OpenAI via Replit AI Integrations (no separate API key needed)

## Project Structure
```
client/
  src/
    pages/           # Page components (Dashboard, RepairOrders, Settings, etc.)
    components/      # Reusable UI components
    lib/             # Utilities, hooks, API client
server/
  routes.ts          # API endpoints (core + settings)
  storage.ts         # Database operations (Drizzle ORM)
  ai.ts              # AI Service Writer functions
  auth.ts            # Authentication logic
  seed.ts            # Seed data for development
shared/
  schema.ts          # Database schema and types (14+ configuration tables)
```

## Key Features

### Multi-Tenant Architecture
- Organizations can have multiple locations
- Users are assigned to specific locations with role-based access
- Data isolation by organization/location

### Repair Order Management
- Job-based structure: Each RO contains multiple service jobs/packages
- Each job has its own line items (labor, parts, tires, fees)
- Customizable workflow stages with visual progress tracking

### Configuration Settings (Phase 1 - COMPLETE)
Settings page with 6 tabs for comprehensive shop configuration:
- **Shop Profile**: Name, address, phone, email, website, tax ID, license, hours of operation
- **RO Settings**: Labor rates, shop fees (auto-apply), discounts, tax settings, job categories, payment types
- **Markups**: Parts matrix (cost-range based), labor matrix (hours-based)
- **Marketing**: Lead sources for customer attribution
- **Branding**: Logo, colors, terms of service, white-label options
- **Workflows**: Custom workflow stages management

### AI Service Writer
- **AI Write**: Generate customer-friendly service descriptions for each job
- **AI Authorization**: Generate professional authorization request messages
- Editable output before applying to RO
- Copy to clipboard functionality

### Integrations
- VIN Decoder: Auto-populate vehicle info from VIN
- Labor Guide: VehicleDatabases.com API for repair pricing estimates
- Address Autocomplete: Geoapify for customer addresses

## Configuration Tables
| Table | Purpose |
|-------|---------|
| laborRates | Multiple labor rate tiers (Standard, Diagnostic, Heavy Line) |
| shopFees | Auto-apply fees (shop supplies, EPA, hazmat) with percentage/fixed, taxable options |
| discounts | Discount presets with codes |
| taxSettings | Sales tax, tire tax, taxable items configuration |
| jobCategories | Category codes for job organization and reporting |
| paymentTypes | Payment methods with processing fees |
| invoiceSettings | Invoice numbering configuration |
| roSettings | Repair order behavior settings |
| partsMatrices | Cost-range based parts markup |
| laborMatrices | Hours-based labor markup |
| leadSources | Marketing source tracking |
| customerSettings | Customer-related preferences |
| transparencySettings | Customer transparency portal options |
| orgBranding | Organization-level branding (logo, colors, white-label) |

## API Keys (Stored as Secrets)
- `GEOAPIFY_API_KEY`: Address autocomplete
- `VEHICLE_DATABASES_API_KEY`: Labor guide API
- `AI_INTEGRATIONS_OPENAI_*`: Replit AI (auto-configured)

## Design System
- **Colors**: Slate grays (#0f172a), Blue (#2563EB) for primary actions, Purple gradient for AI features
- **Typography**: Rajdhani (headings), Inter (body)
- **Style**: Enterprise automotive aesthetic with clean, professional UI

## Recent Changes
- 2024-12-04: Phase 2 Complete - Added Reports dashboard with revenue, productivity, and parts analytics
- 2024-12-04: Added Invoicing system with invoice generation from ROs, auto-calculated totals, payment tracking
- 2024-12-04: Added Technician Time Tracking with clock in/out, break tracking, weekly summaries
- 2024-12-04: Added Parts Ordering with vendor management, order status tracking, line item details
- 2024-12-04: Added Appointments scheduling with service bay management
- 2024-12-04: Phase 1 Configuration Settings - Added comprehensive Settings page with 14 configuration tables
- 2024-12-04: Added AI Service Writer with job description and authorization request generation
- 2024-12-03: Made vehicle mileage optional, fixed RO advisor auto-assignment
- 2024-12-03: Integrated VehicleDatabases labor guide API
- 2024-12-03: Rebranded to BayOPS

## MVP Roadmap
- **Phase 1 (COMPLETE)**: Configuration backbone - all shop settings, markup matrices, branding
- **Phase 2 (COMPLETE)**: Operational workflows - appointments, invoicing, parts ordering, time tracking, reporting
- **Phase 3 (FUTURE)**: Engagement features - DVI photos, SMS/email, commissions, integrations

## Phase 2 Features

### Appointments & Scheduling
- Service bay management (add, edit, toggle active)
- Appointment calendar with status tracking
- Customer and vehicle linking

### Parts Ordering
- Vendor management (name, contact, account info)
- Parts orders with line items (part numbers, quantities, costs)
- Order status workflow: DRAFT → ORDERED → PARTIAL → RECEIVED
- Delete confirmations and toast feedback

### Technician Time Tracking
- Clock in/out functionality
- Break time tracking
- Job assignment per time log
- Weekly summary with total hours, overtime detection
- History view with date range filtering

### Invoicing
- Invoice generation from completed repair orders
- Auto-calculated totals from RO line items (subtotal, tax, total)
- Payment recording with automatic status updates
- Status workflow: DRAFT → SENT → PARTIAL → PAID

### Reporting Dashboard
- Revenue metrics (total, by category, avg RO value)
- Invoice status (paid vs outstanding)
- Productivity metrics (hours worked, technicians, revenue/hour)
- Parts metrics (cost, revenue, margin)
- Date range filtering (today, week, month, year, all)

## Phase 3 Planned Features

### Digital Vehicle Inspections (DVI)
- Photo/video capture during inspections
- Condition ratings (red/yellow/green) for each inspection item
- Customer-facing inspection reports with media

### SMS/Email Communications
- Automated appointment reminders
- RO status updates to customers
- Authorization requests via text/email
- Marketing campaigns

### Commissions
- Technician commission tracking
- Advisor sales commissions
- Performance-based pay calculations

### Planned Integrations

#### PartsTech (Parts Ordering)
- **What it provides**: Access to 20,000+ suppliers (AutoZone, NAPA, Advance Auto, O'Reilly), real-time inventory & pricing, VIN-based parts lookup, price comparison, direct ordering
- **Integration approach**: 
  - Option A: Punchout (popup/iframe, ~1-2 weeks) - opens PartsTech UI, parts auto-import to RO
  - Option B: Full API (~3-4 weeks) - native search, inline pricing, seamless cart
- **Requirements**: Free PartsTech account, Partner API credentials, supplier account credentials
- **Cost**: Free for shops and developers
- **API Docs**: https://api-docs.partstech.com/
- **Auth**: JWT tokens (60 min expiry), supports user + partner credentials

#### Other Planned Integrations
- Payment processing (Stripe, Square)
- Accounting sync (QuickBooks)
- Customer review platforms

## User Preferences
- Prefer purple gradient styling for AI features
- Keep UI clean and professional for automotive industry
- White-label capabilities for enterprise organizations

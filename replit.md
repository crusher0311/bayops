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
- PartsTech: Native parts search and ordering integration (see PartsTech Integration section)

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
- `PARTSTECH_USERNAME`: PartsTech shop/user account username
- `PARTSTECH_API_KEY`: PartsTech shop/user API key
- `PARTSTECH_PARTNER_ID`: PartsTech integration partner ID (developer credentials)
- `PARTSTECH_PARTNER_KEY`: PartsTech integration partner API key (developer credentials)

## Design System
- **Colors**: Slate grays (#0f172a), Blue (#2563EB) for primary actions, Purple gradient for AI features
- **Typography**: Rajdhani (headings), Inter (body)
- **Style**: Enterprise automotive aesthetic with clean, professional UI

## Recent Changes
- 2024-12-04: PartsTech Integration - Native parts search/ordering with VIN-based vehicle context
- 2024-12-04: Phase 3 DVI Started - Added Digital Vehicle Inspection with AI-powered tech notes
- 2024-12-04: DVI Features: Template management, status toggles (GREEN/YELLOW/RED), mandatory recommendations for non-green items
- 2024-12-04: DVI AI Assist: AI generates findings and recommendations based on inspection status
- 2024-12-04: DVI Customer Report: Public shareable inspection report page (/inspection/:token)
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
- **Phase 3 (IN PROGRESS)**: DVI with AI tech notes, customer report sharing, template management

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

## Phase 3 Features (DVI - IN PROGRESS)

### Digital Vehicle Inspections (DVI)
- **Inspection Templates**: Create reusable templates with categorized items
- **Status Toggles**: GREEN (good), YELLOW (needs attention), RED (urgent) for each item
- **AI Tech Notes**: AI-powered generation of findings and recommendations
- **Mandatory Recommendations**: Required for yellow/red items, optional for green
- **Customer Reports**: Public shareable inspection report via unique token URL
- **RO Integration**: Start inspections from Repair Order detail page (Inspection tab)

### DVI Database Schema
- `inspectionTemplates`: Template definitions with items array (label, category, sortOrder)
- `inspections`: Inspection instances linked to RO, containing items with status/finding/recommendation/photos

### DVI Security Architecture
- **Org-scoped storage helpers**: `getInspectionForOrg`, `updateInspectionForOrg`, `deleteInspectionForOrg` join inspections with repair_orders and filter by orgId
- **Foreign key validation**: POST /api/inspections validates roId, templateId, and technicianId all belong to user's org before creating inspection
- **Share token design**: UUIDs serve as authorization (like Google Docs sharing) - possession of token grants read-only access to sanitized inspection data
- **Public endpoint sanitization**: `/api/inspections/shared/:token` returns only customer-facing data (no internal notes, technician info)

### Remaining DVI Work
- Photo/video capture during inspections
- Media storage and display

## Future Phase 3 Features

### SMS/Email Communications
- Automated appointment reminders
- RO status updates to customers
- Authorization requests via text/email
- Marketing campaigns

### Commissions
- Technician commission tracking
- Advisor sales commissions
- Performance-based pay calculations

### PartsTech Integration (IMPLEMENTED)
Native parts search and ordering integration using PartsTech's REST API:
- **VIN-based search**: Searches with vehicle context for accurate part fitment
- **Real-time pricing**: Live pricing from connected suppliers
- **Direct to RO**: Selected parts automatically added to job line items with markup matrix applied
- **UI**: Orange-styled PartsTech button in job headers, modal search dialog with part details
- **Backend**: `server/partstech.ts` handles OAuth authentication (60-min token caching), API calls
- **Routes**: `/api/partstech/*` endpoints for status, VIN decode, parts search, categories, suppliers
- **Credentials**: PARTSTECH_USERNAME and PARTSTECH_API_KEY stored in Replit Secrets

### Planned Integrations
- Payment processing (Stripe, Square)
- Accounting sync (QuickBooks)
- Customer review platforms

## User Preferences
- Prefer purple gradient styling for AI features
- Keep UI clean and professional for automotive industry
- White-label capabilities for enterprise organizations

# BayOPS - Shop Management System

## Overview
BayOPS is a multi-tenant SaaS shop management system designed for automotive businesses. It offers enterprise features such as multi-location support, customizable workflows, digital vehicle inspections, comprehensive repair order management with job/package structures, extensive shop configuration options, and AI-powered service writing capabilities. The project aims to streamline operations, enhance efficiency, and provide advanced tools for automotive service providers, including B2B wholesale management and inventory control.

## User Preferences
- Prefer purple gradient styling for AI features
- Keep UI clean and professional for automotive industry
- White-label capabilities for enterprise organizations

## Git Workflow & Version Control
**Repository:** https://github.com/crusher0311/bayops.git

**Branch Structure:**
| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production - stable releases | Protected (requires PR + approval) |
| `qa` | QA testing before production | None |
| `develop` | Active development from Replit | None |

**Deployment Flow:**
1. **Replit** → `develop` (active work, push with `git push origin main:develop`)
2. **develop** → `qa` (PR for QA testing)
3. **qa** → `main` (PR with required approval for production)

**Version Tags:** Follow semantic versioning (v1.0.0-beta, v1.0.0-rc.1, v1.0.0)

**Key Files:**
- `CHANGELOG.md` - Track all version changes

## System Architecture
BayOPS utilizes a modern web stack with **React 19** for the frontend, employing **Wouter** for routing, **TanStack Query** for data fetching, **React Hook Form**, **Tailwind CSS v4** for styling, and **Radix UI** components. The backend is powered by **Express.js** with **PostgreSQL** and **Drizzle ORM** for data persistence, and **Passport.js** for authentication. **Zustand** is used for minimal state management, primarily for authentication.

Key architectural decisions include:
- **Multi-Tenant Architecture**: Supports multiple organizations and locations with role-based access and data isolation.
- **Modular Backend**: Services for AI, authentication, and database operations are logically separated.
- **Comprehensive Configuration**: Extensive settings for shop profiles, RO management, markups, marketing, branding, and workflows are managed through a robust set of configuration tables.
- **AI Integration**: AI-powered features for generating service descriptions, authorization requests, and DVI tech notes are integrated using Replit AI.
- **Design System**: A clean, professional UI with a specific color palette (Slate grays, Blue, Purple gradients for AI) and typography (Rajdhani for headings, Inter for body) catering to an enterprise automotive aesthetic.
- **Wholesale/B2B System**: Supports distinct location types (RETAIL, WHOLESALE, DISTRIBUTION), B2B customer accounts with payment terms, credit limits, pricing tiers, wholesale orders with a dedicated workflow, and customer A/R ledgers with statements.
- **Digital Vehicle Inspection (DVI)**: Features template management, color-coded status toggles (GREEN/YELLOW/RED), AI-powered findings/recommendations, mandatory recommendations, and shareable customer reports with robust security and media support (photos/videos).
- **Inventory Management**: Full CRUD for inventory items, stock adjustments (receive, adjust, count, return, transfer), low stock alerts, reorder points, inventory valuation, stock transactions audit trail, vendor part numbers, and bin locations.
- **Operational Workflows**: Includes dedicated modules for Appointments & Scheduling (service bay management), Parts Ordering (vendor management, order status workflows), Technician Time Tracking (clock in/out, breaks, job assignment), Invoicing (generation from ROs, payment recording), and a Reporting Dashboard (revenue, productivity, parts analytics).
- **Self-Service Onboarding**: New customers can sign up at `/signup` with a multi-step wizard that creates their organization, location, and admin user atomically. After signup, users can optionally import data from Protractor.
- **Protractor Migration**: One-time data migration from Protractor at `/import/protractor`. Accepts Protractor API credentials (stored in memory only, never persisted), imports all customers, vehicles, and repair order history. Credentials are automatically cleaned up after import completes.

## Database Refactor Status (December 2025)
The database is undergoing a three-phase refactor for enterprise-grade normalized architecture:

**Phase 0 (COMPLETE)**:
- Added `legacy_system` and `legacy_id` columns to customers, vehicles, repair_orders, deferred_work tables
- Added `home_location_id` to customers and vehicles tables
- Added `org_id` to vehicles table (nullable for backfill compatibility)
- Added `legacy_invoice_number` to repair_orders
- Backfilled legacy fields from protractor_id (1387 customers, 1784 vehicles, 1045 repair_orders)

**Phase 1 (COMPLETE - Schema Ready)**:
- Created normalized `ro_jobs` table (replaces jobs JSONB in repair_orders) with org_id, location_id, chapter/code/title, is_deferred
- Created normalized `ro_job_lines` table (replaces lineItems in jobs JSONB)
- Added SUBLET to line_item_type enum
- Tables include legacy_system and legacy_id for import tracking

**Phase 2 (COMPLETE - Dual-Write Active)**:
- Backfilled normalized tables from existing JSONB data (3623 jobs, 9 line items)
- Implemented transactional dual-write in storage.ts for create/update repair orders
- Both JSONB and normalized tables are kept in sync atomically
- JSONB columns retained for backwards compatibility (can be removed after full verification period)

## External Dependencies
- **OpenAI**: Integrated via Replit AI for AI Service Writer functionalities (no separate API key required).
- **Geoapify**: Used for address autocomplete (`GEOAPIFY_API_KEY`).
- **VehicleDatabases.com**: Provides labor guide API for repair pricing estimates (`VEHICLE_DATABASES_API_KEY`).
- **PartsTech**: Offers native parts search and ordering integration. This includes both a popup mode (using existing PartsTech shop account) and a full API mode for in-app search and direct part selection. Requires `PARTSTECH_USERNAME`, `PARTSTECH_API_KEY`, and optionally `PARTSTECH_PARTNER_ID`, `PARTSTECH_PARTNER_KEY` for full API access.
- **DataOne**: Provides OEM maintenance schedules for vehicles via VIN lookup (`DATAONE_API_URL`). Features include:
  - VIN decoding with "squish" pattern matching (first 8 + positions 10-11)
  - PostgreSQL-backed caching with 7-day TTL to minimize API calls
  - Maintenance item triage based on vehicle mileage (DUE_NOW / DUE_SOON / UPCOMING)
  - Integration in repair order detail page's "OEM Maintenance" tab
  - One-click addition of maintenance items as jobs to the current RO
- **CARFAX Service History**: Provides vehicle service history lookup via ServicesSocket API (`CARFAX_PRODUCT_DATA_ID`, `CARFAX_LOCATION_ID`). Features include:
  - Service history retrieval by VIN (requires 17 characters)
  - PostgreSQL-backed caching with 24-hour TTL (carfax_cache table)
  - Service category summaries with last service date/odometer
  - Detailed service records timeline showing date, odometer, and services performed
  - Matching logic to correlate CARFAX service history with OEM maintenance recommendations
  - Integration in repair order detail page's "Service History" tab
  - API routes: `/api/vehicles/:vehicleId/service-history`, `/api/vin/:vin/service-history`, `/api/carfax/status`
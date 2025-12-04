# BayOPS - Shop Management System

## Overview
BayOPS is a multi-tenant SaaS shop management system for automotive businesses with enterprise features including multi-location support, customizable workflows, digital vehicle inspections, repair order management with job/package structure, and AI-powered service writing.

## Tech Stack
- **Frontend**: React 19, Wouter (routing), TanStack Query (data fetching), React Hook Form, Tailwind CSS v4, Radix UI components
- **Backend**: Express.js, PostgreSQL with Drizzle ORM, Passport.js authentication
- **State Management**: Zustand (minimal auth state), React Query for server state
- **AI**: OpenAI via Replit AI Integrations (no separate API key needed)

## Project Structure
```
client/
  src/
    pages/           # Page components (Dashboard, RepairOrders, etc.)
    components/      # Reusable UI components
    lib/             # Utilities, hooks, API client
server/
  routes.ts          # API endpoints
  storage.ts         # Database operations (Drizzle ORM)
  ai.ts              # AI Service Writer functions
  auth.ts            # Authentication logic
  seed.ts            # Seed data for development
shared/
  schema.ts          # Database schema and types
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

### AI Service Writer (NEW)
- **AI Write**: Generate customer-friendly service descriptions for each job
- **AI Authorization**: Generate professional authorization request messages
- Editable output before applying to RO
- Copy to clipboard functionality

### Integrations
- VIN Decoder: Auto-populate vehicle info from VIN
- Labor Guide: VehicleDatabases.com API for repair pricing estimates
- Address Autocomplete: Geoapify for customer addresses

## API Keys (Stored as Secrets)
- `GEOAPIFY_API_KEY`: Address autocomplete
- `VEHICLE_DATABASES_API_KEY`: Labor guide API
- `AI_INTEGRATIONS_OPENAI_*`: Replit AI (auto-configured)

## Design System
- **Colors**: Slate grays (#0f172a), Blue (#2563EB) for primary actions, Purple gradient for AI features
- **Typography**: Rajdhani (headings), Inter (body)
- **Style**: Enterprise automotive aesthetic with clean, professional UI

## Recent Changes
- 2024-12-04: Added AI Service Writer with job description and authorization request generation
- 2024-12-03: Made vehicle mileage optional, fixed RO advisor auto-assignment
- 2024-12-03: Integrated VehicleDatabases labor guide API
- 2024-12-03: Rebranded to BayOPS

## User Preferences
- Prefer purple gradient styling for AI features
- Keep UI clean and professional for automotive industry
- Future: White-label capabilities for enterprise organizations

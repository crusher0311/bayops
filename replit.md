# BayOPS - Shop Management System

## Overview
BayOPS is a multi-tenant SaaS shop management system designed for automotive businesses. It offers enterprise features such as multi-location support, customizable workflows, digital vehicle inspections, comprehensive repair order management with job/package structures, extensive shop configuration options, and AI-powered service writing capabilities. The project aims to streamline operations, enhance efficiency, and provide advanced tools for automotive service providers, including B2B wholesale management and inventory control.

## User Preferences
- Prefer purple gradient styling for AI features
- Keep UI clean and professional for automotive industry
- White-label capabilities for enterprise organizations

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

## External Dependencies
- **OpenAI**: Integrated via Replit AI for AI Service Writer functionalities (no separate API key required).
- **Geoapify**: Used for address autocomplete (`GEOAPIFY_API_KEY`).
- **VehicleDatabases.com**: Provides labor guide API for repair pricing estimates (`VEHICLE_DATABASES_API_KEY`).
- **PartsTech**: Offers native parts search and ordering integration. This includes both a popup mode (using existing PartsTech shop account) and a full API mode for in-app search and direct part selection. Requires `PARTSTECH_USERNAME`, `PARTSTECH_API_KEY`, and optionally `PARTSTECH_PARTNER_ID`, `PARTSTECH_PARTNER_KEY` for full API access.
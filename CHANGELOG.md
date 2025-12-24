# Changelog

All notable changes to BayOPS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-rc.1] - 2024-12-24

### Added
- Public landing page for bayoperations.com with hero, features, AI showcase, and CTA sections
- Full mobile responsiveness with sidebar drawer, touch-friendly targets (44px minimum), iOS zoom prevention
- AI-powered Similar Jobs with engine compatibility matching
- VIN-based engine spec comparison using DataOne API
- CARFAX Service History integration with OEM maintenance correlation
- DataOne OEM Maintenance Schedule recommendations
- PartsTech parts ordering integration via Chrome extension
- Digital Vehicle Inspections (DVI) with AI-powered findings
- Job approval tracking with virtual signature links
- Deferred work management with automatic conversion from declined work
- Protractor data migration support
- Multi-tenant architecture with organization/location support
- Customer messaging via Telnyx SMS and email
- Comprehensive shop configuration (labor rates, markups, branding)

### Changed
- Improved engine matching using parsed specs (displacement, cylinders, configuration)
- Enhanced similar jobs search to query all historical repair orders
- Database refactor to normalized ro_jobs/ro_job_lines structure (Phase 2 complete)
- Public routing now shows landing page for unauthenticated visitors

### Fixed
- Shop fee calculations now properly use location settings (PERCENTAGE/FIXED methods, calculateOn options)
- Tax calculations now use configured rates from settings instead of hardcoded values
- Similar jobs AI fallback now properly finds timing jobs across all vehicles
- Client concerns deletion for legacy notes

## [1.0.0-beta] - 2024-12-23

### Added
- Initial MVP release
- Repair Order management with jobs/line items
- Customer and Vehicle management
- User authentication with role-based access
- Inspection templates and workflows
- Inventory management with stock tracking
- Invoicing and payment recording
- Basic reporting dashboard

---

## Version Numbering Guide

- **Major (1.x.x)**: Breaking changes or major feature releases
- **Minor (x.1.x)**: New features, backward compatible
- **Patch (x.x.1)**: Bug fixes and minor improvements

## Release Tags

- `v1.0.0-alpha` - Early development, testing features
- `v1.0.0-beta` - Feature complete, testing with users
- `v1.0.0-rc.1` - Release candidate, final testing
- `v1.0.0` - Production release

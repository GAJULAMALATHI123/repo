# IT Asset Lifecycle Manager

A SAP BTP application built with the SAP Cloud Application Programming Model (CAP), Node.js, CDS, and SAP Fiori Elements.

## Project status

This repository is being built in stages. The first commit establishes the CAP domain model and service foundation. Run and validate each stage in SAP Business Application Studio before using it in a production environment.

## Planned capabilities

- Asset inventory, categories, vendors, employees, and departments
- Asset assignment, transfer, and return
- Append-only ownership/lifecycle history
- Maintenance records and user-submitted maintenance requests
- Retirement and archival controls
- Separate Admin, Manager, and User service access
- Fiori Elements list reports and object pages
- Cloud Foundry / MTA deployment configuration

## Prerequisites

- Node.js supported by your SAP CAP toolchain
- SAP Business Application Studio with a Dev Space for SAP Cloud Application Programming Model
- SAP BTP subaccount for deployment
- SAP HANA Cloud for production persistence (SQLite is used for local development)

## Local setup

```bash
npm install
npm run watch
```

The CAP server exposes OData V4 services under `/odata/v4` when the service definitions are added and served by CAP.

## Important notes

- Configure XSUAA roles and bindings before deploying to a shared environment.
- Never commit credentials, service keys, or real employee/asset data.
- Maintenance requests are an extension to the supplied functional requirements so that Users can submit issues and authorized Admins/Managers can review them.
- This repository is a development starting point; deployment and end-to-end tests must be completed in the target BTP subaccount.

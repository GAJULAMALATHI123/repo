# IT Asset Lifecycle Manager

A SAP BTP project scaffold using the SAP Cloud Application Programming Model (CAP), Node.js, CDS, XSUAA, and an application router. The current browser screens are HTML prototypes; SAP Fiori Elements pages still need to be implemented.

## Project status

This repository is being built in stages. The first commit establishes the CAP domain model and service foundation. Run and validate each stage in SAP Business Application Studio before using it in a production environment.

## Planned capabilities

- Asset inventory, categories, vendors, employees, and departments
- Asset assignment, transfer, and return
- Append-only ownership/lifecycle history
- Maintenance records and user-submitted maintenance requests
- Retirement and archival controls
- Separate Admin, Manager, and User service access
- Planned Fiori Elements list reports and object pages (not implemented yet)
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

## BTP deployment preparation

The MTA now includes the CAP service, HANA HDI container, XSUAA service, destination service, and an application router that hosts the current HTML prototype. The HTML screens are not yet Fiori Elements pages.

Before deployment:

1. In the SAP BTP subaccount, enable Cloud Foundry and create/select an org and space.
2. Provision and start a SAP HANA Cloud database instance. The MTA creates the HDI container that connects to that database; it does not create the HANA Cloud database instance itself.
3. In SAP Business Application Studio, open this repository and run:

   ```bash
   npm install
   npm run build
   mbt build -p cf
   cf deploy mta_archives/it-asset-lifecycle-manager_0.1.0.mtar
   ```

4. In the BTP Cockpit, create role collections for Admin, Manager, and User using the role templates from `xs-security.json`, and assign the appropriate collection to each test account.
5. Verify that each account is redirected to its authorized workspace and that attempts to open another role's page or API endpoint are denied.

Do not treat deployment as production-ready until the app-router/MTA deployment and live HANA/XSUAA role tests pass. The automated GitHub workflow validates the CAP build and regression tests, but it does not deploy to your BTP subaccount.

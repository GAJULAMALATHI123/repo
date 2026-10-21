# IT Asset Lifecycle Manager

A SAP BTP project scaffold using the SAP Cloud Application Programming Model (CAP), Node.js, CDS, XSUAA, and an application router. The repository now includes role-specific SAP Fiori Elements OData V4 app scaffolds for Admin, Manager, and User, plus an Admin lifecycle-action workspace. These UI artifacts still require browser validation in SAP BTP.

## Project status

This repository is being built in stages. The first commit establishes the CAP domain model and service foundation. Run and validate each stage in SAP Business Application Studio before using it in a production environment.

## Planned capabilities

- Asset inventory, categories, vendors, employees, and departments
- Asset assignment, transfer, and return
- Append-only ownership/lifecycle history
- Maintenance records and user-submitted maintenance requests
- Retirement and archival controls
- Separate Admin, Manager, and User service access
- Role-specific Fiori Elements list reports for assets, requests, maintenance records, assignments, and master data
- Admin lifecycle action forms for assignment, transfer, return, request review, maintenance start/completion, retirement, and archival
- Role-protected Admin and Manager report centers with filtered asset, maintenance, and assignment previews, PDF downloads, and SMTP-based report email
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

The CAP services are exposed at `/admin`, `/manager`, and `/user`; the Admin and Manager services are defined in `srv/asset-service.cds` and `srv/manager-service.cds`. Development uses mocked authentication and SQLite; production is configured for XSUAA and SAP HANA.

## Important notes

- Configure XSUAA roles and bindings before deploying to a shared environment.
- Never commit credentials, service keys, or real employee/asset data.
- Maintenance requests are an extension to the supplied functional requirements so that Users can submit issues and authorized Admins/Managers can review them.
- PDF reports include title, generation timestamp, selected filters, and labeled data columns. Reports are limited to 1,000 rows; apply filters if a report exceeds this limit.
- Email delivery requires SMTP settings in the deployment environment: `SMTP_HOST`, optional `SMTP_PORT` (default `587`), optional `SMTP_SECURE` (`true` or `false`), `REPORT_EMAIL_FROM`, and `SMTP_USER` / `SMTP_PASS` when authentication is required. Configure secrets in the BTP environment; never commit credentials.
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


## Fiori Elements apps

The three Fiori Elements application sources are in `fiori/admin`, `fiori/manager`, and `fiori/user`. Their hosted copies are under `approuter/resources/fiori`. The Admin lifecycle action workspace is `approuter/resources/fiori/admin/actions.html`.

After deployment, use the role-specific application paths:

- Admin: `/fiori/admin/index.html`
- Manager: `/fiori/manager/index.html`
- User: `/fiori/user/index.html`

The login landing page checks the role-protected CAP endpoints and redirects to the matching Fiori Elements app. The Admin lifecycle-action link is available from the Admin application. Admin and Manager can open their `Reports / PDF Export` page to preview filtered reports, download a PDF, or email the PDF after SMTP is configured.

The app router protects each role path with its matching XSUAA scope. CAP UI annotations are defined in `srv/annotations.cds`. The current GitHub workflow checks automated regression tests and the CAP production build; it does not perform a live browser test against a deployed SAP BTP subaccount.

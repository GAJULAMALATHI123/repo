const cds = require('@sap/cds');
const { SELECT, INSERT } = cds.ql;

module.exports = class AssetUserService extends cds.ApplicationService {
  async init() {
    const { Assets, AssetAssignments, OwnershipLedgers, MaintenanceRequests } = this.entities;
    const Employees = cds.entities('itam.Employees');

    // Match the signed-in identity to an employee using email first, then username/ID.
    // Employee.email should contain the same email address configured for the user's IAS/XSUAA identity.
    const findCurrentEmployee = async (req) => {
      if (!req.user || !Employees) return null;
      const attrs = req.user.attr || {};
      const candidates = [...new Set([attrs.email, attrs.user_name, req.user.id].filter(Boolean).map(value => String(value).trim()))];
      if (!candidates.length) return null;
      const tx = cds.tx(req);
      for (const email of candidates) {
        const employee = await tx.run(SELECT.one.from(Employees).where({ email }));
        if (employee) return employee;
      }
      return null;
    };

    // Users may only read assets currently assigned to their employee record.
    this.before('READ', Assets, async (req) => {
      const employee = await findCurrentEmployee(req);
      if (!employee) return req.reject(403, 'Your login is not linked to an employee record.');
      req.query.where({ currentHolder_ID: employee.ID });
    });

    // Users may only read their own assignment records.
    this.before('READ', AssetAssignments, async (req) => {
      const employee = await findCurrentEmployee(req);
      if (!employee) return req.reject(403, 'Your login is not linked to an employee record.');
      req.query.where({ employee_ID: employee.ID });
    });

    // Users may submit requests but cannot edit or delete them after submission.
    this.before(['UPDATE', 'DELETE'], MaintenanceRequests, (req) => {
      return req.reject(403, 'Maintenance requests cannot be edited or deleted by users after submission.');
    });

    // Users may only read maintenance requests they submitted themselves.
    this.before('READ', MaintenanceRequests, (req) => {
      const userId = req.user?.id;
      if (!userId) return req.reject(403, 'Sign in to view your maintenance requests.');
      req.query.where({ requestedBy: userId });
    });

    // Show ledger history only for assets the employee currently holds or held.
    this.before('READ', OwnershipLedgers, async (req) => {
      const employee = await findCurrentEmployee(req);
      if (!employee) return req.reject(403, 'Your login is not linked to an employee record.');
      req.query.where({ toEmployee_ID: employee.ID });
    });

    this.before('CREATE', MaintenanceRequests, async (req) => {
      if (!req.data.asset_ID) req.error(400, 'Choose an asset for the maintenance request.');
      if (!req.data.issueType) req.error(400, 'Choose an issue type.');
      if (!req.data.description?.trim()) req.error(400, 'Describe the issue before submitting.');
      const employee = await findCurrentEmployee(req);
      if (!employee) return req.reject(403, 'Your login is not linked to an employee record.');
      const tx = cds.tx(req);
      const asset = req.data.asset_ID
        ? await tx.run(SELECT.one.from(Assets).where({ ID: req.data.asset_ID }))
        : null;
      if (!asset || asset.currentHolder_ID !== employee.ID) {
        return req.reject(403, 'You can only request maintenance for an asset currently assigned to you.');
      }
      req.data.priority = String(req.data.priority || 'MEDIUM').toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(req.data.priority)) {
        return req.reject(400, 'Priority must be LOW, MEDIUM, HIGH, or URGENT.');
      }
      req.data.status = 'SUBMITTED';
      req.data.submittedAt ||= new Date().toISOString();
      req.data.requestedBy = req.user?.id || 'authenticated-user';
    });

    this.on('submitRequest', 'MaintenanceRequests', async (req) => {
      const { assetID, issueType, description, priority } = req.data;
      if (!assetID || !issueType || !description?.trim()) {
        return req.reject(400, 'Asset, issue type, and description are required.');
      }
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'The selected asset was not found.');
      const employee = await findCurrentEmployee(req);
      if (!employee) return req.reject(403, 'Your login is not linked to an employee record.');
      if (asset.currentHolder_ID !== employee.ID) {
        return req.reject(403, 'You can only request maintenance for an asset currently assigned to you.');
      }
      if (['RETIRED', 'ARCHIVED'].includes(asset.status)) {
        return req.reject(400, 'Maintenance cannot be requested for a retired or archived asset.');
      }
      const requestID = cds.utils.uuid();
      const normalizedPriority = String(priority || 'MEDIUM').toUpperCase();
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(normalizedPriority)) {
        return req.reject(400, 'Priority must be LOW, MEDIUM, HIGH, or URGENT.');
      }
      await tx.run(INSERT.into(MaintenanceRequests).entries({
        ID: requestID,
        asset_ID: assetID,
        requestedBy: req.user?.id || 'authenticated-user',
        issueType: issueType.trim(),
        description: description.trim(),
        priority: normalizedPriority,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      }));
      return `Maintenance request submitted successfully. Request ID: ${requestID}`;
    });

    return super.init();
  }
};

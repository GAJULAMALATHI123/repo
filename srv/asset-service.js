const cds = require('@sap/cds');

const { SELECT, INSERT, UPDATE } = cds.ql;

module.exports = class AssetAdminService extends cds.ApplicationService {
  async init() {
    const { Assets, Employees, AssetAssignments, OwnershipLedgers,
      MaintenanceRecords, MaintenanceRequests, ArchiveRecords } = this.entities;

    this.before('CREATE', Assets, async (req) => {
      const data = req.data;
      if (!data.assetTag || !data.serialNumber || !data.category_ID || !data.purchaseDate) {
        req.error(400, 'Asset tag, serial number, category, and purchase date are required.');
      }
      if (!data.status) data.status = 'AVAILABLE';
      if (data.firstDistributionDate && data.purchaseDate &&
          new Date(data.firstDistributionDate) < new Date(data.purchaseDate)) {
        req.error(400, 'First distribution date cannot be earlier than purchase date.');
      }
    });

    this.before('CREATE', MaintenanceRequests, async (req) => {
      if (!req.data.description?.trim()) req.error(400, 'Please describe the maintenance issue.');
      if (!req.data.issueType) req.error(400, 'Issue type is required.');
      if (!req.data.status) req.data.status = 'SUBMITTED';
      if (!req.data.priority) req.data.priority = 'MEDIUM';
      if (!req.data.submittedAt) req.data.submittedAt = new Date().toISOString();
    });

    this.before(['UPDATE', 'DELETE'], OwnershipLedgers, (req) => {
      req.reject(403, 'Ownership ledger entries are immutable and cannot be changed or deleted.');
    });

    this.before('DELETE', ArchiveRecords, (req) => {
      req.reject(403, 'Archive records cannot be physically deleted.');
    });

    this.on('assignAsset', async (req) => {
      const { assetID, employeeID, assignedDate, expectedReturnDate } = req.data;
      if (!assetID || !employeeID || !assignedDate) return req.reject(400, 'Asset, employee, and assigned date are required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      const employee = await tx.run(SELECT.one.from(Employees).where({ ID: employeeID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (!employee || employee.status !== 'ACTIVE') return req.reject(400, 'Employee must exist and be active.');
      if (asset.status !== 'AVAILABLE') return req.reject(400, 'Only AVAILABLE assets can be assigned.');
      if (new Date(assignedDate) < new Date(asset.purchaseDate)) return req.reject(400, 'Assignment date cannot be earlier than purchase date.');
      await tx.run(INSERT.into(AssetAssignments).entries({ asset_ID: assetID, employee_ID: employeeID, assignedDate, expectedReturnDate, assignmentStatus: 'ACTIVE' }));
      await tx.run(UPDATE(Assets).set({ status: 'ASSIGNED', currentHolder_ID: employeeID, firstDistributionDate: asset.firstDistributionDate || assignedDate }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({ asset_ID: assetID, action: 'ASSIGNED', toEmployee_ID: employeeID, transitionDate: new Date(assignedDate).toISOString() }));
      return 'Asset assigned successfully.';
    });

    this.on('returnAsset', async (req) => {
      const { assetID, returnDate } = req.data;
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (asset.status !== 'ASSIGNED') return req.reject(400, 'Only assigned assets can be returned.');
      const assignment = await tx.run(SELECT.one.from(AssetAssignments).where({ asset_ID: assetID, assignmentStatus: 'ACTIVE' }));
      if (!assignment) return req.reject(404, 'Active assignment not found.');
      const date = returnDate || new Date().toISOString().slice(0, 10);
      await tx.run(UPDATE(AssetAssignments).set({ actualReturnDate: date, assignmentStatus: 'RETURNED' }).where({ ID: assignment.ID }));
      await tx.run(UPDATE(Assets).set({ status: 'AVAILABLE', currentHolder_ID: null }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({ asset_ID: assetID, action: 'RETURNED', fromEmployee_ID: assignment.employee_ID, transitionDate: new Date(date).toISOString() }));
      return 'Asset returned successfully.';
    });

    return super.init();
  }
};

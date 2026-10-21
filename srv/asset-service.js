const cds = require('@sap/cds');
const { SELECT, INSERT, UPDATE } = cds.ql;

module.exports = class AssetAdminService extends cds.ApplicationService {
  async init() {
    const {
      Assets, Employees, AssetAssignments, OwnershipLedgers,
      MaintenanceRecords, MaintenanceRequests, ArchiveRecords
    } = this.entities;

    this.before('CREATE', Assets, (req) => {
      const d = req.data;
      if (!d.assetTag || !d.serialNumber || !d.category_ID || !d.purchaseDate) {
        req.error(400, 'Asset tag, serial number, category, and purchase date are required.');
      }
      d.status ||= 'AVAILABLE';
      if (d.firstDistributionDate && d.purchaseDate &&
          new Date(d.firstDistributionDate) < new Date(d.purchaseDate)) {
        req.error(400, 'First distribution date cannot be earlier than purchase date.');
      }
    });

    this.before('CREATE', MaintenanceRequests, (req) => {
      if (!req.data.description?.trim()) req.error(400, 'Please describe the maintenance issue.');
      if (!req.data.issueType) req.error(400, 'Issue type is required.');
      req.data.status ||= 'SUBMITTED';
      req.data.priority ||= 'MEDIUM';
      req.data.submittedAt ||= new Date().toISOString();
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
      if (expectedReturnDate && new Date(expectedReturnDate) < new Date(assignedDate)) return req.reject(400, 'Expected return date cannot be earlier than assignment date.');
      await tx.run(INSERT.into(AssetAssignments).entries({
        asset_ID: assetID, employee_ID: employeeID, assignedDate,
        expectedReturnDate, assignmentStatus: 'ACTIVE'
      }));
      await tx.run(UPDATE(Assets).set({
        status: 'ASSIGNED', currentHolder_ID: employeeID,
        firstDistributionDate: asset.firstDistributionDate || assignedDate
      }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({
        asset_ID: assetID, action: 'ASSIGNED', toEmployee_ID: employeeID,
        transitionDate: new Date(assignedDate).toISOString()
      }));
      return 'Asset assigned successfully.';
    });

    this.on('transferAsset', async (req) => {
      const { assetID, employeeID, transitionDate } = req.data;
      if (!assetID || !employeeID || !transitionDate) return req.reject(400, 'Asset, new employee, and transfer date are required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (asset.status !== 'ASSIGNED' || !asset.currentHolder_ID) return req.reject(400, 'Only assigned assets can be transferred.');
      if (asset.currentHolder_ID === employeeID) return req.reject(400, 'Choose a different employee for the transfer.');
      const employee = await tx.run(SELECT.one.from(Employees).where({ ID: employeeID }));
      if (!employee || employee.status !== 'ACTIVE') return req.reject(400, 'New employee must exist and be active.');
      const active = await tx.run(SELECT.one.from(AssetAssignments).where({ asset_ID: assetID, assignmentStatus: 'ACTIVE' }));
      if (!active) return req.reject(409, 'Active assignment record is missing; transfer was not completed.');
      if (new Date(transitionDate) < new Date(active.assignedDate)) return req.reject(400, 'Transfer date cannot be earlier than the current assignment date.');
      await tx.run(UPDATE(AssetAssignments).set({ actualReturnDate: transitionDate, assignmentStatus: 'TRANSFERRED' }).where({ ID: active.ID }));
      await tx.run(INSERT.into(AssetAssignments).entries({
        asset_ID: assetID, employee_ID: employeeID, assignedDate: transitionDate, assignmentStatus: 'ACTIVE'
      }));
      await tx.run(UPDATE(Assets).set({ currentHolder_ID: employeeID }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({
        asset_ID: assetID, action: 'TRANSFERRED', fromEmployee_ID: active.employee_ID,
        toEmployee_ID: employeeID, transitionDate: new Date(transitionDate).toISOString()
      }));
      return 'Asset transferred successfully.';
    });

    this.on('returnAsset', async (req) => {
      const { assetID, returnDate } = req.data;
      if (!assetID) return req.reject(400, 'Asset is required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (asset.status !== 'ASSIGNED') return req.reject(400, 'Only assigned assets can be returned.');
      const assignment = await tx.run(SELECT.one.from(AssetAssignments).where({ asset_ID: assetID, assignmentStatus: 'ACTIVE' }));
      if (!assignment) return req.reject(404, 'Active assignment not found.');
      const date = returnDate || new Date().toISOString().slice(0, 10);
      if (new Date(date) < new Date(assignment.assignedDate)) return req.reject(400, 'Return date cannot be earlier than assignment date.');
      await tx.run(UPDATE(AssetAssignments).set({ actualReturnDate: date, assignmentStatus: 'RETURNED' }).where({ ID: assignment.ID }));
      await tx.run(UPDATE(Assets).set({ status: 'AVAILABLE', currentHolder_ID: null }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({
        asset_ID: assetID, action: 'RETURNED', fromEmployee_ID: assignment.employee_ID,
        transitionDate: new Date(date).toISOString()
      }));
      return 'Asset returned successfully.';
    });

    this.on('startMaintenance', async (req) => {
      const { assetID, maintenanceType, requestID } = req.data;
      if (!assetID || !maintenanceType?.trim()) return req.reject(400, 'Asset and maintenance type are required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (['RETIRED', 'ARCHIVED'].includes(asset.status)) return req.reject(400, 'Retired or archived assets cannot enter maintenance.');
      if (asset.status === 'UNDER_MAINTENANCE') return req.reject(400, 'This asset is already under maintenance.');
      let request;
      if (requestID) {
        request = await tx.run(SELECT.one.from(MaintenanceRequests).where({ ID: requestID }));
        if (!request || request.asset_ID !== assetID) return req.reject(400, 'Maintenance request does not match this asset.');
        if (request.status !== 'APPROVED') return req.reject(400, 'Only an approved maintenance request can be started.');
      }
      const maintenanceID = cds.utils.uuid();
      await tx.run(INSERT.into(MaintenanceRecords).entries({
        ID: maintenanceID,
        asset_ID: assetID, type: maintenanceType.trim(),
        reportedDate: new Date().toISOString().slice(0, 10), status: 'IN_PROGRESS'
      }));
      await tx.run(UPDATE(Assets).set({ status: 'UNDER_MAINTENANCE' }).where({ ID: assetID }));
      if (requestID) await tx.run(UPDATE(MaintenanceRequests).set({
        status: 'IN_PROGRESS', reviewedAt: new Date().toISOString(), maintenance_ID: maintenanceID
      }).where({ ID: requestID }));
      return 'Maintenance started successfully.';
    });

    this.on('completeMaintenance', async (req) => {
      const { maintenanceID, completedDate, outcome, cost } = req.data;
      if (!maintenanceID || !completedDate || !outcome?.trim()) return req.reject(400, 'Maintenance record, completion date, and outcome are required.');
      const tx = cds.tx(req);
      const record = await tx.run(SELECT.one.from(MaintenanceRecords).where({ ID: maintenanceID }));
      if (!record) return req.reject(404, 'Maintenance record not found.');
      if (record.status !== 'IN_PROGRESS') return req.reject(400, 'Only in-progress maintenance can be completed.');
      if (new Date(completedDate) < new Date(record.reportedDate)) return req.reject(400, 'Completion date cannot be earlier than reported date.');
      await tx.run(UPDATE(MaintenanceRecords).set({ status: 'COMPLETED', completedDate, outcome: outcome.trim(), cost }).where({ ID: maintenanceID }));
      const remaining = await tx.run(SELECT.one.from(MaintenanceRecords).where({ asset_ID: record.asset_ID, status: 'IN_PROGRESS' }));
      if (!remaining || remaining.ID === maintenanceID) {
        const asset = await tx.run(SELECT.one.from(Assets).where({ ID: record.asset_ID }));
        const restoredStatus = asset?.currentHolder_ID ? 'ASSIGNED' : 'AVAILABLE';
        await tx.run(UPDATE(Assets).set({ status: restoredStatus }).where({ ID: record.asset_ID, status: 'UNDER_MAINTENANCE' }));
      }
      const request = await tx.run(SELECT.one.from(MaintenanceRequests).where({ maintenance_ID: maintenanceID }));
      if (request) await tx.run(UPDATE(MaintenanceRequests).set({
        status: 'RESOLVED', resolutionNotes: outcome.trim(), reviewedAt: new Date().toISOString()
      }).where({ ID: request.ID }));
      return 'Maintenance completed successfully.';
    });

    this.on('reviewMaintenanceRequest', async (req) => {
      const { requestID, decision, notes } = req.data;
      if (!requestID || !['APPROVE', 'REJECT'].includes(String(decision || '').toUpperCase())) {
        return req.reject(400, 'Request ID and APPROVE or REJECT decision are required.');
      }
      const tx = cds.tx(req);
      const request = await tx.run(SELECT.one.from(MaintenanceRequests).where({ ID: requestID }));
      if (!request) return req.reject(404, 'Maintenance request not found.');
      if (!['SUBMITTED', 'UNDER_REVIEW'].includes(request.status)) return req.reject(400, 'Only submitted or under-review requests can be reviewed.');
      const approved = String(decision).toUpperCase() === 'APPROVE';
      await tx.run(UPDATE(MaintenanceRequests).set({
        status: approved ? 'APPROVED' : 'REJECTED',
        reviewedBy: req.user?.id || 'admin',
        reviewedAt: new Date().toISOString(),
        resolutionNotes: notes || (approved ? 'Request approved.' : 'Request rejected.')
      }).where({ ID: requestID }));
      return approved ? 'Maintenance request approved. Start maintenance when work begins.' : 'Maintenance request rejected.';
    });

    this.on('retireAsset', async (req) => {
      const { assetID, reason, retirementDate } = req.data;
      if (!assetID || !reason?.trim() || !retirementDate) return req.reject(400, 'Asset, reason, and retirement date are required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (['ASSIGNED', 'UNDER_MAINTENANCE', 'ARCHIVED'].includes(asset.status)) return req.reject(400, 'Return the asset and finish maintenance before retirement.');
      await tx.run(UPDATE(Assets).set({ status: 'RETIRED', currentHolder_ID: null }).where({ ID: assetID }));
      await tx.run(INSERT.into(OwnershipLedgers).entries({
        asset_ID: assetID, action: 'RETIRED', transitionDate: new Date(retirementDate).toISOString(), notes: reason.trim()
      }));
      return 'Asset retired successfully.';
    });

    this.on('archiveAsset', async (req) => {
      const { assetID, reason, disposalMethod } = req.data;
      if (!assetID || !reason?.trim()) return req.reject(400, 'Asset and archive reason are required.');
      const tx = cds.tx(req);
      const asset = await tx.run(SELECT.one.from(Assets).where({ ID: assetID }));
      if (!asset) return req.reject(404, 'Asset not found.');
      if (asset.status !== 'RETIRED') return req.reject(400, 'Only retired assets can be archived.');
      await tx.run(INSERT.into(ArchiveRecords).entries({
        asset_ID: assetID, archivedAt: new Date().toISOString(),
        archivedBy: req.user?.id || 'admin', reason: reason.trim(), disposalMethod
      }));
      await tx.run(UPDATE(Assets).set({ status: 'ARCHIVED' }).where({ ID: assetID }));
      return 'Asset archived successfully.';
    });

    return super.init();
  }
};

const cds = require('@sap/cds');
const { SELECT, INSERT } = cds.ql;

module.exports = class AssetUserService extends cds.ApplicationService {
  async init() {
    const { Assets, MaintenanceRequests } = this.entities;

    this.before('CREATE', MaintenanceRequests, async (req) => {
      if (!req.data.asset_ID) req.error(400, 'Choose an asset for the maintenance request.');
      if (!req.data.issueType) req.error(400, 'Choose an issue type.');
      if (!req.data.description?.trim()) req.error(400, 'Describe the issue before submitting.');
      if (!['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(req.data.priority || 'MEDIUM')) {
        req.error(400, 'Priority must be LOW, MEDIUM, HIGH, or URGENT.');
      }
      req.data.priority ||= 'MEDIUM';
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

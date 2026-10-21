const cds = require('@sap/cds');
const reports = require('./report-utils');

module.exports = class AssetManagerService extends cds.ApplicationService {
  async init() {
    this.on('getReportData', async (req) => {
      try { return await reports.getReportData(req); }
      catch (error) { return req.reject(error.statusCode || 500, error.message || 'Could not generate report data.'); }
    });
    this.on('generateReport', async (req) => {
      try { return await reports.createReport(req); }
      catch (error) { return req.reject(error.statusCode || 500, error.message || 'Could not generate PDF report.'); }
    });
    this.on('emailReport', async (req) => {
      try { return await reports.emailReport(req); }
      catch (error) { return req.reject(error.statusCode || 500, error.message || 'Could not email report.'); }
    });
    return super.init();
  }
};

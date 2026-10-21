const cds = require('@sap/cds');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const { SELECT } = cds.ql;

const VALID_TYPES = new Set(['assets', 'maintenance', 'assignments']);
const DATE_FIELDS = { assets: 'purchaseDate', maintenance: 'reportedDate', assignments: 'assignedDate' };
const TITLES = { assets: 'Asset Inventory Report', maintenance: 'Maintenance Report', assignments: 'Asset Assignment Report' };

function clean(value) {
  return value == null || value === '' ? '' : String(value);
}
function inDateRange(value, from, to) {
  if (!value) return !from && !to;
  const date = String(value).slice(0, 10);
  return (!from || date >= String(from).slice(0, 10)) && (!to || date <= String(to).slice(0, 10));
}
function validateArgs(args = {}) {
  const type = String(args.reportType || 'assets').toLowerCase();
  if (!VALID_TYPES.has(type)) throw Object.assign(new Error('Choose Assets, Maintenance, or Assignments as the report type.'), { statusCode: 400 });
  if (args.dateFrom && args.dateTo && String(args.dateFrom) > String(args.dateTo)) {
    throw Object.assign(new Error('Start date cannot be later than end date.'), { statusCode: 400 });
  }
  return { ...args, reportType: type };
}

async function getReportData(req, input = req.data) {
  const args = validateArgs(input);
  const tx = cds.tx(req);
  const { reportType, status, categoryID, location, dateFrom, dateTo } = args;
  const Assets = cds.entities('itam.Assets');
  const Employees = cds.entities('itam.Employees');
  const Categories = cds.entities('itam.AssetCategories');
  const MaintenanceRecords = cds.entities('itam.MaintenanceRecords');
  const AssetAssignments = cds.entities('itam.AssetAssignments');
  const [assets, employees, categories] = await Promise.all([
    tx.run(SELECT.from(Assets)),
    tx.run(SELECT.from(Employees)),
    tx.run(SELECT.from(Categories))
  ]);
  const assetById = new Map(assets.map(x => [x.ID, x]));
  const employeeById = new Map(employees.map(x => [x.ID, x]));
  const categoryById = new Map(categories.map(x => [x.ID, x]));
  const typeRows = reportType === 'assets'
    ? assets
    : await tx.run(SELECT.from(reportType === 'maintenance' ? MaintenanceRecords : AssetAssignments));
  const rows = [];
  for (const item of typeRows) {
    const asset = reportType === 'assets' ? item : assetById.get(item.asset_ID);
    if (!asset) continue;
    const rowStatus = reportType === 'assets' ? item.status : reportType === 'maintenance' ? item.status : item.assignmentStatus;
    const category = categoryById.get(asset.category_ID);
    const holder = employeeById.get(reportType === 'assignments' ? item.employee_ID : asset.currentHolder_ID);
    const rowLocation = holder?.location || '';
    const dateValue = item[DATE_FIELDS[reportType]];
    if (status && String(rowStatus || '').toLowerCase() !== String(status).toLowerCase()) continue;
    if (categoryID && asset.category_ID !== categoryID) continue;
    if (location && !rowLocation.toLowerCase().includes(String(location).trim().toLowerCase())) continue;
    if ((dateFrom || dateTo) && !inDateRange(dateValue, dateFrom, dateTo)) continue;
    rows.push({
      assetTag: clean(asset.assetTag),
      serialNumber: clean(asset.serialNumber),
      model: clean(asset.model),
      category: clean(category?.name),
      status: clean(rowStatus),
      owner: clean(holder?.fullName),
      location: clean(rowLocation),
      date: clean(dateValue),
      details: reportType === 'assets'
        ? ['Purchase cost: ' + clean(item.purchaseCost), 'Warranty expiry: ' + clean(item.warrantyExpiry)].filter(x => !x.endsWith(': ')).join('; ')
        : reportType === 'maintenance'
          ? ['Type: ' + clean(item.type), 'Outcome: ' + clean(item.outcome), 'Cost: ' + clean(item.cost)].filter(x => !x.endsWith(': ')).join('; ')
          : ['Expected return: ' + clean(item.expectedReturnDate), 'Actual return: ' + clean(item.actualReturnDate)].filter(x => !x.endsWith(': ')).join('; ')
    });
  }
  if (rows.length > 1000) {
    throw Object.assign(new Error('This report contains more than 1,000 records. Apply filters to narrow the report before exporting.'), { statusCode: 413 });
  }
  return rows;
}

function makePdf(reportType, rows, args, generatedAt) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, autoFirstPage: true });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(18).font('Helvetica-Bold').text(TITLES[reportType] || 'Asset Report');
      doc.moveDown(0.35).fontSize(9).font('Helvetica').text('Generated: ' + generatedAt.toISOString());
      const filters = [
        ['Status', args.status], ['Category ID', args.categoryID], ['Location contains', args.location],
        ['Date from', args.dateFrom], ['Date to', args.dateTo]
      ].filter(([, value]) => value);
      doc.moveDown(0.4).font('Helvetica-Bold').text('Selected filters');
      doc.font('Helvetica').text(filters.length ? filters.map(([key, value]) => key + ': ' + value).join(' | ') : 'No filters applied');
      doc.moveDown(0.7).font('Helvetica-Bold').text('Report data (' + rows.length + ' rows)');
      doc.moveDown(0.25);
      const columns = [
        ['Asset Tag', 'assetTag'], ['Serial Number', 'serialNumber'], ['Model', 'model'],
        ['Category', 'category'], ['Status', 'status'], ['Owner', 'owner'],
        ['Location', 'location'], ['Date', 'date'], ['Details', 'details']
      ];
      doc.font('Helvetica-Bold').fontSize(8).text(columns.map(c => c[0]).join('  |  '));
      doc.moveDown(0.15).font('Helvetica').fontSize(7);
      if (!rows.length) doc.text('No records match the selected filters.');
      rows.forEach((row, index) => {
        const line = columns.map(([, key]) => clean(row[key]).replace(/[\r\n]+/g, ' ').slice(0, 90) || '—').join('  |  ');
        doc.text((index + 1) + '. ' + line, { width: 510 });
        doc.moveDown(0.15);
      });
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function createReport(req, input = req.data) {
  const args = validateArgs(input);
  const rows = await getReportData(req, args);
  const generatedAt = new Date();
  const pdf = await makePdf(args.reportType, rows, args, generatedAt);
  return {
    fileName: (TITLES[args.reportType] || 'Asset Report').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + generatedAt.toISOString().slice(0, 10) + '.pdf',
    contentType: 'application/pdf',
    generatedAt: generatedAt.toISOString(),
    base64: pdf.toString('base64')
  };
}

async function emailReport(req, input = req.data) {
  const args = validateArgs(input);
  const recipients = [...new Set(String(args.recipients || '').split(/[;,]/).map(x => x.trim()).filter(Boolean))];
  if (!recipients.length || recipients.length > 10 || recipients.some(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) {
    throw Object.assign(new Error('Enter between 1 and 10 valid recipient email addresses.'), { statusCode: 400 });
  }
  const host = process.env.SMTP_HOST;
  const from = process.env.REPORT_EMAIL_FROM || process.env.SMTP_USER;
  if (!host || !from) {
    throw Object.assign(new Error('Email is not configured. Set SMTP_HOST and REPORT_EMAIL_FROM (and SMTP credentials if required) in the deployment environment.'), { statusCode: 503 });
  }
  const file = await createReport(req, args);
  const options = {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
  };
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    options.auth = { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  const transport = nodemailer.createTransport(options);
  try {
    await transport.sendMail({
      from,
      to: recipients,
      subject: TITLES[args.reportType] || 'Asset Report',
      text: 'Attached is the requested report generated by IT Asset Lifecycle Manager. It contains only records available to your authorized report service and the selected filters.',
      attachments: [{ filename: file.fileName, content: Buffer.from(file.base64, 'base64'), contentType: 'application/pdf' }]
    });
    return 'Report email sent successfully to ' + recipients.length + ' recipient(s).';
  } catch (error) {
    throw Object.assign(new Error('Report email failed. Check SMTP configuration and recipient addresses, then try again.'), { statusCode: 502 });
  } finally {
    transport.close();
  }
}

module.exports = { getReportData, createReport, emailReport, validateArgs };

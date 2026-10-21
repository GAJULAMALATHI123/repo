const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('CAP project manifest exists', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'it-asset-lifecycle-manager');
  assert.ok(pkg.dependencies['@sap/cds']);
});

test('core CDS model and service definitions exist', () => {
  assert.ok(fs.existsSync(path.join(root, 'db', 'schema.cds')));
  assert.ok(fs.existsSync(path.join(root, 'srv', 'asset-service.cds')));
  assert.ok(fs.existsSync(path.join(root, 'srv', 'asset-service.js')));
});

test('XSUAA role templates are defined', () => {
  const security = JSON.parse(fs.readFileSync(path.join(root, 'xs-security.json'), 'utf8'));
  const names = security['role-templates'].map(role => role.name);
  assert.deepEqual(names, ['Admin', 'Manager', 'User']);
});


test('production CAP authentication uses XSUAA', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.cds.requires.auth.kind, 'xsuaa');
  const devConfig = JSON.parse(fs.readFileSync(path.join(root, '.cdsrc.json'), 'utf8'));
  assert.equal(devConfig.requires.auth['[development]'].kind, 'mocked');
});


test('user maintenance service validates priority and asset ownership', () => {
  const userService = fs.readFileSync(path.join(root, 'srv', 'user-service.js'), 'utf8');
  assert.match(userService, /toUpperCase\(\)/);
  assert.match(userService, /LOW.*MEDIUM.*HIGH.*URGENT/);
  assert.match(userService, /currently assigned to you/);
  assert.match(userService, /findCurrentEmployee/);
});


test('maintenance workflow is wired across user, admin, and manager dashboards', () => {
  const userUi = fs.readFileSync(path.join(root, 'app', 'app.js'), 'utf8');
  const adminUi = fs.readFileSync(path.join(root, 'app', 'admin.js'), 'utf8');
  const managerUi = fs.readFileSync(path.join(root, 'app', 'manager.js'), 'utf8');
  const adminService = fs.readFileSync(path.join(root, 'srv', 'asset-service.js'), 'utf8');
  assert.match(userUi, /fetch\('\/user\/MaintenanceRequests'/);
  assert.match(userUi, /openRequestCount/);
  assert.match(adminUi, /reviewMaintenanceRequest/);
  assert.match(adminUi, /APPROVE/);
  assert.match(adminUi, /REJECT/);
  assert.match(managerUi, /\/manager\/MaintenanceRequests/);
  assert.match(managerUi, /setInterval\(loadManagerDashboard, 30000\)/);
  assert.match(adminService, /this\.on\('reviewMaintenanceRequest'/);
});

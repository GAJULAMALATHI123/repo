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

test('production CAP authentication and database use XSUAA and HANA', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.cds.requires.auth['[production]'].kind, 'xsuaa');
  assert.equal(pkg.cds.requires.db['[production]'].kind, 'hana');
  assert.ok(pkg.dependencies['@cap-js/hana']);
  const devConfig = JSON.parse(fs.readFileSync(path.join(root, '.cdsrc.json'), 'utf8'));
  assert.equal(devConfig.requires.auth['[development]'].kind, 'mocked');
  assert.equal(devConfig.requires.db['[development]'].kind, 'sqlite');
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
  assert.match(userUi, /fetch\('\/user\/MaintenanceRequests/);
  assert.match(userUi, /openRequestCount/);
  assert.match(adminUi, /reviewMaintenanceRequest/);
  assert.match(adminUi, /APPROVE/);
  assert.match(adminUi, /REJECT/);
  assert.match(managerUi, /\/manager\/MaintenanceRequests/);
  assert.match(managerUi, /setInterval\(loadManagerDashboard, 30000\)/);
  assert.match(adminService, /this\.on\('reviewMaintenanceRequest'/);
});

test('Admin dashboard refresh timer is registered at page load', () => {
  const adminUi = fs.readFileSync(path.join(root, 'app', 'admin.js'), 'utf8');
  const reviewBlock = adminUi.slice(0, adminUi.indexOf('async function getRows'));
  assert.equal(reviewBlock.includes('setInterval(loadAdminDashboard, 30000)'), false);
  assert.match(adminUi, /loadAdminDashboard\(\);\s*setInterval\(loadAdminDashboard, 30000\);\s*$/);
});

test('application router protects role pages and API routes with matching scopes', () => {
  const router = JSON.parse(fs.readFileSync(path.join(root, 'approuter', 'xs-app.json'), 'utf8'));
  const findApiRoute = (scope) => router.routes.find(route => route.destination === 'srv-api' && route.scope?.[0] === scope);
  const findPageRoute = (target) => router.routes.find(route => route.target === target && route.localDir === 'resources');
  assert.ok(findApiRoute('$XSAPPNAME.Admin')?.forwardAuthToken);
  assert.ok(findApiRoute('$XSAPPNAME.Manager')?.forwardAuthToken);
  assert.ok(findApiRoute('$XSAPPNAME.User')?.forwardAuthToken);
  assert.deepEqual(findPageRoute('/admin.html').scope, ['$XSAPPNAME.Admin']);
  assert.deepEqual(findPageRoute('/manager.html').scope, ['$XSAPPNAME.Manager']);
  assert.deepEqual(findPageRoute('/index.html').scope, ['$XSAPPNAME.User']);
});

test('maintenance workflow requires approval and restores the assigned status', () => {
  const adminService = fs.readFileSync(path.join(root, 'srv', 'asset-service.js'), 'utf8');
  const userService = fs.readFileSync(path.join(root, 'srv', 'user-service.js'), 'utf8');
  assert.match(adminService, /request\.status !== 'APPROVED'/);
  assert.match(adminService, /asset\?\.currentHolder_ID \? 'ASSIGNED' : 'AVAILABLE'/);
  assert.match(userService, /Maintenance requests cannot be edited or deleted by users/);
  assert.match(userService, /attrs\.email/);
});


test('three role-specific Fiori Elements apps are configured', () => {
  for (const role of ['admin', 'manager', 'user']) {
    const dir = path.join(root, 'fiori', role);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    assert.ok(manifest['sap.app'].dataSources);
    assert.ok(manifest['sap.ui5'].models['']);
    assert.ok(manifest['sap.ui5'].routing.routes.length >= 2);
    assert.ok(fs.existsSync(path.join(dir, 'Component.js')));
    assert.ok(fs.existsSync(path.join(root, 'approuter', 'resources', 'fiori', role, 'manifest.json')));
  }
});

test('Fiori Elements routes and Admin lifecycle action forms are hosted behind role protection', () => {
  const router = JSON.parse(fs.readFileSync(path.join(root, 'approuter', 'xs-app.json'), 'utf8'));
  for (const role of ['admin', 'manager', 'user']) {
    const route = router.routes.find(item => item.source === '^/fiori/' + role + '/(.*)$');
    assert.ok(route, 'Missing ' + role + ' Fiori route');
    assert.deepEqual(route.scope, ['$XSAPPNAME.' + (role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'User')]);
  }
  const actions = fs.readFileSync(path.join(root, 'approuter', 'resources', 'fiori', 'admin', 'actions.html'), 'utf8');
  for (const action of ['assignAsset', 'transferAsset', 'returnAsset', 'reviewMaintenanceRequest', 'startMaintenance', 'completeMaintenance', 'retireAsset', 'archiveAsset']) {
    assert.match(actions, new RegExp('data-action="' + action + '"'));
  }
  assert.ok(fs.existsSync(path.join(root, 'srv', 'annotations.cds')));
});

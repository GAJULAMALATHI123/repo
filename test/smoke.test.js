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

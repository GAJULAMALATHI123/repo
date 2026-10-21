async function getRows(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const body = await response.json();
  return body.value || [];
}
function putCount(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value); }
function cell(row, value) { const td = document.createElement('td'); td.style.padding = '12px'; td.style.borderBottom = '1px solid #e0e7ef'; td.textContent = value == null ? '—' : String(value); row.appendChild(td); }
async function loadAdminDashboard() {
  const status = document.getElementById('adminStatus');
  const tbody = document.getElementById('adminRequestRows');
  try {
    const [assets, requests] = await Promise.all([getRows('/admin/Assets?$select=ID,assetTag,status'), getRows('/admin/MaintenanceRequests?$select=ID,asset_ID,priority,status,issueType,submittedAt')]);
    const assetTags = new Map(assets.map(asset => [asset.ID, asset.assetTag || asset.ID]));
    putCount('totalAssets', assets.length);
    putCount('pendingRequests', requests.filter(x => x.status === 'SUBMITTED').length);
    putCount('underMaintenance', assets.filter(x => x.status === 'UNDER_MAINTENANCE').length);
    tbody.replaceChildren();
    if (!requests.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.style.padding = '16px'; td.textContent = 'No maintenance requests found.'; tr.appendChild(td); tbody.appendChild(tr);
    } else {
      requests.forEach((request) => {
        const tr = document.createElement('tr');
        cell(tr, request.ID); cell(tr, assetTags.get(request.asset_ID) || request.asset_ID); cell(tr, request.priority); cell(tr, request.status); cell(tr, 'Review action will be enabled after backend authorization is verified.');
        tbody.appendChild(tr);
      });
    }
    status.textContent = 'CAP data loaded. Request approval actions are not enabled in this prototype yet.';
  } catch (error) {
    status.textContent = 'Could not load live data. Check that the CAP app is running, the URL is same-origin, and your account has the Admin role.';
    tbody.replaceChildren();
    const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.style.padding = '16px'; td.textContent = 'Data unavailable until the Admin CAP service is reachable and authorized.'; tr.appendChild(td); tbody.appendChild(tr);
  }
}
loadAdminDashboard();

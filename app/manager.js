async function getRows(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const body = await response.json();
  return body.value || [];
}
function putCount(id, value) { const el = document.getElementById(id); if (el) el.textContent = String(value); }
function addCell(row, value) { const td = document.createElement('td'); td.style.padding = '12px'; td.style.borderBottom = '1px solid #e0e7ef'; td.textContent = value == null ? '—' : String(value); row.appendChild(td); }
async function loadManagerDashboard() {
  const status = document.getElementById('managerStatus');
  const tbody = document.getElementById('managerRequestRows');
  try {
    const [assets, requests] = await Promise.all([getRows('/manager/Assets?$select=ID,assetTag,status'), getRows('/manager/MaintenanceRequests?$select=ID,asset_ID,issueType,priority,status')]);
    const assetTags = new Map(assets.map(asset => [asset.ID, asset.assetTag || asset.ID]));
    putCount('availableAssets', assets.filter(x => x.status === 'AVAILABLE').length);
    putCount('assignedAssets', assets.filter(x => x.status === 'ASSIGNED').length);
    putCount('openRequests', requests.filter(x => !['RESOLVED','REJECTED'].includes(x.status)).length);
    tbody.replaceChildren();
    if (!requests.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.style.padding = '16px'; td.textContent = 'No maintenance requests found.'; tr.appendChild(td); tbody.appendChild(tr);
    } else {
      requests.forEach((request) => {
        const tr = document.createElement('tr');
        addCell(tr, request.ID); addCell(tr, assetTags.get(request.asset_ID) || request.asset_ID); addCell(tr, request.issueType); addCell(tr, request.priority); addCell(tr, request.status);
        tbody.appendChild(tr);
      });
    }
    status.textContent = 'CAP data loaded in read-only mode.';
  } catch (error) {
    status.textContent = 'Could not load live data. Check that the CAP app is running, the URL is same-origin, and your account has the Manager role.';
    tbody.replaceChildren();
    const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5; td.style.padding = '16px'; td.textContent = 'Data unavailable until the Manager CAP service is reachable and authorized.'; tr.appendChild(td); tbody.appendChild(tr);
  }
}
loadManagerDashboard();

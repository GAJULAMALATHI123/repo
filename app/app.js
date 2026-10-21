const tabs = [...document.querySelectorAll('nav button[data-view]')];
const panels = [...document.querySelectorAll('.panel')];

tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((item) => item.classList.toggle('active', item === tab));
  panels.forEach((panel) => panel.classList.toggle('hidden', panel.id !== tab.dataset.view));
}));

const assetSelect = document.querySelector('#assetSelect');
const message = document.querySelector('#message');
const connectionStatus = document.querySelector('#connectionStatus');
const assetsStatus = document.querySelector('#assetsStatus');

async function loadAssets() {
  try {
    const response = await fetch('/user/Assets?$select=ID,assetTag,model,status', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('CAP service returned HTTP ' + response.status);
    const payload = await response.json();
    const assets = payload.value || [];
    assetSelect.innerHTML = '<option value="">Choose an asset</option>';
    assets.forEach((asset) => {
      const option = document.createElement('option');
      option.value = asset.ID;
      option.textContent = [asset.assetTag, asset.model, asset.status].filter(Boolean).join(' — ');
      assetSelect.appendChild(option);
    });
    if (!assets.length) {
      assetSelect.innerHTML = '<option value="">No assets available</option>';
      connectionStatus.textContent = 'Connected to CAP, but no assets were returned.';
    } else {
      connectionStatus.textContent = 'Connected to the CAP service. Select an asset to raise a request.';
    }
  } catch (error) {
    assetSelect.innerHTML = '<option value="">Assets could not be loaded</option>';
    connectionStatus.textContent = 'CAP service is not reachable yet. Start/deploy the CAP service and open this page from the same application host.';
    assetsStatus.textContent = 'Asset assignments will be available after CAP service and signed-in employee filtering are configured.';
  }
}

document.querySelector('#requestForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const body = {
    asset_ID: data.get('assetID'),
    issueType: data.get('issueType'),
    description: String(data.get('description') || '').trim(),
    priority: data.get('priority') || 'MEDIUM'
  };

  if (!body.asset_ID || !body.issueType || !body.description) {
    message.textContent = 'Choose an asset and issue type, and describe the problem.';
    return;
  }

  message.textContent = 'Submitting request…';
  try {
    const response = await fetch('/user/MaintenanceRequests', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error('Request failed (HTTP ' + response.status + '). ' + details.slice(0, 240));
    }
    const result = await response.json().catch(() => ({}));
    message.textContent = 'Maintenance request submitted successfully.';
    form.reset();
    await loadAssets();
  } catch (error) {
    message.textContent = error.message || 'Could not submit the request. Check the CAP service and your sign-in.';
  }
});

loadAssets();

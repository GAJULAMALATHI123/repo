(() => {
  const base = document.body.dataset.reportBase;
  const statusEl = document.getElementById('reportStatus');
  const previewBody = document.getElementById('reportRows');
  const form = document.getElementById('reportFilters');
  let lastRows = [];
  let previewKey = '';

  const fields = ['reportType', 'status', 'categoryID', 'location', 'dateFrom', 'dateTo'];
  function filters() {
    const data = {};
    for (const name of fields) {
      const value = String(form.elements[name]?.value || '').trim();
      if (value) data[name] = value;
    }
    data.reportType ||= 'assets';
    return data;
  }
  function keyFor(data) { return JSON.stringify(data); }
  function setStatus(message, error = false) {
    statusEl.textContent = message;
    statusEl.style.color = error ? '#b42318' : '#176b3a';
  }
  async function csrfToken() {
    const response = await fetch(base + '/Assets?$top=0', {
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': 'Fetch', Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('Could not prepare a secure request (HTTP ' + response.status + ').');
    const token = response.headers.get('X-CSRF-Token');
    if (!token) throw new Error('The service did not return a CSRF token.');
    return token;
  }
  async function action(name, payload) {
    const token = await csrfToken();
    const response = await fetch(base + '/' + name, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      let message = 'Request failed (HTTP ' + response.status + ').';
      try { const body = await response.json(); message = body.error?.message || message; } catch (_) {}
      throw new Error(message);
    }
    const body = await response.json();
    return body.value !== undefined && name === 'getReportData' ? body.value : body;
  }
  function cell(row, value) {
    const td = document.createElement('td');
    td.textContent = value == null || value === '' ? '—' : String(value);
    row.appendChild(td);
  }
  function render(rows) {
    previewBody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr'); const td = document.createElement('td');
      td.colSpan = 9; td.className = 'empty'; td.textContent = 'No records match these filters.';
      tr.appendChild(td); previewBody.appendChild(tr); return;
    }
    for (const item of rows) {
      const tr = document.createElement('tr');
      ['assetTag','serialNumber','model','category','status','owner','location','date','details'].forEach(key => cell(tr, item[key]));
      previewBody.appendChild(tr);
    }
  }
  async function loadCategories() {
    try {
      const response = await fetch(base + '/AssetCategories?$select=ID,name&$orderby=name', {
        credentials: 'same-origin', headers: { Accept: 'application/json' }
      });
      if (!response.ok) return;
      const body = await response.json();
      for (const item of body.value || []) {
        const option = document.createElement('option');
        option.value = item.ID; option.textContent = item.name || item.ID;
        form.elements.categoryID.appendChild(option);
      }
    } catch (_) {}
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const args = filters();
    setStatus('Loading filtered report data…');
    const previewButton = document.getElementById('previewButton');
    previewButton.disabled = true;
    try {
      const result = await action('getReportData', args);
      lastRows = Array.isArray(result) ? result : result.value || [];
      previewKey = keyFor(args);
      render(lastRows);
      setStatus('Preview ready: ' + lastRows.length + ' row(s). The PDF and email use these report filters.');
    } catch (error) {
      setStatus(error.message || 'Could not load report data.', true);
    } finally { previewButton.disabled = false; }
  });
  document.getElementById('downloadButton').addEventListener('click', async () => {
    const args = filters();
    if (previewKey !== keyFor(args)) {
      setStatus('Preview the current filters before downloading.', true); return;
    }
    const button = document.getElementById('downloadButton');
    button.disabled = true; setStatus('Generating PDF…');
    try {
      const result = await action('generateReport', args);
      const file = result.value || result;
      if (!file.base64 || file.contentType !== 'application/pdf') throw new Error('The server did not return a valid PDF file.');
      const binary = atob(file.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      if (blob.size < 10 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70) {
        throw new Error('The generated file does not have a valid PDF signature.');
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = file.fileName || 'asset-report.pdf';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('PDF generated and download started. Preview row count: ' + lastRows.length + '.');
    } catch (error) { setStatus(error.message || 'PDF download failed.', true); }
    finally { button.disabled = false; }
  });
  document.getElementById('emailButton').addEventListener('click', async () => {
    const args = filters();
    if (previewKey !== keyFor(args)) {
      setStatus('Preview the current filters before emailing the report.', true); return;
    }
    args.recipients = document.getElementById('recipients').value.trim();
    const button = document.getElementById('emailButton');
    button.disabled = true; setStatus('Sending report email…');
    try {
      const result = await action('emailReport', args);
      const message = result.value || result;
      setStatus(typeof message === 'string' ? message : 'Report email sent successfully.');
    } catch (error) { setStatus(error.message || 'Report email failed.', true); }
    finally { button.disabled = false; }
  });
  loadCategories();
})();

const tabs = [...document.querySelectorAll('nav button[data-view]')];
const panels = [...document.querySelectorAll('.panel')];
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((item) => item.classList.toggle('active', item === tab));
  panels.forEach((panel) => panel.classList.toggle('hidden', panel.id !== tab.dataset.view));
}));

document.querySelector('#requestForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const message = document.querySelector('#message');
  // This is a UI prototype only; do not imply a request was saved to the backend.
  message.textContent = 'Form validation passed. This prototype is not connected to the CAP backend yet, so no request has been saved.';
  message.setAttribute('role', 'status');
});

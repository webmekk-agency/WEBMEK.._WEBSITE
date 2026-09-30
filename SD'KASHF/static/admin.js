const API = "/api";
const $ = (selector) => document.querySelector(selector);

async function loadAdmin() {
  const meResponse = await fetch(`${API}/me`);
  const me = await meResponse.json();
  if (!me.authenticated || me.user.role !== "admin") {
    window.location.href = "/";
    return;
  }

  const response = await fetch(`${API}/leads`);
  if (!response.ok) {
    $("#leadsBody").innerHTML = `<tr><td colspan="6">Could not load leads.</td></tr>`;
    return;
  }
  const result = await response.json();
  renderStats(result.leads);
  renderLeads(result.leads);
}

function renderStats(leads) {
  const counts = { New: 0, Contacted: 0, Quotation: 0, Payment: 0, Working: 0, Delivered: 0 };
  leads.forEach(lead => { if (counts[lead.status] !== undefined) counts[lead.status]++; });
  $("#adminStats").innerHTML = [
    ["Total Leads", leads.length],
    ["New", counts.New],
    ["Contacted", counts.Contacted],
    ["Quotation", counts.Quotation],
    ["Working", counts.Working],
    ["Delivered", counts.Delivered]
  ].map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

function renderLeads(leads) {
  const body = $("#leadsBody");
  if (!leads.length) {
    body.innerHTML = `<tr><td colspan="6">No leads yet.</td></tr>`;
    return;
  }

  body.innerHTML = leads.map(lead => `
    <tr>
      <td><strong>${escapeHtml(lead.lead_id)}</strong><br>${escapeHtml(lead.name)}</td>
      <td>${escapeHtml(lead.business)}<br><small>${escapeHtml(lead.city)}</small></td>
      <td>${escapeHtml(lead.phone)}<br><a href="https://wa.me/${escapeHtml(lead.phone.replace(/\D/g, ""))}" target="_blank" rel="noopener">WhatsApp ↗</a></td>
      <td>${escapeHtml(lead.selected_plan || "Custom")}<br><small>${escapeHtml(lead.budget)}</small></td>
      <td class="requirement-cell">${escapeHtml(lead.requirement)}</td>
      <td>
        <select data-status-id="${lead.id}" class="status-select">
          ${["New","Contacted","Quotation","Payment","Working","Delivered","Closed"].map(status => `<option ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-status-id]").forEach(select => {
    select.addEventListener("change", async () => {
      await fetch(`${API}/leads/${select.dataset.statusId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      await loadAdmin();
    });
  });
}

$("#refreshLeads")?.addEventListener("click", loadAdmin);

$("#logoutBtn")?.addEventListener("click", async () => {
  await fetch(`${API}/logout`, { method: "POST" });
  window.location.href = "/";
});

$("#projectForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const status = $("#projectStatus");
  const data = Object.fromEntries(new FormData(event.target).entries());
  ["user_id", "lead_id", "progress", "amount", "paid"].forEach(key => {
    if (data[key] === "") delete data[key];
  });
  if (data.user_id) data.user_id = Number(data.user_id);
  if (data.lead_id) data.lead_id = Number(data.lead_id);
  if (data.progress) data.progress = Number(data.progress);
  if (data.amount) data.amount = Number(data.amount);
  if (data.paid) data.paid = Number(data.paid);

  const response = await fetch(`${API}/admin/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const result = await response.json();
  status.textContent = response.ok ? `Project created: #${result.id}` : (result.error || "Project creation failed");
  if (response.ok) event.target.reset();
});

loadAdmin();

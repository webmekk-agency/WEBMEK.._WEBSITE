const API = "/api";
const $ = (selector) => document.querySelector(selector);

async function loadClient() {
  const meResponse = await fetch(`${API}/me`);
  const me = await meResponse.json();

  if (!me.authenticated) {
    window.location.href = "/";
    return;
  }

  $("#welcome").textContent = `Hello, ${me.user.name}`;

  const response = await fetch(`${API}/projects`);
  const result = await response.json();
  const wrapper = $("#projects");

  if (!response.ok || !result.projects.length) {
    wrapper.innerHTML = `<div class="panel"><h2>No project assigned yet.</h2><p>Your project will appear here after WebMek creates it.</p></div>`;
    return;
  }

  wrapper.innerHTML = result.projects.map(project => {
    const remaining = Math.max(0, Number(project.amount) - Number(project.paid));
    return `
      <article class="project-card panel">
        <div class="project-top"><div><span class="eyebrow">Project #${project.id}</span><h2>${escapeHtml(project.title)}</h2></div><span class="status-pill">${escapeHtml(project.status)}</span></div>
        <div class="progress-line"><span style="width:${Math.min(100, Math.max(0, project.progress))}%"></span></div>
        <div class="project-details"><div><span>Progress</span><strong>${project.progress}%</strong></div><div><span>Total</span><strong>₹${Number(project.amount).toLocaleString("en-IN")}</strong></div><div><span>Paid</span><strong>₹${Number(project.paid).toLocaleString("en-IN")}</strong></div><div><span>Remaining</span><strong>₹${remaining.toLocaleString("en-IN")}</strong></div></div>
        ${project.preview_url ? `<a class="btn btn-primary" href="${escapeHtml(project.preview_url)}" target="_blank" rel="noopener">Open Preview ↗</a>` : ""}
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

$("#logoutBtn")?.addEventListener("click", async () => {
  await fetch(`${API}/logout`, { method: "POST" });
  window.location.href = "/";
});

loadClient();

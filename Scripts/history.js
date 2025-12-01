
function renderLogs() {
  const container = document.getElementById("logsContainer");
  const logs = loadLogs();

  if (!logs.length) {
    container.innerHTML = `<p class="text-center text-muted">No pump history yet.</p>`;
    return;
  }

  container.innerHTML = "";

  logs.forEach((log) => {
    const start = new Date(log.start).toLocaleString();
    const end = new Date(log.end).toLocaleString();

    const card = document.createElement("div");
    card.className = "log-card";
    card.innerHTML = `
      <div class="log-title">${log.zone}</div>
      <div class="log-details">
        ${start} → ${end}<br>
        Duration: <b>${log.duration} min</b>
      </div>
    `;

    card.onclick = () => openDetails(log);
    container.appendChild(card);
  });
}


function openDetails(log) {
  const modalBody = document.getElementById("viewLogBody");
  modalBody.innerHTML = `
    <b>Zone:</b> ${log.zone}<br>
    <b>Start:</b> ${new Date(log.start).toLocaleString()}<br>
    <b>End:</b> ${new Date(log.end).toLocaleString()}<br>
    <b>Duration:</b> ${log.duration} minutes
  `;
  new bootstrap.Modal(document.getElementById("viewLogModal")).show();
}



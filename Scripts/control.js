// ================================
//  GLOBAL STATES
// ================================
let pumpTimer = null;          // timeout that turns the pump off
let scheduleTimers = [];       // one interval schedule per zone
let zone_names = [];           // list of zone names

// ================================
//  OPEN ZONE MODAL
// ================================ 
document.getElementById('openZoneModal').addEventListener('click', function () {
  const zoneModal = new bootstrap.Modal(document.getElementById('zoneModal'));
  document.getElementById('zoneNameInput').value = '';
  document.getElementById('StartingAt').value = '';
  document.getElementById('Duration').value = '';
  zoneModal.show();
});

// ================================
//  SAVE LOG TO FIREBASE
// ================================
function savePumpLog(zoneName, start, end) {
  const durationMs = end - start;
  const durationMin = Math.round(durationMs / 60000);

  const log = {
    zone: zoneName,
    start,
    end,
    duration: durationMin
  };

  uploadLog(log);
  console.log("📦 Log saved:", log);
}

// ================================
//  ADD ZONE CARD + SCHEDULE
// ================================
document.getElementById('addZoneBtn').addEventListener('click', function () {

  const zoneName = document.getElementById('zoneNameInput').value.trim();
  const startingAt = document.getElementById('StartingAt').value.trim(); // HH:MM
  const duration = parseInt(document.getElementById('Duration').value.trim(), 10);

  if (!zoneName || !startingAt || !duration || duration <= 0) {
    alert("Please input Zone name, Start Time and Duration");
    return;
  }

  zone_names.push(zoneName);

  // ===== card creation =====
  const col = document.createElement('div');
  col.className = 'col-12 col-md-6 col-lg-3';

  col.innerHTML = `
    <div class="card h-100 dashboard-card irrigation-card position-relative">
      <button class="zone-delete-btn" title="Remove Zone">&times;</button>
      <div class="card-body">
        <div class="card-header-inline">
          <h6 class="card-title">${zoneName}</h6>
        </div>
        <div class="card-meta">
          <div class="meta-row">
            <span class="label">Starting at:</span>
            <span class="value">${startingAt}</span>
          </div>
          <div class="meta-row">
            <span class="label">Duration:</span>
            <span class="value">${duration} min</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('zonesContainer').appendChild(col);

  // schedule pump
  schedulePump(startingAt, duration);

  // Hide modal
  const zoneModal = bootstrap.Modal.getInstance(document.getElementById('zoneModal'));
  if (zoneModal) zoneModal.hide();
});

// ================================
//  BACK BUTTON
// ================================
(function () {
  const btn = document.getElementById('backButton');
  if (!btn) return;
  btn.addEventListener('click', function () {
    if (history.length > 1) history.back();
    else location.href = 'index.html';
  });
})();

// ================================
//  PUMP UI INDICATOR
// ================================
function setPumpState(isOn) {
  const el = document.getElementById("pumpState");
  if (!el) return;

  el.textContent = isOn ? "ON" : "OFF";
  el.classList.toggle("pump-on", isOn);
  el.classList.toggle("pump-off", !isOn);
}

// ================================
//  PUMP CONTROL
// ================================
function pumpOn() {
  console.log("Pump → ON");
  setPumpState(true);
}

function pumpOff() {
  console.log("Pump → OFF");
  setPumpState(false);
}

// ================================
//  USER MANUAL OFF
// ================================
document.getElementById('turnOffPump')?.addEventListener('click', emergencyStopPump);

function emergencyStopPump() {
  pumpOff();
  if (pumpTimer) {
    clearTimeout(pumpTimer);
    pumpTimer = null;
  }
}

// ================================
//  SCHEDULER
// ================================
function schedulePump(startTime, durationMinutes) {
  const timer = setInterval(() => {
    const now = new Date();
    const current = now.toTimeString().slice(0, 5);

    if (current === startTime) {
      console.log("⏱️ Scheduled pump start:", startTime);
      startPumpFor(durationMinutes);
      clearInterval(timer);
    }
  }, 1000);

  scheduleTimers.push(timer);
}

// ================================
// AUTO OFF TIMER
// ================================
function startPumpFor(durationMinutes) {
  pumpOn();

  if (pumpTimer) clearTimeout(pumpTimer);

  pumpTimer = setTimeout(() => {
    console.log("⏱️ Auto OFF");
    pumpOff();
    pumpTimer = null;
  }, durationMinutes * 60 * 1000);
}

// ================================
// Upload log entry to Firebase
// ================================
function uploadLog(log) {
  const logsRef = push(ref(db, "pump/logs"));
  return set(logsRef, log);
}

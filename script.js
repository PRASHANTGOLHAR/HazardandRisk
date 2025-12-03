// Hazard & Risk Portal - Static JavaScript

// Constants
const LEVELS_OPTIONS = ["Ground", "Mezzanine", "Concourse", "DN Platform", "UP Platform"];
const INFORM_TO_OPTIONS = ["Civil", "MEP", "Telecom ", "Signaling", "Fire detection", "Fire suppression ", "IT", "Traction", "Viaduct", "AFC", "Security" ];
const ADMIN_PASSWORD = "Hazard2025";

// State
let state = {
  currentView: "controller", // "controller" or "admin"
  isAdmin: false,
  stations: [],
  entries: [],
  selectedStation: null,
  editingEntry: null,
  editingStation: null,
  previewImage: null
};

// DOM Elements
const app = document.getElementById("app");

// Load data from localStorage
function loadData() {
  const savedStations = localStorage.getItem("hazard-stations");
  const savedEntries = localStorage.getItem("hazard-entries");
  if (savedStations) state.stations = JSON.parse(savedStations);
  if (savedEntries) state.entries = JSON.parse(savedEntries);
}

// Save data to localStorage
function saveStations() {
  localStorage.setItem("hazard-stations", JSON.stringify(state.stations));
}

function saveEntries() {
  localStorage.setItem("hazard-entries", JSON.stringify(state.entries));
}

// Toast notifications
function showToast(message, type = "success") {
  const container = document.querySelector(".toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function createToastContainer() {
  const container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

// Generate unique ID
function generateId() {
  return Date.now().toString();
}

// Icons (SVG strings)
const icons = {
  alertTriangle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" width="40px" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  power: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
  gauge: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
  document: `<svg viewBox="0 0 24 24" fill="none" width="40px" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
  archive: `<svg viewBox="0 0 24 24" fill="none"  stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`
};

// Render functions
function render() {
  app.innerHTML = `
    ${renderNavbar()}
    ${state.currentView === "admin" ? renderAdminDashboard() : renderControllerDashboard()}
    ${renderFooter()}
    ${renderDialogs()}
  `;
  attachEventListeners();
}

function renderNavbar() {
  const maskedId = state.isAdmin ? getMaskedAdminId() : "";
  return `
    <nav class="navbar">
      <div class="navbar-content">
        <div class="navbar-brand">
          <div class="navbar-icon">
            <div class="navbar-icon-glow"></div>
            <div class="navbar-icon-inner">${icons.alertTriangle}</div>
          </div>
          <div>
            <h1 class="navbar-title">HAZARD & RISK</h1>
            <p class="navbar-subtitle">"Be aware, take care"</p>
          </div>
        </div>
        <div class="navbar-actions">
          ${state.isAdmin && state.currentView === "admin" ? `
            <div class="admin-id-badge">ID: ${maskedId}</div>
          ` : ""}
          ${state.currentView === "controller" ? `
            <button class="btn btn-accent" onclick="openLoginDialog()">
              ${icons.shield}
              SM Login
            </button>
          ` : ""}
        </div>
      </div>
    </nav>
  `;
}

function getMaskedAdminId() {
  const savedId = localStorage.getItem("admin-id") || "";
  if (!savedId) return "";
  const lastTwo = savedId.slice(-2);
  const stars = "*".repeat(Math.max(0, savedId.length - 2));
  return stars + lastTwo;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-text">
          <p>© 2025 Hazard and Risk Portal. All rights reserved.</p>
        </div>
        <div class="footer-credits">
          <p>Created by Prashant Golhar</p>
          <p>Station Managers : Prashant Gaikwad • Jagdish Billakanti</p>
        </div>
      </div>
    </footer>
  `;
}

function renderAdminDashboard() {
  if (state.selectedStation) {
    return renderAdminStationView();
  }
  return `
    <main class="main-content">
      <div class="main-overlay"></div>
      <div class="content-wrapper">
        <div class="page-header">
          <h1 class="page-title">SM Dashboard</h1>
          <div class="flex gap-3">
            <button class="btn btn-outline" onclick="switchToController()">
              ${icons.gauge}
              Station Dashboard
            </button>
            <button class="btn btn-primary" onclick="openAddStationDialog()">
              ${icons.plus}
              Add Station
            </button>
          </div>
        </div>
        <div class="grid grid-cols-3">
          ${state.stations.map((station, index) => renderStationCard(station, index, true)).join("")}
        </div>
      </div>
    </main>
  `;
}

function renderAdminStationView() {
  const station = state.stations.find(s => s.id === state.selectedStation);
  if (!station) return "";
  const entries = state.entries.filter(e => e.stationId === station.id);
  
  return `
    <main class="main-content">
      <div class="main-overlay"></div>
      <div class="content-wrapper">
        <div class="page-header">
          <div class="flex items-center gap-4">
            <button class="btn btn-outline" onclick="goBackAdmin()">
              ${icons.arrowLeft}
              Back
            </button>
            <h1 class="page-title">${station.name}</h1>
            <div class="status-badge ${station.enabled ? 'status-active' : 'status-disabled'}">
              ${station.enabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline" onclick="openEditStationDialog('${station.id}')">
              ${icons.edit}
              Edit Station
            </button>
            <button class="btn btn-outline" onclick="exportToExcel('${station.id}')">
              ${icons.download}
              Export to Excel
            </button>
            <button class="btn btn-primary" onclick="openAddEntryDialog('${station.id}')">
              ${icons.plus}
              Add Entry
            </button>
          </div>
        </div>
        <div class="card">
          <div class="table-container">
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sr No</th>
                    ${station.columns.map(col => `<th>${col.name}</th>`).join("")}
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map((entry, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      ${station.columns.map(col => `
                        <td>
                          ${col.type === "file" && entry.data[col.id] ? `
                            <div class="flex items-center gap-2">
                              <img src="${entry.data[col.id]}" alt="Thumbnail" class="image-thumbnail" onclick="openImagePreview('${entry.id}', '${col.id}')" />
                              <button class="btn btn-outline" onclick="openImagePreview('${entry.id}', '${col.id}')">
                                ${icons.eye}
                                View
                              </button>
                            </div>
                          ` : col.type === "date" && entry.data[col.id] ? `
                            <span>${new Date(entry.data[col.id]).toLocaleDateString()}</span>
                          ` : col.type === "levels" ? `
                            <span class="levels-badge">${entry.data[col.id] || "-"}</span>
                          ` : `
                            <span>${entry.data[col.id] || "-"}</span>
                          `}
                        </td>
                      `).join("")}
                      <td>
                        <div class="actions-cell">
                          <button class="btn btn-ghost" onclick="openEditEntryDialog('${entry.id}')">
                            ${icons.edit}
                          </button>
                          <button class="btn btn-ghost text-destructive" onclick="deleteEntry('${entry.id}')">
                            ${icons.trash}
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

function renderControllerDashboard() {
  if (state.selectedStation) {
    return renderControllerStationView();
  }
  
  if (state.stations.length === 0) {
    return `
      <main class="main-content">
        <div class="main-overlay"></div>
        <div class="content-wrapper">
          <div class="page-header">
            <div>
              <h1 class="page-title">Station Dashboard</h1>
              <p class="page-subtitle">Register your observations here</p>
            </div>
          </div>
          <div class="card">
            <div class="empty-state">
              <div class="empty-state-icon">${icons.archive}</div>
              <h3 class="empty-state-title">No Stations Available</h3>
              <p class="empty-state-text">Contact your administrator to create stations.</p>
            </div>
          </div>
        </div>
      </main>
    `;
  }
  
  return `
    <main class="main-content">
      <div class="main-overlay"></div>
      <div class="content-wrapper">
        <div class="page-header">
          <div>
            <h1 class="page-title">Station Dashboard</h1>
            <p class="page-subtitle">Register your observation now</p>
          </div>
        </div>
        <div class="grid grid-cols-3">
          ${state.stations.map((station, index) => renderStationCard(station, index, false)).join("")}
        </div>
      </div>
    </main>
  `;
}

function renderControllerStationView() {
  const station = state.stations.find(s => s.id === state.selectedStation);
  if (!station) return "";
  const entries = state.entries.filter(e => e.stationId === station.id);
  
  if (!station.enabled) {
    return `
      <main class="main-content">
        <div class="main-overlay"></div>
        <div class="content-wrapper">
          <div class="page-header">
            <div class="flex items-center gap-4">
              <button class="btn btn-outline" onclick="goBackController()">
                ${icons.arrowLeft}
                Back
              </button>
              <h1 class="page-title">${station.name}</h1>
            </div>
          </div>
          <div class="card disabled-warning">
            <div class="empty-state">
              <div class="disabled-warning-icon">${icons.alertTriangle}</div>
              <h3 class="empty-state-title" style="color: var(--hazard-danger);">Station Disabled</h3>
              <p class="empty-state-text">This station has been temporarily disabled by the administrator.<br>Please contact admin for more information.</p>
            </div>
          </div>
        </div>
      </main>
    `;
  }
  
  return `
    <main class="main-content">
      <div class="main-overlay"></div>
      <div class="content-wrapper">
        <div class="page-header">
          <div class="flex items-center gap-4">
            <button class="btn btn-outline" onclick="goBackController()">
              ${icons.arrowLeft}
              Back
            </button>
            <h1 class="page-title">${station.name}</h1>
          </div>
          <button class="btn btn-accent" onclick="openAddEntryDialog('${station.id}')">
            ${icons.plus}
            Add Entry
          </button>
        </div>
        <div class="card">
          <div class="table-container">
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sr No</th>
                    ${station.columns.map(col => `<th>${col.name}</th>`).join("")}
                    <th style="text-align: right;">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map((entry, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      ${station.columns.map(col => `
                        <td>
                          ${col.type === "file" && entry.data[col.id] ? `
                            <div class="flex items-center gap-2">
                              <img src="${entry.data[col.id]}" alt="Thumbnail" class="image-thumbnail" onclick="openImagePreview('${entry.id}', '${col.id}')" />
                              <button class="btn btn-outline" onclick="openImagePreview('${entry.id}', '${col.id}')">
                                ${icons.eye}
                                View
                              </button>
                            </div>
                          ` : col.type === "date" && entry.data[col.id] ? `
                            <span>${new Date(entry.data[col.id]).toLocaleDateString()}</span>
                          ` : col.type === "levels" ? `
                            <span class="levels-badge">${entry.data[col.id] || "-"}</span>
                          ` : `
                            <span>${entry.data[col.id] || "-"}</span>
                          `}
                        </td>
                      `).join("")}
                      <td>
                        <div class="actions-cell">
                          ${station.editedByAdmin && !entry.editedByController ? `
                            <button class="btn btn-ghost" onclick="openEditEntryDialogController('${entry.id}')">
                              ${icons.edit}
                            </button>
                          ` : ""}
                        </div>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}

function renderStationCard(station, index, isAdmin) {
  const entryCount = state.entries.filter(e => e.stationId === station.id).length;
  return `
    <div class="card card-interactive" onclick="selectStation('${station.id}')" style="animation-delay: ${index * 100}ms">
      <div class="card-header">
        <div class="card-title">
          <div style="flex: 1;">
            <div class="flex items-center gap-3 mb-2">
              <div class="station-icon">${icons.building}</div>
              <span class="station-name">${station.name}</span>
            </div>
            <div class="status-badge ${station.enabled ? 'status-active' : 'status-disabled'}">
              <div class="status-dot ${station.enabled ? 'active' : 'disabled'}"></div>
              ${station.enabled ? 'Active' : 'Disabled'}
            </div>
          </div>
          ${isAdmin ? `
            <div class="flex gap-2">
              <button class="btn btn-ghost" onclick="event.stopPropagation(); toggleStationStatus('${station.id}')" title="${station.enabled ? 'Disable' : 'Enable'} station">
                <span class="${station.enabled ? 'text-success' : 'text-destructive'}">${icons.power}</span>
              </button>
              <button class="btn btn-ghost" onclick="event.stopPropagation(); deleteStation('${station.id}')">
                <span class="text-destructive">${icons.trash}</span>
              </button>
            </div>
          ` : ""}
        </div>
      </div>
      <div class="card-content">
        <div class="flex items-center gap-2" style="color: var(--muted-foreground); font-size: 0.875rem;">
          ${icons.document}
          <span style="font-weight: 500;">${entryCount}</span>
          <span>total entries</span>
        </div>
      </div>
    </div>
  `;
}

function renderDialogs() {
  return `
    <!-- Login Dialog -->
    <div id="loginDialog" class="dialog-overlay">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title">${icons.shield}SM Login</div>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">Login ID</label>
            <input type="password" id="adminIdInput" class="form-input" placeholder="Enter Login ID" onkeydown="if(event.key==='Enter') handleLogin()">
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-outline" onclick="closeDialog('loginDialog')">Cancel</button>
          <button class="btn btn-primary" onclick="handleLogin()">Login</button>
        </div>
      </div>
    </div>
    
    <!-- Add Station Dialog -->
    <div id="addStationDialog" class="dialog-overlay">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title">Create New Station</div>
          <div class="dialog-description">Create a new station with custom columns to manage hazard and risk data entries.</div>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">Station Name</label>
            <input type="text" id="newStationName" class="form-input" placeholder="Enter station name">
          </div>
          <div class="form-group">
            <div class="flex items-center" style="justify-content: space-between; margin-bottom: 0.5rem;">
              <label class="form-label" style="margin-bottom: 0;">Columns</label>
              <button class="btn btn-outline" onclick="addNewColumn()">
                ${icons.plus}
                Add Column
              </button>
            </div>
            <div id="newColumnsContainer" style="max-height: 300px; overflow-y: auto;"></div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-outline" onclick="closeDialog('addStationDialog')">Cancel</button>
          <button class="btn btn-primary" onclick="createStation()">Create Station</button>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Entry Dialog -->
    <div id="entryDialog" class="dialog-overlay">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title" id="entryDialogTitle">Add Entry</div>
          <div class="dialog-description" id="entryDialogDesc">Fill in the details below.</div>
        </div>
        <div class="dialog-body" id="entryFormContainer"></div>
        <div class="dialog-footer">
          <button class="btn btn-outline" onclick="closeDialog('entryDialog')">Cancel</button>
          <button class="btn btn-primary" onclick="saveEntry()">Save Entry</button>
        </div>
      </div>
    </div>
    
    <!-- Edit Station Dialog -->
    <div id="editStationDialog" class="dialog-overlay">
      <div class="dialog">
        <div class="dialog-header">
          <div class="dialog-title" id="editStationTitle">Edit Station</div>
          <div class="dialog-description">Modify the columns for this station.</div>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <div class="flex items-center" style="justify-content: space-between; margin-bottom: 0.5rem;">
              <label class="form-label" style="margin-bottom: 0;">Columns</label>
              <button class="btn btn-outline" onclick="addEditColumn()">
                ${icons.plus}
                Add Column
              </button>
            </div>
            <div id="editColumnsContainer" style="max-height: 400px; overflow-y: auto;"></div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-outline" onclick="closeDialog('editStationDialog')">Cancel</button>
          <button class="btn btn-primary" onclick="saveStationEdit()">Save Changes</button>
        </div>
      </div>
    </div>
    
    <!-- Image Preview Dialog -->
    <div id="imagePreviewDialog" class="dialog-overlay">
      <div class="dialog image-preview-dialog" style="position: relative;">
        <button class="dialog-close" onclick="closeDialog('imagePreviewDialog')">${icons.x}</button>
        <div class="image-preview-container">
          <img id="previewImage" src="" alt="Preview">
        </div>
      </div>
    </div>
  `;
}

// Event handlers
function attachEventListeners() {
  // Close dialogs when clicking overlay
  document.querySelectorAll(".dialog-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("open");
      }
    });
  });
}

function openDialog(id) {
  document.getElementById(id).classList.add("open");
}

function closeDialog(id) {
  document.getElementById(id).classList.remove("open");
}

// Auth
function openLoginDialog() {
  openDialog("loginDialog");
  setTimeout(() => document.getElementById("adminIdInput").focus(), 100);
}

function handleLogin() {
  const adminId = document.getElementById("adminIdInput").value;
  if (adminId === ADMIN_PASSWORD) {
    localStorage.setItem("admin-authenticated", "true");
    localStorage.setItem("admin-id", adminId);
    state.isAdmin = true;
    state.currentView = "admin";
    closeDialog("loginDialog");
    document.getElementById("adminIdInput").value = "";
    showToast("Admin access granted");
    render();
  } else {
    showToast("Invalid Admin ID", "error");
  }
}

// Navigation
function switchToController() {
  state.currentView = "controller";
  state.selectedStation = null;
  render();
}

function selectStation(stationId) {
  state.selectedStation = stationId;
  render();
}

function goBackAdmin() {
  state.selectedStation = null;
  render();
}

function goBackController() {
  state.selectedStation = null;
  render();
}

// Station management
let newColumns = [];

function openAddStationDialog() {
  newColumns = [];
  document.getElementById("newStationName").value = "";
  renderNewColumns();
  openDialog("addStationDialog");
}

function addNewColumn() {
  newColumns.push({
    id: generateId(),
    name: "New Column",
    type: "text"
  });
  renderNewColumns();
}

function renderNewColumns() {
  const container = document.getElementById("newColumnsContainer");
  container.innerHTML = newColumns.map((col, index) => `
    <div class="column-item">
      <input type="text" class="form-input" value="${col.name}" onchange="updateNewColumnName(${index}, this.value)" placeholder="Column name">
      <select class="form-select" onchange="updateNewColumnType(${index}, this.value)">
        <option value="text" ${col.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="file" ${col.type === 'file' ? 'selected' : ''}>File</option>
        <option value="date" ${col.type === 'date' ? 'selected' : ''}>Date</option>
        <option value="levels" ${col.type === 'levels' ? 'selected' : ''}>Levels</option>
        <option value="informs" ${col.type === 'informs' ? 'selected' : ''}>Inform To</option>
      </select>
      <button class="btn btn-ghost text-destructive" onclick="removeNewColumn(${index})">${icons.trash}</button>
    </div>
  `).join("");
}

function updateNewColumnName(index, name) {
  newColumns[index].name = name;
}

function updateNewColumnType(index, type) {
  newColumns[index].type = type;
}

function removeNewColumn(index) {
  newColumns.splice(index, 1);
  renderNewColumns();
}

function createStation() {
  const name = document.getElementById("newStationName").value.trim();
  if (!name) {
    showToast("Please enter a station name", "error");
    return;
  }
  if (newColumns.length === 0) {
    showToast("Please add at least one column", "error");
    return;
  }
  
  const station = {
    id: generateId(),
    name: name,
    columns: [...newColumns],
    enabled: true
  };
  
  state.stations.push(station);
  saveStations();
  closeDialog("addStationDialog");
  showToast("Station created successfully");
  render();
}

function toggleStationStatus(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (station) {
    station.enabled = !station.enabled;
    saveStations();
    showToast(`Station ${station.enabled ? 'enabled' : 'disabled'}`);
    render();
  }
}

function deleteStation(stationId) {
  if (confirm("Are you sure you want to delete this station?")) {
    state.stations = state.stations.filter(s => s.id !== stationId);
    state.entries = state.entries.filter(e => e.stationId !== stationId);
    saveStations();
    saveEntries();
    showToast("Station deleted");
    render();
  }
}

// Edit Station
let editColumns = [];
let editingStationId = null;

function openEditStationDialog(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return;
  
  editingStationId = stationId;
  editColumns = station.columns.map(c => ({...c}));
  document.getElementById("editStationTitle").textContent = `Edit Station: ${station.name}`;
  renderEditColumns();
  openDialog("editStationDialog");
}

function addEditColumn() {
  editColumns.push({
    id: generateId(),
    name: "New Column",
    type: "text"
  });
  renderEditColumns();
}

function renderEditColumns() {
  const container = document.getElementById("editColumnsContainer");
  container.innerHTML = editColumns.map((col, index) => `
    <div class="column-item">
      <input type="text" class="form-input" value="${col.name}" onchange="updateEditColumnName(${index}, this.value)" placeholder="Column name">
      <select class="form-select" onchange="updateEditColumnType(${index}, this.value)">
        <option value="text" ${col.type === 'text' ? 'selected' : ''}>Text</option>
        <option value="file" ${col.type === 'file' ? 'selected' : ''}>File</option>
        <option value="date" ${col.type === 'date' ? 'selected' : ''}>Date</option>
        <option value="levels" ${col.type === 'levels' ? 'selected' : ''}>Levels</option>
        <option value="informs" ${col.type === 'informs' ? 'selected' : ''}>Inform To</option>
      </select>
      <button class="btn btn-ghost text-destructive" onclick="removeEditColumn(${index})">${icons.trash}</button>
    </div>
  `).join("");
}

function updateEditColumnName(index, name) {
  editColumns[index].name = name;
}

function updateEditColumnType(index, type) {
  editColumns[index].type = type;
}

function removeEditColumn(index) {
  editColumns.splice(index, 1);
  renderEditColumns();
}

function saveStationEdit() {
  if (editColumns.length === 0) {
    showToast("Please add at least one column", "error");
    return;
  }
  
  const station = state.stations.find(s => s.id === editingStationId);
  if (station) {
    station.columns = [...editColumns];
    station.editedByAdmin = true;
    saveStations();
    closeDialog("editStationDialog");
    showToast("Station updated successfully");
    render();
  }
}

// Entry management
let entryData = {};
let editingEntryId = null;
let entryStationId = null;
let isControllerEdit = false;

function openAddEntryDialog(stationId) {
  entryStationId = stationId;
  editingEntryId = null;
  entryData = {};
  isControllerEdit = false;
  
  document.getElementById("entryDialogTitle").textContent = "Add New Entry";
  document.getElementById("entryDialogDesc").textContent = "Fill in the details below to add a new entry to this station.";
  
  renderEntryForm(stationId);
  openDialog("entryDialog");
}

function openEditEntryDialog(entryId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  
  editingEntryId = entryId;
  entryStationId = entry.stationId;
  entryData = {...entry.data};
  isControllerEdit = false;
  
  document.getElementById("entryDialogTitle").textContent = "Edit Entry";
  document.getElementById("entryDialogDesc").textContent = "Update the entry details for this station.";
  
  renderEntryForm(entry.stationId);
  openDialog("entryDialog");
}

function openEditEntryDialogController(entryId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;
  
  editingEntryId = entryId;
  entryStationId = entry.stationId;
  entryData = {...entry.data};
  isControllerEdit = true;
  
  document.getElementById("entryDialogTitle").textContent = "Edit Entry";
  document.getElementById("entryDialogDesc").textContent = "Update the entry details. Once saved, this entry cannot be edited again.";
  
  renderEntryForm(entry.stationId);
  openDialog("entryDialog");
}

function renderEntryForm(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return;
  
  const container = document.getElementById("entryFormContainer");
  container.innerHTML = station.columns.map(col => `
    <div class="form-group">
      <label class="form-label">${col.name}</label>
      ${col.type === "text" ? `
        <input type="text" class="form-input" value="${entryData[col.id] || ''}" onchange="updateEntryData('${col.id}', this.value)" placeholder="Enter ${col.name.toLowerCase()}">
      ` : col.type === "date" ? `
        <input type="date" class="form-input" value="${entryData[col.id] || ''}" onchange="updateEntryData('${col.id}', this.value)">
      ` : col.type === "levels" ? `
        <select class="form-select" onchange="updateEntryData('${col.id}', this.value)">
          <option value="">Select Level</option>
          ${LEVELS_OPTIONS.map(level => `<option value="${level}" ${entryData[col.id] === level ? 'selected' : ''}>${level}</option>`).join("")}
        </select>


      ` : col.type === "informs" ? `
        <select class="form-select" onchange="updateEntryData('${col.id}', this.value)">
          <option value="">Select Department</option>
          ${INFORM_TO_OPTIONS.map(level => `<option value="${level}" ${entryData[col.id] === level ? 'selected' : ''}>${level}</option>`).join("")}
        </select>

    
      ` : `
        <input type="file" class="form-input" accept="image/*" onchange="handleFileUpload('${col.id}', this)">
        ${entryData[col.id] ? `<img src="${entryData[col.id]}" alt="Preview" style="width: 128px; height: 128px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border);">` : ''}
      `}
    </div>
  `).join("");
}

function updateEntryData(columnId, value) {
  entryData[columnId] = value;
}

function handleFileUpload(columnId, input) {
  const file = input.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onloadend = () => {
      entryData[columnId] = reader.result;
      renderEntryForm(entryStationId);
    };
    reader.readAsDataURL(file);
  } else {
    showToast("Please upload an image file", "error");
  }
}

function saveEntry() {
  if (editingEntryId) {
    // Edit existing
    const entry = state.entries.find(e => e.id === editingEntryId);
    if (entry) {
      entry.data = {...entryData};
      if (isControllerEdit) {
        entry.editedByController = true;
      }
      saveEntries();
      showToast("Entry updated successfully");
    }
  } else {
    // Add new
    const newEntry = {
      id: generateId(),
      stationId: entryStationId,
      data: {...entryData}
    };
    state.entries.push(newEntry);
    saveEntries();
    showToast("Entry added successfully");
  }
  
  closeDialog("entryDialog");
  render();
}

function deleteEntry(entryId) {
  if (confirm("Are you sure you want to delete this entry?")) {
    state.entries = state.entries.filter(e => e.id !== entryId);
    saveEntries();
    showToast("Entry deleted");
    render();
  }
}

// Image preview
function openImagePreview(entryId, columnId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (entry && entry.data[columnId]) {
    document.getElementById("previewImage").src = entry.data[columnId];
    openDialog("imagePreviewDialog");
  }
}

// Export to Excel (basic CSV export)
function exportToExcel(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return;
  
  const entries = state.entries.filter(e => e.stationId === stationId);
  
  // Create CSV content
  const headers = ["Sr No", ...station.columns.map(c => c.name)];
  const rows = entries.map((entry, index) => {
    return [
      index + 1,
      ...station.columns.map(col => {
        if (col.type === "file") return entry.data[col.id] ? "Image" : "";
        if (col.type === "date" && entry.data[col.id]) return new Date(entry.data[col.id]).toLocaleDateString();
        return entry.data[col.id] || "";
      })
    ];
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  
  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${station.name}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast("Data exported successfully");
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  render();
});

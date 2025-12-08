
// =====================================================
// HAZARD & RISK PORTAL - COMPLETE JAVASCRIPT
// =====================================================

// =====================================================
// AIRTABLE CONFIGURATION - CHANGE THESE VALUES!
// =====================================================
/*
 * HOW TO GET YOUR AIRTABLE API KEY:
 * 1. Go to https://airtable.com/create/tokens
 * 2. Click "Create new token"
 * 3. Give it a name (e.g., "HazardRiskPortal")
 * 
 * IMPORTANT SCOPES TO SELECT:
 * ✅ data.records:read    - Read records from tables
 * ✅ data.records:write   - Create/update/delete records
 * ✅ schema.bases:read    - Read base schema (optional but helpful)
 * 
 * BASE ACCESS:
 * - Select your "HazardRiskPortal" base
 * - Or select "All current and future bases" for convenience
 * 
 * 4. Click "Create token" and copy it
 * 5. Paste below in AIRTABLE_API_KEY
 * 
 * HOW TO GET YOUR BASE ID:
 * 1. Open your base in Airtable
 * 2. Click "Help" menu → "API documentation"
 * 3. In the URL or docs, find the Base ID (starts with "app...")
 * 4. Paste below in AIRTABLE_BASE_ID
 */

/*
 * =====================================================
 * AIRTABLE TABLE SCHEMA - CREATE THESE EXACT FIELDS!
 * =====================================================
 * 
 * TABLE 1: "Stations"
 * ┌─────────────────┬──────────────────┬─────────────────────────────────────────┐
 * │ Field Name      │ Field Type       │ Description                             │
 * ├─────────────────┼──────────────────┼─────────────────────────────────────────┤
 * │ id              │ Single line text │ Primary field - Unique station ID       │
 * │ name            │ Single line text │ Station name (e.g., "Aarey Station")    │
 * │ columns         │ Long text        │ JSON array of column configurations     │
 * │ enabled         │ Checkbox         │ Whether station is active/visible       │
 * │ editedByAdmin   │ Checkbox         │ Tracks if admin has modified            │
 * └─────────────────┴──────────────────┴─────────────────────────────────────────┘
 * 
 * TABLE 2: "Entries"  
 * ┌───────────────────┬──────────────────┬─────────────────────────────────────────┐
 * │ Field Name        │ Field Type       │ Description                             │
 * ├───────────────────┼──────────────────┼─────────────────────────────────────────┤
 * │ id                │ Single line text │ Primary field - Unique entry ID         │
 * │ stationId         │ Single line text │ Links entry to a station                │
 * │ data              │ Long text        │ JSON object with all form field values  │
 * │ editedByController│ Checkbox         │ Tracks if controller has modified       │
 * └───────────────────┴──────────────────┴─────────────────────────────────────────┘
 * 
 * IMPORTANT: Create EXACT field names (case-sensitive!)
 * =====================================================
 */

const AIRTABLE_CONFIG = {
  // ⬇️ PASTE YOUR API KEY HERE (starts with "pat...")
  API_KEY: "patfXZtAQF24Ynu8K.301041af7168126b7dc01a55836482a6169347a819f316a9202ac3d96d9c4f20",
  
  // ⬇️ PASTE YOUR BASE ID HERE (starts with "app...")
  BASE_ID: "appWA7YoldYBbig7U",
  
  // Table names - create these exact tables in Airtable
  STATIONS_TABLE: "Stations",
  ENTRIES_TABLE: "Entries",
  VISITS_TABLE: "Visits"
};

/*
 * TABLE 3: "Visits" (for visit counter)
 * ┌─────────────────┬──────────────────┬─────────────────────────────────────────┐
 * │ Field Name      │ Field Type       │ Description                             │
 * ├─────────────────┼──────────────────┼─────────────────────────────────────────┤
 * │ id              │ Single line text │ Primary field - Always "counter"        │
 * │ count           │ Number           │ Total visit count                       │
 * └─────────────────┴──────────────────┴─────────────────────────────────────────┘
 */

// Check if Airtable is configured
const isAirtableConfigured = () => {
  return AIRTABLE_CONFIG.API_KEY !== "YOUR_AIRTABLE_API_KEY_HERE" && 
         AIRTABLE_CONFIG.BASE_ID !== "YOUR_BASE_ID_HERE";
};

// Airtable API URL
const getAirtableUrl = (table) => 
  `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}/${encodeURIComponent(table)}`;

// Airtable headers
const getHeaders = () => ({
  'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
  'Content-Type': 'application/json'
});

// =====================================================
// CONSTANTS
// =====================================================
const LEVELS_OPTIONS = ["Ground", "Mezzanine", "Concourse", "DN Platform", "UP Platform"];
const INFORM_TO_OPTIONS = ["Civil", "MEP", "Telecom", "Signaling", "Fire detection", "Fire suppression", "IT", "Traction", "Viaduct", "AFC", "Security", "Other"];
const ADMIN_PASSWORD = "Hazard2025";
const MAX_IMAGE_SIZE = 50000; // Max base64 string length to avoid Airtable limits

// =====================================================
// STATE
// =====================================================
let state = {
  currentView: "controller",
  isAdmin: false,
  stations: [],
  entries: [],
  selectedStation: null,
  editingEntry: null,
  editingStation: null,
  previewImage: null,
  visitCount: 0
};

// DOM Elements
const app = document.getElementById("app");

// =====================================================
// DATA OPERATIONS (Airtable + localStorage fallback)
// =====================================================

// Fetch stations - NO DEFAULT STATIONS, only from Airtable
async function fetchStations() {
  if (!isAirtableConfigured()) {
    console.warn("⚠️ Airtable not configured. Please configure Airtable to use this portal.");
    return []; // Return empty - no default stations
  }

  try {
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.STATIONS_TABLE), {
      headers: getHeaders()
    });
    
    if (!response.ok) throw new Error(`Airtable error: ${response.status}`);
    
    const data = await response.json();
    return data.records.map(record => ({
      id: record.fields.id || record.id,
      name: record.fields.name || '',
      columns: record.fields.columns ? JSON.parse(record.fields.columns) : [],
      enabled: record.fields.enabled || false,
      editedByAdmin: record.fields.editedByAdmin || false,
      airtableRecordId: record.id
    }));
  } catch (error) {
    console.error("Error fetching stations:", error);
    return []; // Return empty on error - no localStorage fallback
  }
}

// Create station - ONLY saves to Airtable
async function createStationApi(station) {
  if (!isAirtableConfigured()) {
    showToast("Please configure Airtable to create stations", "error");
    return null;
  }

  try {
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.STATIONS_TABLE), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        records: [{
          fields: {
            id: station.id,
            name: station.name,
            columns: JSON.stringify(station.columns),
            enabled: station.enabled,
            editedByAdmin: station.editedByAdmin || false
          }
        }]
      })
    });
    
    if (!response.ok) throw new Error(`Airtable error: ${response.status}`);
    
    const data = await response.json();
    return { ...station, airtableRecordId: data.records[0].id };
  } catch (error) {
    console.error("Error creating station:", error);
    showToast("Failed to create station in Airtable", "error");
    return null;
  }
}

// Update station - ONLY saves to Airtable
async function updateStationApi(station) {
  if (!isAirtableConfigured() || !station.airtableRecordId) {
    showToast("Cannot update: Airtable not configured", "error");
    return;
  }

  try {
    await fetch(`${getAirtableUrl(AIRTABLE_CONFIG.STATIONS_TABLE)}/${station.airtableRecordId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          name: station.name,
          columns: JSON.stringify(station.columns),
          enabled: station.enabled,
          editedByAdmin: station.editedByAdmin || false
        }
      })
    });
  } catch (error) {
    console.error("Error updating station:", error);
    showToast("Failed to update station", "error");
  }
}

// Delete station - ONLY deletes from Airtable
async function deleteStationApi(stationId, airtableRecordId) {
  if (!isAirtableConfigured() || !airtableRecordId) {
    showToast("Cannot delete: Airtable not configured", "error");
    return;
  }

  try {
    await fetch(`${getAirtableUrl(AIRTABLE_CONFIG.STATIONS_TABLE)}/${airtableRecordId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (error) {
    console.error("Error deleting station:", error);
    showToast("Failed to delete station", "error");
  }
}

// Fetch entries - ONLY from Airtable
async function fetchEntries() {
  if (!isAirtableConfigured()) {
    return []; // Return empty - no localStorage fallback
  }

  try {
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.ENTRIES_TABLE), {
      headers: getHeaders()
    });
    
    if (!response.ok) throw new Error(`Airtable error: ${response.status}`);
    
    const data = await response.json();
    return data.records.map(record => ({
      id: record.fields.id || record.id,
      stationId: record.fields.stationId || '',
      data: record.fields.data ? JSON.parse(record.fields.data) : {},
      editedByController: record.fields.editedByController || false,
      airtableRecordId: record.id
    }));
  } catch (error) {
    console.error("Error fetching entries:", error);
    return []; // Return empty on error
  }
}

// Create entry - ONLY saves to Airtable
async function createEntryApi(entry) {
  if (!isAirtableConfigured()) {
    showToast("Please configure Airtable to create entries", "error");
    return null;
  }

  try {
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.ENTRIES_TABLE), {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        records: [{
          fields: {
            id: entry.id,
            stationId: entry.stationId,
            data: JSON.stringify(entry.data),
            editedByController: entry.editedByController || false
          }
        }]
      })
    });
    
    if (!response.ok) throw new Error(`Airtable error: ${response.status}`);
    
    const data = await response.json();
    return { ...entry, airtableRecordId: data.records[0].id };
  } catch (error) {
    console.error("Error creating entry:", error);
    showToast("Failed to create entry", "error");
    return null;
  }
}

// Update entry - ONLY saves to Airtable
async function updateEntryApi(entry) {
  if (!isAirtableConfigured() || !entry.airtableRecordId) {
    showToast("Cannot update: Airtable not configured", "error");
    return;
  }

  try {
    await fetch(`${getAirtableUrl(AIRTABLE_CONFIG.ENTRIES_TABLE)}/${entry.airtableRecordId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({
        fields: {
          data: JSON.stringify(entry.data),
          editedByController: entry.editedByController || false
        }
      })
    });
  } catch (error) {
    console.error("Error updating entry:", error);
    showToast("Failed to update entry", "error");
  }
}

// Delete entry - ONLY deletes from Airtable
async function deleteEntryApi(entryId, airtableRecordId) {
  if (!isAirtableConfigured() || !airtableRecordId) {
    showToast("Cannot delete: Airtable not configured", "error");
    return;
  }

  try {
    await fetch(`${getAirtableUrl(AIRTABLE_CONFIG.ENTRIES_TABLE)}/${airtableRecordId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (error) {
    console.error("Error deleting entry:", error);
    showToast("Failed to delete entry", "error");
  }
}

// =====================================================
// VISIT COUNTER
// =====================================================
async function getVisitCount() {
  if (!isAirtableConfigured()) return 0;
  
  try {
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.VISITS_TABLE), {
      headers: getHeaders()
    });
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    if (data.records.length > 0) {
      return data.records[0].fields.count || 0;
    }
    return 0;
  } catch (error) {
    console.error("Error fetching visit count:", error);
    return 0;
  }
}

async function incrementVisitCount() {
  if (!isAirtableConfigured()) return 0;
  
  try {
    // First, get existing record
    const response = await fetch(getAirtableUrl(AIRTABLE_CONFIG.VISITS_TABLE), {
      headers: getHeaders()
    });
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    
    if (data.records.length > 0) {
      // Update existing record
      const record = data.records[0];
      const newCount = (record.fields.count || 0) + 1;
      
      await fetch(`${getAirtableUrl(AIRTABLE_CONFIG.VISITS_TABLE)}/${record.id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          fields: { count: newCount }
        })
      });
      
      return newCount;
    } else {
      // Create first record
      const createResponse = await fetch(getAirtableUrl(AIRTABLE_CONFIG.VISITS_TABLE), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          records: [{
            fields: {
              id: "counter",
              count: 1
            }
          }]
        })
      });
      
      if (createResponse.ok) return 1;
      return 0;
    }
  } catch (error) {
    console.error("Error incrementing visit count:", error);
    return 0;
  }
}

// =====================================================
// LOAD DATA
// =====================================================
async function loadData() {
  state.stations = await fetchStations();
  state.entries = await fetchEntries();
  
  // Increment and get visit count
  state.visitCount = await incrementVisitCount();
}

// =====================================================
// TOAST NOTIFICATIONS
// =====================================================
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

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function generateId() {
  return Date.now().toString();
}

// =====================================================
// ICONS (SVG strings)
// =====================================================
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
  archive: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`
};

// =====================================================
// RENDER FUNCTIONS
// =====================================================
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
              ASM Login
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
  const airtableConnected = isAirtableConfigured();
  return `
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-text">
          <p>© 2025 Hazard and Risk Portal. All rights reserved.</p>
          <p class="visit-counter">Total Visitors: ${state.visitCount.toLocaleString()}</p>
        </div>
        <div class="footer-credits">
          <p>Created by Prashant Golhar</p>
          
          ${state.isAdmin && state.currentView === "admin" ? `
            <div style="margin-top: 0.5rem;">
              ${airtableConnected ? `
                <span class="live-indicator">
                  <span class="live-dot"></span>
                  Page is Live 
                </span>
              ` : `
                <span style="font-size: 0.75rem; opacity: 0.75;">
                  Using localStorage (Airtable not configured)
                </span>
              `}
            </div>
          ` : ""}
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
          <div class="dialog-title">${icons.shield}ASM Login</div>
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
      <div class="dialog dialog-station">
        <div class="dialog-header">
          <div class="dialog-title">Create New Station</div>
          <div class="dialog-description">Create a new station with custom columns to manage hazard and risk data entries.</div>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">Station Name</label>
            <input type="text" id="newStationName" class="form-input" placeholder="Enter station name">
          </div>
          <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
            <div class="flex items-center" style="justify-content: space-between; margin-bottom: 0.5rem;">
              <label class="form-label" style="margin-bottom: 0;">Columns</label>
              <button class="btn btn-outline" onclick="addNewColumn()">
                ${icons.plus}
                Add Column
              </button>
            </div>
            <div id="newColumnsContainer" style="flex: 1; overflow-y: auto;"></div>
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
      <div class="dialog dialog-station">
        <div class="dialog-header">
          <div class="dialog-title" id="editStationTitle">Edit Station</div>
          <div class="dialog-description">Modify the columns for this station.</div>
        </div>
        <div class="dialog-body">
          <div class="form-group" style="flex: 1; display: flex; flex-direction: column;">
            <div class="flex items-center" style="justify-content: space-between; margin-bottom: 0.5rem;">
              <label class="form-label" style="margin-bottom: 0;">Columns</label>
              <button class="btn btn-outline" onclick="addEditColumn()">
                ${icons.plus}
                Add Column
              </button>
            </div>
            <div id="editColumnsContainer" style="flex: 1; overflow-y: auto;"></div>
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

// =====================================================
// EVENT HANDLERS
// =====================================================
function attachEventListeners() {
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

// =====================================================
// STATION MANAGEMENT
// =====================================================
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

async function createStation() {
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
  
  const created = await createStationApi(station);
  state.stations.push(created);
  closeDialog("addStationDialog");
  showToast("Station created successfully");
  render();
}

async function toggleStationStatus(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (station) {
    station.enabled = !station.enabled;
    await updateStationApi(station);
    showToast(`Station ${station.enabled ? 'enabled' : 'disabled'}`);
    render();
  }
}

async function deleteStation(stationId) {
  if (confirm("Are you sure you want to delete this station?")) {
    const station = state.stations.find(s => s.id === stationId);
    
    // Delete entries for this station
    const stationEntries = state.entries.filter(e => e.stationId === stationId);
    for (const entry of stationEntries) {
      await deleteEntryApi(entry.id, entry.airtableRecordId);
    }
    state.entries = state.entries.filter(e => e.stationId !== stationId);
    
    // Delete station
    await deleteStationApi(stationId, station?.airtableRecordId);
    state.stations = state.stations.filter(s => s.id !== stationId);
    
    showToast("Station deleted");
    render();
  }
}

// =====================================================
// EDIT STATION
// =====================================================
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

async function saveStationEdit() {
  if (editColumns.length === 0) {
    showToast("Please add at least one column", "error");
    return;
  }
  
  const station = state.stations.find(s => s.id === editingStationId);
  if (station) {
    station.columns = [...editColumns];
    station.editedByAdmin = true;
    await updateStationApi(station);
    
    // Reset editedByController for all entries of this station so they can be edited again
    const stationEntries = state.entries.filter(e => e.stationId === editingStationId);
    for (const entry of stationEntries) {
      if (entry.editedByController) {
        entry.editedByController = false;
        await updateEntryApi(entry);
      }
    }
    
    closeDialog("editStationDialog");
    showToast("Station updated. Controllers can now edit entries again.");
    render();
  }
}

// =====================================================
// ENTRY MANAGEMENT
// =====================================================
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
  
  const today = new Date().toISOString().split('T')[0];
  const container = document.getElementById("entryFormContainer");
  container.innerHTML = station.columns.map(col => {
    const currentValue = entryData[col.id] || '';
    const isOtherSelected = col.type === "informs" && currentValue && !INFORM_TO_OPTIONS.slice(0, -1).includes(currentValue);
    
    return `
    <div class="form-group">
      <label class="form-label">${col.name}</label>
      ${col.type === "text" ? `
        <input type="text" class="form-input" value="${currentValue}" onchange="updateEntryData('${col.id}', this.value)" placeholder="Enter ${col.name.toLowerCase()}">
      ` : col.type === "date" ? `
       <input type="date" class="form-input" value="${currentValue}" max="${today}" onchange="updateEntryData('${col.id}', this.value)">
      ` : col.type === "levels" ? `
        <select class="form-select" onchange="updateEntryData('${col.id}', this.value)">
          <option value="">Select Level</option>
          ${LEVELS_OPTIONS.map(level => `<option value="${level}" ${currentValue === level ? 'selected' : ''}>${level}</option>`).join("")}
        </select>
      ` : col.type === "informs" ? `
        <select class="form-select" onchange="handleInformToChange('${col.id}', this.value)">
          <option value="">Select Department</option>
          ${INFORM_TO_OPTIONS.map(opt => `<option value="${opt}" ${(opt === "Other" && isOtherSelected) || currentValue === opt ? 'selected' : ''}>${opt}</option>`).join("")}
        </select>
        <div id="other-${col.id}" class="other-input-container" style="display: ${isOtherSelected ? 'block' : 'none'}; margin-top: 0.5rem;">
          <input type="text" class="form-input" value="${isOtherSelected ? currentValue : ''}" onchange="updateEntryData('${col.id}', this.value)" placeholder="Enter department name">
        </div>
      ` : `
        <input type="file" class="form-input" accept="image/*" onchange="handleFileUpload('${col.id}', this)">
        <div id="upload-status-${col.id}" style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--muted-foreground);"></div>
        ${currentValue ? `<img src="${currentValue}" alt="Preview" style="width: 128px; height: 128px; object-fit: cover; border-radius: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border);">` : ''}
      `}
    </div>
  `}).join("");
}

function handleInformToChange(columnId, value) {
  if (value === "Other") {
    document.getElementById(`other-${columnId}`).style.display = 'block';
    entryData[columnId] = ''; // Clear until user types
  } else {
    document.getElementById(`other-${columnId}`).style.display = 'none';
    entryData[columnId] = value;
  }
}

function updateEntryData(columnId, value) {
  entryData[columnId] = value;
}

function handleFileUpload(columnId, input) {
  const file = input.files?.[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showToast("Please upload an image file", "error");
    return;
  }
  
  const statusEl = document.getElementById(`upload-status-${columnId}`);
  if (statusEl) statusEl.textContent = "Processing image...";
  
  // Compress image before storing
  compressImage(file, (compressedBase64) => {
    if (compressedBase64.length > MAX_IMAGE_SIZE) {
      showToast("Image too large. Please use a smaller image.", "error");
      if (statusEl) statusEl.textContent = "Image too large!";
      return;
    }
    
    entryData[columnId] = compressedBase64;
    if (statusEl) statusEl.textContent = "Image ready!";
    renderEntryForm(entryStationId);
  });
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Max dimensions for compression
      const maxWidth = 400;
      const maxHeight = 400;
      
      let width = img.width;
      let height = img.height;
      
      // Scale down if needed
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to compressed JPEG
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
      callback(compressedBase64);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function saveEntry() {
  if (editingEntryId) {
    // Edit existing
    const entry = state.entries.find(e => e.id === editingEntryId);
    if (entry) {
      entry.data = {...entryData};
      if (isControllerEdit) {
        entry.editedByController = true;
      }
      await updateEntryApi(entry);
      showToast("Entry updated successfully");
    }
  } else {
    // Add new
    const newEntry = {
      id: generateId(),
      stationId: entryStationId,
      data: {...entryData},
      editedByController: false
    };
    
    const created = await createEntryApi(newEntry);
    if (created) {
      state.entries.push(created);
      showToast("Entry added successfully");
    } else {
      showToast("Failed to save entry", "error");
      return;
    }
  }
  
  closeDialog("entryDialog");
  render();
}

async function deleteEntry(entryId) {
  if (confirm("Are you sure you want to delete this entry?")) {
    const entry = state.entries.find(e => e.id === entryId);
    await deleteEntryApi(entryId, entry?.airtableRecordId);
    state.entries = state.entries.filter(e => e.id !== entryId);
    showToast("Entry deleted");
    render();
  }
}

// =====================================================
// IMAGE PREVIEW
// =====================================================
function openImagePreview(entryId, columnId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (entry && entry.data[columnId]) {
    document.getElementById("previewImage").src = entry.data[columnId];
    openDialog("imagePreviewDialog");
  }
}

// =====================================================
// EXPORT TO EXCEL
// =====================================================
async function exportToExcel(stationId) {
  const station = state.stations.find(s => s.id === stationId);
  if (!station) return;
  
  const entries = state.entries.filter(e => e.stationId === stationId);
  
  showToast("Generating Excel file...");
  
  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hazard & Risk Portal';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet(station.name, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    
    // Define headers - UPPERCASE
    const headers = ["SR NO", ...station.columns.map(c => c.name.toUpperCase())];
    
    // Track which columns have images for sizing
    const imageColumns = station.columns.map((col, idx) => col.type === "file" ? idx + 2 : -1).filter(i => i > -1);
    
    // Add header row
    const headerRow = worksheet.addRow(headers);
    
    // Style header row
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF003366' }
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    // Set column widths - 5cm = ~19 characters for image columns, others auto
    const CM_TO_WIDTH = 4.5; // Approximate conversion
    worksheet.columns = headers.map((header, idx) => {
      if (imageColumns.includes(idx + 1)) {
        return { width: 5 * CM_TO_WIDTH }; // 5cm width for image columns
      }
      return { width: Math.max(header.length + 5, 15) };
    });
    
    // Process entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rowData = [i + 1];
      const rowImageData = []; // Track images to add after row creation
      
      for (let colIdx = 0; colIdx < station.columns.length; colIdx++) {
        const col = station.columns[colIdx];
        
        if (col.type === "file" && entry.data[col.id]) {
          rowData.push(""); // Placeholder for image
          rowImageData.push({ colIndex: colIdx + 2, imageData: entry.data[col.id] });
        } else if (col.type === "date" && entry.data[col.id]) {
          rowData.push(new Date(entry.data[col.id]).toLocaleDateString());
        } else {
          rowData.push(entry.data[col.id] || "");
        }
      }
      
      const row = worksheet.addRow(rowData);
      
      // Set row height for images (5cm = ~142 pixels = ~106 points)
      const hasImages = rowImageData.length > 0;
      if (hasImages) {
        row.height = 142; // 5cm height
      } else {
        row.height = 25;
      }
      
      // Style data cells - center aligned
      row.eachCell((cell, colNumber) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
        // Alternate row colors
        if (i % 2 === 0) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' }
          };
        }
      });
      
      // Add images
      for (const imgData of rowImageData) {
        try {
          // Extract base64 data
          const base64Match = imgData.imageData.match(/^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/);
          if (base64Match) {
            const extension = base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1];
            const base64String = base64Match[2];
            
            const imageId = workbook.addImage({
              base64: base64String,
              extension: extension
            });
            
            // 5cm x 5cm = approximately 189 x 189 pixels at 96 DPI
            // Position image in cell with some padding
            worksheet.addImage(imageId, {
              tl: { col: imgData.colIndex - 1 + 0.1, row: row.number - 1 + 0.1 },
              ext: { width: 170, height: 170 } // Slightly smaller than cell for padding
            });
          }
        } catch (imgError) {
          console.error("Error adding image:", imgError);
        }
      }
    }
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${station.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    
    showToast("Excel exported successfully with images!");
  } catch (error) {
    console.error("Export error:", error);
    showToast("Export failed. Please try again.", "error");
  }
}

// =====================================================
// INITIALIZE
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  render();
});

// --- Supabase Integration ---
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Fetch all clients from Supabase
async function fetchClientsFromSupabase() {
    const { data, error } = await supabase
        .from('clients')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data || [];
}

// Save (insert) a new client to Supabase
async function saveClientToSupabase(client) {
    const { data, error } = await supabase
        .from('clients')
        .insert([client]);
    if (error) {
        console.error('Supabase insert error:', error);
        return null;
    }
    return data && data[0];
}
// Function to generate next client ID
function getNextClientId() {
    if (!window.allClients || window.allClients.length === 0) {
        return 'CT001';
    }
    
    // Extract numbers from existing client IDs and find the maximum
    const clientIds = window.allClients
        .map(c => c.clientId)
        .filter(id => id && id.startsWith('CT'))
        .map(id => parseInt(id.substring(2), 10));
    
    const maxNum = clientIds.length > 0 ? Math.max(...clientIds) : 0;
    const nextNum = maxNum + 1;
    
    return 'CT' + String(nextNum).padStart(3, '0');
}


// Supabase replaces localStorage for clients
async function loadClientsFromStorage() {
    // Fetch from Supabase
    return await fetchClientsFromSupabase();
}


async function saveClientsToStorage(client) {
    // Insert single client to Supabase
    return await saveClientToSupabase(client);
}

function mergeClientsWithStorage(apiClients) {
    const saved = loadClientsFromStorage();
    const combined = [...(apiClients || []), ...saved];
    const seen = new Set();
    return combined.filter(client => {
        const key = client?.clientId || client?.id || JSON.stringify(client);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Clients Module
async function loadClients() {
    updateClientsHeaderActions('clients');

    const contentEl = document.getElementById('content-body');

    contentEl.innerHTML = `
        <div class="ledger-tabs" style="margin-bottom: 24px;">
            <button class="ledger-tab active" onclick="setActiveClientTab('clients')">
                <i class="fas fa-users"></i> Clients
            </button>
            <button class="ledger-tab" onclick="setActiveClientTab('vendors')">
                <i class="fas fa-truck"></i> Vendors
            </button>
        </div>

        <div id="client-tab-content" class="ledger-tab-content"></div>
    `;

    window.clientActiveTab = 'clients';
    renderClientsTab(document.getElementById('client-tab-content'));
}

function updateClientsHeaderActions(tab) {
    const headerActionsEl = document.getElementById('header-actions');
    if (!headerActionsEl) return;
    const canEditData = Auth.hasFeaturePermission('clients', 'edit');

    if (!canEditData) {
        headerActionsEl.innerHTML = '';
        return;
    }

    if (tab === 'clients') {
        headerActionsEl.innerHTML = `
            <button class="btn btn-primary btn-press-3d" onclick="showAddClientModal()">
                <i class="fas fa-plus"></i>
                Add Client
            </button>
        `;
        return;
    }

    if (tab === 'vendors') {
        headerActionsEl.innerHTML = `
            <button class="btn btn-primary btn-press-3d" onclick="showAddVendorModal()">
                <i class="fas fa-plus"></i>
                Add Vendor
            </button>
        `;
        return;
    }

    headerActionsEl.innerHTML = '';
}

function setActiveClientTab(tab) {
    window.clientActiveTab = tab;
    updateClientsHeaderActions(tab);

    const tabs = document.querySelectorAll('.ledger-tabs .ledger-tab');
    tabs.forEach(t => {
        t.classList.remove('active');
        const tabType = t.getAttribute('onclick').includes('vendors') ? 'vendors' : 'clients';
        if (tabType === tab) {
            t.classList.add('active');
        }
    });

    const contentEl = document.getElementById('client-tab-content');
    if (!contentEl) return;

    if (tab === 'vendors') {
        renderVendorsTab(contentEl);
    } else {
        renderClientsTab(contentEl);
    }
}

async function renderClientsTab(contentEl) {
    window.lastClientsSearchTerm = '';

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>All Clients</h3>
                <input type="text" id="search-clients" placeholder="Search clients..." 
                    onkeyup="filterClients(this.value)" style="width: 250px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
            </div>
            <div class="card-body">
                <div id="clients-table-container"></div>
            </div>
        </div>
    `;

    try {
        const savedVehicles = localStorage.getItem(STORAGE_KEYS.VEHICLES);
        window.allVehicles = savedVehicles ? JSON.parse(savedVehicles) : [];
    } catch (error) {
        window.allVehicles = [];
    }
    window.allClients = loadClientsFromStorage();
    displayClientsTable(window.allClients);

    try {
        try {
            const [clients, vehicles] = await Promise.all([
                Promise.race([
                    API.getClients(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                ]),
                Promise.race([
                    API.getVehicles(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                ]).catch(() => [])
            ]);

            window.allVehicles = vehicles || [];
            window.allClients = mergeClientsWithStorage(clients);
            saveClientsToStorage();
            displayClientsTable(window.allClients);
        } catch (e) {
            try {
                const savedVehicles = localStorage.getItem(STORAGE_KEYS.VEHICLES);
                window.allVehicles = savedVehicles ? JSON.parse(savedVehicles) : [];
            } catch (error) {
                window.allVehicles = [];
            }
            window.allClients = loadClientsFromStorage();
            displayClientsTable(window.allClients);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function renderVendorsTab(contentEl) {
    window.lastVendorsSearchTerm = '';

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>All Vendors</h3>
                <input type="text" id="search-vendors" placeholder="Search vendors..." 
                    onkeyup="filterVendors(this.value)" style="width: 250px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
            </div>
            <div class="card-body">
                <div id="vendors-table-container"></div>
            </div>
        </div>
    `;

    const vendors = typeof loadVendorsFromStorage === 'function' ? loadVendorsFromStorage() : [];
    let updated = false;
    vendors.forEach((vendor, index) => {
        if (!vendor.vendorId) {
            const fallbackId = vendor.id || index + 1;
            vendor.vendorId = `VD${String(fallbackId).padStart(3, '0')}`;
            updated = true;
        }
    });
    if (updated && typeof saveVendorsToStorage === 'function') {
        saveVendorsToStorage();
    }
    window.allVendors = vendors;
    displayVendorsTable(vendors);
}

function displayClientsTable(clients) {
    const container = document.getElementById('clients-table-container');
    const canEditData = Auth.hasFeaturePermission('clients', 'edit');
    const canDeleteData = Auth.hasFeaturePermission('clients', 'delete');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                <p style="margin-bottom: 16px;">No clients found</p>
                ${canEditData ? `<button class="btn btn-primary" onclick="showAddClientModal()">
                    <i class="fas fa-plus"></i> Add Client
                </button>` : ''}
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table compact-table">';
    html += '<thead><tr>';
    html += '<th>Client ID</th>';
    html += '<th>Name</th>';
    html += '<th>Email</th>';
    html += '<th>Phone</th>';
    html += '<th>NTN</th>';
    html += '<th>Vehicles</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    clients.forEach(client => {
        const statusClass = `status-${client.status.toLowerCase()}`;
        
        // Count vehicles for this client from the vehicles list
        let vehicleCount = 0;
        if (window.allVehicles && Array.isArray(window.allVehicles)) {
            vehicleCount = window.allVehicles.filter(v => v.clientName === client.name).length;
        }
        
        html += '<tr>';
        html += `<td><strong style="color: #1976d2; font-weight: 700;">${client.clientId || 'N/A'}</strong></td>`;
        html += `<td><strong>${client.name}</strong></td>`;
        html += `<td>${client.email}</td>`;
        html += `<td>${client.phone}</td>`;
        html += `<td>${client.ntn || '-'}</td>`;
        html += `<td><span class="badge" style="background: #e3f2fd; color: #1976d2;">${vehicleCount}</span></td>`;
        html += `<td><span class="status-badge ${statusClass}">${client.status}</span></td>`;
        let actionsHtml = '';
        if (canEditData) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="editClient(${client.id})" title="Edit Client" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            actionsHtml += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteClient(${client.id})" title="Delete Client"><i class="fas fa-trash"></i></button>`;
        }

        html += `<td style="white-space: nowrap;">${actionsHtml || '<span style="color: var(--gray-400);">-</span>'}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
}

function displayVendorsTable(vendors) {
    const container = document.getElementById('vendors-table-container');
    const canEditData = Auth.hasFeaturePermission('clients', 'edit');
    const canDeleteData = Auth.hasFeaturePermission('clients', 'delete');
    if (!container) return;

    if (!vendors || vendors.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                <p style="margin-bottom: 16px;">No vendors found</p>
                ${canEditData ? `<button class="btn btn-primary" onclick="showAddVendorModal()">
                    <i class="fas fa-plus"></i> Add Vendor
                </button>` : ''}
            </div>
        `;
        return;
    }

    let html = '<div class="table-responsive"><table class="data-table compact-table">';
    html += '<thead><tr>';
    html += '<th>Vendor ID</th>';
    html += '<th>Name</th>';
    html += '<th>Email</th>';
    html += '<th>Phone</th>';
    html += '<th>NTN</th>';
    html += '<th>Status</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    vendors.forEach(vendor => {
        const statusClass = `status-${(vendor.status || 'active').toLowerCase()}`;
        html += '<tr>';
        html += `<td><strong style="color: #1976d2; font-weight: 700;">${vendor.vendorId || 'N/A'}</strong></td>`;
        html += `<td><strong>${vendor.name || '-'}</strong></td>`;
        html += `<td>${vendor.email || '-'}</td>`;
        html += `<td>${vendor.phone || '-'}</td>`;
        html += `<td>${vendor.ntn || '-'}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${vendor.status || 'Active'}</span></td>`;
        let actionsHtml = '';
        if (canEditData) {
            actionsHtml += `<button class="btn btn-sm btn-primary" onclick="editVendor(${vendor.id})" title="Edit Vendor" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            actionsHtml += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteVendor(${vendor.id})" title="Delete Vendor"><i class="fas fa-trash"></i></button>`;
        }

        html += `<td style="white-space: nowrap;">${actionsHtml || '<span style="color: var(--gray-400);">-</span>'}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

}

function filterClients(searchTerm) {
    if (!window.allClients) return;
    
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    window.lastClientsSearchTerm = normalizedSearch;

    if (!normalizedSearch) {
        displayClientsTable(window.allClients);
        return;
    }
    
    const filtered = window.allClients.filter(client => 
        String(client.name || '').toLowerCase().includes(normalizedSearch) ||
        String(client.email || '').toLowerCase().includes(normalizedSearch)
    );
    
    displayClientsTable(filtered);
}

function filterVendors(searchTerm) {
    if (!window.allVendors) return;

    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    window.lastVendorsSearchTerm = normalizedSearch;

    if (!normalizedSearch) {
        displayVendorsTable(window.allVendors);
        return;
    }

    const filtered = window.allVendors.filter(vendor => {
        const name = vendor.name || '';
        const email = vendor.email || '';
        const phone = vendor.phone || '';
        return name.toLowerCase().includes(normalizedSearch) ||
            email.toLowerCase().includes(normalizedSearch) ||
            phone.toLowerCase().includes(normalizedSearch);
    });

    displayVendorsTable(filtered);
}

function showAddClientModal() {
    if (!ensureFeaturePermission('clients', 'create')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'add-client-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: min(95vw, 500px); max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; flex: 1; min-width: 0;">Add New Client</h2>
                <button onclick="document.getElementById('add-client-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="saveNewClient(event)" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; color: var(--gray-600);">Client ID</label>
                    <input type="text" value="${getNextClientId()}" disabled style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; background: var(--gray-100); color: #1976d2; font-weight: 600;">
                    <small style="color: var(--gray-500); margin-top: 4px; display: block;">Auto-generated</small>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Client Name *</label>
                    <input type="text" id="client-name" placeholder="Enter client name" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email *</label>
                    <input type="email" id="client-email" placeholder="Enter email address" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone *</label>
                    <input type="tel" id="client-phone" placeholder="Enter phone number" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Address</label>
                    <input type="text" id="client-address" placeholder="Enter address" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">NTN (Optional)</label>
                    <input type="text" id="client-ntn" placeholder="Enter NTN" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Default Vehicle Unit Price (PKR) *</label>
                    <input type="number" id="client-default-rate" placeholder="Enter default unit price" min="0" step="0.01" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="client-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Add Client</button>
                    <button type="button" onclick="document.getElementById('add-client-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('client-name').focus();
}

function saveNewClient(event) {
    event.preventDefault();

    if (!ensureFeaturePermission('clients', 'create')) {
        return;
    }
    
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const address = document.getElementById('client-address').value.trim();
    const ntn = document.getElementById('client-ntn').value.trim();
    const defaultUnitPrice = parseFloat(document.getElementById('client-default-rate').value);
    const status = document.getElementById('client-status').value;
    
    if (!name || !email || !phone || !defaultUnitPrice || defaultUnitPrice <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    window.allClients = window.allClients || [];
    const nextId = window.allClients.reduce((max, c) => Math.max(max, c.id || 0), 0) + 1;
    // Create new client object
    const newClient = {
        id: nextId,
        clientId: getNextClientId(),
        name: name,
        email: email,
        phone: phone,
        address: address || 'Not specified',
        ntn: ntn || '',
        defaultUnitPrice: defaultUnitPrice,
        vehicleCount: 0,
        status: status,
        totalInvoices: 0,
        balance: 0
    };
    
    // Add to clients list
    window.allClients.push(newClient);
    saveClientsToStorage();
    
    // Update table
    displayClientsTable(window.allClients);
    
    // Close modal
    document.getElementById('add-client-modal').remove();
    
    // Show success message
    showNotification('Client added successfully!', 'success');
}

function editClient(clientId) {
    if (!ensureFeaturePermission('clients', 'edit')) {
        return;
    }

    const client = window.allClients.find(c => c.id === clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'edit-client-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: min(95vw, 500px); max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; flex: 1; min-width: 0;">Edit Client</h2>
                <button onclick="document.getElementById('edit-client-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="updateClient(event, ${clientId})" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Client Name *</label>
                    <input type="text" id="edit-client-name" value="${client.name}" placeholder="Enter client name" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email *</label>
                    <input type="email" id="edit-client-email" value="${client.email}" placeholder="Enter email address" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone *</label>
                    <input type="tel" id="edit-client-phone" value="${client.phone}" placeholder="Enter phone number" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Address</label>
                    <input type="text" id="edit-client-address" value="${client.address}" placeholder="Enter address" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">NTN (Optional)</label>
                    <input type="text" id="edit-client-ntn" value="${client.ntn || ''}" placeholder="Enter NTN" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Default Vehicle Unit Price (PKR) *</label>
                    <input type="number" id="edit-client-default-rate" value="${client.defaultUnitPrice || ''}" min="0" step="0.01" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="edit-client-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active" ${client.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${client.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                
                <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--gray-300);">
                
                <div>
                    <label style="display: block; margin-bottom: 12px; font-weight: 600; color: var(--gray-700);">
                        <i class="fas fa-sitemap"></i> Fleet / Department Management
                    </label>
                    <button type="button" onclick="showCategoryManagementModal('${client.name}')" class="btn btn-primary" style="width: 100%; margin-bottom: 12px;">
                        <i class="fas fa-cog"></i> Manage Fleets
                    </button>
                    <div id="category-list" style="background: var(--gray-50); padding: 12px; border-radius: 4px; border: 1px solid var(--gray-300);"></div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Update Client</button>
                    <button type="button" onclick="document.getElementById('edit-client-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
        <script>
            // Display current fleets for this client in the modal
            setTimeout(() => {
                const clientName = '${client.name}';
                initializeClientFleets(clientName);
                const categoryList = document.getElementById('category-list');
                const fleets = window.clientFleets[clientName] || [];
                if (fleets && fleets.length > 0) {
                    let html = '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
                    fleets.forEach(fleet => {
                        html += '<span style="color: #000000; font-size: 13px; display: inline-block; font-weight: 600;">' + fleet + '</span>';
                    });
                    html += '</div>';
                    categoryList.innerHTML = html;
                } else {
                    categoryList.innerHTML = '<p style="font-size: 13px; color: var(--gray-500); margin: 0;">No fleets defined yet</p>';
                }
            }, 0);
        </script>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('edit-client-name').focus();
}

function updateClient(event, clientId) {
    event.preventDefault();

    if (!ensureFeaturePermission('clients', 'edit')) {
        return;
    }
    
    const name = document.getElementById('edit-client-name').value.trim();
    const email = document.getElementById('edit-client-email').value.trim();
    const phone = document.getElementById('edit-client-phone').value.trim();
    const address = document.getElementById('edit-client-address').value.trim();
    const ntn = document.getElementById('edit-client-ntn').value.trim();
    const defaultUnitPrice = parseFloat(document.getElementById('edit-client-default-rate').value);
    const status = document.getElementById('edit-client-status').value;
    
    if (!name || !email || !phone || !defaultUnitPrice || defaultUnitPrice <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Find and update client
    const clientIndex = window.allClients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
        window.allClients[clientIndex] = {
            ...window.allClients[clientIndex],
            name: name,
            email: email,
            phone: phone,
            address: address || 'Not specified',
            ntn: ntn || '',
            defaultUnitPrice: defaultUnitPrice,
            status: status
        };
    }
    
    // Update table
    displayClientsTable(window.allClients);
    saveClientsToStorage();
    
    // Close modal
    document.getElementById('edit-client-modal').remove();
    
    // Show success message
    showNotification('Client updated successfully!', 'success');
}

function deleteClient(clientId) {
    if (!ensureFeaturePermission('clients', 'delete')) {
        return;
    }

    const client = window.allClients.find(c => c.id === clientId);
    if (!client) {
        alert('Client not found');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'delete-client-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 400px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <h2 style="margin: 0 0 12px 0; color: var(--danger);">Delete Client?</h2>
            <p style="margin: 0 0 20px 0; color: var(--gray-600);">
                Are you sure you want to delete <strong>${client.name}</strong>? This action cannot be undone.
            </p>
            
            <div style="display: flex; gap: 12px;">
                <button onclick="confirmDeleteClient(${clientId})" class="btn" style="flex: 1; background: var(--danger); color: white;">Delete</button>
                <button onclick="document.getElementById('delete-client-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function confirmDeleteClient(clientId) {
    if (!ensureFeaturePermission('clients', 'delete')) {
        return;
    }

    // Remove client from list
    window.allClients = window.allClients.filter(c => c.id !== clientId);
    saveClientsToStorage();
    
    // Update table
    displayClientsTable(window.allClients);
    
    // Close modal
    document.getElementById('delete-client-modal').remove();
    
    // Show success message
    showNotification('Client deleted successfully!', 'success');
}

function editVendor(vendorId) {
    if (!ensureFeaturePermission('clients', 'edit')) {
        return;
    }

    const vendors = window.allVendors || [];
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
        alert('Vendor not found');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'edit-vendor-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: min(95vw, 500px); max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; flex: 1; min-width: 0;">Edit Vendor</h2>
                <button onclick="document.getElementById('edit-vendor-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <form onsubmit="updateVendor(event, ${vendorId})" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Vendor Name *</label>
                    <input type="text" id="edit-vendor-name" value="${vendor.name || ''}" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email</label>
                    <input type="email" id="edit-vendor-email" value="${vendor.email || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone</label>
                    <input type="tel" id="edit-vendor-phone" value="${vendor.phone || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Address</label>
                    <input type="text" id="edit-vendor-address" value="${vendor.address || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">NTN (Optional)</label>
                    <input type="text" id="edit-vendor-ntn" value="${vendor.ntn || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="edit-vendor-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active" ${vendor.status === 'Inactive' ? '' : 'selected'}>Active</option>
                        <option value="Inactive" ${vendor.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Update Vendor</button>
                    <button type="button" onclick="document.getElementById('edit-vendor-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('edit-vendor-name').focus();
}

function updateVendor(event, vendorId) {
    event.preventDefault();

    if (!ensureFeaturePermission('clients', 'edit')) {
        return;
    }

    const name = document.getElementById('edit-vendor-name').value.trim();
    const email = document.getElementById('edit-vendor-email').value.trim();
    const phone = document.getElementById('edit-vendor-phone').value.trim();
    const address = document.getElementById('edit-vendor-address').value.trim();
    const ntn = document.getElementById('edit-vendor-ntn').value.trim();
    const status = document.getElementById('edit-vendor-status').value;

    if (!name) {
        alert('Please enter vendor name');
        return;
    }

    const vendors = window.allVendors || [];
    const vendorIndex = vendors.findIndex(v => v.id === vendorId);
    if (vendorIndex !== -1) {
        vendors[vendorIndex] = {
            ...vendors[vendorIndex],
            name,
            email,
            phone,
            address,
            ntn: ntn || '',
            status
        };
    }

    window.allVendors = vendors;
    if (typeof saveVendorsToStorage === 'function') {
        saveVendorsToStorage();
    }
    displayVendorsTable(vendors);

    document.getElementById('edit-vendor-modal').remove();
    showNotification('Vendor updated successfully!', 'success');
}

function deleteVendor(vendorId) {
    if (!ensureFeaturePermission('clients', 'delete')) {
        return;
    }

    const vendors = window.allVendors || [];
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) {
        alert('Vendor not found');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'delete-vendor-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 400px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <h2 style="margin: 0 0 12px 0; color: var(--danger);">Delete Vendor?</h2>
            <p style="margin: 0 0 20px 0; color: var(--gray-600);">
                Are you sure you want to delete <strong>${vendor.name}</strong>? This action cannot be undone.
            </p>

            <div style="display: flex; gap: 12px;">
                <button onclick="confirmDeleteVendor(${vendorId})" class="btn" style="flex: 1; background: var(--danger); color: white;">Delete</button>
                <button onclick="document.getElementById('delete-vendor-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function confirmDeleteVendor(vendorId) {
    if (!ensureFeaturePermission('clients', 'delete')) {
        return;
    }

    window.allVendors = (window.allVendors || []).filter(v => v.id !== vendorId);
    if (typeof saveVendorsToStorage === 'function') {
        saveVendorsToStorage();
    }

    displayVendorsTable(window.allVendors);
    document.getElementById('delete-vendor-modal').remove();
    showNotification('Vendor deleted successfully!', 'success');
}
// Vehicle Fleet/Department Management Modal (Per Client)
function showCategoryManagementModal(clientName) {
    if (!clientName) {
        alert('Client not selected');
        return;
    }
    
    initializeClientFleets(clientName);
    
    const modal = document.createElement('div');
    modal.id = 'category-management-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    let categoriesHtml = '';
    const canDeleteData = Auth.hasFeaturePermission('clients', 'delete');
    const fleets = window.clientFleets[clientName] || [];
    if (fleets && fleets.length > 0) {
        categoriesHtml = fleets.map(fleet => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--gray-50); padding: 12px; border-radius: 4px; border: 1px solid var(--gray-300); margin-bottom: 8px;">
                <span style="font-weight: 500; color: var(--gray-800);">${fleet}</span>
                ${canDeleteData ? `<button type="button" onclick="deleteFleetAndRefresh('${clientName}', '${fleet}')" style="background: var(--danger); color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    Delete
                </button>` : ''}
            </div>
        `).join('');
    }
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: min(95vw, 500px); max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <div style="flex: 1; min-width: 0;">
                    <h2 style="margin: 0 0 4px 0;">Fleet Names / Departments</h2>
                    <p style="margin: 0; font-size: 12px; color: var(--gray-500);">for ${clientName}</p>
                </div>
                <button onclick="document.getElementById('category-management-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">Add New Fleet / Department</label>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="new-category-input" placeholder="e.g., Safari Villa 3, Express Delivery, etc." style="flex: 1; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    <button type="button" onclick="addNewFleetAndRefresh('${clientName}')" class="btn btn-primary">Add</button>
                </div>
            </div>
            
            <hr style="margin: 16px 0; border: none; border-top: 2px solid var(--gray-300);">
            
            <div>
                <h3 style="margin: 0 0 12px 0; font-size: 14px; color: var(--gray-600);">Current Fleets (${fleets ? fleets.length : 0})</h3>
                <div id="categories-list-container">
                    ${categoriesHtml || '<p style="font-size: 13px; color: var(--gray-500); margin: 0;">No fleets yet</p>'}
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button type="button" onclick="document.getElementById('category-management-modal').remove()" class="btn btn-primary" style="flex: 1;">Done</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('new-category-input').focus();
}

function addNewFleetAndRefresh(clientName) {
    const input = document.getElementById('new-category-input');
    const fleetName = input.value.trim();
    
    if (!fleetName) {
        alert('Please enter a fleet/department name');
        return;
    }
    
    if (addClientFleet(clientName, fleetName)) {
        showNotification(`Fleet "${fleetName}" added successfully!`, 'success');
        // Refresh the modal
        document.getElementById('category-management-modal').remove();
        showCategoryManagementModal(clientName);
    } else {
        alert('Fleet already exists or invalid name');
    }
}

function deleteFleetAndRefresh(clientName, fleetName) {
    if (!ensureFeaturePermission('clients', 'delete')) {
        return;
    }

    const confirm_delete = confirm(`Delete fleet "${fleetName}"?`);
    if (confirm_delete) {
        if (removeClientFleet(clientName, fleetName)) {
            showNotification(`Fleet "${fleetName}" deleted successfully!`, 'success');
            // Refresh the modal
            document.getElementById('category-management-modal').remove();
            showCategoryManagementModal(clientName);
        }
    }
}

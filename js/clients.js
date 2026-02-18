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

function loadClientsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load clients from localStorage:', error);
        return [];
    }
}

function saveClientsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(window.allClients || []));
    } catch (error) {
        console.error('Failed to save clients to localStorage:', error);
    }
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
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3>Clients Management</h3>
            <button class="btn btn-primary" onclick="showAddClientModal()">
                <i class="fas fa-plus"></i>
                Add Client
            </button>
        </div>
        
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
            
            // Store vehicles globally for vehicle count calculation
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

function displayClientsTable(clients) {
    const container = document.getElementById('clients-table-container');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                <p style="margin-bottom: 16px;">No clients found</p>
                <button class="btn btn-primary" onclick="showAddClientModal()">
                    <i class="fas fa-plus"></i> Add Client
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Client ID</th>';
    html += '<th>Name</th>';
    html += '<th>Email</th>';
    html += '<th>Phone</th>';
    html += '<th>Vehicles</th>';
    html += '<th>Status</th>';
    html += '<th>Balance</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    clients.forEach(client => {
        const statusClass = `status-${client.status.toLowerCase()}`;
        const balanceClass = client.balance >= 0 ? 'var(--danger)' : 'var(--success)';
        
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
        html += `<td><span class="badge" style="background: #e3f2fd; color: #1976d2;">${vehicleCount}</span></td>`;
        html += `<td><span class="status-badge ${statusClass}">${client.status}</span></td>`;
        html += `<td style="color: ${balanceClass}; font-weight: 600;">${formatPKR(client.balance)}</td>`;
        html += `<td>
            <button class="btn btn-sm btn-primary" onclick="editClient(${client.id})" style="margin-right: 4px;">Edit</button>
            <button class="btn btn-sm" style="background: var(--gray-200);" onclick="deleteClient(${client.id})">Delete</button>
        </td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Store clients for search
    window.allClients = clients;
}

function filterClients(searchTerm) {
    if (!window.allClients) return;
    
    const filtered = window.allClients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    displayClientsTable(filtered);
}

function showAddClientModal() {
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Add New Client</h2>
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
    
    const name = document.getElementById('client-name').value.trim();
    const email = document.getElementById('client-email').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const address = document.getElementById('client-address').value.trim();
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Edit Client</h2>
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
                        html += '<span style="background: #fff3e0; color: #e65100; padding: 6px 12px; border-radius: 4px; font-size: 13px; display: inline-block; font-weight: 600;">' + fleet + '</span>';
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
    
    const name = document.getElementById('edit-client-name').value.trim();
    const email = document.getElementById('edit-client-email').value.trim();
    const phone = document.getElementById('edit-client-phone').value.trim();
    const address = document.getElementById('edit-client-address').value.trim();
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
    const fleets = window.clientFleets[clientName] || [];
    if (fleets && fleets.length > 0) {
        categoriesHtml = fleets.map(fleet => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--gray-50); padding: 12px; border-radius: 4px; border: 1px solid var(--gray-300); margin-bottom: 8px;">
                <span style="font-weight: 500; color: var(--gray-800);">${fleet}</span>
                <button type="button" onclick="deleteFleetAndRefresh('${clientName}', '${fleet}')" style="background: var(--danger); color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    Delete
                </button>
            </div>
        `).join('');
    }
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
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

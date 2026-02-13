
// Clients Module
async function loadClients() {
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
            const clients = await Promise.race([
                API.getClients(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayClientsTable(clients);
        } catch (e) {
            // Use demo data
            displayClientsTable([
                {
                    id: 1,
                    name: 'Connectia Tech',
                    email: 'contact@connectia.com',
                    phone: '+92-300-1234567',
                    address: 'Karachi, Pakistan',
                    status: 'Active',
                    totalInvoices: 156,
                    balance: 50000
                },
                {
                    id: 2,
                    name: 'Transport Ltd',
                    email: 'info@transportltd.com',
                    phone: '+92-300-9876543',
                    address: 'Lahore, Pakistan',
                    status: 'Active',
                    totalInvoices: 98,
                    balance: -25000
                },
                {
                    id: 3,
                    name: 'Logistics Plus',
                    email: 'logistics@logisticsplus.com',
                    phone: '+92-300-5555555',
                    address: 'Islamabad, Pakistan',
                    status: 'Active',
                    totalInvoices: 67,
                    balance: 15000
                },
                {
                    id: 4,
                    name: 'Prime Delivery Services',
                    email: 'admin@primedelivery.com',
                    phone: '+92-300-4444444',
                    address: 'Rawalpindi, Pakistan',
                    status: 'Active',
                    totalInvoices: 234,
                    balance: 75000
                },
                {
                    id: 5,
                    name: 'Fleet Management Co',
                    email: 'fleet@fleetmgmt.com',
                    phone: '+92-300-3333333',
                    address: 'Multan, Pakistan',
                    status: 'Inactive',
                    totalInvoices: 145,
                    balance: -50000
                }
            ]);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

// Helper function to get vehicle count for a client
async function getVehicleCountForClient(clientId) {
    try {
        // Try to get vehicles from API
        const vehicles = await Promise.race([
            API.getVehicles ? API.getVehicles() : Promise.reject(new Error('API not available')),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        
        // Count vehicles belonging to this client
        return vehicles.filter(v => v.clientId === clientId || v.client_id === clientId).length;
    } catch (e) {
        // If API fails, try to use window.allVehicles if available
        if (window.allVehicles && Array.isArray(window.allVehicles)) {
            return window.allVehicles.filter(v => v.clientId === clientId || v.client_id === clientId).length;
        }
        return 0;
    }
}

// Helper function to get all vehicles
async function getAllVehicles() {
    try {
        const vehicles = await Promise.race([
            API.getVehicles ? API.getVehicles() : Promise.reject(new Error('API not available')),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        return vehicles;
    } catch (e) {
        // Return stored vehicles or empty array
        return window.allVehicles || [];
    }
}

async function displayClientsTable(clients) {
    const container = document.getElementById('clients-table-container');
    
    if (!clients || clients.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No clients found</p>';
        return;
    }
    
    // Get all vehicles once
    const allVehicles = await getAllVehicles();
    
    // Create a map of clientId to vehicle count
    const vehicleCountMap = {};
    allVehicles.forEach(vehicle => {
        const clientId = vehicle.clientId || vehicle.client_id;
        if (clientId) {
            vehicleCountMap[clientId] = (vehicleCountMap[clientId] || 0) + 1;
        }
    });
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
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
        
        // Get actual vehicle count from the map
        const vehicleCount = vehicleCountMap[client.id] || 0;
        
        html += '<tr>';
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
    const status = document.getElementById('client-status').value;
    
    if (!name || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new client object (removed vehicleCount as it's calculated dynamically)
    const newClient = {
        id: Math.max(...window.allClients.map(c => c.id), 0) + 1,
        name: name,
        email: email,
        phone: phone,
        address: address || 'Not specified',
        status: status,
        totalInvoices: 0,
        balance: 0
    };
    
    // Add to clients list
    window.allClients.push(newClient);
    
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 500px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
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
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="edit-client-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active" ${client.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${client.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Update Client</button>
                    <button type="button" onclick="document.getElementById('edit-client-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
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
    const status = document.getElementById('edit-client-status').value;
    
    if (!name || !email || !phone) {
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
            status: status
        };
    }
    
    // Update table
    displayClientsTable(window.allClients);
    
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
    
    // Update table
    displayClientsTable(window.allClients);
    
    // Close modal
    document.getElementById('delete-client-modal').remove();
    
    // Show success message
    showNotification('Client deleted successfully!', 'success');
}

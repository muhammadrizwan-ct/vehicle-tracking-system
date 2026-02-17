// Vehicle Fleet Categories Management (Per Client)
function initializeClientFleets(clientName) {
    if (!window.clientFleets) {
        window.clientFleets = {};
    }
    
    if (!window.clientFleets[clientName]) {
        const stored = localStorage.getItem(`clientFleets_${clientName}`);
        if (stored) {
            window.clientFleets[clientName] = JSON.parse(stored);
            if (clientName === 'Connectia Tech') {
                window.clientFleets[clientName] = ['Safari Villas 3'];
                saveClientFleets(clientName);
            }
        } else {
            window.clientFleets[clientName] = [];
            saveClientFleets(clientName);
        }
    }
}

function saveClientFleets(clientName) {
    if (window.clientFleets && window.clientFleets[clientName]) {
        localStorage.setItem(`clientFleets_${clientName}`, JSON.stringify(window.clientFleets[clientName]));
    }
}

function addClientFleet(clientName, fleetName) {
    initializeClientFleets(clientName);
    if (fleetName.trim() && !window.clientFleets[clientName].includes(fleetName.trim())) {
        window.clientFleets[clientName].push(fleetName.trim());
        saveClientFleets(clientName);
        return true;
    }
    return false;
}

function removeClientFleet(clientName, fleetName) {
    initializeClientFleets(clientName);
    const index = window.clientFleets[clientName].indexOf(fleetName);
    if (index > -1) {
        window.clientFleets[clientName].splice(index, 1);
        saveClientFleets(clientName);
        return true;
    }
    return false;
}

function getClientFleetDropdownOptions(clientName) {
    initializeClientFleets(clientName);
    return window.clientFleets[clientName] ? window.clientFleets[clientName].map(fleet => 
        `<option value="${fleet}">${fleet}</option>`
    ).join('') : '';
}

function loadVehiclesFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load vehicles from localStorage:', error);
        return [];
    }
}

function saveVehiclesToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(window.allVehicles || []));
    } catch (error) {
        console.error('Failed to save vehicles to localStorage:', error);
    }
}

function mergeVehiclesWithStorage(apiVehicles) {
    const saved = loadVehiclesFromStorage();
    const combined = [...(apiVehicles || []), ...saved];
    const seen = new Set();
    return combined.filter(vehicle => {
        const key = vehicle?.id || vehicle?.vehicleId || JSON.stringify(vehicle);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Vehicles Module
async function loadVehicles() {
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    window.archivedVehicles = loadArchivedVehiclesFromStorage();
    
    contentEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3>Vehicle Management</h3>
            <div style="display: flex; gap: 8px;">
                <button class="btn" style="background: var(--gray-200);" onclick="showArchivedVehiclesModal()">
                    <i class="fas fa-archive"></i>
                    Archived Vehicles
                </button>
                <button class="btn btn-primary" onclick="showAddVehicleModal()">
                    <i class="fas fa-plus"></i>
                    Add Vehicle
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>All Vehicles</h3>
                <input type="text" id="search-vehicles" placeholder="Search vehicles..." 
                    onkeyup="filterVehicles(this.value)" style="width: 250px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
            </div>
            <div class="card-body">
                <div id="vehicles-table-container"></div>
            </div>
        </div>
    `;
    
    try {
        try {
            const vehicles = await Promise.race([
                API.getVehicles(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
                window.allVehicles = mergeVehiclesWithStorage(vehicles);
                saveVehiclesToStorage();
                displayVehiclesTable(filterArchivedVehicles(window.allVehicles));
        } catch (e) {
                window.allVehicles = loadVehiclesFromStorage();
                displayVehiclesTable(filterArchivedVehicles(window.allVehicles));
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

function loadArchivedVehiclesFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.ARCHIVED_VEHICLES);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to load archived vehicles:', error);
        return [];
    }
}

function saveArchivedVehiclesToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.ARCHIVED_VEHICLES, JSON.stringify(window.archivedVehicles || []));
    } catch (error) {
        console.error('Failed to save archived vehicles:', error);
    }
}

function filterArchivedVehicles(vehicles) {
    const archivedIds = new Set((window.archivedVehicles || []).map(v => v.id));
    return vehicles.filter(v => !archivedIds.has(v.id));
}

function displayVehiclesTable(vehicles) {
    const container = document.getElementById('vehicles-table-container');
    
    if (!vehicles || vehicles.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                <p style="margin-bottom: 16px;">No vehicles found</p>
                <button class="btn btn-primary" onclick="showAddVehicleModal()">
                    <i class="fas fa-plus"></i> Add Vehicle
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Registration</th>';
    html += '<th>Brand</th>';
    html += '<th>Model</th>';
    html += '<th>Fleet Name</th>';
    html += '<th>Client</th>';
    html += '<th>Status</th>';
    html += '<th>Mileage</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    vehicles.forEach(vehicle => {
        const statusClass = `status-${vehicle.status.toLowerCase()}`;
            saveVehiclesToStorage();
        
        html += '<tr>';
        html += `<td><strong>${vehicle.registrationNo}</strong></td>`;
        html += `<td>${vehicle.brand}</td>`;
        html += `<td>${vehicle.model}</td>`;
        html += `<td><span class="badge" style="background: #fff3e0; color: #e65100; font-weight: 600;">${vehicle.category || 'N/A'}</span></td>`;
        html += `<td>${vehicle.clientName}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${vehicle.status}</span></td>`;
        html += `<td>${vehicle.mileage} km</td>`;
        html += `<td>
            <button class="btn btn-sm btn-primary" onclick="viewVehicleDetails(${vehicle.id})" style="margin-right: 4px;">View</button>
            <button class="btn btn-sm" style="background: var(--gray-200); margin-right: 4px;" onclick="editVehicle(${vehicle.id})">Edit</button>
            <button class="btn btn-sm" style="background: var(--warning); color: #111827;" onclick="archiveVehicle(${vehicle.id})">Archive</button>
        </td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Store vehicles for search
    window.allVehicles = vehicles;
}

function filterVehicles(searchTerm) {
    if (!window.allVehicles) return;
    
    const filtered = window.allVehicles.filter(vehicle => 
        vehicle.registrationNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    displayVehiclesTable(filtered);
}

function showAddVehicleModal() {
    const modal = document.createElement('div');
    modal.id = 'add-vehicle-modal';
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
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 700px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Add New Vehicle</h2>
                <button onclick="document.getElementById('add-vehicle-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="saveNewVehicle(event)" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Vehicle Name *</label>
                    <input type="text" id="vehicle-name" placeholder="Enter vehicle name" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Client Name *</label>
                    <select id="vehicle-client" required onchange="updateFleetDropdown()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Client</option>
                        <option value="Connectia Tech">Connectia Tech</option>
                        <option value="Transport Ltd">Transport Ltd</option>
                        <option value="Logistics Plus">Logistics Plus</option>
                        <option value="Prime Delivery Services">Prime Delivery Services</option>
                        <option value="Fleet Management Co">Fleet Management Co</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Registration No *</label>
                    <input type="text" id="vehicle-reg" placeholder="e.g., GUJ-234" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Make/Brand *</label>
                    <input type="text" id="vehicle-brand" placeholder="e.g., Hino, Toyota" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Model *</label>
                    <input type="text" id="vehicle-model" placeholder="e.g., 500 Series" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">IMEI NO *</label>
                    <input type="text" id="vehicle-imei" placeholder="e.g., 358401001234567" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">SIM NO *</label>
                    <input type="text" id="vehicle-sim" placeholder="e.g., 923001234567" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fleet Name / Department *</label>
                    <select id="vehicle-category" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Fleet Name</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Installation Date *</label>
                    <input type="date" id="vehicle-install-date" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Unit Rate (PKR) *</label>
                    <input type="number" id="vehicle-rate" placeholder="Enter rate in rupees" min="0" step="0.01" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="vehicle-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                </div>
                
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes (Optional)</label>
                    <textarea id="vehicle-notes" placeholder="Add any additional notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; min-height: 60px;"></textarea>
                </div>
                
                <div style="grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Add Vehicle</button>
                    <button type="button" onclick="document.getElementById('add-vehicle-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('vehicle-name').focus();
    
    // Load fleets for selected client
    setTimeout(() => {
        const clientSelect = document.getElementById('vehicle-client');
        if (clientSelect.value) {
            updateFleetDropdown();
        }
    }, 0);
}

function updateFleetDropdown() {
    const clientName = document.getElementById('vehicle-client').value;
    const fleetSelect = document.getElementById('vehicle-category');
    
    if (!clientName || !fleetSelect) return;
    
    initializeClientFleets(clientName);
    const fleets = window.clientFleets[clientName] || [];
    
    fleetSelect.innerHTML = '<option value="">Select Fleet Name</option>';
    fleets.forEach(fleet => {
        const option = document.createElement('option');
        option.value = fleet;
        option.textContent = fleet;
        fleetSelect.appendChild(option);
    });
}

function saveNewVehicle(event) {
    event.preventDefault();
    
    const name = document.getElementById('vehicle-name').value.trim();
    const clientName = document.getElementById('vehicle-client').value.trim();
    const regNo = document.getElementById('vehicle-reg').value.trim();
    const brand = document.getElementById('vehicle-brand').value.trim();
    const model = document.getElementById('vehicle-model').value.trim();
    const imei = document.getElementById('vehicle-imei').value.trim();
    const sim = document.getElementById('vehicle-sim').value.trim();
    const category = document.getElementById('vehicle-category').value;
    const installDate = document.getElementById('vehicle-install-date').value;
    const rate = parseFloat(document.getElementById('vehicle-rate').value);
    const status = document.getElementById('vehicle-status').value;
    const notes = document.getElementById('vehicle-notes').value.trim();
    
    if (!name || !clientName || !regNo || !brand || !model || !imei || !sim || !category || !installDate || !rate) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create new vehicle object
    const newVehicle = {
        id: Math.max(...window.allVehicles.map(v => v.id), 0) + 1,
        registrationNo: regNo,
        brand: brand,
        model: model,
        type: category,
        year: new Date(installDate).getFullYear(),
        clientName: clientName,
        status: status,
        lastLocation: 'Not tracked',
        mileage: 0,
        vehicleName: name,
        imeiNo: imei,
        simNo: sim,
        installationDate: installDate,
        unitRate: rate,
        notes: notes
    };
    
    // Add to vehicles list
    window.allVehicles.push(newVehicle);
    
    // Update table
    displayVehiclesTable(window.allVehicles);
        saveVehiclesToStorage();
    
    // Close modal
    document.getElementById('add-vehicle-modal').remove();
    
    // Show success message
    showNotification('Vehicle added successfully!', 'success');
}

function viewVehicleDetails(vehicleId) {
    const vehicle = window.allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        alert('Vehicle not found');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'view-vehicle-modal';
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
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 700px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Vehicle Details</h2>
                <button onclick="document.getElementById('view-vehicle-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Registration No</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.registrationNo}</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Brand</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.brand}</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Model</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.model}</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Fleet Name</label>
                    <span style="background: #fff3e0; color: #e65100; padding: 4px 8px; border-radius: 3px; font-weight: 600; font-size: 14px;">${vehicle.category || 'N/A'}</span>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Client Name</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.clientName}</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Year</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.year}</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Status</label>
                    <span class="status-badge status-${vehicle.status.toLowerCase()}" style="padding: 4px 8px; border-radius: 3px; font-weight: 600; font-size: 12px;">${vehicle.status}</span>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Mileage</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.mileage || '0'} km</p>
                </div>
                
                <div style="padding: 12px; background: var(--gray-50); border-radius: 4px;">
                    <label style="display: block; font-size: 12px; color: var(--gray-500); font-weight: 600; margin-bottom: 4px;">Last Location</label>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: var(--gray-800);">${vehicle.lastLocation || 'N/A'}</p>
                </div>
            </div>
            
            <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--gray-300);">
            
            <div style="display: flex; gap: 12px;">
                <button type="button" onclick="editVehicle(${vehicle.id})" class="btn btn-primary" style="flex: 1;">
                    <i class="fas fa-edit"></i> Edit Vehicle
                </button>
                <button type="button" onclick="document.getElementById('view-vehicle-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function editVehicle(vehicleId) {
    const vehicle = window.allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        alert('Vehicle not found');
        return;
    }
    
    // Close view modal if open
    const viewModal = document.getElementById('view-vehicle-modal');
    if (viewModal) {
        viewModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'edit-vehicle-modal';
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
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 700px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Edit Vehicle</h2>
                <button onclick="document.getElementById('edit-vehicle-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="saveEditedVehicle(event, ${vehicleId})" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Registration No *</label>
                    <input type="text" id="edit-vehicle-reg" value="${vehicle.registrationNo}" placeholder="e.g., GUJ-234" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Make/Brand *</label>
                    <input type="text" id="edit-vehicle-brand" value="${vehicle.brand}" placeholder="e.g., Hino, Toyota" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Model *</label>
                    <input type="text" id="edit-vehicle-model" value="${vehicle.model}" placeholder="e.g., 500 Series" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Year *</label>
                    <input type="number" id="edit-vehicle-year" value="${vehicle.year}" min="1900" max="2100" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Client Name *</label>
                    <select id="edit-vehicle-client" onchange="updateEditFleetDropdown()" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Client</option>
                        <option value="Connectia Tech">Connectia Tech</option>
                        <option value="Transport Ltd">Transport Ltd</option>
                        <option value="Logistics Plus">Logistics Plus</option>
                        <option value="Prime Delivery Services">Prime Delivery Services</option>
                        <option value="Fleet Management Co">Fleet Management Co</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fleet Name / Department *</label>
                    <select id="edit-vehicle-category" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Fleet Name</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Mileage (km)</label>
                    <input type="number" id="edit-vehicle-mileage" value="${vehicle.mileage || 0}" min="0" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Last Location</label>
                    <input type="text" id="edit-vehicle-location" value="${vehicle.lastLocation || ''}" placeholder="e.g., Karachi" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="edit-vehicle-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active" ${vehicle.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Inactive" ${vehicle.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                        <option value="Maintenance" ${vehicle.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                    </select>
                </div>
                
                <div style="grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                    <button type="button" onclick="document.getElementById('edit-vehicle-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set selected values - client first, then load fleets
    setTimeout(() => {
        document.getElementById('edit-vehicle-client').value = vehicle.clientName || '';
        updateEditFleetDropdown();
        // Now set the category value
        setTimeout(() => {
            document.getElementById('edit-vehicle-category').value = vehicle.category || '';
        }, 0);
    }, 0);
}

function updateEditFleetDropdown() {
    const clientName = document.getElementById('edit-vehicle-client').value;
    const fleetSelect = document.getElementById('edit-vehicle-category');
    
    if (!clientName || !fleetSelect) return;
    
    initializeClientFleets(clientName);
    const fleets = window.clientFleets[clientName] || [];
    
    fleetSelect.innerHTML = '<option value="">Select Fleet Name</option>';
    fleets.forEach(fleet => {
        const option = document.createElement('option');
        option.value = fleet;
        option.textContent = fleet;
        fleetSelect.appendChild(option);
    });
}

function saveEditedVehicle(event, vehicleId) {
    event.preventDefault();
    
    const registrationNo = document.getElementById('edit-vehicle-reg').value.trim();
    const brand = document.getElementById('edit-vehicle-brand').value.trim();
    const model = document.getElementById('edit-vehicle-model').value.trim();
    const year = parseInt(document.getElementById('edit-vehicle-year').value);
    const category = document.getElementById('edit-vehicle-category').value;
    const clientName = document.getElementById('edit-vehicle-client').value;
    const mileage = parseInt(document.getElementById('edit-vehicle-mileage').value) || 0;
    const lastLocation = document.getElementById('edit-vehicle-location').value.trim();
    const status = document.getElementById('edit-vehicle-status').value;
    
    if (!registrationNo || !brand || !model || !category || !clientName) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Find and update vehicle
    const vehicleIndex = window.allVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex !== -1) {
        window.allVehicles[vehicleIndex] = {
            ...window.allVehicles[vehicleIndex],
            registrationNo: registrationNo,
            brand: brand,
            model: model,
            year: year,
            category: category,
            clientName: clientName,
            mileage: mileage,
            lastLocation: lastLocation,
            status: status
        };
    }
    
    // Update table
    displayVehiclesTable(window.allVehicles);
    
    // Close modal
    document.getElementById('edit-vehicle-modal').remove();
    
    // Show success message
    showNotification('Vehicle updated successfully!', 'success');
}

async function archiveVehicle(vehicleId) {
    const vehicle = window.allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        showNotification('Vehicle not found', 'error');
        return;
    }
    
    const confirmMessage = `Archive ${vehicle.registrationNo}? You can restore it later from Archived Vehicles.`;
    let confirmed = false;
    if (typeof showConfirm === 'function') {
        confirmed = await showConfirm(confirmMessage);
    } else {
        confirmed = confirm(confirmMessage);
    }
    
    if (!confirmed) {
        return;
    }
    
    window.archivedVehicles = window.archivedVehicles || [];
    if (!window.archivedVehicles.find(v => v.id === vehicleId)) {
        window.archivedVehicles.push(vehicle);
        saveArchivedVehiclesToStorage();
    }
    
    window.allVehicles = window.allVehicles.filter(v => v.id !== vehicleId);
    displayVehiclesTable(window.allVehicles);
        saveVehiclesToStorage();
    
    const viewModal = document.getElementById('view-vehicle-modal');
    if (viewModal) {
        viewModal.remove();
    }
    
    showNotification('Vehicle archived successfully!', 'success');
}

function showArchivedVehiclesModal() {
    const archived = window.archivedVehicles || [];
    const modal = document.createElement('div');
    modal.id = 'archived-vehicles-modal';
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
        overflow-y: auto;
    `;
    
    let tableHTML = '<p style="text-align: center; color: var(--gray-500);">No archived vehicles</p>';
    if (archived.length > 0) {
        tableHTML = '<div class="table-responsive"><table class="data-table"><thead><tr>';
        tableHTML += '<th>Registration</th><th>Brand</th><th>Model</th><th>Fleet Name</th><th>Client</th><th>Status</th><th>Actions</th>';
        tableHTML += '</tr></thead><tbody>';
        archived.forEach(vehicle => {
            const statusClass = `status-${(vehicle.status || 'inactive').toLowerCase()}`;
            tableHTML += '<tr>';
            tableHTML += `<td><strong>${vehicle.registrationNo}</strong></td>`;
            tableHTML += `<td>${vehicle.brand || ''}</td>`;
            tableHTML += `<td>${vehicle.model || ''}</td>`;
            tableHTML += `<td><span class="badge" style="background: #fff3e0; color: #e65100; font-weight: 600;">${vehicle.category || 'N/A'}</span></td>`;
            tableHTML += `<td>${vehicle.clientName || ''}</td>`;
            tableHTML += `<td><span class="status-badge ${statusClass}">${vehicle.status || 'Inactive'}</span></td>`;
            tableHTML += `<td><button class="btn btn-sm btn-primary" onclick="unarchiveVehicle(${vehicle.id})">Unarchive</button></td>`;
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table></div>';
    }
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 900px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Archived Vehicles</h2>
                <button onclick="document.getElementById('archived-vehicles-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            ${tableHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
}

function unarchiveVehicle(vehicleId) {
    const archived = window.archivedVehicles || [];
    const index = archived.findIndex(v => v.id === vehicleId);
    if (index === -1) {
        showNotification('Archived vehicle not found', 'error');
        return;
    }
    
    const vehicle = archived.splice(index, 1)[0];
    saveArchivedVehiclesToStorage();
    
    window.allVehicles = window.allVehicles || [];
    if (!window.allVehicles.find(v => v.id === vehicleId)) {
        window.allVehicles.unshift(vehicle);
    }
    displayVehiclesTable(window.allVehicles);
        saveVehiclesToStorage();
    
    const modal = document.getElementById('archived-vehicles-modal');
    if (modal) {
        modal.remove();
        showArchivedVehiclesModal();
    }
    
    showNotification('Vehicle unarchived successfully!', 'success');
}

async function deleteVehicle(vehicleId) {
    const vehicle = window.allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) {
        showNotification('Vehicle not found', 'error');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete ${vehicle.registrationNo}?`;
    let confirmed = false;
    if (typeof showConfirm === 'function') {
        confirmed = await showConfirm(confirmMessage);
    } else {
        confirmed = confirm(confirmMessage);
    }
    
    if (!confirmed) {
        return;
    }
    
    try {
        if (typeof API !== 'undefined' && API.deleteVehicle) {
            await API.deleteVehicle(vehicleId);
        }
    } catch (error) {
        console.error('Failed to delete vehicle from API:', error);
    }
    
    window.allVehicles = window.allVehicles.filter(v => v.id !== vehicleId);
        window.archivedVehicles = (window.archivedVehicles || []).filter(v => v.id !== vehicleId);
        saveArchivedVehiclesToStorage();
        saveVehiclesToStorage();
    displayVehiclesTable(window.allVehicles);
    
    const viewModal = document.getElementById('view-vehicle-modal');
    if (viewModal) {
        viewModal.remove();
    }
    
    showNotification('Vehicle deleted successfully!', 'success');
}

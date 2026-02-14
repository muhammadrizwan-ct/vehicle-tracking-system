// Vehicles Module
async function loadVehicles() {
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3>Vehicle Management</h3>
            <button class="btn btn-primary" onclick="showAddVehicleModal()">
                <i class="fas fa-plus"></i>
                Add Vehicle
            </button>
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
            displayVehiclesTable(vehicles);
        } catch (e) {
            // Use demo data
            displayVehiclesTable([
                {
                    id: 1,
                    registrationNo: 'GUJ-234',
                    brand: 'Hino',
                    model: '500 Series',
                    type: 'Truck',
                    year: 2022,
                    clientName: 'Connectia Tech',
                    status: 'Active',
                    lastLocation: 'Karachi',
                    mileage: 45000
                },
                {
                    id: 2,
                    registrationNo: 'KAR-567',
                    brand: 'Toyota',
                    model: 'Fortuner',
                    type: 'SUV',
                    year: 2021,
                    clientName: 'Connectia Tech',
                    status: 'Active',
                    lastLocation: 'Lahore',
                    mileage: 62000
                },
                {
                    id: 3,
                    registrationNo: 'LHR-890',
                    brand: 'Suzuki',
                    model: 'Alto',
                    type: 'Sedan',
                    year: 2020,
                    clientName: 'Transport Ltd',
                    status: 'Active',
                    lastLocation: 'Islamabad',
                    mileage: 78000
                },
                {
                    id: 4,
                    registrationNo: 'ISL-123',
                    brand: 'Hino',
                    model: '700 Series',
                    type: 'Truck',
                    year: 2023,
                    clientName: 'Logistics Plus',
                    status: 'Maintenance',
                    lastLocation: 'Rawalpindi',
                    mileage: 15000
                },
                {
                    id: 5,
                    registrationNo: 'MUL-456',
                    brand: 'Honda',
                    model: 'Civic',
                    type: 'Sedan',
                    year: 2021,
                    clientName: 'Prime Delivery',
                    status: 'Active',
                    lastLocation: 'Multan',
                    mileage: 58000
                },
                {
                    id: 6,
                    registrationNo: 'RWP-789',
                    brand: 'Isuzu',
                    model: 'NPR',
                    type: 'Van',
                    year: 2022,
                    clientName: 'Fleet Management',
                    status: 'Inactive',
                    lastLocation: 'Peshawar',
                    mileage: 32000
                }
            ]);
        }
    } catch (error) {
        console.error('Error loading vehicles:', error);
    }
}

function displayVehiclesTable(vehicles) {
    const container = document.getElementById('vehicles-table-container');
    
    if (!vehicles || vehicles.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No vehicles found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Registration</th>';
    html += '<th>Brand</th>';
    html += '<th>Model</th>';
    html += '<th>Type</th>';
    html += '<th>Client</th>';
    html += '<th>Status</th>';
    html += '<th>Mileage</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    vehicles.forEach(vehicle => {
        const statusClass = `status-${vehicle.status.toLowerCase()}`;
        
        html += '<tr>';
        html += `<td><strong>${vehicle.registrationNo}</strong></td>`;
        html += `<td>${vehicle.brand}</td>`;
        html += `<td>${vehicle.model}</td>`;
        html += `<td><span class="badge" style="background: #f3e5f5; color: #7b1fa2;">${vehicle.type}</span></td>`;
        html += `<td>${vehicle.clientName}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${vehicle.status}</span></td>`;
        html += `<td>${vehicle.mileage} km</td>`;
        html += `<td>
            <button class="btn btn-sm btn-primary" onclick="viewVehicleDetails(${vehicle.id})" style="margin-right: 4px;">View</button>
            <button class="btn btn-sm" style="background: var(--gray-200);" onclick="editVehicle(${vehicle.id})">Edit</button>
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
                    <select id="vehicle-client" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
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
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fleet Category *</label>
                    <select id="vehicle-category" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Fleet Category</option>
                        <option value="Safari Villa 3">Safari Villa 3</option>
                        <option value="Safari Villa 2">Safari Villa 2</option>
                        <option value="Safari Potohar">Safari Potohar</option>
                        <option value="Hino 500">Hino 500</option>
                        <option value="Hino 700">Hino 700</option>
                        <option value="Toyota Fortuner">Toyota Fortuner</option>
                        <option value="Suzuki Alto">Suzuki Alto</option>
                        <option value="Honda Civic">Honda Civic</option>
                        <option value="Isuzu NPR">Isuzu NPR</option>
                        <option value="Custom">Custom</option>
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
    
    // Close modal
    document.getElementById('add-vehicle-modal').remove();
    
    // Show success message
    showNotification('Vehicle added successfully!', 'success');
}

function viewVehicleDetails(vehicleId) {
    alert('View Vehicle ' + vehicleId + ' - Coming Soon!');
}

function editVehicle(vehicleId) {
    alert('Edit Vehicle ' + vehicleId + ' - Coming Soon!');
}

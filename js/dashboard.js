// Dashboard Module
async function loadDashboard() {
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div class="stats-grid" id="dashboard-stats">
            <!-- Stats will be loaded here -->
        </div>
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>Monthly Revenue</h3>
                    <select id="revenue-year" onchange="loadDashboard()">
                        ${generateYearOptions()}
                    </select>
                </div>
                <div class="card-body">
                    <canvas id="revenue-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Top Clients</h3>
                </div>
                <div class="card-body">
                    <div id="top-clients-list"></div>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>Clients by Vehicles</h3>
                </div>
                <div class="card-body">
                    <canvas id="category-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Payment Status</h3>
                </div>
                <div class="card-body">
                    <canvas id="payment-chart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <div class="card-header">
                <h3>Recent Invoices</h3>
                <button class="btn btn-sm btn-primary" onclick="loadPage('invoices')">
                    View All
                </button>
            </div>
            <div class="card-body">
                <div id="recent-invoices"></div>
            </div>
        </div>
    `;
    
    try {
        try {
            const metrics = await Promise.race([
                API.getDashboardMetrics(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayDashboardStats(metrics);
        } catch (e) {
            // Calculate metrics from actual data
            const metrics = calculateDashboardMetrics();
            displayDashboardStats(metrics);
        }

        try {
            const topClients = await Promise.race([
                API.getTopClients(5),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayTopClients(topClients);
        } catch (e) {
            const topClients = getTopClientsFromData(5);
            displayTopClients(topClients);
        }

        try {
            displayCategoryChart();
        } catch (e) {
            displayCategoryChart();
        }

        try {
            const recentInvoices = await Promise.race([
                API.getInvoices({ limit: 5, sort: 'desc' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayRecentInvoices(recentInvoices);
        } catch (e) {
            const recentInvoices = getRecentInvoices(5);
            displayRecentInvoices(recentInvoices);
        }

        try {
            const monthlyData = await Promise.race([
                API.getMonthlySummary(new Date().getFullYear()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayRevenueChart(monthlyData);
        } catch (e) {
            const monthlyData = getMonthlySummaryFromData(new Date().getFullYear());
            displayRevenueChart(monthlyData);
        }

        try {
            const paymentStatus = await Promise.race([
                API.getPaymentStatus(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayPaymentChart(paymentStatus);
        } catch (e) {
            const paymentStatus = getPaymentStatus();
            displayPaymentChart(paymentStatus);
        }
        
    } catch (error) {
        console.warn('Dashboard error:', error);
    }
}

function displayDashboardStats(metrics) {
    const statsEl = document.getElementById('dashboard-stats');
    
    statsEl.innerHTML = `
        <div class="stat-card">
            <div>
                <h4>Total Clients</h4>
                <div class="stat-number">${metrics.totalClients || 0}</div>
                <div class="stat-change positive">+${metrics.newClients || 0} this month</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-users"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Active Vehicles</h4>
                <div class="stat-number">${metrics.activeVehicles || 0}</div>
                <div class="stat-change">${metrics.vehicleCategories || 0} categories</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-car"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Monthly Revenue</h4>
                <div class="stat-number">${formatPKR(metrics.monthlyRevenue || 0)}</div>
                <div class="stat-change positive">+${metrics.revenueGrowth || 0}% vs last month</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-chart-line"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Total Receivable</h4>
                <div class="stat-number">${formatPKR(metrics.totalPending || 0)}</div>
                <div class="stat-change">Pending Invoices</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-credit-card"></i>
            </div>
        </div>
    `;
}

function displayTopClients(clients) {
    const listEl = document.getElementById('top-clients-list');
    
    if (!clients || clients.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No data available</p>';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    clients.forEach(client => {
        html += `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid var(--gray-200);">
                <div>
                    <div style="font-weight: 600;">${client.name}</div>
                    <div style="font-size: 12px; color: var(--gray-500);">${client.vehicleCount || 0} vehicles</div>
                </div>
                <div style="font-weight: 700; color: ${client.balance > 0 ? 'var(--danger)' : 'var(--success)'};">
                    ${formatPKR(client.balance || 0)}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    listEl.innerHTML = html;
}

function displayRevenueChart(monthlyData) {
    const ctx = document.getElementById('revenue-chart').getContext('2d');
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueData = monthlyData?.map(d => d.total) || new Array(12).fill(0);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Revenue',
                data: revenueData,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatPKR(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatPKR(value);
                        }
                    }
                }
            }
        }
    });
}

function displayCategoryChart(categoryData) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Get clients with vehicle and payment data
    const clientsChartData = getClientsChartData();
    
    if (clientsChartData.length === 0) {
        clientsChartData.push({ name: 'No Data', vehicleCount: 1, monthlyPayments: 0 });
    }
    
    const clientLabels = clientsChartData.map(c => 
        `${c.name}\n(Vehicles: ${c.vehicleCount}, Payments: Rs ${c.monthlyPayments.toLocaleString()})`
    );
    const vehicleCounts = clientsChartData.map(c => c.vehicleCount);
    
    const colors = [
        '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed',
        '#db2777', '#0891b2', '#7c2d12', '#4c0519', '#1e293b'
    ];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: clientLabels,
            datasets: [{
                data: vehicleCounts,
                backgroundColor: colors.slice(0, clientsChartData.length),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const data = clientsChartData[context.dataIndex];
                            return `Vehicles: ${data.vehicleCount} | Monthly Payments: Rs ${data.monthlyPayments.toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });
}

function displayRecentInvoices(invoices) {
    const container = document.getElementById('recent-invoices');
    
    if (!invoices || invoices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No recent invoices</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr><th>Invoice No</th><th>Client</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
    
    invoices.forEach(inv => {
        const statusClass = `status-${inv.status.toLowerCase()}`;
        
        html += '<tr onclick="showInvoiceDetails(\'' + inv.invoiceNo + '\')" style="cursor: pointer;">';
        html += `<td>${inv.invoiceNo}</td>`;
        html += `<td>${inv.clientName}</td>`;
        html += `<td>${formatDate(inv.invoiceDate)}</td>`;
        html += `<td>${formatPKR(inv.totalAmount)}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${inv.status}</span></td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '';
    
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
        options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
    }
    
    return options;
}

function displayPaymentChart(paymentData) {
    const ctx = document.getElementById('payment-chart');
    if (!ctx) return;
    
    const chartCtx = ctx.getContext('2d');
    
    const labels = Object.keys(paymentData);
    const data = Object.values(paymentData);
    const colors = ['#059669', '#f59e0b', '#dc2626'];
    
    new Chart(chartCtx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Calculate dashboard metrics from actual data
function calculateDashboardMetrics() {
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    const vehicles = JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLES) || '[]');
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    // Calculate total clients
    const totalClients = clients.length || 0;
    
    // Calculate new clients this month
    const newClients = clients.filter(c => {
        const createdDate = new Date(c.createdAt || new Date());
        return createdDate.getMonth() + 1 === currentMonth && createdDate.getFullYear() === currentYear;
    }).length || 0;
    
    // Calculate active vehicles
    const activeVehicles = vehicles.length || 0;
    
    // Calculate total invoices and collections
    const totalInvoices = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.netAmount ?? p.amount ?? p.totalAmount) || 0), 0);
    const totalPending = invoices.reduce((sum, inv) => {
        const pending = (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0);
        return sum + Math.max(0, pending);
    }, 0);
    
    // Calculate collection rate
    const collectionRate = totalInvoices > 0 ? Math.round((totalPaid / totalInvoices) * 100) : 0;
    
    return {
        totalClients,
        newClients,
        activeVehicles,
        newVehicles: 0,
        vehicleCategories: 0,
        monthlyRevenue: totalPaid,
        revenueGrowth: 0,
        collectionRate,
        totalPending
    };
}

// Get top clients from actual data
function getTopClientsFromData(limit = 5) {
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS) || '[]');
    
    // Group invoices by client
    const clientData = {};
    invoices.forEach(inv => {
        const clientName = inv.clientName || 'Unknown';
        if (!clientData[clientName]) {
            clientData[clientName] = {
                name: clientName,
                totalAmount: 0,
                paidAmount: 0,
                vehicleCount: 0
            };
        }
        clientData[clientName].totalAmount += Number(inv.totalAmount) || 0;
        clientData[clientName].paidAmount += Number(inv.paidAmount) || 0;
        clientData[clientName].vehicleCount += Number(inv.vehicleCount) || 1;
    });
    
    // Convert to array and sort by total amount
    const topClients = Object.values(clientData)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, limit)
        .map((client, idx) => ({
            id: idx + 1,
            name: client.name,
            vehicleCount: client.vehicleCount,
            balance: client.totalAmount - client.paidAmount
        }));
    
    return topClients;
}

// Get clients chart data with vehicle and payment info
function getClientsChartData(limit = 10) {
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    const vehicles = JSON.parse(localStorage.getItem(STORAGE_KEYS.VEHICLES) || '[]');
    const payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    
    // Group vehicles by client
    const clientData = {};
    vehicles.forEach(vehicle => {
        const clientName = vehicle.clientName || 'Unknown';
        if (!clientData[clientName]) {
            clientData[clientName] = {
                name: clientName,
                vehicleCount: 0,
                monthlyPayments: 0
            };
        }
        clientData[clientName].vehicleCount++;
    });
    
    // Add payment data
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    payments.forEach(payment => {
        const paymentDate = new Date(payment.paymentDate);
        if (paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear) {
            if (payment.lineItems && payment.lineItems.length > 0) {
                payment.lineItems.forEach(item => {
                    const clientName = item.clientName || 'Unknown';
                    if (!clientData[clientName]) {
                        clientData[clientName] = {
                            name: clientName,
                            vehicleCount: 0,
                            monthlyPayments: 0
                        };
                    }
                    clientData[clientName].monthlyPayments += Number(item.allocatedAmount) || 0;
                });
            }
        }
    });
    
    return Object.values(clientData)
        .sort((a, b) => b.vehicleCount - a.vehicleCount)
        .slice(0, limit);
}
function getRecentInvoices(limit = 5) {
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    
    return invoices
        .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
        .slice(0, limit)
        .map(inv => ({
            invoiceNo: inv.invoiceNo,
            clientName: inv.clientName || 'Unknown',
            invoiceDate: inv.invoiceDate,
            totalAmount: inv.totalAmount,
            status: inv.status || 'Pending'
        }));
}

// Get payment status from actual data
function getPaymentStatus() {
    const invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
    
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    
    invoices.forEach(inv => {
        if (inv.status === 'Paid') {
            paid++;
        } else if (inv.status === 'Pending') {
            const dueDate = new Date(inv.dueDate);
            if (dueDate < new Date()) {
                overdue++;
            } else {
                pending++;
            }
        } else {
            pending++;
        }
    });
    
    return { paid, pending, overdue };
}

// Get monthly summary from actual payment data
function getMonthlySummaryFromData(year = new Date().getFullYear()) {
    const payments = JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]');
    
    // Initialize monthly totals
    const monthlyTotals = Array(12).fill(0);
    
    // Sum payments by month
    payments.forEach(payment => {
        const paymentDate = new Date(payment.paymentDate);
        if (paymentDate.getFullYear() === year) {
            const month = paymentDate.getMonth();
            const amount = Number(payment.netAmount ?? payment.amount ?? payment.totalAmount ?? 0);
            monthlyTotals[month] += amount;
        }
    });
    
    // Convert to expected format
    return monthlyTotals.map((total, idx) => ({
        month: idx + 1,
        total: total
    }));
}
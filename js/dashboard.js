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
                    <h3>Category Distribution</h3>
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
            // Use demo data
            displayDashboardStats({
                totalClients: 24,
                newClients: 3,
                activeVehicles: 127,
                newVehicles: 5,
                vehicleCategories: 8,
                monthlyRevenue: 185000,
                revenueGrowth: 12,
                collectionRate: 85,
                totalPending: 350000
            });
        }

        try {
            const topClients = await Promise.race([
                API.getTopClients(5),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayTopClients(topClients);
        } catch (e) {
            displayTopClients([
                { id: 1, name: 'Connectia Tech', vehicleCount: 15, balance: 50000 },
                { id: 2, name: 'Transport Ltd', vehicleCount: 12, balance: -25000 },
                { id: 3, name: 'Logistics Plus', vehicleCount: 8, balance: 15000 }
            ]);
        }

        try {
            const categoryAnalysis = await Promise.race([
                API.getCategoryAnalysis(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayCategoryChart(categoryAnalysis);
        } catch (e) {
            displayCategoryChart([
                { category: 'Sedan', count: 35 },
                { category: 'SUV', count: 28 },
                { category: 'Truck', count: 20 },
                { category: 'Van', count: 18 },
                { category: 'Other', count: 26 }
            ]);
        }

        try {
            const recentInvoices = await Promise.race([
                API.getInvoices({ limit: 5, sort: 'desc' }),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayRecentInvoices(recentInvoices);
        } catch (e) {
            displayRecentInvoices([
                { invoiceNo: 'CT001', clientName: 'Connectia Tech', invoiceDate: new Date().toISOString(), totalAmount: 150000, status: 'Paid' },
                { invoiceNo: 'CT002', clientName: 'Transport Ltd', invoiceDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), totalAmount: 85000, status: 'Pending' },
                { invoiceNo: 'CT003', clientName: 'Logistics Plus', invoiceDate: new Date(Date.now() - 5*24*60*60*1000).toISOString(), totalAmount: 120000, status: 'Paid' }
            ]);
        }

        try {
            const monthlyData = await Promise.race([
                API.getMonthlySummary(new Date().getFullYear()),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayRevenueChart(monthlyData);
        } catch (e) {
            displayRevenueChart([
                { month: 1, total: 150000 },
                { month: 2, total: 185000 },
                { month: 3, total: 195000 },
                { month: 4, total: 170000 },
                { month: 5, total: 210000 },
                { month: 6, total: 225000 },
                { month: 7, total: 200000 },
                { month: 8, total: 230000 },
                { month: 9, total: 215000 },
                { month: 10, total: 240000 },
                { month: 11, total: 195000 },
                { month: 12, total: 280000 }
            ]);
        }

        try {
            const paymentStatus = await Promise.race([
                API.getPaymentStatus(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayPaymentChart(paymentStatus);
        } catch (e) {
            displayPaymentChart({
                paid: 156,
                pending: 47,
                overdue: 12
            });
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
                <h4>Collection Rate</h4>
                <div class="stat-number">${metrics.collectionRate || 0}%</div>
                <div class="stat-change">Pending: ${formatPKR(metrics.totalPending || 0)}</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-percent"></i>
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
    
    const categories = categoryData?.map(c => c.category) || [];
    const counts = categoryData?.map(c => c.count) || [];
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: counts,
                backgroundColor: [
                    '#2563eb',
                    '#059669',
                    '#d97706',
                    '#dc2626',
                    '#7c3aed',
                    '#db2777'
                ]
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
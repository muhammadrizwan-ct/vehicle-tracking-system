// Dashboard Module
let dashboardRevenueChart = null;
let dashboardCategoryChart = null;
let dashboardPaymentChart = null;

function withTimeout(promise, timeoutMs = 2000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
}

function isDashboardStillActive() {
    return (sessionStorage.getItem('currentPage') || '') === 'dashboard';
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthKeyLabel(monthKey) {
    const [yearText, monthText] = String(monthKey || '').split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return 'Current Month';
    }

    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getRecordDate(record = {}, candidates = []) {
    for (const key of candidates) {
        const value = record?.[key];
        if (!value) continue;

        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date;
        }
    }

    return null;
}

function toMonthKeyFromDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function isDateInMonthKey(date, monthKey) {
    if (!date || !monthKey) return false;
    return toMonthKeyFromDate(date) === monthKey;
}

function collectDashboardMonthKeys(dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const keys = new Set();

    const addFromRecords = (records = [], dateFields = []) => {
        records.forEach((record) => {
            const date = getRecordDate(record, dateFields);
            const monthKey = toMonthKeyFromDate(date);
            if (monthKey) {
                keys.add(monthKey);
            }
        });
    };

    addFromRecords(dataStore.clients, ['created_at', 'createdAt', 'dateAdded', 'addedAt', 'created']);
    addFromRecords(dataStore.vehicles, ['installationDate', 'installDate', 'install_date', 'created_at', 'createdAt', 'dateAdded']);
    addFromRecords(dataStore.invoices, ['invoiceDate', 'invoice_date', 'date', 'created_at', 'createdAt']);

    // Ensure current month is always available
    keys.add(getCurrentMonthKey());

    return Array.from(keys).sort((a, b) => b.localeCompare(a));
}

function buildDashboardMonthOptions(selectedMonthKey, dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const monthKeys = collectDashboardMonthKeys(dataStore);
    return monthKeys.map((key) => {
        const selectedAttr = key === selectedMonthKey ? 'selected' : '';
        return `<option value="${key}" ${selectedAttr}>${formatMonthKeyLabel(key)}</option>`;
    }).join('');
}

function readDashboardLocalData() {
    const parseSafe = (key) => {
        try {
            const raw = localStorage.getItem(key);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    };

    return {
        clients: parseSafe(STORAGE_KEYS.CLIENTS),
        vehicles: parseSafe(STORAGE_KEYS.VEHICLES),
        invoices: parseSafe(STORAGE_KEYS.INVOICES),
        payments: parseSafe(STORAGE_KEYS.PAYMENTS)
    };
}

async function hydrateDashboardDataStore() {
    const local = readDashboardLocalData();
    const store = {
        clients: [...local.clients],
        vehicles: [...local.vehicles],
        invoices: [...local.invoices],
        payments: [...local.payments]
    };

    const settleList = await Promise.allSettled([
        (typeof fetchClientsFromSupabase === 'function') ? withTimeout(fetchClientsFromSupabase(), 2500) : Promise.resolve([]),
        (typeof fetchVehiclesFromSupabase === 'function') ? withTimeout(fetchVehiclesFromSupabase(), 2500) : Promise.resolve([]),
        (typeof fetchInvoicesFromSupabase === 'function') ? withTimeout(fetchInvoicesFromSupabase(), 2500) : Promise.resolve([]),
        (typeof fetchPaymentsFromSupabase === 'function') ? withTimeout(fetchPaymentsFromSupabase(), 2500) : Promise.resolve([])
    ]);

    const [clientsRes, vehiclesRes, invoicesRes, paymentsRes] = settleList;
    if (clientsRes.status === 'fulfilled' && Array.isArray(clientsRes.value) && clientsRes.value.length > 0) {
        store.clients = clientsRes.value;
    }
    if (vehiclesRes.status === 'fulfilled' && Array.isArray(vehiclesRes.value) && vehiclesRes.value.length > 0) {
        store.vehicles = vehiclesRes.value;
    }
    if (invoicesRes.status === 'fulfilled' && Array.isArray(invoicesRes.value) && invoicesRes.value.length > 0) {
        store.invoices = invoicesRes.value;
    }
    if (paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value) && paymentsRes.value.length > 0) {
        store.payments = paymentsRes.value;
    }

    window.dashboardDataStore = store;
    return store;
}

async function loadDashboard() {
    // Dashboard download actions
    document.getElementById('header-actions').innerHTML = `
        <button class="btn btn-sm btn-primary btn-export" onclick="exportDashboardPDF()" title="Download Dashboard PDF" aria-label="Download Dashboard PDF">
            <i class="fas fa-file-pdf"></i>
        </button>
        <button class="btn btn-sm btn-success btn-export" onclick="exportDashboardExcel()" title="Download Dashboard Excel" aria-label="Download Dashboard Excel">
            <i class="fas fa-file-excel"></i>
        </button>
    `;
    
    const contentEl = document.getElementById('content-body');
    const previousMonthKey = document.getElementById('dashboard-month-filter')?.value || getCurrentMonthKey();
    const monthOptions = buildDashboardMonthOptions(previousMonthKey);
    
    contentEl.innerHTML = `
        <div class="card" style="margin-bottom: 16px;">
            <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h3 style="margin: 0;">Dashboard Summary</h3>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label for="dashboard-month-filter" style="font-size: 13px; color: var(--gray-600); font-weight: 600;">Month</label>
                    <select id="dashboard-month-filter" onchange="loadDashboard()" style="padding: 8px 10px; border: 1px solid var(--gray-300); border-radius: 6px; min-width: 150px;">
                        ${monthOptions}
                    </select>
                </div>
            </div>
        </div>

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
        const selectedYear = Number(document.getElementById('revenue-year')?.value) || new Date().getFullYear();
        const dataStore = await hydrateDashboardDataStore();
        const selectedMonthKey = document.getElementById('dashboard-month-filter')?.value || getCurrentMonthKey();

        const [topClients, recentInvoices, monthlyData, paymentStatus] = await Promise.all([
            withTimeout(API.getTopClients(5), 2000).catch(() => getTopClientsFromData(5, dataStore)),
            withTimeout(API.getInvoices({ limit: 5, sort: 'desc' }), 2000).catch(() => getRecentInvoices(5, dataStore)),
            withTimeout(API.getMonthlySummary(selectedYear), 2000).catch(() => getMonthlySummaryFromData(selectedYear, dataStore)),
            withTimeout(API.getPaymentStatus(), 2000).catch(() => getPaymentStatus(dataStore))
        ]);

        const metrics = calculateDashboardMetrics(dataStore, selectedMonthKey);

        // Avoid drawing stale results if user switched tabs while requests were in flight.
        if (!isDashboardStillActive()) {
            return;
        }

        displayDashboardStats(metrics);
        displayTopClients(topClients);
        displayCategoryChart();
        displayRecentInvoices(recentInvoices);
        displayRevenueChart(monthlyData);
        displayPaymentChart(paymentStatus);
    } catch (error) {
        console.warn('Dashboard error:', error);
    }
}

function buildDashboardExportData() {
    const selectedYear = Number(document.getElementById('revenue-year')?.value) || new Date().getFullYear();
    const metrics = calculateDashboardMetrics();
    const topClients = getTopClientsFromData(10);
    const recentInvoices = getRecentInvoices(20);
    const monthlyData = getMonthlySummaryFromData(selectedYear);
    const paymentStatus = getPaymentStatus();

    return {
        selectedYear,
        metrics,
        topClients,
        recentInvoices,
        monthlyData,
        paymentStatus,
        generatedAt: new Date().toLocaleString('en-PK')
    };
}

function exportDashboardExcel() {
    if (typeof XLSX === 'undefined') {
        showNotification('Excel library not loaded. Please refresh and try again.', 'error');
        return;
    }

    try {
        const data = buildDashboardExportData();

        const summaryRows = [
            { Metric: 'Generated At', Value: data.generatedAt },
            { Metric: 'Year', Value: data.selectedYear },
            { Metric: 'Total Clients', Value: data.metrics.totalClients || 0 },
            { Metric: 'Active Vehicles', Value: data.metrics.activeVehicles || 0 },
            { Metric: 'Monthly Revenue', Value: data.metrics.monthlyRevenue || 0 },
            { Metric: 'Total Receivable', Value: data.metrics.totalPending || 0 },
            { Metric: 'Collection Rate (%)', Value: data.metrics.collectionRate || 0 },
            { Metric: 'Payment Status - Paid', Value: data.paymentStatus.paid || 0 },
            { Metric: 'Payment Status - Pending', Value: data.paymentStatus.pending || 0 },
            { Metric: 'Payment Status - Overdue', Value: data.paymentStatus.overdue || 0 }
        ];

        const topClientsRows = (data.topClients || []).map((item) => ({
            Client: item.name || '-',
            Vehicles: item.vehicleCount || 0,
            Balance: item.balance || 0
        }));

        const monthlyRows = (data.monthlyData || []).map((item) => ({
            Month: item.month,
            Revenue: item.total || 0
        }));

        const invoicesRows = (data.recentInvoices || []).map((item) => ({
            InvoiceNo: item.invoiceNo || '-',
            Client: item.clientName || '-',
            Date: item.invoiceDate || '-',
            Amount: item.totalAmount || 0,
            Status: item.status || '-'
        }));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topClientsRows), 'TopClients');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthlyRows), 'MonthlyRevenue');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invoicesRows), 'RecentInvoices');

        XLSX.writeFile(workbook, `dashboard_report_${Date.now()}.xlsx`);
        showNotification('Dashboard Excel downloaded successfully', 'success');
    } catch (error) {
        console.error('Dashboard Excel export error:', error);
        showNotification('Failed to download Dashboard Excel', 'error');
    }
}

function exportDashboardPDF() {
    const JsPdfConstructor =
        (typeof window !== 'undefined' && window.jspdf && window.jspdf.jsPDF)
        || (typeof jsPDF !== 'undefined' ? jsPDF : null);

    if (!JsPdfConstructor) {
        showNotification('PDF library not loaded. Please refresh and try again.', 'error');
        return;
    }

    try {
        const data = buildDashboardExportData();
        const doc = new JsPdfConstructor({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        doc.setFontSize(14);
        doc.text('Dashboard Report', 14, 12);
        doc.setFontSize(10);
        doc.text(`Generated: ${data.generatedAt}`, 14, 18);
        doc.text(`Year: ${data.selectedYear}`, 14, 23);

        const summaryRows = [
            ['Total Clients', String(data.metrics.totalClients || 0)],
            ['Active Vehicles', String(data.metrics.activeVehicles || 0)],
            ['Monthly Revenue', formatPKR(data.metrics.monthlyRevenue || 0)],
            ['Total Receivable', formatPKR(data.metrics.totalPending || 0)],
            ['Collection Rate', `${data.metrics.collectionRate || 0}%`],
            ['Paid/Pending/Overdue', `${data.paymentStatus.paid || 0} / ${data.paymentStatus.pending || 0} / ${data.paymentStatus.overdue || 0}`]
        ];

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: 28,
                head: [['Metric', 'Value']],
                body: summaryRows,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: 14, right: 14 }
            });

            const topClientsRows = (data.topClients || []).slice(0, 10).map((item) => [
                item.name || '-',
                String(item.vehicleCount || 0),
                formatPKR(item.balance || 0)
            ]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 8,
                head: [['Top Client', 'Vehicles', 'Balance']],
                body: topClientsRows,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [5, 150, 105] },
                margin: { left: 14, right: 14 }
            });
        }

        doc.save(`dashboard_report_${Date.now()}.pdf`);
        showNotification('Dashboard PDF downloaded successfully', 'success');
    } catch (error) {
        console.error('Dashboard PDF export error:', error);
        showNotification('Failed to download Dashboard PDF', 'error');
    }
}

function displayDashboardStats(metrics) {
    const statsEl = document.getElementById('dashboard-stats');
    const monthLabel = metrics.selectedMonthLabel || 'Selected Month';
    
    statsEl.innerHTML = `
        <div class="stat-card">
            <div>
                <h4>Total Clients</h4>
                <div class="stat-number">${metrics.totalClients || 0}</div>
                <div class="stat-change positive">+${metrics.newClients || 0} added in ${monthLabel}</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-users"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Total Vehicles</h4>
                <div class="stat-number">${metrics.activeVehicles || 0}</div>
                <div class="stat-change positive">+${metrics.newVehicles || 0} added in ${monthLabel}</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-car"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Total Revenue</h4>
                <div class="stat-number">${formatPKR(metrics.monthlyRevenue || 0)}</div>
                <div class="stat-change positive">For ${monthLabel}</div>
            </div>
            <div class="stat-icon">
                <i class="fas fa-chart-line"></i>
            </div>
        </div>
        
        <div class="stat-card">
            <div>
                <h4>Pending Payments</h4>
                <div class="stat-number">${formatPKR(metrics.totalPending || 0)}</div>
                <div class="stat-change">Open balances in ${monthLabel}</div>
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
    
    if (dashboardRevenueChart) {
        dashboardRevenueChart.destroy();
    }

    dashboardRevenueChart = new Chart(ctx, {
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
    
    if (dashboardCategoryChart) {
        dashboardCategoryChart.destroy();
    }

    dashboardCategoryChart = new Chart(ctx, {
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
    
    if (dashboardPaymentChart) {
        dashboardPaymentChart.destroy();
    }

    dashboardPaymentChart = new Chart(chartCtx, {
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
function calculateDashboardMetrics(dataStore = window.dashboardDataStore || readDashboardLocalData(), selectedMonthKey = getCurrentMonthKey()) {
    const clients = Array.isArray(dataStore.clients) ? dataStore.clients : [];
    const invoices = Array.isArray(dataStore.invoices) ? dataStore.invoices : [];
    const vehicles = Array.isArray(dataStore.vehicles) ? dataStore.vehicles : [];
    
    // Calculate total clients
    const totalClients = clients.length || 0;
    
    // Calculate new clients in selected month
    const newClients = clients.filter(c => {
        const createdDate = getRecordDate(c, ['created_at', 'createdAt', 'dateAdded', 'addedAt', 'created']);
        return isDateInMonthKey(createdDate, selectedMonthKey);
    }).length || 0;
    
    // Calculate total vehicles
    const activeVehicles = vehicles.length || 0;
    const newVehicles = vehicles.filter((v) => {
        const addedDate = getRecordDate(v, ['installationDate', 'installDate', 'install_date', 'created_at', 'createdAt', 'dateAdded']);
        return isDateInMonthKey(addedDate, selectedMonthKey);
    }).length || 0;
    
    const monthInvoices = invoices.filter((inv) => {
        const invoiceDate = getRecordDate(inv, ['invoiceDate', 'invoice_date', 'date', 'created_at', 'createdAt']);
        return isDateInMonthKey(invoiceDate, selectedMonthKey);
    });

    // Revenue and pending for selected month
    const monthlyRevenue = monthInvoices.reduce((sum, inv) => {
        const totalAmount = Number(inv.totalAmount ?? inv.amount ?? inv.invoiceAmount ?? inv.invoice_amount ?? 0) || 0;
        return sum + totalAmount;
    }, 0);

    const totalPending = monthInvoices.reduce((sum, inv) => {
        const explicitBalance = Number(inv.balance ?? inv.pendingAmount ?? inv.pending_amount);
        if (Number.isFinite(explicitBalance)) {
            return sum + Math.max(0, explicitBalance);
        }

        const totalAmount = Number(inv.totalAmount ?? inv.amount ?? inv.invoiceAmount ?? inv.invoice_amount ?? 0) || 0;
        const paidAmount = Number(inv.paidAmount ?? inv.paid_amount ?? inv.receivedAmount ?? 0) || 0;
        const pending = totalAmount - paidAmount;
        return sum + Math.max(0, pending);
    }, 0);

    const vehicleCategories = new Set(
        vehicles.map((vehicle) => String(vehicle.category || vehicle.type || 'default').trim()).filter(Boolean)
    ).size;
    
    return {
        totalClients,
        newClients,
        activeVehicles,
        newVehicles,
        vehicleCategories,
        monthlyRevenue,
        revenueGrowth: 0,
        collectionRate: 0,
        totalPending,
        selectedMonthKey,
        selectedMonthLabel: formatMonthKeyLabel(selectedMonthKey)
    };
}

// Get top clients from actual data
function getTopClientsFromData(limit = 5, dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const invoices = Array.isArray(dataStore.invoices) ? dataStore.invoices : [];
    
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
function getClientsChartData(limit = 10, dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const vehicles = Array.isArray(dataStore.vehicles) ? dataStore.vehicles : [];
    const payments = Array.isArray(dataStore.payments) ? dataStore.payments : [];
    
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
function getRecentInvoices(limit = 5, dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const invoices = Array.isArray(dataStore.invoices) ? dataStore.invoices : [];
    
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
function getPaymentStatus(dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const invoices = Array.isArray(dataStore.invoices) ? dataStore.invoices : [];
    
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
function getMonthlySummaryFromData(year = new Date().getFullYear(), dataStore = window.dashboardDataStore || readDashboardLocalData()) {
    const payments = Array.isArray(dataStore.payments) ? dataStore.payments : [];
    
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
// Reports Module
async function loadReports() {
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <h3 style="margin: 0;">Reports & Analytics</h3>
            <div class="card" style="margin: 0; min-width: 320px; max-width: 520px; flex: 1;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <h3 style="margin: 0;">Generate Reports</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm btn-export" onclick="generatePDFReport()">
                            <i class="fas fa-file-pdf"></i>
                            Export PDF
                        </button>
                        <button class="btn btn-success btn-sm btn-export" onclick="generateExcelReport()">
                            <i class="fas fa-file-excel"></i>
                            Export Excel
                        </button>
                    </div>
                </div>
                <div class="card-body" style="padding-top: 10px;">
                    <div id="report-options" style="display: grid; grid-template-columns: repeat(2, minmax(140px, 1fr)); gap: 8px 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                            <input type="checkbox" checked> Revenue Report
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                            <input type="checkbox" checked> Payment Collections
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                            <input type="checkbox" checked> Vehicle Details
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; margin: 0;">
                            <input type="checkbox" checked> Client Summary
                        </label>
                    </div>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>Revenue Report</h3>
                    <select id="revenue-period" onchange="generateRevenueReport()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                </div>
                <div class="card-body">
                    <canvas id="revenue-report-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Client Distribution</h3>
                </div>
                <div class="card-body">
                    <canvas id="client-distribution-chart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h3>Client 12-Month Invoice/Payment Status</h3>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                    <select id="reports-client-filter" onchange="renderClientMonthStatusReport()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 220px;">
                        <option value="">All Clients</option>
                    </select>
                    <button class="btn btn-sm btn-secondary" onclick="renderClientMonthStatusReport()">
                        <i class="fas fa-refresh"></i>
                        Refresh
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="reports-client-status-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;"></div>
                <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 14px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #facc15; display: inline-block;"></span><small>Pending Invoice</small></div>
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e; display: inline-block;"></span><small>Payment Made</small></div>
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #d1d5db; display: inline-block;"></span><small>No Invoice</small></div>
                </div>
                <div id="reports-client-status-table" class="table-responsive"></div>
            </div>
        </div>
    `;
    
    // Generate demo charts
    generateRevenueReportChart();
    generateClientDistributionChart();
    populateReportsClientFilter();
    renderClientMonthStatusReport();
}

function getReportsInvoices() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        return [];
    }
}

function getReportsClients() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        return [];
    }
}

function normalizeMonthKey(monthLabel) {
    if (!monthLabel) return '';
    const value = String(monthLabel).trim();
    const lower = value.toLowerCase();

    const monthMap = {
        january: '01',
        february: '02',
        march: '03',
        april: '04',
        may: '05',
        june: '06',
        july: '07',
        august: '08',
        september: '09',
        october: '10',
        november: '11',
        december: '12'
    };

    if (/^\d{4}-\d{2}$/.test(value)) {
        return value;
    }

    if (monthMap[lower]) {
        const year = new Date().getFullYear();
        return `${year}-${monthMap[lower]}`;
    }

    return '';
}

function getLast12MonthKeys() {
    const months = [];
    const current = new Date();
    current.setDate(1);

    for (let i = 11; i >= 0; i -= 1) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        months.push({ key, label });
    }

    return months;
}

function populateReportsClientFilter() {
    const filterEl = document.getElementById('reports-client-filter');
    if (!filterEl) return;

    const invoices = getReportsInvoices();
    const clients = getReportsClients();
    const names = new Set();

    invoices.forEach((inv) => {
        if (inv?.clientName) names.add(String(inv.clientName).trim());
    });
    clients.forEach((client) => {
        if (client?.name) names.add(String(client.name).trim());
    });

    const sortedNames = Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
    const currentValue = filterEl.value;

    filterEl.innerHTML = '<option value="">All Clients</option>';
    sortedNames.forEach((name) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        filterEl.appendChild(option);
    });

    if (sortedNames.includes(currentValue)) {
        filterEl.value = currentValue;
    }
}

function renderClientMonthStatusReport() {
    const tableEl = document.getElementById('reports-client-status-table');
    const summaryEl = document.getElementById('reports-client-status-summary');
    const filterEl = document.getElementById('reports-client-filter');
    if (!tableEl || !summaryEl) return;

    const invoices = getReportsInvoices();
    const months = getLast12MonthKeys();
    const selectedClient = filterEl?.value || '';

    const filteredInvoices = invoices.filter((inv) => {
        if (!inv?.clientName) return false;
        if (!selectedClient) return true;
        return String(inv.clientName).trim() === selectedClient;
    });

    const clientNames = Array.from(new Set(filteredInvoices.map((inv) => String(inv.clientName).trim()))).sort((a, b) => a.localeCompare(b));

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const totalPending = filteredInvoices.reduce((sum, inv) => {
        const balance = Number(inv.balance);
        if (!Number.isNaN(balance)) return sum + Math.max(balance, 0);
        const amount = Number(inv.totalAmount) || 0;
        const paid = Number(inv.paidAmount) || 0;
        return sum + Math.max(amount - paid, 0);
    }, 0);

    summaryEl.innerHTML = `
        <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; border-left: 3px solid #2563eb;">
            <small style="color: var(--gray-600);">Total Invoices (12 Months)</small>
            <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(totalAmount)}</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border-left: 3px solid #22c55e;">
            <small style="color: var(--gray-600);">Total Payments Made</small>
            <div style="font-size: 18px; font-weight: 700; color: #22c55e;">${formatPKR(totalPaid)}</div>
        </div>
        <div style="background: #fef9c3; padding: 12px; border-radius: 6px; border-left: 3px solid #eab308;">
            <small style="color: var(--gray-600);">Total Pending</small>
            <div style="font-size: 18px; font-weight: 700; color: #ca8a04;">${formatPKR(totalPending)}</div>
        </div>
    `;

    if (clientNames.length === 0) {
        tableEl.innerHTML = '<p style="text-align:center; color: var(--gray-500); padding: 20px;">No client invoice data found for the selected filter.</p>';
        return;
    }

    let html = '<table class="data-table">';
    html += '<thead><tr><th>Client</th>';
    months.forEach((m) => {
        html += `<th style="text-align:center;">${m.label}</th>`;
    });
    html += '<th style="text-align:right;">Payments</th>';
    html += '</tr></thead><tbody>';

    clientNames.forEach((clientName) => {
        const clientInvoices = filteredInvoices.filter((inv) => String(inv.clientName).trim() === clientName);
        const byMonth = {};

        clientInvoices.forEach((inv) => {
            const monthKey = normalizeMonthKey(inv.month) || (inv.invoiceDate ? String(inv.invoiceDate).slice(0, 7) : '');
            if (!monthKey) return;
            if (!byMonth[monthKey]) byMonth[monthKey] = [];
            byMonth[monthKey].push(inv);
        });

        const clientPayments = clientInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

        html += '<tr>';
        html += `<td><strong>${clientName}</strong></td>`;

        months.forEach((m) => {
            const list = byMonth[m.key] || [];
            let dotColor = '#d1d5db';
            let tooltip = 'No invoice';

            if (list.length > 0) {
                const hasPaid = list.some((inv) => {
                    const paidAmount = Number(inv.paidAmount) || 0;
                    const status = String(inv.status || '').toLowerCase();
                    return paidAmount > 0 || status === 'paid' || status === 'partial';
                });

                if (hasPaid) {
                    dotColor = '#22c55e';
                    tooltip = 'Payment made';
                } else {
                    dotColor = '#facc15';
                    tooltip = 'Pending invoice';
                }
            }

            html += `<td style="text-align:center;">
                <span title="${tooltip}" style="display:inline-block; width:12px; height:12px; border-radius:50%; background:${dotColor};"></span>
            </td>`;
        });

        html += `<td style="text-align:right; font-weight:600; color:#16a34a;">${formatPKR(clientPayments)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    tableEl.innerHTML = html;
}

function generateRevenueReportChart() {
    try {
        const ctx = document.getElementById('revenue-report-chart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        
        new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [150000, 185000, 195000, 170000, 210000, 225000],
                    backgroundColor: '#2563eb'
                },
                {
                    label: 'Expected',
                    data: [160000, 180000, 200000, 180000, 220000, 230000],
                    backgroundColor: '#90caf9'
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
                        ticks: {
                            callback: function(value) {
                                return formatPKR(value);
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.warn('Chart error:', e);
    }
}

function generateClientDistributionChart() {
    try {
        const ctx = document.getElementById('client-distribution-chart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        
        new Chart(chartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Inactive', 'Pending'],
                datasets: [{
                    data: [18, 4, 2],
                    backgroundColor: ['#059669', '#ef4444', '#f59e0b']
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
    } catch (e) {
        console.warn('Chart error:', e);
    }
}

function generateRevenueReport() {
    alert('Generate Revenue Report - Coming Soon!');
}

function generatePDFReport() {
    alert('Export PDF Report - Coming Soon!');
}

function generateExcelReport() {
    alert('Export Excel Report - Coming Soon!');
}

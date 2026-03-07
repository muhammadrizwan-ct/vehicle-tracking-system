// --- Supabase Integration ---
var supabase = window.supabaseClient;

// Fetch all invoices from Supabase
async function fetchInvoicesFromSupabase() {
    const { data, error } = await supabase
        .from('invoices')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data || [];
}

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
                        <button class="btn btn-primary btn-sm btn-export" onclick="generatePDFReport()" title="Export PDF" aria-label="Export PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn btn-success btn-sm btn-export" onclick="generateExcelReport()" title="Export Excel" aria-label="Export Excel">
                            <i class="fas fa-file-excel"></i>
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

        <div class="card" style="margin-bottom: 24px; border-left: 4px solid #2563eb;">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                <h3 style="margin: 0;">AI Report Assistant</h3>
                <small style="color: var(--gray-500);">Ask in plain English</small>
            </div>
            <div class="card-body" style="display: grid; gap: 10px;">
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <input
                        id="ai-report-query"
                        type="text"
                        placeholder="Example: total revenue during last 3 months"
                        style="flex: 1; min-width: 260px; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px;"
                    />
                    <button class="btn btn-primary" onclick="runAIReportQuery()">
                        <i class="fas fa-robot"></i>
                        Ask
                    </button>
                </div>
                <div style="display:grid; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
                    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <label for="ai-query-section" style="font-size:12px; color:#475569; font-weight:600;">Which section do you want to know?</label>
                        <select id="ai-query-section" onchange="onAIQuerySectionChange()" style="padding:7px 10px; border:1px solid var(--gray-300); border-radius:6px; min-width:200px;">
                            <option value="revenue">Revenue</option>
                            <option value="invoices">Invoices</option>
                            <option value="clients">Clients</option>
                            <option value="counts">Counts</option>
                        </select>
                    </div>
                    <div id="ai-query-suggestions" style="display:flex; gap:8px; flex-wrap:wrap;"></div>
                </div>
                <div id="ai-report-output" style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; color: #334155;">
                    Ask a question to generate a quick report.
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
                </div>
            </div>
            <div class="card-body">
                <div id="reports-client-status-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;"></div>
                <div style="display: flex; align-items: center; gap: 18px; margin-bottom: 14px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #facc15; display: inline-block;"></span><small>Pending Invoice</small></div>
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #22c55e; display: inline-block;"></span><small>Payment Made</small></div>
                    <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 10px; height: 10px; border-radius: 50%; background: #d1d5db; display: inline-block;"></span><small>No Invoice</small></div>
                </div>
                <div id="reports-client-status-graph" class="table-responsive"></div>
            </div>
        </div>
    `;
    
    // Generate demo charts
    generateRevenueReportChart();
    generateClientDistributionChart();
    await populateReportsClientFilter();
    await renderClientMonthStatusReport();

    const queryInput = document.getElementById('ai-report-query');
    if (queryInput) {
        queryInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                runAIReportQuery();
            }
        });
    }

    renderAIQuerySuggestions();
}


// Supabase replaces localStorage for reports
async function getReportsInvoices() {
    return await fetchInvoicesFromSupabase();
}

async function getReportsClients() {
    return await fetchClientsFromSupabase();
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

function getInvoiceMonthKey(invoice) {
    const fromDate = (invoice?.invoiceDate || invoice?.createdDate || invoice?.dueDate || '').toString().slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(fromDate)) {
        return fromDate;
    }
    return normalizeMonthKey(invoice?.month || invoice?.invoiceMonth || '');
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

async function populateReportsClientFilter() {
    const filterEl = document.getElementById('reports-client-filter');
    if (!filterEl) return;

    const invoices = await getReportsInvoices();
    const clients = await getReportsClients();
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

async function renderClientMonthStatusReport() {
    const graphEl = document.getElementById('reports-client-status-graph');
    const summaryEl = document.getElementById('reports-client-status-summary');
    const filterEl = document.getElementById('reports-client-filter');
    if (!graphEl || !summaryEl) return;

    const [invoices, clients] = await Promise.all([getReportsInvoices(), getReportsClients()]);
    const months = getLast12MonthKeys();
    const monthKeySet = new Set(months.map((m) => m.key));
    const selectedClient = filterEl?.value || '';

    const filteredInvoices = invoices.filter((inv) => {
        const invClient = String(inv?.clientName || '').trim();
        if (!invClient) return false;
        if (!selectedClient) return true;
        return invClient === selectedClient;
    }).filter((inv) => monthKeySet.has(getInvoiceMonthKey(inv)));

    const allClientNames = new Set();
    clients.forEach((client) => {
        const name = String(client?.name || '').trim();
        if (!name) return;
        if (selectedClient && name !== selectedClient) return;
        allClientNames.add(name);
    });
    filteredInvoices.forEach((inv) => {
        const name = String(inv?.clientName || '').trim();
        if (!name) return;
        if (selectedClient && name !== selectedClient) return;
        allClientNames.add(name);
    });
    const clientNames = Array.from(allClientNames).sort((a, b) => a.localeCompare(b));

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
        graphEl.innerHTML = '<p style="text-align:center; color: var(--gray-500); padding: 20px;">No client data found for the selected filter.</p>';
        return;
    }

    let html = '<div style="overflow:auto; border: 1px solid var(--gray-200); border-radius: 8px;">';
    html += '<table class="data-table" style="min-width: 980px;">';
    html += '<thead><tr><th style="min-width: 220px;">Client</th>';
    months.forEach((m) => {
        html += `<th style="text-align:center;">${m.label}</th>`;
    });
    html += '<th style="text-align:right; min-width: 140px;">Paid Amount</th>';
    html += '<th style="text-align:right; min-width: 140px;">Unpaid Amount</th>';
    html += '</tr></thead><tbody>';

    clientNames.forEach((clientName) => {
        const clientInvoices = filteredInvoices.filter((inv) => String(inv.clientName || '').trim() === clientName);
        const byMonth = {};

        clientInvoices.forEach((inv) => {
            const monthKey = getInvoiceMonthKey(inv);
            if (!monthKey) return;
            if (!byMonth[monthKey]) byMonth[monthKey] = [];
            byMonth[monthKey].push(inv);
        });

        const clientPayments = clientInvoices.reduce((sum, inv) => {
            return sum + normalizeReportMoney(inv.paidAmount ?? inv.paid_amount ?? inv.receivedAmount ?? 0);
        }, 0);
        const clientPending = clientInvoices.reduce((sum, inv) => sum + getInvoiceBalanceAmount(inv), 0);

        html += '<tr style="height: 42px;">';
        html += `<td><strong>${clientName}</strong></td>`;

        months.forEach((m) => {
            const list = byMonth[m.key] || [];
            let cellColor = '#d1d5db';
            let tooltip = 'No invoice';

            if (list.length > 0) {
                const monthInvoiced = list.reduce((sum, inv) => {
                    return sum + normalizeReportMoney(inv.totalAmount ?? inv.total_amount ?? inv.total ?? 0);
                }, 0);
                const monthPaid = list.reduce((sum, inv) => {
                    return sum + normalizeReportMoney(inv.paidAmount ?? inv.paid_amount ?? inv.receivedAmount ?? 0);
                }, 0);
                const monthPending = list.reduce((sum, inv) => sum + getInvoiceBalanceAmount(inv), 0);

                const hasPaid = list.some((inv) => {
                    const paidAmount = normalizeReportMoney(inv.paidAmount ?? inv.paid_amount ?? inv.receivedAmount ?? 0);
                    const status = String(inv.status || '').toLowerCase();
                    return paidAmount > 0 || status === 'paid' || status === 'partial';
                });

                if (hasPaid) {
                    cellColor = '#22c55e';
                    tooltip = `Payment made | Invoiced: ${formatPKR(monthInvoiced)} | Paid: ${formatPKR(monthPaid)} | Pending: ${formatPKR(monthPending)}`;
                } else {
                    cellColor = '#facc15';
                    tooltip = `Pending invoice | Invoiced: ${formatPKR(monthInvoiced)} | Paid: ${formatPKR(monthPaid)} | Pending: ${formatPKR(monthPending)}`;
                }
            }

            html += `<td style="text-align:center; padding: 6px 4px;">
                <div title="${tooltip}" style="width: 100%; height: 16px; border-radius: 4px; background:${cellColor}; border: 1px solid rgba(0,0,0,0.08);"></div>
            </td>`;
        });

        html += `<td style="text-align:right; font-weight:600; color:#16a34a;">${formatPKR(clientPayments)}</td>`;
        html += `<td style="text-align:right; font-weight:600; color:#ca8a04;">${formatPKR(clientPending)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '</div>';
    graphEl.innerHTML = html;
}

function setAIQueryExample(text) {
    const queryInput = document.getElementById('ai-report-query');
    if (!queryInput) return;
    queryInput.value = text;
    queryInput.focus();
}

function getAIQueryTreeConfig() {
    return {
        revenue: [
            'total revenue last 3 months',
            'total collected this month',
            'revenue this year',
            'billed vs collected last 6 months'
        ],
        invoices: [
            'last 5 pending invoices',
            'overdue invoices count and amount',
            'pending invoices this month',
            'invoice count last month'
        ],
        clients: [
            'top 5 clients by revenue this year',
            'top 3 clients by revenue last 6 months',
            'top clients by collection this month',
            'client revenue this month'
        ],
        counts: [
            'how many invoices this month',
            'how many pending invoices this month',
            'how many overdue invoices today',
            'invoice count this year'
        ]
    };
}

function renderAIQuerySuggestions() {
    const sectionEl = document.getElementById('ai-query-section');
    const suggestionsEl = document.getElementById('ai-query-suggestions');
    if (!sectionEl || !suggestionsEl) return;

    const tree = getAIQueryTreeConfig();
    const sectionKey = String(sectionEl.value || 'revenue').trim().toLowerCase();
    const suggestions = Array.isArray(tree[sectionKey]) ? tree[sectionKey] : [];

    suggestionsEl.innerHTML = '';
    suggestions.forEach((queryText) => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.type = 'button';
        btn.textContent = queryText;
        btn.onclick = () => setAIQueryExample(queryText);
        suggestionsEl.appendChild(btn);
    });
}

function onAIQuerySectionChange() {
    renderAIQuerySuggestions();
}

function normalizeReportInvoiceDate(invoice = {}) {
    const candidates = [
        invoice.invoiceDate,
        invoice.invoice_date,
        invoice.createdDate,
        invoice.created_date,
        invoice.created_at,
        invoice.date,
        invoice.dueDate,
        invoice.due_date
    ];

    for (const candidate of candidates) {
        const parsed = new Date(candidate || '');
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function normalizeReportMoney(value) {
    const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

function getInvoiceBalanceAmount(invoice = {}) {
    const explicitBalance = normalizeReportMoney(invoice.balance);
    if (explicitBalance > 0) {
        return explicitBalance;
    }

    const total = normalizeReportMoney(invoice.totalAmount ?? invoice.total_amount ?? invoice.total);
    const paid = normalizeReportMoney(invoice.paidAmount ?? invoice.paid_amount);
    const derived = total - paid;
    return derived > 0 ? derived : 0;
}

function isPendingInvoiceStatus(statusText) {
    const status = String(statusText || '').trim().toLowerCase();
    if (!status) return true;
    return status === 'pending' || status === 'partial' || status === 'unpaid';
}

function isOverdueInvoice(invoice = {}, now = new Date()) {
    const dueDate = new Date(invoice.dueDate || invoice.due_date || '');
    if (Number.isNaN(dueDate.getTime())) return false;

    const status = String(invoice.status || '').trim().toLowerCase();
    if (status === 'paid') return false;

    return dueDate < now && getInvoiceBalanceAmount(invoice) > 0;
}

function parseResultLimit(queryText = '', fallback = 5) {
    const query = String(queryText || '').toLowerCase();
    const numberWords = {
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12
    };

    const numericMatch = query.match(/(?:top|last|latest|highest|first)\s+(\d+)/);
    if (numericMatch?.[1]) {
        return Math.max(1, Number(numericMatch[1]));
    }

    const wordMatch = query.match(/(?:top|last|latest|highest|first)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)/);
    if (wordMatch?.[1]) {
        return Math.max(1, Number(numberWords[wordMatch[1]] || fallback));
    }

    return Math.max(1, Number(fallback));
}

function resolveReportDateRange(queryText = '', now = new Date()) {
    const query = String(queryText || '').toLowerCase();
    const defaultMonths = 3;

    const numericFromKeyword = (pattern, fallback) => {
        const match = query.match(pattern);
        return Math.max(1, Number(match?.[1] || fallback));
    };

    const lastDays = numericFromKeyword(/last\s+(\d+)\s+days?/, 0);
    if (/last\s+\d+\s+days?/.test(query)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (lastDays - 1));
        return { start, end: now, label: `Last ${lastDays} day(s)`, months: 1, isExplicit: true };
    }

    const lastWeeks = numericFromKeyword(/last\s+(\d+)\s+weeks?/, 0);
    if (/last\s+\d+\s+weeks?/.test(query)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (lastWeeks * 7 - 1));
        return { start, end: now, label: `Last ${lastWeeks} week(s)`, months: Math.max(1, Math.ceil(lastWeeks / 4)), isExplicit: true };
    }

    const explicitMonths = Math.max(1, Number(query.match(/last\s+(\d+)\s+months?/)?.[1] || defaultMonths));

    if (/today/.test(query)) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        return { start, end, label: 'Today', months: 1, isExplicit: true };
    }

    if (/this\s+month/.test(query)) {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start, end: now, label: 'This month', months: 1, isExplicit: true };
    }

    if (/last\s+month/.test(query)) {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { start, end, label: 'Last month', months: 1, isExplicit: true };
    }

    if (/this\s+year/.test(query)) {
        const start = new Date(now.getFullYear(), 0, 1);
        return { start, end: now, label: 'This year', months: now.getMonth() + 1, isExplicit: true };
    }

    if (/this\s+quarter/.test(query)) {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        return { start, end: now, label: 'This quarter', months: 3, isExplicit: true };
    }

    if (/last\s+year/.test(query)) {
        const year = now.getFullYear() - 1;
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31, 23, 59, 59, 999);
        return { start, end, label: 'Last year', months: 12, isExplicit: true };
    }

    if (/last\s+quarter/.test(query)) {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = (currentQuarter - 1 + 4) % 4 * 3;
        const yearOffset = currentQuarter === 0 ? -1 : 0;
        const year = now.getFullYear() + yearOffset;
        const start = new Date(year, quarterStartMonth, 1);
        const end = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        return { start, end, label: 'Last quarter', months: 3, isExplicit: true };
    }

    const start = new Date(now.getFullYear(), now.getMonth() - explicitMonths + 1, 1);
    return { start, end: now, label: `Last ${explicitMonths} month(s)`, months: explicitMonths, isExplicit: /last\s+\d+\s+months?/.test(query) };
}

function parseAIReportIntent(rawQuery = '') {
    const query = String(rawQuery || '').trim().toLowerCase();
    const limit = parseResultLimit(query, 5);
    const range = resolveReportDateRange(query);

    const cleaned = query.replace(/[^a-z0-9\s]/g, ' ');
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const hasAny = (words = []) => words.some((word) => tokens.includes(word));

    const revenueWords = ['revenue', 'sales', 'income', 'earning', 'earnings', 'collection', 'collected', 'turnover'];
    const invoiceWords = ['invoice', 'invoices', 'bill', 'bills', 'billing'];
    const pendingWords = ['pending', 'unpaid', 'outstanding', 'due'];
    const overdueWords = ['overdue', 'late', 'expired'];
    const countWords = ['count', 'number', 'many', 'total'];
    const topWords = ['top', 'highest', 'best', 'largest'];
    const clientWords = ['client', 'clients', 'customer', 'customers'];

    const hasRevenue = hasAny(revenueWords);
    const hasInvoice = hasAny(invoiceWords);
    const hasPending = hasAny(pendingWords);
    const hasOverdue = hasAny(overdueWords);
    const hasCount = hasAny(countWords) || /how\s+many/.test(query);
    const hasTop = hasAny(topWords);
    const hasClient = hasAny(clientWords);
    const hasGenerateAction = /generate|create|make|print|download|show|open|view/.test(query);
    const invoiceNoMatch = query.match(/\b([a-z]{1,6}\s*[-]?[0-9]{2,})\b/i);
    const extractedInvoiceNo = invoiceNoMatch?.[1]
        ? String(invoiceNoMatch[1]).replace(/\s+/g, '').toUpperCase()
        : '';

    if (hasGenerateAction && hasInvoice && extractedInvoiceNo) {
        const action = /download/.test(query) ? 'download' : 'view';
        return { intent: 'invoice_document', limit, range, invoiceNo: extractedInvoiceNo, action };
    }

    if ((hasTop && hasClient && hasRevenue) || (/top\s+\d*\s*clients?/.test(query) && hasRevenue)) {
        return { intent: 'top_clients_revenue', limit, range };
    }

    if (hasOverdue && (hasInvoice || /overdue\s+/.test(query))) {
        return { intent: 'overdue_invoices', limit, range };
    }

    if (hasPending && hasInvoice) {
        return { intent: 'pending_invoices', limit, range };
    }

    if (hasRevenue) {
        return { intent: 'revenue_last_period', limit, range };
    }

    if ((hasCount && hasInvoice) || /how\s+many\s+invoices|invoice\s+count|number\s+of\s+invoices/.test(query)) {
        return { intent: 'invoice_count', limit, range };
    }

    return { intent: 'unsupported', limit, range };
}

function buildAIReportResultMarkup(payload = {}) {
    const title = String(payload.title || 'Report');
    const summary = String(payload.summary || 'No data');
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    let html = `
        <div style="display: grid; gap: 10px;">
            <div>
                <div style="font-size: 13px; color: var(--gray-500);">${title}</div>
                <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${summary}</div>
            </div>
    `;

    if (rows.length > 0) {
        html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>Invoice #</th><th>Client</th><th>Date</th><th style="text-align:right;">Amount</th></tr></thead><tbody>';
        rows.forEach((row) => {
            html += `<tr>
                <td>${row.invoiceNo || '-'}</td>
                <td>${row.clientName || '-'}</td>
                <td>${row.dateText || '-'}</td>
                <td style="text-align:right;">${formatPKR(row.amount || 0)}</td>
            </tr>`;
        });
        html += '</tbody></table></div>';
    }

    html += '</div>';
    return html;
}

function setAIReportOutput(outputEl, html, payload = null) {
    if (!outputEl) return;

    if (payload && typeof payload === 'object') {
        window.aiReportLastPayload = {
            ...payload,
            generatedAt: new Date().toISOString()
        };

        outputEl.innerHTML = `
            <div style="display:grid; gap:10px;">
                ${html}
                <div style="display:flex; justify-content:flex-end;">
                    <button class="btn btn-primary btn-sm btn-export" onclick="exportAIReportToPDF()" title="Export AI report as PDF" aria-label="Export AI report as PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
        `;
        return;
    }

    window.aiReportLastPayload = null;
    outputEl.innerHTML = html;
}

function exportAIReportToPDF() {
    const payload = window.aiReportLastPayload;
    if (!payload) {
        showNotification('No AI report available to export', 'warning');
        return;
    }

    const JsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || (typeof jsPDF !== 'undefined' ? jsPDF : null);
    if (!JsPdfConstructor) {
        showNotification('PDF library not loaded. Please refresh and try again.', 'error');
        return;
    }

    try {
        const doc = new JsPdfConstructor({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const title = String(payload.title || 'AI Report');
        const summary = String(payload.summary || '');
        const generatedAt = payload.generatedAt ? new Date(payload.generatedAt).toLocaleString() : new Date().toLocaleString();

        doc.setFontSize(16);
        doc.text('Connectia ERP - AI Report', 14, 16);
        doc.setFontSize(12);
        doc.text(title, 14, 24);
        doc.setFontSize(10);
        doc.text(`Generated: ${generatedAt}`, 14, 30);

        let currentY = 38;
        if (summary) {
            const summaryLines = doc.splitTextToSize(summary, 180);
            doc.text(summaryLines, 14, currentY);
            currentY += Math.max(8, summaryLines.length * 5 + 4);
        }

        const metrics = Array.isArray(payload.metrics) ? payload.metrics : [];
        if (metrics.length > 0) {
            metrics.forEach((line) => {
                const textLine = String(line || '').trim();
                if (!textLine) return;
                doc.text(textLine, 14, currentY);
                currentY += 6;
            });
            currentY += 2;
        }

        const headers = Array.isArray(payload.tableHeaders) ? payload.tableHeaders : [];
        const rows = Array.isArray(payload.tableRows) ? payload.tableRows : [];
        if (headers.length > 0 && rows.length > 0 && typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: currentY,
                head: [headers],
                body: rows,
                styles: { fontSize: 9 },
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: 14, right: 14 }
            });
        }

        const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'ai-report';
        const fileName = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('AI report PDF export error:', error);
        showNotification('Could not export AI report PDF', 'error');
    }
}

function normalizeInvoiceLookupKey(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

async function runAIReportQuery() {
    const queryInput = document.getElementById('ai-report-query');
    const outputEl = document.getElementById('ai-report-output');
    if (!queryInput || !outputEl) return;

    const rawQuery = String(queryInput.value || '').trim();
    if (!rawQuery) {
        outputEl.textContent = 'Please type a report request first.';
        return;
    }

    outputEl.textContent = 'Generating report...';
    window.aiReportLastPayload = null;

    try {
        const parsed = parseAIReportIntent(rawQuery);
        const invoices = await getReportsInvoices();
        const queryLower = rawQuery.toLowerCase();
        const wantsPdfReport = /\bpdf\b/.test(queryLower) || (/export/.test(queryLower) && parsed.intent !== 'invoice_document');
        const now = new Date();
        const { start: fromDate, end: toDate, label: periodLabel, isExplicit } = parsed.range;

        const invoiceInRange = (invoice) => {
            const invoiceDate = normalizeReportInvoiceDate(invoice);
            if (!invoiceDate) return false;
            return invoiceDate >= fromDate && invoiceDate <= toDate;
        };

        const getInvoiceNo = (invoice) => invoice.invoiceNo || invoice.invoice_no || '-';
        const getClientName = (invoice) => invoice.clientName || invoice.client_name || '-';
        const sortedByNewestDate = (list = []) => [...list].sort((a, b) => (normalizeReportInvoiceDate(b)?.getTime() || 0) - (normalizeReportInvoiceDate(a)?.getTime() || 0));

        if (parsed.intent === 'unsupported') {
            setAIReportOutput(outputEl, `
                <div style="display:grid; gap:8px;">
                    <div style="font-weight:700; color:#334155;">I can generate these reports right now:</div>
                    <div>1. Last N pending invoices</div>
                    <div>2. Total revenue in last N months</div>
                    <div>3. Overdue invoices count and amount</div>
                    <div>4. Top N clients by revenue</div>
                    <div>5. Invoice count in this month/year</div>
                    <div>6. Open invoice by number (example: generate CT0001 invoice)</div>
                </div>
            `);
            return;
        }

        if (parsed.intent === 'invoice_document') {
            const targetInvoiceNo = String(parsed.invoiceNo || '').trim();
            const targetKey = normalizeInvoiceLookupKey(targetInvoiceNo);
            const matchedInvoice = invoices.find((inv) => {
                const key = normalizeInvoiceLookupKey(inv.invoiceNo || inv.invoice_no || '');
                return key && key === targetKey;
            });

            const resolvedInvoiceNo = String(matchedInvoice?.invoiceNo || matchedInvoice?.invoice_no || targetInvoiceNo).trim();

            if (parsed.action === 'download' && typeof window.downloadInvoicePDF === 'function') {
                window.downloadInvoicePDF(resolvedInvoiceNo);
                setAIReportOutput(outputEl, `
                    <div style="display:grid; gap:8px;">
                        <div style="font-weight:700; color:#334155;">Invoice Download Triggered</div>
                        <div>${resolvedInvoiceNo} is being prepared for PDF download.</div>
                    </div>
                `);
                return;
            }

            if (typeof window.viewInvoicePDF === 'function') {
                window.viewInvoicePDF(resolvedInvoiceNo);
                setAIReportOutput(outputEl, `
                    <div style="display:grid; gap:8px;">
                        <div style="font-weight:700; color:#334155;">Invoice Opened</div>
                        <div>${resolvedInvoiceNo} opened in print/view mode.</div>
                    </div>
                `);
                return;
            }

            setAIReportOutput(outputEl, `
                <div style="display:grid; gap:8px;">
                    <div style="font-weight:700; color:#334155;">Invoice Found</div>
                    <div>${targetInvoiceNo} exists, but invoice view/download handler is unavailable on this page.</div>
                </div>
            `);
            return;
        }

        if (parsed.intent === 'pending_invoices') {
            const pendingBase = invoices
                .filter((inv) => isPendingInvoiceStatus(inv.status) && getInvoiceBalanceAmount(inv) > 0)
                .filter((inv) => (isExplicit ? invoiceInRange(inv) : true));

            const pending = sortedByNewestDate(pendingBase);

            const lastN = pending.slice(0, parsed.limit).map((inv) => ({
                invoiceNo: getInvoiceNo(inv),
                clientName: getClientName(inv),
                dateText: formatDate(inv.invoiceDate || inv.invoice_date || inv.createdDate || inv.created_at || ''),
                amount: getInvoiceBalanceAmount(inv)
            }));

            const pendingAmount = pending.reduce((sum, inv) => sum + getInvoiceBalanceAmount(inv), 0);

            const pendingPayload = {
                title: 'Pending Invoices',
                summary: `${pending.length} pending invoices | ${formatPKR(pendingAmount)}${isExplicit ? ` | ${periodLabel}` : ''}`,
                rows: lastN,
                tableHeaders: ['Invoice #', 'Client', 'Date', 'Amount'],
                tableRows: lastN.map((row) => [row.invoiceNo || '-', row.clientName || '-', row.dateText || '-', formatPKR(row.amount || 0)])
            };
            setAIReportOutput(outputEl, buildAIReportResultMarkup(pendingPayload), pendingPayload);
            if (wantsPdfReport) {
                exportAIReportToPDF();
            }
            return;
        }

        if (parsed.intent === 'overdue_invoices') {
            const overdue = sortedByNewestDate(
                invoices
                    .filter((inv) => isOverdueInvoice(inv, now))
                    .filter((inv) => (isExplicit ? invoiceInRange(inv) : true))
            );
            const overdueAmount = overdue.reduce((sum, inv) => sum + getInvoiceBalanceAmount(inv), 0);
            const lastN = overdue
                .slice(0, parsed.limit)
                .map((inv) => ({
                    invoiceNo: getInvoiceNo(inv),
                    clientName: getClientName(inv),
                    dateText: formatDate(inv.dueDate || inv.due_date || inv.invoiceDate || ''),
                    amount: getInvoiceBalanceAmount(inv)
                }));

            const overduePayload = {
                title: 'Overdue Invoices',
                summary: `${overdue.length} overdue invoices | ${formatPKR(overdueAmount)}${isExplicit ? ` | ${periodLabel}` : ''}`,
                rows: lastN,
                tableHeaders: ['Invoice #', 'Client', 'Date', 'Amount'],
                tableRows: lastN.map((row) => [row.invoiceNo || '-', row.clientName || '-', row.dateText || '-', formatPKR(row.amount || 0)])
            };
            setAIReportOutput(outputEl, buildAIReportResultMarkup(overduePayload), overduePayload);
            if (wantsPdfReport) {
                exportAIReportToPDF();
            }
            return;
        }

        if (parsed.intent === 'invoice_count') {
            const base = isExplicit ? invoices.filter(invoiceInRange) : invoices;
            const pendingOnly = /pending/.test(queryLower);
            const overdueOnly = /overdue/.test(queryLower);
            const filtered = base.filter((inv) => {
                if (pendingOnly) return isPendingInvoiceStatus(inv.status) && getInvoiceBalanceAmount(inv) > 0;
                if (overdueOnly) return isOverdueInvoice(inv, now);
                return true;
            });

            const countHtml = `
                <div style="display:grid; gap:10px;">
                    <div style="font-size: 13px; color: var(--gray-500);">Invoice Count</div>
                    <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${filtered.length} invoices${isExplicit ? ` | ${periodLabel}` : ''}</div>
                </div>
            `;
            const countPayload = {
                title: 'Invoice Count',
                summary: `${filtered.length} invoices${isExplicit ? ` | ${periodLabel}` : ''}`
            };
            setAIReportOutput(outputEl, countHtml, countPayload);
            if (wantsPdfReport) {
                exportAIReportToPDF();
            }
            return;
        }

        if (parsed.intent === 'top_clients_revenue') {
            const inRange = invoices.filter(invoiceInRange);
            const byClient = {};
            inRange.forEach((inv) => {
                const client = getClientName(inv);
                if (!byClient[client]) {
                    byClient[client] = { clientName: client, billed: 0, collected: 0 };
                }
                byClient[client].billed += normalizeReportMoney(inv.totalAmount ?? inv.total_amount ?? inv.total);
                byClient[client].collected += normalizeReportMoney(inv.paidAmount ?? inv.paid_amount);
            });

            const ranking = Object.values(byClient)
                .sort((a, b) => b.billed - a.billed)
                .slice(0, parsed.limit);

            let html = `
                <div style="display:grid; gap:10px;">
                    <div>
                        <div style="font-size: 13px; color: var(--gray-500);">Top Clients by Revenue</div>
                        <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${periodLabel}</div>
                    </div>
            `;

            if (ranking.length === 0) {
                html += '<div style="font-size:12px; color: var(--gray-500);">No records found for selected period.</div>';
            } else {
                html += '<div class="table-responsive"><table class="data-table"><thead><tr><th>Client</th><th style="text-align:right;">Billed</th><th style="text-align:right;">Collected</th></tr></thead><tbody>';
                ranking.forEach((row) => {
                    html += `<tr><td>${row.clientName}</td><td style="text-align:right;">${formatPKR(row.billed)}</td><td style="text-align:right;">${formatPKR(row.collected)}</td></tr>`;
                });
                html += '</tbody></table></div>';
            }

            html += '</div>';
            const topClientPayload = {
                title: 'Top Clients by Revenue',
                summary: periodLabel,
                tableHeaders: ['Client', 'Billed', 'Collected'],
                tableRows: ranking.map((row) => [row.clientName || '-', formatPKR(row.billed || 0), formatPKR(row.collected || 0)])
            };
            setAIReportOutput(outputEl, html, topClientPayload);
            if (wantsPdfReport) {
                exportAIReportToPDF();
            }
            return;
        }

        if (parsed.intent === 'revenue_last_period') {
            const inRange = invoices.filter(invoiceInRange);

            const billedRevenue = inRange.reduce((sum, inv) => sum + normalizeReportMoney(inv.totalAmount ?? inv.total_amount ?? inv.total), 0);
            const collectedRevenue = inRange.reduce((sum, inv) => sum + normalizeReportMoney(inv.paidAmount ?? inv.paid_amount), 0);

            const monthlyBreakdown = {};
            inRange.forEach((inv) => {
                const dt = normalizeReportInvoiceDate(inv);
                if (!dt) return;
                const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyBreakdown[key]) {
                    monthlyBreakdown[key] = { billed: 0, collected: 0 };
                }
                monthlyBreakdown[key].billed += normalizeReportMoney(inv.totalAmount ?? inv.total_amount ?? inv.total);
                monthlyBreakdown[key].collected += normalizeReportMoney(inv.paidAmount ?? inv.paid_amount);
            });

            const monthRows = Object.keys(monthlyBreakdown)
                .sort((a, b) => a.localeCompare(b))
                .map((key) => {
                    const dt = new Date(`${key}-01`);
                    return {
                        label: dt.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
                        billed: monthlyBreakdown[key].billed,
                        collected: monthlyBreakdown[key].collected
                    };
                });

            let breakdownHtml = '';
            if (monthRows.length > 0) {
                breakdownHtml = '<div class="table-responsive"><table class="data-table"><thead><tr><th>Month</th><th style="text-align:right;">Billed</th><th style="text-align:right;">Collected</th></tr></thead><tbody>';
                monthRows.forEach((row) => {
                    breakdownHtml += `<tr><td>${row.label}</td><td style="text-align:right;">${formatPKR(row.billed)}</td><td style="text-align:right;">${formatPKR(row.collected)}</td></tr>`;
                });
                breakdownHtml += '</tbody></table></div>';
            }

            const revenueHtml = `
                <div style="display:grid; gap:10px;">
                    <div>
                        <div style="font-size: 13px; color: var(--gray-500);">Revenue Report</div>
                        <div style="font-size: 20px; font-weight: 700; color: #0f172a;">${periodLabel}</div>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap:10px;">
                        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px;">
                            <small style="color:#1d4ed8;">Billed Revenue</small>
                            <div style="font-size:18px; font-weight:700; color:#1e3a8a;">${formatPKR(billedRevenue)}</div>
                        </div>
                        <div style="background:#ecfdf5; border:1px solid #bbf7d0; border-radius:8px; padding:10px;">
                            <small style="color:#15803d;">Collected Revenue</small>
                            <div style="font-size:18px; font-weight:700; color:#166534;">${formatPKR(collectedRevenue)}</div>
                        </div>
                    </div>
                    <div style="font-size:12px; color:var(--gray-500);">Based on ${inRange.length} invoices in selected period.</div>
                    ${breakdownHtml}
                </div>
            `;
            const revenuePayload = {
                title: 'Revenue Report',
                summary: `${periodLabel} | Billed ${formatPKR(billedRevenue)} | Collected ${formatPKR(collectedRevenue)}`,
                metrics: [
                    `Billed Revenue: ${formatPKR(billedRevenue)}`,
                    `Collected Revenue: ${formatPKR(collectedRevenue)}`,
                    `Invoices Count: ${inRange.length}`
                ],
                tableHeaders: ['Month', 'Billed', 'Collected'],
                tableRows: monthRows.map((row) => [row.label || '-', formatPKR(row.billed || 0), formatPKR(row.collected || 0)])
            };
            setAIReportOutput(outputEl, revenueHtml, revenuePayload);
            if (wantsPdfReport) {
                exportAIReportToPDF();
            }
            return;
        }
    } catch (error) {
        console.error('AI report error:', error);
        setAIReportOutput(outputEl, 'Could not generate report. Please try again.');
    }
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

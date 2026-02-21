// Ledger Module
async function loadLedger(initialTab = 'client') {
    document.getElementById('header-actions').innerHTML = '';

    const contentEl = document.getElementById('content-body');
    contentEl.innerHTML = `
        <div id="ledger-tab-content" class="ledger-tab-content"></div>
    `;

    await setActiveLedgerTab(initialTab);
}

async function loadClientLedger() {
    const contentEl = document.getElementById('content-body');
    await renderClientLedger(contentEl);
}

async function setActiveLedgerTab(tab) {
    window.ledgerActiveTab = tab;
    const tabs = document.querySelectorAll('.ledger-tab[data-ledger-tab]');
    tabs.forEach((button) => {
        button.classList.toggle('active', button.dataset.ledgerTab === tab);
    });

    const contentEl = document.getElementById('ledger-tab-content');
    if (!contentEl) return;

    if (tab === 'client') {
        await renderClientLedger(contentEl);
        return;
    }

    if (tab === 'vendor') {
        await renderVendorLedger(contentEl);
        return;
    }

    if (tab === 'bank') {
        await renderBankLedger(contentEl);
    }
}

async function renderClientLedger(contentEl) {
    if (!contentEl) return;

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Invoices & Payments Ledger</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <select id="ledger-client" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 240px;">
                        <option value="">All Clients</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From Month:
                        <input type="month" id="ledger-month-from" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To Month:
                        <input type="month" id="ledger-month-to" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <button class="btn btn-sm btn-secondary" onclick="resetLedgerFilters()">
                        <i class="fas fa-rotate-left"></i>
                        Reset
                    </button>
                    <button class="btn btn-sm btn-primary btn-export" onclick="exportLedgerPDF()">
                        <i class="fas fa-file-pdf"></i>
                        Export PDF
                    </button>
                    <button class="btn btn-sm btn-success btn-export" onclick="exportLedgerExcel()">
                        <i class="fas fa-file-excel"></i>
                        Export Excel
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="ledger-summary" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px;"></div>

                <div id="ledger-table"></div>
            </div>
        </div>
    `;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthFromInput = document.getElementById('ledger-month-from');
    const monthToInput = document.getElementById('ledger-month-to');
    if (monthFromInput) {
        monthFromInput.value = currentMonth;
    }
    if (monthToInput) {
        monthToInput.value = currentMonth;
    }

    const { clients, invoices, payments } = await fetchLedgerData();
    window.ledgerState = {
        clients,
        invoices,
        payments
    };

    populateLedgerClientOptions(clients, invoices, payments);
    filterClientLedger();
}

async function renderVendorLedger(contentEl) {
    if (!contentEl) return;

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Vendor Payments Ledger</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <select id="ledger-vendor" onchange="filterVendorLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 240px;">
                        <option value="">All Vendors</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From Month:
                        <input type="month" id="ledger-month-from" onchange="filterVendorLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To Month:
                        <input type="month" id="ledger-month-to" onchange="filterVendorLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <button class="btn btn-sm btn-secondary" onclick="refreshVendorLedger()" style="margin-left: auto;">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="resetLedgerFilters()">
                        <i class="fas fa-rotate-left"></i>
                        Reset
                    </button>
                    <button class="btn btn-sm btn-primary btn-export" onclick="exportLedgerPDF()">
                        <i class="fas fa-file-pdf"></i>
                        Export PDF
                    </button>
                    <button class="btn btn-sm btn-success btn-export" onclick="exportLedgerExcel()">
                        <i class="fas fa-file-excel"></i>
                        Export Excel
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="vendor-ledger-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;"></div>
                <div id="vendor-ledger-table"></div>
            </div>
        </div>
    `;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthFromInput = document.getElementById('ledger-month-from');
    const monthToInput = document.getElementById('ledger-month-to');
    if (monthFromInput) monthFromInput.value = currentMonth;
    if (monthToInput) monthToInput.value = currentMonth;

    const vendors = loadJSONFromStorage(STORAGE_KEYS.VENDORS);
    const vendorInvoices = loadJSONFromStorage(STORAGE_KEYS.VENDOR_INVOICES);
    const vendorPayments = loadJSONFromStorage(STORAGE_KEYS.VENDOR_PAYMENTS);
    window.vendorLedgerState = { vendors, vendorInvoices, vendorPayments };

    populateLedgerVendorOptions(vendors, vendorInvoices, vendorPayments);
    filterVendorLedger();
}

async function renderBankLedger(contentEl) {
    if (!contentEl) return;

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Bank Ledger</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From Month:
                        <input type="month" id="ledger-month-from" onchange="filterBankLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To Month:
                        <input type="month" id="ledger-month-to" onchange="filterBankLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <button class="btn btn-sm btn-secondary" onclick="refreshBankLedger()" style="margin-left: auto;">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="resetLedgerFilters()">
                        <i class="fas fa-rotate-left"></i>
                        Reset
                    </button>
                    <button class="btn btn-sm btn-primary btn-export" onclick="exportLedgerPDF()">
                        <i class="fas fa-file-pdf"></i>
                        Export PDF
                    </button>
                    <button class="btn btn-sm btn-success btn-export" onclick="exportLedgerExcel()">
                        <i class="fas fa-file-excel"></i>
                        Export Excel
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="bank-ledger-summary" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;"></div>
                <div id="bank-ledger-table"></div>
            </div>
        </div>
    `;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthFromInput = document.getElementById('ledger-month-from');
    const monthToInput = document.getElementById('ledger-month-to');
    if (monthFromInput) monthFromInput.value = currentMonth;
    if (monthToInput) monthToInput.value = currentMonth;

    await refreshBankLedger(false);
}

async function fetchLedgerData() {
    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    const [clientsResult, invoicesResult, paymentsResult] = await Promise.allSettled([
        Promise.race([API.getClients({ limit: 500 }), timeout(2500)]),
        Promise.race([API.getInvoices({ limit: 1000 }), timeout(2500)]),
        Promise.race([API.getPayments({ limit: 1000 }), timeout(2500)])
    ]);

    const apiClients = normalizeArrayResponse(clientsResult.status === 'fulfilled' ? clientsResult.value : [], 'clients');
    const apiInvoices = normalizeArrayResponse(invoicesResult.status === 'fulfilled' ? invoicesResult.value : [], 'invoices');
    const apiPayments = normalizeArrayResponse(paymentsResult.status === 'fulfilled' ? paymentsResult.value : [], 'payments');

    const storedClients = loadJSONFromStorage(STORAGE_KEYS.CLIENTS);
    const storedInvoices = loadJSONFromStorage(STORAGE_KEYS.INVOICES);
    const storedPayments = loadJSONFromStorage(STORAGE_KEYS.PAYMENTS);

    return {
        clients: dedupeByKey([...apiClients, ...storedClients], (c) => c.id || c.clientId || c.name),
        invoices: dedupeByKey([...apiInvoices, ...storedInvoices], (inv) => inv.invoiceNo || inv.id || JSON.stringify(inv)),
        payments: dedupeByKey([...apiPayments, ...storedPayments], (p) => p.reference || p.paymentReference || p.id || JSON.stringify(p))
    };
}

function normalizeArrayResponse(response, key) {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response[key])) return response[key];
    return [];
}

function loadJSONFromStorage(storageKey) {
    try {
        const saved = localStorage.getItem(storageKey);
        const parsed = saved ? JSON.parse(saved) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function dedupeByKey(items, getKey) {
    const seen = new Set();
    const deduped = [];

    items.forEach((item) => {
        const key = getKey(item);
        if (!key || seen.has(key)) return;
        seen.add(key);
        deduped.push(item);
    });

    return deduped;
}

function populateLedgerClientOptions(clients, invoices, payments) {
    const selectEl = document.getElementById('ledger-client');
    if (!selectEl) return;

    const fromClients = clients.map((client) => client.name).filter(Boolean);
    const fromInvoices = invoices.map((invoice) => invoice.clientName).filter(Boolean);
    const fromPayments = payments.map((payment) => payment.clientName).filter(Boolean);

    const uniqueClientNames = [...new Set([...fromClients, ...fromInvoices, ...fromPayments])].sort((a, b) => a.localeCompare(b));

    selectEl.innerHTML = '<option value="">All Clients</option>';
    uniqueClientNames.forEach((name) => {
        selectEl.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

function populateLedgerVendorOptions(vendors, vendorInvoices, vendorPayments) {
    const selectEl = document.getElementById('ledger-vendor');
    if (!selectEl) return;

    const fromVendors = (vendors || []).map((vendor) => vendor.name).filter(Boolean);
    const fromInvoices = (vendorInvoices || []).map((invoice) => invoice.vendorName).filter(Boolean);
    const fromPayments = (vendorPayments || []).map((payment) => payment.vendorName).filter(Boolean);
    const uniqueVendorNames = [...new Set([...fromVendors, ...fromInvoices, ...fromPayments])].sort((a, b) => a.localeCompare(b));

    selectEl.innerHTML = '<option value="">All Vendors</option>';
    uniqueVendorNames.forEach((name) => {
        selectEl.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

function filterClientLedger() {
    const client = document.getElementById('ledger-client')?.value || '';
    const monthFrom = document.getElementById('ledger-month-from')?.value || '';
    const monthTo = document.getElementById('ledger-month-to')?.value || '';
    const state = window.ledgerState || { invoices: [], payments: [] };

    const filteredInvoices = state.invoices.filter((invoice) => {
        const matchesClient = !client || invoice.clientName === client;
        const matchesMonthRange = matchesMonthRangeFilter(invoice.invoiceDate, invoice.month, monthFrom, monthTo);
        return matchesClient && matchesMonthRange;
    });

    const filteredPayments = state.payments.filter((payment) => {
        const paymentClient = payment.clientName || extractPaymentClient(payment);
        const matchesClient = !client || paymentClient === client;
        const matchesMonthRange = matchesMonthRangeFilter(payment.paymentDate, payment.month, monthFrom, monthTo);
        return matchesClient && matchesMonthRange;
    });

    displayLedgerSummary(filteredInvoices, filteredPayments);
    displayLedgerTable(filteredInvoices, filteredPayments);
}

function filterVendorLedger() {
    const vendor = document.getElementById('ledger-vendor')?.value || '';
    const monthFrom = document.getElementById('ledger-month-from')?.value || '';
    const monthTo = document.getElementById('ledger-month-to')?.value || '';
    const state = window.vendorLedgerState || { vendorInvoices: [], vendorPayments: [] };

    const filteredInvoices = (state.vendorInvoices || []).filter((invoice) => {
        const matchesVendor = !vendor || invoice.vendorName === vendor;
        const invoiceDate = invoice.invoiceDate || invoice.invoiceMonth;
        const matchesMonthRange = matchesMonthRangeFilter(invoiceDate, invoice.invoiceMonth, monthFrom, monthTo);
        return matchesVendor && matchesMonthRange;
    });

    const filteredPayments = (state.vendorPayments || []).filter((payment) => {
        const matchesVendor = !vendor || payment.vendorName === vendor;
        const dateValue = getVendorPaymentDate(payment);
        const matchesMonthRange = matchesMonthRangeFilter(dateValue, payment.invoiceMonth, monthFrom, monthTo);
        return matchesVendor && matchesMonthRange;
    });

    const rows = buildVendorLedgerRows(filteredInvoices, filteredPayments);
    if (rows.length === 0) {
        clearVendorLedgerDisplay('No vendor ledger entries found for selected filters.');
        return;
    }

    displayVendorLedgerSummary(filteredInvoices, filteredPayments);
    displayVendorLedgerTable(rows);
}

function refreshVendorLedger() {
    const previousVendor = document.getElementById('ledger-vendor')?.value || '';
    const previousMonthFrom = document.getElementById('ledger-month-from')?.value || '';
    const previousMonthTo = document.getElementById('ledger-month-to')?.value || '';

    const vendors = loadJSONFromStorage(STORAGE_KEYS.VENDORS);
    const vendorInvoices = loadJSONFromStorage(STORAGE_KEYS.VENDOR_INVOICES);
    const vendorPayments = loadJSONFromStorage(STORAGE_KEYS.VENDOR_PAYMENTS);
    window.vendorLedgerState = { vendors, vendorInvoices, vendorPayments };

    populateLedgerVendorOptions(vendors, vendorInvoices, vendorPayments);

    const vendorEl = document.getElementById('ledger-vendor');
    const monthFromEl = document.getElementById('ledger-month-from');
    const monthToEl = document.getElementById('ledger-month-to');

    if (vendorEl) vendorEl.value = previousVendor;
    if (monthFromEl) monthFromEl.value = previousMonthFrom;
    if (monthToEl) monthToEl.value = previousMonthTo;

    filterVendorLedger();
    showNotification('Vendor ledger refreshed successfully', 'success');
}

async function refreshBankLedger(showToast = true) {
    const previousMonthFrom = document.getElementById('ledger-month-from')?.value || '';
    const previousMonthTo = document.getElementById('ledger-month-to')?.value || '';

    const { payments } = await fetchLedgerData();
    const salaryExpenses = loadJSONFromStorage(STORAGE_KEYS.SALARY_EXPENSES);
    const dailyExpenses = loadJSONFromStorage(STORAGE_KEYS.DAILY_EXPENSES);
    const vendorPayments = loadJSONFromStorage(STORAGE_KEYS.VENDOR_PAYMENTS);

    window.bankLedgerState = {
        payments,
        salaryExpenses,
        dailyExpenses,
        vendorPayments
    };

    const monthFromEl = document.getElementById('ledger-month-from');
    const monthToEl = document.getElementById('ledger-month-to');
    if (monthFromEl) monthFromEl.value = previousMonthFrom;
    if (monthToEl) monthToEl.value = previousMonthTo;

    filterBankLedger();

    if (showToast) {
        showNotification('Bank ledger refreshed successfully', 'success');
    }
}

function getClientPaymentNetAmount(payment) {
    const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
    const taxRate = Number(payment.taxRate) || 0;
    const storedTax = Number(payment.taxAmount);
    const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
    const netAmount = Number(payment.netAmount);
    return Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
}

function buildBankLedgerRows() {
    const monthFrom = document.getElementById('ledger-month-from')?.value || '';
    const monthTo = document.getElementById('ledger-month-to')?.value || '';
    const state = window.bankLedgerState || { payments: [], salaryExpenses: [], dailyExpenses: [], vendorPayments: [] };

    const rows = [];

    (state.payments || []).forEach((payment) => {
        if (!matchesMonthRangeFilter(payment.paymentDate, payment.month, monthFrom, monthTo)) return;

        const amount = getClientPaymentNetAmount(payment);
        const clientName = payment.clientName || extractPaymentClient(payment) || 'Client';
        const paymentType = payment.method || 'N/A';
        const reference = payment.reference || payment.paymentReference || '-';

        rows.push({
            type: 'client-payment',
            date: payment.paymentDate,
            invoiceNo: payment.invoiceNo || getPaymentInvoiceText(payment) || '-',
            details: `Client payment from ${clientName} (${paymentType}, Ref: ${reference})`,
            debit: 0,
            credit: amount,
            taxDeduction: 0
        });
    });

    (state.salaryExpenses || []).forEach((expense) => {
        if (!matchesMonthRangeFilter(expense.expenseDate, '', monthFrom, monthTo)) return;

        const amount = Number(expense.netPayable ?? expense.totalAmount ?? expense.grossSalary) || 0;
        rows.push({
            type: 'salary-expense',
            date: expense.expenseDate,
            invoiceNo: `SAL-${expense.id || '-'}`,
            details: `Salary expense (${expense.employeeName || 'Employee'})`,
            debit: amount,
            credit: 0,
            taxDeduction: 0
        });
    });

    (state.dailyExpenses || []).forEach((expense) => {
        if (!matchesMonthRangeFilter(expense.expenseDate, '', monthFrom, monthTo)) return;

        const amount = Number(expense.totalAmount) || 0;
        rows.push({
            type: 'daily-expense',
            date: expense.expenseDate,
            invoiceNo: `DEX-${expense.id || '-'}`,
            details: `Daily expense (${expense.employeeName || 'Employee'})`,
            debit: amount,
            credit: 0,
            taxDeduction: 0
        });
    });

    (state.vendorPayments || []).forEach((payment) => {
        const paymentDate = getVendorPaymentDate(payment);
        if (!matchesMonthRangeFilter(paymentDate, payment.invoiceMonth, monthFrom, monthTo)) return;

        const amount = Number(payment.amount ?? payment.netAmount) || 0;
        const vendorName = payment.vendorName || 'Vendor';
        const paymentType = payment.method || 'N/A';
        const reference = payment.reference || '-';
        rows.push({
            type: 'vendor-payment',
            date: paymentDate,
            invoiceNo: payment.invoiceNo || '-',
            details: `Vendor payment to ${vendorName} (${paymentType}, Ref: ${reference})`,
            debit: amount,
            credit: 0,
            taxDeduction: 0
        });
    });

    rows.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
    });

    return rows;
}

function filterBankLedger() {
    const rows = buildBankLedgerRows();

    if (rows.length === 0) {
        clearBankLedgerDisplay('No bank ledger entries found for selected filters.');
        return;
    }

    displayBankLedgerSummary(rows);
    displayBankLedgerTable(rows);
}

function clearBankLedgerDisplay(message) {
    const summaryEl = document.getElementById('bank-ledger-summary');
    const tableEl = document.getElementById('bank-ledger-table');

    if (summaryEl) {
        summaryEl.innerHTML = `
            <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                <small style="color: var(--gray-600); font-size: 11px;">Total Credit</small>
                <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(0)}</div>
            </div>
            <div style="background: #fee2e2; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #dc2626;">
                <small style="color: var(--gray-600); font-size: 11px;">Total Debit</small>
                <div style="font-size: 18px; font-weight: 700; color: #dc2626;">${formatPKR(0)}</div>
            </div>
            <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                <small style="color: var(--gray-600); font-size: 11px;">Net Balance</small>
                <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(0)}</div>
            </div>
            <div style="background: #f5f3ff; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #7c3aed;">
                <small style="color: var(--gray-600); font-size: 11px;">Entries</small>
                <div style="font-size: 18px; font-weight: 700; color: #7c3aed;">0</div>
            </div>
        `;
    }

    if (tableEl) {
        tableEl.innerHTML = `<p style="text-align: center; color: var(--gray-500);">${message || 'No bank ledger entries found'}</p>`;
    }
}

function displayBankLedgerSummary(rows) {
    const summaryEl = document.getElementById('bank-ledger-summary');
    if (!summaryEl) return;

    const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
    const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
    const netBalance = totalCredit - totalDebit;

    summaryEl.innerHTML = `
        <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
            <small style="color: var(--gray-600); font-size: 11px;">Total Credit</small>
            <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(totalCredit)}</div>
        </div>
        <div style="background: #fee2e2; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #dc2626;">
            <small style="color: var(--gray-600); font-size: 11px;">Total Debit</small>
            <div style="font-size: 18px; font-weight: 700; color: #dc2626;">${formatPKR(totalDebit)}</div>
        </div>
        <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
            <small style="color: var(--gray-600); font-size: 11px;">Net Balance</small>
            <div style="font-size: 18px; font-weight: 700; color: ${netBalance >= 0 ? '#2563eb' : '#dc2626'};">${formatPKR(netBalance)}</div>
        </div>
        <div style="background: #f5f3ff; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #7c3aed;">
            <small style="color: var(--gray-600); font-size: 11px;">Entries</small>
            <div style="font-size: 18px; font-weight: 700; color: #7c3aed;">${rows.length}</div>
        </div>
    `;
}

function displayBankLedgerTable(rows) {
    const container = document.getElementById('bank-ledger-table');
    if (!container) return;

    if (!rows || rows.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No bank ledger entries found for selected filters</p>';
        return;
    }

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    let html = '<div style="border: 1px solid var(--gray-200); border-radius: 4px; overflow: hidden;">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-bottom: none; table-layout: fixed; width: 100%;">';
    html += '<thead style="background: var(--gray-50);"><tr>';
    html += '<th style="width: 12%;">Date</th>';
    html += '<th style="width: 18%;">Reference</th>';
    html += '<th style="width: 30%;">Details</th>';
    html += '<th style="width: 13%;">Debit</th>';
    html += '<th style="width: 13%;">Credit</th>';
    html += '<th style="width: 14%;">Balance</th>';
    html += '</tr></thead></table></div>';

    html += '<div style="max-height: 520px; overflow-y: auto; border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200);">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; table-layout: fixed; width: 100%;"><tbody>';

    rows.forEach((row) => {
        runningBalance += (row.credit || 0) - (row.debit || 0);
        totalDebit += row.debit || 0;
        totalCredit += row.credit || 0;

        html += '<tr>';
        html += `<td style="width: 12%;">${formatDate(row.date)}</td>`;
        html += `<td style="width: 18%; word-wrap: break-word;"><strong>${row.invoiceNo || '-'}</strong></td>`;
        html += `<td style="width: 30%;">${row.details}</td>`;
        html += `<td style="width: 13%; color: ${row.debit > 0 ? 'var(--danger)' : 'var(--gray-500)'}; font-weight: 700;">${row.debit > 0 ? formatPKR(row.debit) : '-'}</td>`;
        html += `<td style="width: 13%; color: ${row.credit > 0 ? 'var(--success)' : 'var(--gray-500)'}; font-weight: 700;">${row.credit > 0 ? formatPKR(row.credit) : '-'}</td>`;
        html += `<td style="width: 14%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';

    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-top: none; table-layout: fixed; width: 100%;">';
    html += '<tfoot style="background: var(--gray-100); font-weight: 700; border-top: 2px solid var(--gray-400);"><tr>';
    html += '<td colspan="3" style="width: 60%; text-align: right; padding: 12px; font-weight: 700;">Total:</td>';
    html += `<td style="width: 13%; color: var(--danger); font-weight: 700;">${formatPKR(totalDebit)}</td>`;
    html += `<td style="width: 13%; color: var(--success); font-weight: 700;">${formatPKR(totalCredit)}</td>`;
    html += `<td style="width: 14%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
    html += '</tr></tfoot></table></div>';

    html += '</div>';
    container.innerHTML = html;
}

function getVendorPaymentDate(payment) {
    return payment.paymentDate || payment.invoiceMonth || '';
}

function buildVendorLedgerRows(invoices, payments) {
    const rows = [];

    (invoices || []).forEach((invoice) => {
        const amount = Number(invoice.amount) || 0;
        const vendorName = invoice.vendorName || 'Vendor';
        rows.push({
            type: 'invoice',
            date: invoice.invoiceDate || invoice.invoiceMonth,
            invoiceNo: invoice.invoiceNo || '-',
            details: `Invoice received from ${vendorName}`,
            debit: 0,
            credit: amount,
            taxDeduction: 0
        });
    });

    (payments || []).forEach((payment) => {
        const amount = Number(payment.amount) || 0;
        const vendorName = payment.vendorName || 'Vendor';
        const paymentType = payment.method || 'N/A';
        const reference = payment.reference || '-';
        rows.push({
            type: 'payment',
            date: getVendorPaymentDate(payment),
            invoiceNo: payment.invoiceNo || '-',
            details: `Payment to ${vendorName} (${paymentType}, Ref: ${reference})`,
            debit: amount,
            credit: 0,
            taxDeduction: 0
        });
    });

    rows.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
    });

    return rows;
}

function clearVendorLedgerDisplay(message) {
    const summaryEl = document.getElementById('vendor-ledger-summary');
    const tableEl = document.getElementById('vendor-ledger-table');

    if (summaryEl) {
        summaryEl.innerHTML = `
            <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                <small style="color: var(--gray-600); font-size: 11px;">Total Invoiced</small>
                <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(0)}</div>
            </div>
            <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                <small style="color: var(--gray-600); font-size: 11px;">Total Paid</small>
                <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(0)}</div>
            </div>
            <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                <small style="color: var(--gray-600); font-size: 11px;">Pending Amount</small>
                <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${formatPKR(0)}</div>
            </div>
        `;
    }

    if (tableEl) {
        tableEl.innerHTML = `<p style="text-align: center; color: var(--gray-500);">${message || 'No vendor ledger entries found'}</p>`;
    }
}

function displayVendorLedgerSummary(invoices, payments) {
    const summaryEl = document.getElementById('vendor-ledger-summary');
    if (!summaryEl) return;

    const totalInvoiced = (invoices || []).reduce((sum, invoice) => sum + (Number(invoice.amount) || 0), 0);
    const totalPaid = (payments || []).reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const pendingAmount = Math.max(totalInvoiced - totalPaid, 0);

    summaryEl.innerHTML = `
        <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
            <small style="color: var(--gray-600); font-size: 11px;">Total Invoiced</small>
            <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(totalInvoiced)}</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
            <small style="color: var(--gray-600); font-size: 11px;">Total Paid</small>
            <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(totalPaid)}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
            <small style="color: var(--gray-600); font-size: 11px;">Pending Amount</small>
            <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${formatPKR(pendingAmount)}</div>
        </div>
    `;
}

function displayVendorLedgerTable(rows) {
    const container = document.getElementById('vendor-ledger-table');
    if (!container) return;

    if (rows.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No vendor ledger entries found for selected filters</p>';
        return;
    }

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTax = 0;

    let html = '<div style="border: 1px solid var(--gray-200); border-radius: 4px; overflow: hidden;">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-bottom: none; table-layout: fixed; width: 100%;">';
    html += '<thead style="background: var(--gray-50);"><tr>';
    html += '<th style="width: 10%;">Date</th>';
    html += '<th style="width: 15%;">Invoice No</th>';
    html += '<th style="width: 25%;">Details</th>';
    html += '<th style="width: 12%;">Debit</th>';
    html += '<th style="width: 12%;">Credit</th>';
    html += '<th style="width: 13%;">Tax Deduction</th>';
    html += '<th style="width: 13%;">Balance</th>';
    html += '</tr></thead></table></div>';

    html += '<div style="max-height: 520px; overflow-y: auto; border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200);">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; table-layout: fixed; width: 100%;"><tbody>';

    rows.forEach((row) => {
        const taxDeduction = row.taxDeduction || 0;
        runningBalance += (row.credit || 0) - (row.debit || 0) - taxDeduction;
        totalDebit += row.debit || 0;
        totalCredit += row.credit || 0;
        totalTax += taxDeduction;

        html += '<tr>';
        html += `<td style="width: 10%;">${formatDate(row.date)}</td>`;
        html += `<td style="width: 15%; word-wrap: break-word;"><strong>${row.invoiceNo || '-'}</strong></td>`;
        html += `<td style="width: 25%;">${row.details}</td>`;
        html += `<td style="width: 12%; color: ${row.debit > 0 ? 'var(--danger)' : 'var(--gray-500)'}; font-weight: 700;">${row.debit > 0 ? formatPKR(row.debit) : '-'}</td>`;
        html += `<td style="width: 12%; color: ${row.credit > 0 ? 'var(--success)' : 'var(--gray-500)'}; font-weight: 700;">${row.credit > 0 ? formatPKR(row.credit) : '-'}</td>`;
        html += `<td style="width: 13%; color: var(--gray-500); font-weight: 700;">-</td>`;
        html += `<td style="width: 13%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';

    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-top: none; table-layout: fixed; width: 100%;">';
    html += '<tfoot style="background: var(--gray-100); font-weight: 700; border-top: 2px solid var(--gray-400);"><tr>';
    html += '<td colspan="3" style="width: 50%; text-align: right; padding: 12px; font-weight: 700;">Total:</td>';
    html += `<td style="width: 12%; color: var(--danger); font-weight: 700;">${formatPKR(totalDebit)}</td>`;
    html += `<td style="width: 12%; color: var(--success); font-weight: 700;">${formatPKR(totalCredit)}</td>`;
    html += `<td style="width: 13%; color: var(--gray-500); font-weight: 700;">-</td>`;
    html += `<td style="width: 13%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
    html += '</tr></tfoot></table></div>';

    html += '</div>';
    container.innerHTML = html;
}

function matchesMonthRangeFilter(dateValue, monthName, monthFrom, monthTo) {
    if (!monthFrom && !monthTo) return true;
    
    // Try to get month string from date
    let recordMonth = '';
    if (dateValue) {
        recordMonth = String(dateValue).slice(0, 7);
    } else if (monthName) {
        // Convert month name to YYYY-MM format if possible
        const monthMap = {
            january: '01', february: '02', march: '03', april: '04',
            may: '05', june: '06', july: '07', august: '08',
            september: '09', october: '10', november: '11', december: '12'
        };
        const monthIndex = monthMap[String(monthName).toLowerCase().trim()];
        if (monthIndex) {
            const currentYear = new Date().getFullYear();
            recordMonth = `${currentYear}-${monthIndex}`;
        }
    }
    
    if (!recordMonth) return false;
    
    if (monthFrom && recordMonth < monthFrom) return false;
    if (monthTo && recordMonth > monthTo) return false;
    
    return true;
}

function extractPaymentClient(payment) {
    if (!payment?.lineItems || payment.lineItems.length === 0) return '';
    return payment.lineItems[0]?.clientName || '';
}

function recordMatchesMonth(dateValue, monthName, targetMonth) {
    if (dateValue && String(dateValue).slice(0, 7) === targetMonth) {
        return true;
    }

    if (!monthName) return false;

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

    const monthIndex = monthMap[String(monthName).toLowerCase().trim()];
    if (!monthIndex) return false;

    const [, selectedMonthPart] = targetMonth.split('-');
    return selectedMonthPart === monthIndex;
}

function displayLedgerSummary(invoices, payments) {
    const summaryEl = document.getElementById('ledger-summary');
    if (!summaryEl) return;

    const totalInvoices = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    
    // Calculate total payments (net amount after tax)
    const totalPaymentsNet = payments.reduce((sum, payment) => {
        const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
        const taxRate = Number(payment.taxRate) || 0;
        const storedTax = Number(payment.taxAmount);
        const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
        const netAmount = Number(payment.netAmount);
        const creditAmount = Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
        return sum + creditAmount;
    }, 0);
    
    // Calculate total tax deductions
    const totalTaxDeductions = payments.reduce((sum, payment) => {
        const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
        const taxRate = Number(payment.taxRate) || 0;
        const storedTax = Number(payment.taxAmount);
        const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
        return sum + taxDeduction;
    }, 0);
    
    // Calculate pending amount same as running balance in ledger
    const totalPending = totalInvoices - totalPaymentsNet - totalTaxDeductions;

    summaryEl.innerHTML = `
        <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
            <small style="color: var(--gray-600); font-size: 11px;">Invoice Count</small>
            <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${invoices.length}</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
            <small style="color: var(--gray-600); font-size: 11px;">Payment Count</small>
            <div style="font-size: 18px; font-weight: 700; color: #059669;">${payments.length}</div>
        </div>
        <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
            <small style="color: var(--gray-600); font-size: 11px;">Invoice Amount</small>
            <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(totalInvoices)}</div>
        </div>
        <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
            <small style="color: var(--gray-600); font-size: 11px;">Payments Received</small>
            <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(totalPaymentsNet)}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
            <small style="color: var(--gray-600); font-size: 11px;">Pending Amount</small>
            <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${formatPKR(Math.max(totalPending, 0))}</div>
        </div>
    `;
}

function getInvoicePending(invoice) {
    const explicitBalance = Number(invoice.balance);
    if (!Number.isNaN(explicitBalance)) {
        return Math.max(explicitBalance, 0);
    }

    const total = Number(invoice.totalAmount) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    return Math.max(total - paid, 0);
}

function displayLedgerTable(invoices, payments) {
    const container = document.getElementById('ledger-table');
    if (!container) return;

    const rows = [];

    invoices.forEach((invoice) => {
        const total = Number(invoice.totalAmount) || 0;
        rows.push({
            type: 'invoice',
            date: invoice.invoiceDate,
            invoiceNo: invoice.invoiceNo || '-',
            details: `Invoice issued to ${invoice.clientName || 'Client'}`,
            debit: total,
            credit: 0,
            taxDeduction: 0
        });
    });

    payments.forEach((payment) => {
        const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
        const taxRate = Number(payment.taxRate) || 0;
        const storedTax = Number(payment.taxAmount);
        const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
        const netAmount = Number(payment.netAmount);
        const creditAmount = Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
        const invoicesText = getPaymentInvoiceText(payment);
        const paymentType = payment.method || 'N/A';
        const reference = payment.reference || payment.paymentReference || '-';
        const clientName = payment.clientName || extractPaymentClient(payment) || 'Client';
        const details = `Payment from ${clientName} (${paymentType}, Ref: ${reference})`;

        rows.push({
            type: 'payment',
            date: payment.paymentDate,
            invoiceNo: invoicesText,
            details,
            debit: 0,
            credit: creditAmount,
            taxDeduction
        });
    });

    rows.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
    });

    if (rows.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No ledger entries found for selected filters</p>';
        return;
    }

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTax = 0;

    // Header table (fixed)
    let html = '<div style="border: 1px solid var(--gray-200); border-radius: 4px; overflow: hidden;">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-bottom: none; table-layout: fixed; width: 100%;">';
    html += '<thead style="background: var(--gray-50);"><tr>';
    html += '<th style="width: 10%;">Date</th>';
    html += '<th style="width: 15%;">Invoice No</th>';
    html += '<th style="width: 25%;">Details</th>';
    html += '<th style="width: 12%;">Debit</th>';
    html += '<th style="width: 12%;">Credit</th>';
    html += '<th style="width: 13%;">Tax Deduction</th>';
    html += '<th style="width: 13%;">Balance</th>';
    html += '</tr></thead></table></div>';

    // Scrollable body
    html += '<div style="max-height: 520px; overflow-y: auto; border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200);">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; table-layout: fixed; width: 100%;"><tbody>';
    
    rows.forEach((row) => {
        const taxDeduction = row.taxDeduction || 0;
        runningBalance += (row.debit || 0) - (row.credit || 0) - taxDeduction;
        totalDebit += row.debit || 0;
        totalCredit += row.credit || 0;
        totalTax += taxDeduction;
        
        html += '<tr>';
        html += `<td style="width: 10%;">${formatDate(row.date)}</td>`;
        html += `<td style="width: 15%; word-wrap: break-word;"><strong>${row.invoiceNo || '-'}</strong></td>`;
        html += `<td style="width: 25%;">${row.details}</td>`;
        html += `<td style="width: 12%; color: ${row.debit > 0 ? 'var(--danger)' : 'var(--gray-500)'}; font-weight: 700;">${row.debit > 0 ? formatPKR(row.debit) : '-'}</td>`;
        html += `<td style="width: 12%; color: ${row.credit > 0 ? 'var(--success)' : 'var(--gray-500)'}; font-weight: 700;">${row.credit > 0 ? formatPKR(row.credit) : '-'}</td>`;
        html += `<td style="width: 13%; color: ${taxDeduction > 0 ? 'var(--danger)' : 'var(--gray-500)'}; font-weight: 700;">${taxDeduction > 0 ? '- ' + formatPKR(taxDeduction) : '-'}</td>`;
        html += `<td style="width: 13%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';

    // Footer table (fixed)
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-top: none; table-layout: fixed; width: 100%;">';
    html += '<tfoot style="background: var(--gray-100); font-weight: 700; border-top: 2px solid var(--gray-400);"><tr>';
    html += '<td colspan="3" style="width: 50%; text-align: right; padding: 12px; font-weight: 700;">Total:</td>';
    html += `<td style="width: 12%; color: var(--danger); font-weight: 700;">${formatPKR(totalDebit)}</td>`;
    html += `<td style="width: 12%; color: var(--success); font-weight: 700;">${formatPKR(totalCredit)}</td>`;
    html += `<td style="width: 13%; color: var(--danger); font-weight: 700;">${totalTax > 0 ? '- ' + formatPKR(totalTax) : '-'}</td>`;
    html += `<td style="width: 13%; color: ${runningBalance >= 0 ? 'var(--gray-800)' : 'var(--danger)'}; font-weight: 700;">${formatPKR(runningBalance)}</td>`;
    html += '</tr></tfoot></table></div>';
    
    html += '</div>';
    container.innerHTML = html;
}

function getPaymentInvoiceText(payment) {
    if (Array.isArray(payment.lineItems) && payment.lineItems.length > 0) {
        return payment.lineItems.map((item) => item.invoiceNo).join(', ');
    }
    return payment.invoiceNo || '-';
}

function resetLedgerFilters() {
    const clientEl = document.getElementById('ledger-client');
    const vendorEl = document.getElementById('ledger-vendor');
    const monthFromEl = document.getElementById('ledger-month-from');
    const monthToEl = document.getElementById('ledger-month-to');
    const currentMonth = new Date().toISOString().slice(0, 7);

    if (clientEl) clientEl.value = '';
    if (vendorEl) vendorEl.value = '';
    if (monthFromEl) monthFromEl.value = currentMonth;
    if (monthToEl) monthToEl.value = currentMonth;

    if (window.ledgerActiveTab === 'vendor') {
        filterVendorLedger();
    } else if (window.ledgerActiveTab === 'bank') {
        filterBankLedger();
    } else {
        filterClientLedger();
    }
}

function exportLedgerPDF() {
    const isVendorLedger = window.ledgerActiveTab === 'vendor';
    const isBankLedger = window.ledgerActiveTab === 'bank';
    const client = document.getElementById('ledger-client')?.value || 'All Clients';
    const vendor = document.getElementById('ledger-vendor')?.value || 'All Vendors';
    const monthFrom = document.getElementById('ledger-month-from')?.value || '';
    const monthTo = document.getElementById('ledger-month-to')?.value || '';
    let monthDisplay = 'All Months';
    if (monthFrom && monthTo) {
        if (monthFrom === monthTo) {
            monthDisplay = monthFrom;
        } else {
            monthDisplay = `${monthFrom} to ${monthTo}`;
        }
    } else if (monthFrom) {
        monthDisplay = `From ${monthFrom}`;
    } else if (monthTo) {
        monthDisplay = `To ${monthTo}`;
    }
    const timestamp = new Date().toLocaleString();
    const reportTitle = window.ledgerActiveTab === 'vendor' ? 'Vendor Ledger Report'
        : window.ledgerActiveTab === 'bank' ? 'Bank Ledger Report'
        : 'Client Ledger Report';

    let content = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #1976d2; text-align: center; margin-bottom: 5px;">Connectia ERP</h1>
            <h2 style="text-align: center; color: #333; margin-bottom: 20px;">${reportTitle}</h2>
            
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px;">
                <p style="margin: 5px 0;"><strong>${isBankLedger ? 'Ledger' : (isVendorLedger ? 'Vendor' : 'Client')}:</strong> ${isBankLedger ? 'Bank' : (isVendorLedger ? vendor : client)}</p>
                <p style="margin: 5px 0;"><strong>Period:</strong> ${monthDisplay}</p>
                <p style="margin: 5px 0;"><strong>Generated:</strong> ${timestamp}</p>
            </div>
    `;

    // Ledger Table - rebuild from data
    const rows = [];
    const monthFromVal = monthFrom;
    const monthToVal = monthTo;

    if (isBankLedger) {
        rows.push(...buildBankLedgerRows());
    } else if (isVendorLedger) {
        const vendorState = window.vendorLedgerState || { vendorInvoices: [], vendorPayments: [] };
        const filteredInvoices = (vendorState.vendorInvoices || []).filter((invoice) => {
            const selectedVendor = document.getElementById('ledger-vendor')?.value || '';
            const matchesVendor = !selectedVendor || invoice.vendorName === selectedVendor;
            const invoiceDate = invoice.invoiceDate || invoice.invoiceMonth;
            const matchesMonthRange = matchesMonthRangeFilter(invoiceDate, invoice.invoiceMonth, monthFromVal, monthToVal);
            return matchesVendor && matchesMonthRange;
        });

        const filteredPayments = (vendorState.vendorPayments || []).filter((payment) => {
            const selectedVendor = document.getElementById('ledger-vendor')?.value || '';
            const matchesVendor = !selectedVendor || payment.vendorName === selectedVendor;
            const dateValue = getVendorPaymentDate(payment);
            const matchesMonthRange = matchesMonthRangeFilter(dateValue, payment.invoiceMonth, monthFromVal, monthToVal);
            return matchesVendor && matchesMonthRange;
        });

        rows.push(...buildVendorLedgerRows(filteredInvoices, filteredPayments));
    } else {
        const state = window.ledgerState || { invoices: [], payments: [] };
        const filteredInvoices = state.invoices.filter((invoice) => {
            const c = document.getElementById('ledger-client')?.value || '';
            const matchesClient = !c || invoice.clientName === c;
            const matchesMonthRange = matchesMonthRangeFilter(invoice.invoiceDate, invoice.month, monthFromVal, monthToVal);
            return matchesClient && matchesMonthRange;
        });

        const filteredPayments = state.payments.filter((payment) => {
            const c = document.getElementById('ledger-client')?.value || '';
            const paymentClient = payment.clientName || extractPaymentClient(payment);
            const matchesClient = !c || paymentClient === c;
            const matchesMonthRange = matchesMonthRangeFilter(payment.paymentDate, payment.month, monthFromVal, monthToVal);
            return matchesClient && matchesMonthRange;
        });

        filteredInvoices.forEach((invoice) => {
            const total = Number(invoice.totalAmount) || 0;
            rows.push({
                type: 'invoice',
                date: invoice.invoiceDate,
                invoiceNo: invoice.invoiceNo || '-',
                details: `Invoice issued to ${invoice.clientName || 'Client'}`,
                debit: total,
                credit: 0,
                taxDeduction: 0
            });
        });

        filteredPayments.forEach((payment) => {
            const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
            const taxRate = Number(payment.taxRate) || 0;
            const storedTax = Number(payment.taxAmount);
            const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
            const netAmount = Number(payment.netAmount);
            const creditAmount = Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
            const invoicesText = getPaymentInvoiceText(payment);
            const paymentType = payment.method || 'N/A';
            const reference = payment.reference || payment.paymentReference || '-';
            const clientName = payment.clientName || extractPaymentClient(payment) || 'Client';
            const details = `Payment from ${clientName} (${paymentType}, Ref: ${reference})`;

            rows.push({
                type: 'payment',
                date: payment.paymentDate,
                invoiceNo: invoicesText,
                details,
                debit: 0,
                credit: creditAmount,
                taxDeduction
            });
        });
    }

    rows.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
    });

    if (rows.length > 0) {
        content += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #333;">Ledger</h3>`;
        content += `<table style="width: 100%; border-collapse: collapse; font-size: 10px;">`;
        content += `<thead style="background: #f5f5f5;"><tr>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Date</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Invoice No</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Details</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Debit</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Credit</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Tax Deduction</th>`;
        content += `<th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Balance</th>`;
        content += `</tr></thead><tbody>`;

        let runningBalance = 0;
        let totalDebit = 0;
        let totalCredit = 0;
        let totalTax = 0;

        rows.forEach((row) => {
            const taxDeduction = row.taxDeduction || 0;
            runningBalance += isBankLedger
                ? (row.credit || 0) - (row.debit || 0) - taxDeduction
                : isVendorLedger
                ? (row.credit || 0) - (row.debit || 0) - taxDeduction
                : (row.debit || 0) - (row.credit || 0) - taxDeduction;
            totalDebit += row.debit || 0;
            totalCredit += row.credit || 0;
            totalTax += taxDeduction;

            content += `<tr>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px;">${formatDate(row.date)}</td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px;"><strong>${row.invoiceNo || '-'}</strong></td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px;">${row.details}</td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: ${row.debit > 0 ? '#dc3545' : '#6c757d'};">${row.debit > 0 ? formatPKR(row.debit) : '-'}</td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: ${row.credit > 0 ? '#28a745' : '#6c757d'};">${row.credit > 0 ? formatPKR(row.credit) : '-'}</td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px; text-align: right; color: ${taxDeduction > 0 ? '#dc3545' : '#6c757d'};">${taxDeduction > 0 ? '- ' + formatPKR(taxDeduction) : '-'}</td>`;
            content += `<td style="border: 1px solid #ddd; padding: 6px; text-align: right; font-weight: 700; color: ${runningBalance >= 0 ? '#333' : '#dc3545'};">${formatPKR(runningBalance)}</td>`;
            content += `</tr>`;
        });

        content += `</tbody><tfoot style="background: #f5f5f5; font-weight: 700;"><tr>`;
        content += `<td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Total:</td>`;
        content += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #dc3545;">${formatPKR(totalDebit)}</td>`;
        content += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #28a745;">${formatPKR(totalCredit)}</td>`;
        content += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #dc3545;">${totalTax > 0 ? '- ' + formatPKR(totalTax) : '-'}</td>`;
        content += `<td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: 700; color: ${runningBalance >= 0 ? '#333' : '#dc3545'};">${formatPKR(runningBalance)}</td>`;
        content += `</tr></tfoot></table>`;
    }

    content += `
            <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px;">
                <p>This report was generated by Connectia ERP</p>
            </div>
        </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = content;

    const opt = {
        margin: 10,
        filename: `ledger-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(opt).from(element).save();
}

function exportLedgerExcel() {
    console.log('Export Excel function called');
    try {
        // Check if XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            console.error('XLSX library not found');
            alert('Excel export library not loaded. Please refresh the page and try again.');
            return;
        }
        console.log('XLSX library loaded');

        const isVendorLedger = window.ledgerActiveTab === 'vendor';
        const isBankLedger = window.ledgerActiveTab === 'bank';
        const client = document.getElementById('ledger-client')?.value || 'All Clients';
        const vendor = document.getElementById('ledger-vendor')?.value || 'All Vendors';
        const monthFrom = document.getElementById('ledger-month-from')?.value || '';
        const monthTo = document.getElementById('ledger-month-to')?.value || '';
        let monthDisplay = 'All Months';
        if (monthFrom && monthTo) {
            if (monthFrom === monthTo) {
                monthDisplay = monthFrom;
            } else {
                monthDisplay = `${monthFrom} to ${monthTo}`;
            }
        } else if (monthFrom) {
            monthDisplay = `From ${monthFrom}`;
        } else if (monthTo) {
            monthDisplay = `To ${monthTo}`;
        }

        const rows = [];
        const monthFromVal = monthFrom;
        const monthToVal = monthTo;

        if (isBankLedger) {
            rows.push(...buildBankLedgerRows());
        } else if (isVendorLedger) {
            const vendorState = window.vendorLedgerState || { vendorInvoices: [], vendorPayments: [] };
            const filteredInvoices = (vendorState.vendorInvoices || []).filter((invoice) => {
                const selectedVendor = document.getElementById('ledger-vendor')?.value || '';
                const matchesVendor = !selectedVendor || invoice.vendorName === selectedVendor;
                const invoiceDate = invoice.invoiceDate || invoice.invoiceMonth;
                const matchesMonthRange = matchesMonthRangeFilter(invoiceDate, invoice.invoiceMonth, monthFromVal, monthToVal);
                return matchesVendor && matchesMonthRange;
            });

            const filteredPayments = (vendorState.vendorPayments || []).filter((payment) => {
                const selectedVendor = document.getElementById('ledger-vendor')?.value || '';
                const matchesVendor = !selectedVendor || payment.vendorName === selectedVendor;
                const dateValue = getVendorPaymentDate(payment);
                const matchesMonthRange = matchesMonthRangeFilter(dateValue, payment.invoiceMonth, monthFromVal, monthToVal);
                return matchesVendor && matchesMonthRange;
            });

            rows.push(...buildVendorLedgerRows(filteredInvoices, filteredPayments));
        } else {
            const state = window.ledgerState || { invoices: [], payments: [] };
            const filteredInvoices = state.invoices.filter((invoice) => {
                const c = document.getElementById('ledger-client')?.value || '';
                const matchesClient = !c || invoice.clientName === c;
                const matchesMonthRange = matchesMonthRangeFilter(invoice.invoiceDate, invoice.month, monthFromVal, monthToVal);
                return matchesClient && matchesMonthRange;
            });

            const filteredPayments = state.payments.filter((payment) => {
                const c = document.getElementById('ledger-client')?.value || '';
                const paymentClient = payment.clientName || extractPaymentClient(payment);
                const matchesClient = !c || paymentClient === c;
                const matchesMonthRange = matchesMonthRangeFilter(payment.paymentDate, payment.month, monthFromVal, monthToVal);
                return matchesClient && matchesMonthRange;
            });

            filteredInvoices.forEach((invoice) => {
                const total = Number(invoice.totalAmount) || 0;
                rows.push({
                    type: 'invoice',
                    date: invoice.invoiceDate,
                    invoiceNo: invoice.invoiceNo || '-',
                    details: `Invoice issued to ${invoice.clientName || 'Client'}`,
                    debit: total,
                    credit: 0,
                    taxDeduction: 0
                });
            });

            filteredPayments.forEach((payment) => {
                const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
                const taxRate = Number(payment.taxRate) || 0;
                const storedTax = Number(payment.taxAmount);
                const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
                const netAmount = Number(payment.netAmount);
                const creditAmount = Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
                const invoicesText = getPaymentInvoiceText(payment);
                const paymentType = payment.method || 'N/A';
                const reference = payment.reference || payment.paymentReference || '-';
                const clientName = payment.clientName || extractPaymentClient(payment) || 'Client';
                const details = `Payment from ${clientName} (${paymentType}, Ref: ${reference})`;

                rows.push({
                    type: 'payment',
                    date: payment.paymentDate,
                    invoiceNo: invoicesText,
                    details,
                    debit: 0,
                    credit: creditAmount,
                    taxDeduction
                });
            });
        }

    rows.sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeA - timeB;
    });

    // Check if there are any rows to export
    if (rows.length === 0) {
        alert('No data to export. Please adjust your filters.');
        return;
    }
    console.log(`Exporting ${rows.length} rows to Excel`);

    // Build Excel data
    const excelData = [];
    
    // Header info
    excelData.push([`Connectia ERP - ${isBankLedger ? 'Bank' : (isVendorLedger ? 'Vendor' : 'Client')} Ledger Report`]);
    excelData.push([`${isBankLedger ? 'Ledger' : (isVendorLedger ? 'Vendor' : 'Client')}:`, isBankLedger ? 'Bank' : (isVendorLedger ? vendor : client)]);
    excelData.push(['Period:', monthDisplay]);
    excelData.push(['Generated:', new Date().toLocaleString()]);
    excelData.push([]);
    
    // Column headers
    excelData.push(['Date', 'Invoice No', 'Details', 'Debit', 'Credit', 'Tax Deduction', 'Balance']);
    
    // Data rows with running balance
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTax = 0;
    
    rows.forEach((row) => {
        const taxDeduction = row.taxDeduction || 0;
        runningBalance += isBankLedger
            ? (row.credit || 0) - (row.debit || 0) - taxDeduction
            : isVendorLedger
            ? (row.credit || 0) - (row.debit || 0) - taxDeduction
            : (row.debit || 0) - (row.credit || 0) - taxDeduction;
        totalDebit += row.debit || 0;
        totalCredit += row.credit || 0;
        totalTax += taxDeduction;
        
        excelData.push([
            formatDate(row.date),
            row.invoiceNo || '-',
            row.details,
            row.debit || 0,
            row.credit || 0,
            taxDeduction || 0,
            runningBalance
        ]);
    });
    
    // Total row
    excelData.push([]);
    excelData.push(['', '', 'Total:', totalDebit, totalCredit, totalTax, runningBalance]);
    
    console.log('Creating Excel workbook...');
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    console.log('Setting column widths...');
    // Set column widths
    ws['!cols'] = [
        { wch: 12 },  // Date
        { wch: 15 },  // Invoice No
        { wch: 40 },  // Details
        { wch: 15 },  // Debit
        { wch: 15 },  // Credit
        { wch: 15 },  // Tax Deduction
        { wch: 15 }   // Balance
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
    
    // Generate filename
    const filename = `ledger-${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    console.log('Saving file as:', filename);
    // Save file
    XLSX.writeFile(wb, filename);
    console.log('Excel file saved successfully');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Failed to export Excel file: ' + error.message);
    }
}

window.loadClientLedger = loadClientLedger;
window.loadLedger = loadLedger;
window.setActiveLedgerTab = setActiveLedgerTab;
window.filterClientLedger = filterClientLedger;
window.filterVendorLedger = filterVendorLedger;
window.filterBankLedger = filterBankLedger;
window.refreshVendorLedger = refreshVendorLedger;
window.refreshBankLedger = refreshBankLedger;
window.resetLedgerFilters = resetLedgerFilters;
window.exportLedgerPDF = exportLedgerPDF;
window.exportLedgerExcel = exportLedgerExcel;

// Client Ledger Module
async function loadClientLedger() {
    document.getElementById('header-actions').innerHTML = '';

    const contentEl = document.getElementById('content-body');
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Client Ledger</h3>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>Invoices & Payments Ledger</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <select id="ledger-client" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 240px;">
                        <option value="">All Clients</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        Month:
                        <input type="month" id="ledger-month" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <button class="btn btn-sm btn-secondary" onclick="resetLedgerFilters()">
                        <i class="fas fa-rotate-left"></i>
                        Reset
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="exportLedgerPDF()">
                        <i class="fas fa-download"></i>
                        Export PDF
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="ledger-summary" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px;"></div>

                <h4 style="margin: 0 0 10px;">Invoices</h4>
                <div id="ledger-invoices-table"></div>

                <h4 style="margin: 18px 0 10px;">Payments</h4>
                <div id="ledger-payments-table"></div>
            </div>
        </div>
    `;

    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('ledger-month').value = currentMonth;

    const { clients, invoices, payments } = await fetchLedgerData();
    window.ledgerState = {
        clients,
        invoices,
        payments
    };

    populateLedgerClientOptions(clients, invoices, payments);
    filterClientLedger();
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

function filterClientLedger() {
    const client = document.getElementById('ledger-client')?.value || '';
    const month = document.getElementById('ledger-month')?.value || '';
    const state = window.ledgerState || { invoices: [], payments: [] };

    const filteredInvoices = state.invoices.filter((invoice) => {
        const matchesClient = !client || invoice.clientName === client;
        const matchesMonth = !month || recordMatchesMonth(invoice.invoiceDate, invoice.month, month);
        return matchesClient && matchesMonth;
    });

    const filteredPayments = state.payments.filter((payment) => {
        const paymentClient = payment.clientName || extractPaymentClient(payment);
        const matchesClient = !client || paymentClient === client;
        const matchesMonth = !month || recordMatchesMonth(payment.paymentDate, payment.month, month);
        return matchesClient && matchesMonth;
    });

    displayLedgerSummary(filteredInvoices, filteredPayments);
    displayLedgerInvoicesTable(filteredInvoices);
    displayLedgerPaymentsTable(filteredPayments);
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
    const totalPaidOnInvoices = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const totalPending = invoices.reduce((sum, inv) => sum + getInvoicePending(inv), 0);
    const totalPayments = payments.reduce((sum, payment) => sum + (Number(payment.netAmount ?? payment.amount ?? payment.totalAmount) || 0), 0);

    summaryEl.innerHTML = `
        <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <small style="color: var(--gray-600);">Invoice Count</small>
            <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${invoices.length}</div>
        </div>
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">
            <small style="color: var(--gray-600);">Payment Count</small>
            <div style="font-size: 20px; font-weight: 700; color: #059669;">${payments.length}</div>
        </div>
        <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <small style="color: var(--gray-600);">Invoice Amount</small>
            <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${formatPKR(totalInvoices)}</div>
        </div>
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">
            <small style="color: var(--gray-600);">Payments Received</small>
            <div style="font-size: 20px; font-weight: 700; color: #059669;">${formatPKR(Math.max(totalPayments, totalPaidOnInvoices))}</div>
        </div>
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <small style="color: var(--gray-600);">Pending Amount</small>
            <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${formatPKR(totalPending)}</div>
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

function displayLedgerInvoicesTable(invoices) {
    const container = document.getElementById('ledger-invoices-table');
    if (!container) return;

    if (!invoices || invoices.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No invoices found for selected filters</p>';
        return;
    }

    let html = '<div style="max-height: 350px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 4px;"><div class="table-responsive"><table class="data-table" style="margin-bottom: 0;">';
    html += '<thead style="position: sticky; top: 0; background: var(--gray-50); z-index: 10;"><tr>';
    html += '<th>Invoice No</th>';
    html += '<th>Date</th>';
    html += '<th>Client</th>';
    html += '<th>Total</th>';
    html += '<th>Paid</th>';
    html += '<th>Pending</th>';
    html += '<th>Status</th>';
    html += '</tr></thead><tbody>';

    invoices.forEach((invoice) => {
        const pending = getInvoicePending(invoice);
        const paid = Number(invoice.paidAmount) || 0;

        html += '<tr>';
        html += `<td><strong>${invoice.invoiceNo || '-'}</strong></td>`;
        html += `<td>${formatDate(invoice.invoiceDate)}</td>`;
        html += `<td>${invoice.clientName || '-'}</td>`;
        html += `<td>${formatPKR(invoice.totalAmount || 0)}</td>`;
        html += `<td style="color: var(--success);">${formatPKR(paid)}</td>`;
        html += `<td style="color: ${pending > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">${formatPKR(pending)}</td>`;
        html += `<td>${invoice.status || (pending > 0 ? 'Pending' : 'Paid')}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';
    container.innerHTML = html;
}

function displayLedgerPaymentsTable(payments) {
    const container = document.getElementById('ledger-payments-table');
    if (!container) return;

    if (!payments || payments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No payments found for selected filters</p>';
        return;
    }

    let html = '<div style="max-height: 350px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: 4px;"><div class="table-responsive"><table class="data-table" style="margin-bottom: 0;">';
    html += '<thead style="position: sticky; top: 0; background: var(--gray-50); z-index: 10;"><tr>';
    html += '<th>Date</th>';
    html += '<th>Client</th>';
    html += '<th>Invoice(s)</th>';
    html += '<th>Amount</th>';
    html += '<th>Payment Type</th>';
    html += '<th>Reference / Cheque No</th>';
    html += '</tr></thead><tbody>';

    payments.forEach((payment) => {
        const amount = Number(payment.netAmount ?? payment.amount ?? payment.totalAmount) || 0;
        const invoicesText = getPaymentInvoiceText(payment);
        const paymentType = payment.method || 'N/A';
        const reference = payment.reference || payment.paymentReference || '-';
        const clientName = payment.clientName || extractPaymentClient(payment) || '-';

        html += '<tr>';
        html += `<td>${formatDate(payment.paymentDate)}</td>`;
        html += `<td>${clientName}</td>`;
        html += `<td>${invoicesText}</td>`;
        html += `<td style="color: var(--success); font-weight: 700;">${formatPKR(amount)}</td>`;
        html += `<td>${paymentType}</td>`;
        html += `<td>${reference}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div></div>';
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
    const monthEl = document.getElementById('ledger-month');

    if (clientEl) clientEl.value = '';
    if (monthEl) monthEl.value = new Date().toISOString().slice(0, 7);

    filterClientLedger();
}

function exportLedgerPDF() {
    const client = document.getElementById('ledger-client')?.value || 'All Clients';
    const month = document.getElementById('ledger-month')?.value || 'All Months';
    const timestamp = new Date().toLocaleString();

    let content = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #1976d2; text-align: center; margin-bottom: 5px;">Connectia IMS</h1>
            <h2 style="text-align: center; color: #333; margin-bottom: 20px;">Client Ledger Report</h2>
            
            <div style="background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px;">
                <p style="margin: 5px 0;"><strong>Client:</strong> ${client}</p>
                <p style="margin: 5px 0;"><strong>Month:</strong> ${month}</p>
                <p style="margin: 5px 0;"><strong>Generated:</strong> ${timestamp}</p>
            </div>
    `;

    // Summary Cards
    const summaryEl = document.getElementById('ledger-summary');
    if (summaryEl) {
        content += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #333;">Summary</h3>`;
        content += `<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px; font-size: 11px;">`;
        
        const summaryItems = summaryEl.querySelectorAll('div');
        summaryItems.forEach(item => {
            const small = item.querySelector('small')?.textContent || '';
            const value = item.querySelector('div')?.textContent || '';
            content += `<div style="background: #f9f9f9; padding: 10px; border-radius: 5px; border-left: 3px solid #2563eb;">
                <div style="font-size: 10px; color: #666; margin-bottom: 5px;">${small}</div>
                <div style="font-weight: 700; font-size: 12px;">${value}</div>
            </div>`;
        });
        content += `</div>`;
    }

    // Invoices Table
    const invoicesTableEl = document.getElementById('ledger-invoices-table');
    if (invoicesTableEl && invoicesTableEl.textContent.trim() !== 'No invoices found for selected filters') {
        content += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #333;">Invoices</h3>`;
        const invoiceTable = invoicesTableEl.querySelector('table');
        if (invoiceTable) {
            content += `<table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">`;
            content += invoiceTable.innerHTML;
            content += `</table>`;
        }
    }

    // Payments Table
    const paymentsTableEl = document.getElementById('ledger-payments-table');
    if (paymentsTableEl && paymentsTableEl.textContent.trim() !== 'No payments found for selected filters') {
        content += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #333;">Payments</h3>`;
        const paymentTable = paymentsTableEl.querySelector('table');
        if (paymentTable) {
            content += `<table style="width: 100%; border-collapse: collapse; font-size: 11px;">`;
            content += paymentTable.innerHTML;
            content += `</table>`;
        }
    }

    content += `
            <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px;">
                <p>This report was generated by Connectia IMS</p>
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

window.loadClientLedger = loadClientLedger;
window.filterClientLedger = filterClientLedger;
window.resetLedgerFilters = resetLedgerFilters;
window.exportLedgerPDF = exportLedgerPDF;

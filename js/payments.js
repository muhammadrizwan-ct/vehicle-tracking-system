// --- Supabase Integration ---
const supabase = window.supabaseClient;

// Fetch all payments from Supabase
async function fetchPaymentsFromSupabase() {
    const { data, error } = await supabase
        .from('payments')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data || [];
}

// Save (insert) a new payment to Supabase
async function savePaymentToSupabase(payment) {
    const { data, error } = await supabase
        .from('payments')
        .insert([payment]);
    if (error) {
        console.error('Supabase insert error:', error);
        return null;
    }
    return data && data[0];
}
// Payments Module
async function loadPayments(initialTab = 'client') {
    updatePaymentsHeaderActions(initialTab);
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div id="payment-tab-content" class="ledger-tab-content"></div>
    `;
    
    window.paymentActiveTab = initialTab;
    setActivePaymentTab(initialTab);
}

function updatePaymentsHeaderActions(tab) {
    const headerActionsEl = document.getElementById('header-actions');
    if (!headerActionsEl) return;
    const canEditData = Auth.hasDataActionPermission('edit');

    if (!canEditData) {
        headerActionsEl.innerHTML = '';
        return;
    }

    if (tab === 'client') {
        headerActionsEl.innerHTML = `
            <button class="btn btn-primary" onclick="showRecordPaymentModal()">
                <i class="fas fa-plus"></i>
                Record Payment
            </button>
        `;
        return;
    }

    if (tab === 'vendor') {
        headerActionsEl.innerHTML = `
            <button class="btn btn-primary" onclick="showRecordVendorPaymentModal()">
                <i class="fas fa-plus"></i>
                Record Vendor Payment
            </button>
        `;
        return;
    }

    if (tab === 'expenses') {
        const expenseSubTab = window.expenseSubTab || 'daily';
        const isSalary = expenseSubTab === 'salary';
        headerActionsEl.innerHTML = `
            <button class="btn btn-primary" onclick="${isSalary ? 'showRecordSalaryExpenseModal()' : 'showRecordDailyExpenseModal()'}">
                <i class="fas fa-plus"></i>
                ${isSalary ? 'Record Salary Expense' : 'Record Daily Expense'}
            </button>
        `;
        return;
    }

    headerActionsEl.innerHTML = '';
}

function setActivePaymentTab(tab) {
    window.paymentActiveTab = tab;

    updatePaymentsHeaderActions(tab);
    
    // Update tab UI
    const tabs = document.querySelectorAll('.ledger-tabs .ledger-tab[data-payment-tab]');
    tabs.forEach((button) => {
        button.classList.toggle('active', button.dataset.paymentTab === tab);
    });
    
    // Render content based on tab
    const contentEl = document.getElementById('payment-tab-content');
    
    if (tab === 'client') {
        renderClientPayments(contentEl);
    } else if (tab === 'vendor') {
        renderVendorPayments(contentEl);
    } else if (tab === 'expenses') {
        renderExpenses(contentEl);
    }
}

async function renderClientPayments(contentEl) {
    window.lastClientPaymentSearchTerm = '';

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Client Payment Transactions</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <select id="payment-client" onchange="filterPaymentTransactions()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 200px;">
                        <option value="">All Clients</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From Month:
                        <input type="month" id="payment-month-from" onchange="filterPaymentTransactions()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To Month:
                        <input type="month" id="payment-month-to" onchange="filterPaymentTransactions()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <select id="filter-method" onchange="filterPaymentTransactions()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">All Methods</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                    <input type="text" id="search-payments" placeholder="Search..." 
                        onkeyup="filterPaymentTransactions()" style="width: 200px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                </div>
            </div>
            <div class="card-body">
                <div id="payment-summary-cards" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                    <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                        <small style="color: var(--gray-600); font-size: 11px;">Total Collected</small>
                        <div style="font-size: 18px; font-weight: 700; color: #059669;">Loading...</div>
                    </div>
                    
                    <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                        <small style="color: var(--gray-600); font-size: 11px;">Pending Payments</small>
                        <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">Loading...</div>
                    </div>
                    
                    <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                        <small style="color: var(--gray-600); font-size: 11px;">Collection Rate</small>
                        <div style="font-size: 18px; font-weight: 700; color: #2563eb;">--</div>
                    </div>
                </div>
                
                <div id="payments-table-container"></div>
            </div>
        </div>
    `;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthFromEl = document.getElementById('payment-month-from');
    const monthToEl = document.getElementById('payment-month-to');
    if (monthFromEl) monthFromEl.value = currentMonth;
    if (monthToEl) monthToEl.value = currentMonth;

    const savedPayments = loadPaymentsFromStorage();
    if (savedPayments && savedPayments.length > 0) {
        window.allPayments = savedPayments;
        populatePaymentClientDropdown(savedPayments);
        displayPaymentsTable(savedPayments);
        await updatePaymentSummary(savedPayments);
    } else {
        window.allPayments = [];
        displayPaymentsTable([]);
        await updatePaymentSummary([]);
    }
    
    try {
        try {
            const payments = await Promise.race([
                API.getPayments(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            const mergedPayments = mergePaymentsWithStorage(payments);
            window.allPayments = mergedPayments;
            
            // Populate client dropdown
            populatePaymentClientDropdown(mergedPayments);
            
            displayPaymentsTable(mergedPayments);
            savePaymentsToStorage();
            
            // Load invoices and update summary
            await updatePaymentSummary(mergedPayments);
        } catch (e) {
            // Cached data has already been shown above.
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

function populatePaymentClientDropdown(payments) {
    const clientSelect = document.getElementById('payment-client');
    if (!clientSelect) return;
    
    // Get unique clients
    const clients = [...new Set(payments.map(p => p.clientName).filter(Boolean))].sort();
    
    // Clear existing options except "All Clients"
    clientSelect.innerHTML = '<option value="">All Clients</option>';
    
    // Add client options
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client;
        option.textContent = client;
        clientSelect.appendChild(option);
    });
}

function filterPaymentTransactions(skipAutoReset = false) {
    const clientFilter = document.getElementById('payment-client')?.value || '';
    const monthFrom = document.getElementById('payment-month-from')?.value || '';
    const monthTo = document.getElementById('payment-month-to')?.value || '';
    const methodFilter = document.getElementById('filter-method')?.value || '';
    const searchText = String(document.getElementById('search-payments')?.value || '').trim();
    const hadSearch = Boolean(window.lastClientPaymentSearchTerm);
    const clearedAfterSearch = !searchText && hadSearch;
    window.lastClientPaymentSearchTerm = searchText;

    if (clearedAfterSearch && !skipAutoReset) {
        resetPaymentFilters(true);
        return;
    }
    
    if (!window.allPayments) return;
    
    const filtered = window.allPayments.filter(payment => {
        // Client filter
        if (clientFilter && payment.clientName !== clientFilter) {
            return false;
        }
        
        // Month range filter
        if (!matchesMonthRangeFilterPayment(payment.paymentDate, monthFrom, monthTo)) {
            return false;
        }
        
        // Method filter
        if (methodFilter && payment.method !== methodFilter) {
            return false;
        }
        
        // Search filter
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            const matchesReference = payment.reference && payment.reference.toLowerCase().includes(searchLower);
            const matchesClient = payment.clientName && payment.clientName.toLowerCase().includes(searchLower);
            const matchesMethod = payment.method && payment.method.toLowerCase().includes(searchLower);
            const matchesInvoice = payment.invoiceNo && payment.invoiceNo.toLowerCase().includes(searchLower);
            const matchesLineItems = payment.lineItems && payment.lineItems.some(item => 
                item.invoiceNo.toLowerCase().includes(searchLower) ||
                item.clientName.toLowerCase().includes(searchLower)
            );
            
            if (!matchesReference && !matchesClient && !matchesMethod && !matchesInvoice && !matchesLineItems) {
                return false;
            }
        }
        
        return true;
    });
    
    displayPaymentsTable(filtered);
}

function matchesMonthRangeFilterPayment(dateValue, monthFrom, monthTo) {
    if (!monthFrom && !monthTo) return true;
    if (!dateValue) return false;
    
    // Extract YYYY-MM from date
    const recordMonth = String(dateValue).slice(0, 7);
    
    if (monthFrom && recordMonth < monthFrom) return false;
    if (monthTo && recordMonth > monthTo) return false;
    
    return true;
}

function resetPaymentFilters() {
    return resetPaymentFiltersWithAutoApply(true);
}

function resetPaymentFiltersWithAutoApply(triggerFilter = true) {
    const clientEl = document.getElementById('payment-client');
    const monthFromEl = document.getElementById('payment-month-from');
    const monthToEl = document.getElementById('payment-month-to');
    const methodEl = document.getElementById('filter-method');
    const searchEl = document.getElementById('search-payments');
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    if (clientEl) clientEl.value = '';
    if (monthFromEl) monthFromEl.value = currentMonth;
    if (monthToEl) monthToEl.value = currentMonth;
    if (methodEl) methodEl.value = '';
    if (searchEl) searchEl.value = '';
    
    if (triggerFilter) {
        filterPaymentTransactions(true);
    }
}

function renderVendorPayments(contentEl) {
    window.lastVendorPaymentSearchTerm = '';

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>Vendor Payment Transactions</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <select id="vendor-payment-vendor" onchange="filterVendorPayments()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; min-width: 200px;">
                        <option value="">All Vendors</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From Month:
                        <input type="month" id="vendor-payment-month-from" onchange="filterVendorPayments()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To Month:
                        <input type="month" id="vendor-payment-month-to" onchange="filterVendorPayments()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <select id="vendor-payment-method" onchange="filterVendorPayments()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">All Methods</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                    <input type="text" id="vendor-payment-search" placeholder="Search..." 
                        onkeyup="filterVendorPayments()" style="width: 200px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                </div>
            </div>
            <div class="card-body">
                <div id="vendor-payments-table-container"></div>
            </div>
        </div>
    `;

    const vendors = loadVendorsFromStorage() || [];
    window.allVendors = vendors;
    if (typeof populateVendorDropdown === 'function') {
        populateVendorDropdown(vendors);
    }
    if (typeof displayVendorsTable === 'function' && window.clientActiveTab === 'vendors') {
        displayVendorsTable(vendors);
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthFromEl = document.getElementById('vendor-payment-month-from');
    const monthToEl = document.getElementById('vendor-payment-month-to');
    if (monthFromEl) monthFromEl.value = currentMonth;
    if (monthToEl) monthToEl.value = currentMonth;

    const vendorPayments = loadVendorPaymentsFromStorage() || [];
    window.allVendorPayments = vendorPayments;
    displayVendorPaymentsTable(vendorPayments);
}

function renderExpenses(contentEl) {
    contentEl.innerHTML = `
        <div class="ledger-tabs" style="margin-bottom: 16px;">
            <button class="ledger-tab" data-expense-tab="salary" onclick="setActiveExpenseSubTab('salary')">
                <i class="fas fa-money-bill-wave"></i> Salary Expenses
            </button>
            <button class="ledger-tab active" data-expense-tab="daily" onclick="setActiveExpenseSubTab('daily')">
                <i class="fas fa-calendar-day"></i> Daily Expenses
            </button>
        </div>
        <div id="expense-subtab-content"></div>
    `;

    window.expenseSubTab = window.expenseSubTab || 'daily';
    setActiveExpenseSubTab(window.expenseSubTab);
}

function setActiveExpenseSubTab(tab) {
    window.expenseSubTab = tab;
    updatePaymentsHeaderActions('expenses');
    const tabs = document.querySelectorAll('[data-expense-tab]');
    tabs.forEach((button) => {
        button.classList.toggle('active', button.dataset.expenseTab === tab);
    });

    const subTabContent = document.getElementById('expense-subtab-content');
    if (!subTabContent) return;

    if (tab === 'daily') {
        renderDailyExpensesTab(subTabContent);
        return;
    }

    renderSalaryExpensesTab(subTabContent);
}

function getSalaryExpensesStorageKey() {
    return (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.SALARY_EXPENSES) ? STORAGE_KEYS.SALARY_EXPENSES : 'vts_salary_expenses';
}

function getDailyExpensesStorageKey() {
    return (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.DAILY_EXPENSES) ? STORAGE_KEYS.DAILY_EXPENSES : 'vts_daily_expenses';
}

function loadSalaryExpensesFromStorage() {
    try {
        const saved = localStorage.getItem(getSalaryExpensesStorageKey());
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load salary expenses from localStorage:', error);
        return [];
    }
}

function saveSalaryExpensesToStorage() {
    try {
        localStorage.setItem(getSalaryExpensesStorageKey(), JSON.stringify(window.allSalaryExpenses || []));
    } catch (error) {
        console.error('Failed to save salary expenses to localStorage:', error);
    }
}

function loadDailyExpensesFromStorage() {
    try {
        const saved = localStorage.getItem(getDailyExpensesStorageKey());
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load daily expenses from localStorage:', error);
        return [];
    }
}

function saveDailyExpensesToStorage() {
    try {
        localStorage.setItem(getDailyExpensesStorageKey(), JSON.stringify(window.allDailyExpenses || []));
    } catch (error) {
        console.error('Failed to save daily expenses to localStorage:', error);
    }
}

function getExpenseNotes(expense) {
    if (!expense) return '';
    const raw = expense.notes ?? expense.note ?? expense.remarks ?? expense.description ?? '';
    return String(raw).trim();
}

function renderSalaryExpensesTab(contentEl) {
    const expenses = loadSalaryExpensesFromStorage() || [];
    window.allSalaryExpenses = expenses;

    const totalNet = expenses.reduce((sum, item) => sum + (Number(item.netPayable) || 0), 0);
    const totalTax = expenses.reduce((sum, item) => sum + (Number(item.taxDeduction) || 0), 0);
    const totalGross = expenses.reduce((sum, item) => sum + (Number(item.grossSalary) || 0), 0);

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 style="margin: 0;">Salary Expenses</h3>
            </div>
            <div class="card-body">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
                    <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                        <small style="color: var(--gray-600); font-size: 11px;">Total Gross Salary</small>
                        <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(totalGross)}</div>
                    </div>
                    <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                        <small style="color: var(--gray-600); font-size: 11px;">Total Tax Deduction</small>
                        <div style="font-size: 18px; font-weight: 700; color: #b45309;">${formatPKR(totalTax)}</div>
                    </div>
                    <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                        <small style="color: var(--gray-600); font-size: 11px;">Total Net Payable</small>
                        <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(totalNet)}</div>
                    </div>
                </div>
                <div id="salary-expenses-table-container"></div>
            </div>
        </div>
    `;

    displaySalaryExpensesTable(expenses);
}

function displaySalaryExpensesTable(expenses) {
    const container = document.getElementById('salary-expenses-table-container');
    const canEditData = Auth.hasDataActionPermission('edit');
    const canDeleteData = Auth.hasDataActionPermission('delete');
    if (!container) return;

    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-500); border: 1px dashed var(--gray-300); border-radius: 6px;">
                No salary expenses recorded yet
            </div>
        `;
        return;
    }

    let totalNet = 0;
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th style="width: 12%;">Date</th>';
    html += '<th style="width: 18%;">Employee</th>';
    html += '<th style="width: 14%; text-align: right;">Gross Salary</th>';
    html += '<th style="width: 12%; text-align: right;">Tax Deduction</th>';
    html += '<th style="width: 14%; text-align: right;">Net Payable</th>';
    html += '<th style="width: 14%;">Actions</th>';
    html += '</tr></thead><tbody>';

    expenses.forEach((expense) => {
        totalNet += Number(expense.netPayable) || 0;
        html += '<tr>';
        html += `<td>${expense.expenseDate || '-'}</td>`;
        html += `<td>${expense.employeeName || '-'}</td>`;
        html += `<td style="text-align: right;">${formatPKR(Number(expense.grossSalary) || 0)}</td>`;
        html += `<td style="text-align: right; color: var(--danger);">- ${formatPKR(Number(expense.taxDeduction) || 0)}</td>`;
        html += `<td style="text-align: right; font-weight: 700; color: var(--success);">${formatPKR(Number(expense.netPayable) || 0)}</td>`;
        html += '<td>';
        html += `<div style="display: flex; gap: 6px; white-space: nowrap;">`;
        html += `<button class="btn btn-sm btn-secondary" onclick="showSalaryExpenseDetailsModal(${expense.id})" title="View Details" style="width: 28px; height: 28px; padding: 0;"><i class="fas fa-eye"></i></button>`;
        if (canEditData) {
            html += `<button class="btn btn-sm btn-primary" onclick="showEditSalaryExpenseModal(${expense.id})" title="Edit Expense" style="width: 28px; height: 28px; padding: 0;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            html += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteSalaryExpense(${expense.id})" title="Delete Expense"><i class="fas fa-trash"></i></button>`;
        }
        html += '</div>';
        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot><tr style="background: var(--gray-100); font-weight: 700;">';
    html += '<td colspan="4" style="text-align: right;">Total Salary Net Payable:</td>';
    html += `<td style="text-align: right;">${formatPKR(totalNet)}</td>`;
    html += '<td></td>';
    html += '</tr></tfoot>';
    html += '</table></div>';

    container.innerHTML = html;
}

function showRecordSalaryExpenseModal(existingExpense = null) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const isEditMode = !!existingExpense;
    const today = new Date().toISOString().split('T')[0];

    const basicSalary = Number(existingExpense?.basicSalary) || 0;
    const houseAllowance = Number(existingExpense?.houseAllowance) || 0;
    const transportAllowance = Number(existingExpense?.transportAllowance) || 0;
    const otherAllowance = Number(existingExpense?.otherAllowance) || 0;
    const taxDeduction = Number(existingExpense?.taxDeduction) || 0;

    const modal = document.createElement('div');
    modal.id = 'record-salary-expense-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 760px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">${isEditMode ? 'Edit Expense' : 'Record Expense'}</h2>
                <button onclick="document.getElementById('record-salary-expense-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <form onsubmit="saveSalaryExpense(event)">
                <input type="hidden" id="salary-expense-id" value="${existingExpense?.id || ''}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Employee Name *</label>
                        <input type="text" id="expense-employee-name" required placeholder="Enter employee name" value="${existingExpense?.employeeName || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Expense Date</label>
                        <input type="date" id="expense-date" value="${existingExpense?.expenseDate || today}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div style="background: var(--gray-100); padding: 16px; border-radius: 6px; margin-bottom: 16px;">
                    <h3 style="margin: 0 0 14px 0; font-size: 16px;">Employee Salary Structure</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Basic Salary *</label>
                            <input type="number" id="salary-basic" min="0" step="0.01" value="${basicSalary || ''}" oninput="calculateExpenseTotals()" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">House Allowance</label>
                            <input type="number" id="salary-house" min="0" step="0.01" value="${houseAllowance || ''}" oninput="calculateExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Transport Allowance</label>
                            <input type="number" id="salary-transport" min="0" step="0.01" value="${transportAllowance || ''}" oninput="calculateExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Other Allowance</label>
                            <input type="number" id="salary-other" min="0" step="0.01" value="${otherAllowance || ''}" oninput="calculateExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Deduction</label>
                            <input type="number" id="salary-tax-deduction" min="0" step="0.01" value="${taxDeduction || ''}" oninput="calculateExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                    </div>
                </div>

                <div style="border: 1px solid var(--gray-200); border-radius: 6px; padding: 16px; margin-bottom: 16px; background: var(--gray-50);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--gray-600);">Gross Salary:</span>
                        <span style="font-weight: 700;" id="expense-display-gross">${formatPKR(0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--gray-600);">Tax Deduction:</span>
                        <span style="font-weight: 700; color: var(--danger);" id="expense-display-tax">- ${formatPKR(0)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--gray-300);">
                        <span style="font-weight: 600; color: var(--gray-700);">Net Payable:</span>
                        <span style="font-weight: 700; font-size: 20px; color: var(--success);" id="expense-display-net">${formatPKR(0)}</span>
                    </div>
                </div>

                <div style="margin-bottom: 18px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                    <textarea id="salary-expense-notes" rows="3" placeholder="Optional notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; resize: vertical;">${existingExpense?.notes || ''}</textarea>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">${isEditMode ? 'Update Salary Expense' : 'Save Salary Expense'}</button>
                    <button type="button" onclick="document.getElementById('record-salary-expense-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    calculateExpenseTotals();
}

function calculateExpenseTotals() {
    const basicSalary = parseFloat(document.getElementById('salary-basic')?.value) || 0;
    const houseAllowance = parseFloat(document.getElementById('salary-house')?.value) || 0;
    const transportAllowance = parseFloat(document.getElementById('salary-transport')?.value) || 0;
    const otherAllowance = parseFloat(document.getElementById('salary-other')?.value) || 0;
    const taxDeduction = parseFloat(document.getElementById('salary-tax-deduction')?.value) || 0;

    const grossSalary = basicSalary + houseAllowance + transportAllowance + otherAllowance;
    const netPayable = Math.max(grossSalary - taxDeduction, 0);

    const grossEl = document.getElementById('expense-display-gross');
    const taxEl = document.getElementById('expense-display-tax');
    const netEl = document.getElementById('expense-display-net');

    if (grossEl) grossEl.textContent = formatPKR(grossSalary);
    if (taxEl) taxEl.textContent = '- ' + formatPKR(taxDeduction);
    if (netEl) netEl.textContent = formatPKR(netPayable);

    return { grossSalary, taxDeduction, netPayable, basicSalary, houseAllowance, transportAllowance, otherAllowance };
}

function saveSalaryExpense(event) {
    event.preventDefault();

    const expenseId = document.getElementById('salary-expense-id')?.value;
    const employeeName = document.getElementById('expense-employee-name')?.value.trim();
    const expenseDate = document.getElementById('expense-date')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('salary-expense-notes')?.value.trim() || '';
    const totals = calculateExpenseTotals();

    if (!employeeName) {
        alert('Please enter employee name');
        return;
    }

    if (totals.taxDeduction > totals.grossSalary) {
        alert('Tax deduction cannot be greater than gross salary');
        return;
    }

    if (!window.allSalaryExpenses) {
        window.allSalaryExpenses = [];
    }

    const payload = {
        employeeName,
        expenseDate,
        basicSalary: totals.basicSalary,
        houseAllowance: totals.houseAllowance,
        transportAllowance: totals.transportAllowance,
        otherAllowance: totals.otherAllowance,
        grossSalary: totals.grossSalary,
        taxDeduction: totals.taxDeduction,
        netPayable: totals.netPayable,
        notes
    };

    if (expenseId) {
        const index = window.allSalaryExpenses.findIndex((item) => String(item.id) === String(expenseId));
        if (index === -1) {
            showNotification('Salary expense record not found', 'error');
            return;
        }
        window.allSalaryExpenses[index] = {
            ...window.allSalaryExpenses[index],
            ...payload,
            id: window.allSalaryExpenses[index].id
        };
    } else {
        const newExpense = {
            id: Date.now(),
            ...payload
        };
        window.allSalaryExpenses.unshift(newExpense);
    }

    saveSalaryExpensesToStorage();

    const modal = document.getElementById('record-salary-expense-modal');
    if (modal) {
        modal.remove();
    }

    if (window.paymentActiveTab === 'expenses') {
        const contentEl = document.getElementById('expense-subtab-content');
        if (contentEl) {
            renderSalaryExpensesTab(contentEl);
        }
    }

    showNotification(`Salary expense for ${employeeName} ${expenseId ? 'updated' : 'saved'} successfully`, 'success');
}

function showEditSalaryExpenseModal(expenseId) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const expenses = loadSalaryExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);

    if (!expense) {
        showNotification('Salary expense record not found', 'error');
        return;
    }

    showRecordSalaryExpenseModal(expense);
}

function showSalaryExpenseDetailsModal(expenseId) {
    const expenses = loadSalaryExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);

    if (!expense) {
        showNotification('Salary expense record not found', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'salary-expense-details-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 760px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--gray-200);">
                <div>
                    <h2 style="margin: 0;">Salary Expense Details</h2>
                    <p style="margin: 4px 0 0 0; color: var(--gray-600);">${expense.employeeName || '-'} • ${expense.expenseDate || '-'}</p>
                </div>
                <button onclick="document.getElementById('salary-expense-details-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <div style="background: var(--gray-100); padding: 14px; border-radius: 6px; margin-bottom: 14px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px;">Employee Salary Structure</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between;"><span>Basic Salary</span><strong>${formatPKR(Number(expense.basicSalary) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>House Allowance</span><strong>${formatPKR(Number(expense.houseAllowance) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Transport Allowance</span><strong>${formatPKR(Number(expense.transportAllowance) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Other Allowance</span><strong>${formatPKR(Number(expense.otherAllowance) || 0)}</strong></div>
                    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; border-top: 1px solid var(--gray-300); padding-top: 8px;"><span><strong>Gross Salary</strong></span><strong>${formatPKR(Number(expense.grossSalary) || 0)}</strong></div>
                    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; color: var(--danger);"><span>Tax Deduction</span><strong>- ${formatPKR(Number(expense.taxDeduction) || 0)}</strong></div>
                </div>
            </div>

            <div style="border: 1px solid var(--gray-200); border-radius: 6px; padding: 14px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 15px;">
                    <span style="font-weight: 600; color: var(--gray-700);">Net Payable</span>
                    <span style="font-weight: 700; color: var(--success);">${formatPKR(Number(expense.netPayable) || 0)}</span>
                </div>
            </div>

            ${expense.notes ? `
                <div style="margin-bottom: 14px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px; color: var(--gray-700);">Notes</h4>
                    <p style="margin: 0; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; background: var(--gray-50);">${expense.notes}</p>
                </div>
            ` : ''}

            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="printSalaryExpenseDetails(${expense.id})" style="flex: 1;">Print</button>
                <button class="btn btn-primary" onclick="document.getElementById('salary-expense-details-modal').remove()" style="flex: 1;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function printSalaryExpenseDetails(expenseId) {
    const expenses = loadSalaryExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);
    const companyName = (typeof CONFIG !== 'undefined' && CONFIG.COMPANY_NAME) ? CONFIG.COMPANY_NAME : 'Company';
    const generatedAt = new Date().toLocaleString();

    if (!expense) {
        showNotification('Expense record not found', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Unable to open print window. Please allow popups.', 'warning');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Salary Expense Details - ${expense.employeeName || ''}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
                h1 { margin: 0 0 6px 0; }
                .muted { color: #6b7280; margin-bottom: 20px; }
                .company { margin-bottom: 4px; font-size: 18px; font-weight: 700; }
                .section { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin-bottom: 12px; }
                .section h3 { margin: 0 0 10px 0; font-size: 16px; }
                .row { display: flex; justify-content: space-between; margin: 6px 0; }
                .row strong { font-weight: 700; }
                .total { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px; }
            </style>
        </head>
        <body>
            <div class="company">${companyName}</div>
            <h1>Salary Expense Details</h1>
            <div class="muted">${expense.employeeName || '-'} • ${expense.expenseDate || '-'} • Generated: ${generatedAt}</div>

            <div class="section">
                <h3>Employee Salary Structure</h3>
                <div class="row"><span>Basic Salary</span><strong>${formatPKR(Number(expense.basicSalary) || 0)}</strong></div>
                <div class="row"><span>House Allowance</span><strong>${formatPKR(Number(expense.houseAllowance) || 0)}</strong></div>
                <div class="row"><span>Transport Allowance</span><strong>${formatPKR(Number(expense.transportAllowance) || 0)}</strong></div>
                <div class="row"><span>Other Allowance</span><strong>${formatPKR(Number(expense.otherAllowance) || 0)}</strong></div>
                <div class="row total"><span><strong>Gross Salary</strong></span><strong>${formatPKR(Number(expense.grossSalary) || 0)}</strong></div>
                <div class="row"><span>Tax Deduction</span><strong>- ${formatPKR(Number(expense.taxDeduction) || 0)}</strong></div>
            </div>

            <div class="section">
                <div class="row"><span><strong>Net Payable</strong></span><strong>${formatPKR(Number(expense.netPayable) || 0)}</strong></div>
            </div>

            ${expense.notes ? `<div class="section"><h3>Notes</h3><p style="margin: 0;">${expense.notes}</p></div>` : ''}
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function deleteSalaryExpense(expenseId) {
    if (!ensureDataActionPermission('delete')) {
        return;
    }

    const expenses = loadSalaryExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);

    if (!expense) {
        showNotification('Salary expense record not found', 'error');
        return;
    }

    const confirmed = confirm(`Delete salary expense for ${expense.employeeName}? This cannot be undone.`);
    if (!confirmed) return;

    window.allSalaryExpenses = expenses.filter((item) => item.id !== expenseId);
    saveSalaryExpensesToStorage();

    const contentEl = document.getElementById('expense-subtab-content');
    if (window.paymentActiveTab === 'expenses' && contentEl) {
        renderSalaryExpensesTab(contentEl);
    }

    showNotification('Salary expense deleted successfully', 'success');
}

function renderDailyExpensesTab(contentEl) {
    const expenses = loadDailyExpensesFromStorage() || [];
    window.allDailyExpenses = expenses;

    const totalAmount = expenses.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0);

    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 style="margin: 0;">Daily Expenses</h3>
            </div>
            <div class="card-body">
                <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb; margin-bottom: 20px; max-width: 320px;">
                    <small style="color: var(--gray-600); font-size: 11px;">Total Daily Expenses</small>
                    <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${formatPKR(totalAmount)}</div>
                </div>
                <div id="daily-expenses-table-container"></div>
            </div>
        </div>
    `;

    displayDailyExpensesTable(expenses);
}

function displayDailyExpensesTable(expenses) {
    const container = document.getElementById('daily-expenses-table-container');
    const canEditData = Auth.hasDataActionPermission('edit');
    const canDeleteData = Auth.hasDataActionPermission('delete');
    if (!container) return;

    if (!expenses || expenses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-500); border: 1px dashed var(--gray-300); border-radius: 6px;">
                No daily expenses recorded yet
            </div>
        `;
        return;
    }

    let total = 0;
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th style="width: 12%;">Date</th>';
    html += '<th style="width: 18%;">Employee</th>';
    html += '<th style="width: 12%; text-align: right;">Working Days</th>';
    html += '<th style="width: 12%; text-align: right;">Travel / Day</th>';
    html += '<th style="width: 12%; text-align: right;">Meal / Day</th>';
    html += '<th style="width: 12%; text-align: right;">Fuel / Day</th>';
    html += '<th style="width: 12%; text-align: right;">Total</th>';
    html += '<th style="width: 10%;">Actions</th>';
    html += '</tr></thead><tbody>';

    expenses.forEach((expense) => {
        const rowTotal = Number(expense.totalAmount) || 0;
        total += rowTotal;
        html += '<tr>';
        html += `<td>${expense.expenseDate || '-'}</td>`;
        html += `<td>${expense.employeeName || '-'}</td>`;
        html += `<td style="text-align: right;">${Number(expense.workingDays) || 0}</td>`;
        html += `<td style="text-align: right;">${formatPKR(Number(expense.travelPerDay) || 0)}</td>`;
        html += `<td style="text-align: right;">${formatPKR(Number(expense.mealPerDay) || 0)}</td>`;
        html += `<td style="text-align: right;">${formatPKR(Number(expense.fuelPerDay) || 0)}</td>`;
        html += `<td style="text-align: right; font-weight: 700; color: #2563eb;">${formatPKR(rowTotal)}</td>`;
        html += '<td>';
        html += `<div style="display: flex; gap: 6px; white-space: nowrap;">`;
        html += `<button class="btn btn-sm btn-secondary" onclick="showDailyExpenseDetailsModal(${expense.id})" title="View Details" style="width: 28px; height: 28px; padding: 0;"><i class="fas fa-eye"></i></button>`;
        if (canEditData) {
            html += `<button class="btn btn-sm btn-primary" onclick="showEditDailyExpenseModal(${expense.id})" title="Edit Expense" style="width: 28px; height: 28px; padding: 0;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            html += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteDailyExpense(${expense.id})" title="Delete Expense"><i class="fas fa-trash"></i></button>`;
        }
        html += '</div>';
        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot><tr style="background: var(--gray-100); font-weight: 700;">';
    html += '<td colspan="6" style="text-align: right;">Total Daily Expenses:</td>';
    html += `<td style="text-align: right;">${formatPKR(total)}</td>`;
    html += '<td></td>';
    html += '</tr></tfoot>';
    html += '</table></div>';

    container.innerHTML = html;
}

function showRecordDailyExpenseModal(existingExpense = null) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const isEditMode = !!existingExpense;
    const today = new Date().toISOString().split('T')[0];
    const modal = document.createElement('div');
    modal.id = 'record-daily-expense-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 680px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">${isEditMode ? 'Edit Daily Expense' : 'Record Daily Expense'}</h2>
                <button onclick="document.getElementById('record-daily-expense-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <form onsubmit="saveDailyExpense(event)">
                <input type="hidden" id="daily-expense-id" value="${existingExpense?.id || ''}">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Employee Name *</label>
                        <input type="text" id="daily-expense-employee-name" required value="${existingExpense?.employeeName || ''}" placeholder="Enter employee name" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Expense Date</label>
                        <input type="date" id="daily-expense-date" value="${existingExpense?.expenseDate || today}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Working Days</label>
                        <input type="number" id="daily-expense-working-days" min="0" step="1" value="${Number(existingExpense?.workingDays) || ''}" oninput="calculateDailyExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Travel / Day</label>
                        <input type="number" id="daily-expense-travel" min="0" step="0.01" value="${Number(existingExpense?.travelPerDay) || ''}" oninput="calculateDailyExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Meal / Day</label>
                        <input type="number" id="daily-expense-meal" min="0" step="0.01" value="${Number(existingExpense?.mealPerDay) || ''}" oninput="calculateDailyExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Fuel / Day</label>
                        <input type="number" id="daily-expense-fuel" min="0" step="0.01" value="${Number(existingExpense?.fuelPerDay) || ''}" oninput="calculateDailyExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Other / Day</label>
                        <input type="number" id="daily-expense-other" min="0" step="0.01" value="${Number(existingExpense?.otherPerDay) || ''}" oninput="calculateDailyExpenseTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div style="border: 1px solid var(--gray-200); border-radius: 6px; padding: 14px; margin-bottom: 14px; background: var(--gray-50);">
                    <div style="display: flex; justify-content: space-between; font-size: 15px;">
                        <span style="font-weight: 600; color: var(--gray-700);">Total Daily Expense</span>
                        <span style="font-weight: 700; color: #2563eb;" id="daily-expense-total-display">${formatPKR(0)}</span>
                    </div>
                </div>

                <div style="margin-bottom: 18px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                    <textarea id="daily-expense-notes" rows="3" placeholder="Optional notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; resize: vertical;">${getExpenseNotes(existingExpense)}</textarea>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">${isEditMode ? 'Update Daily Expense' : 'Save Daily Expense'}</button>
                    <button type="button" onclick="document.getElementById('record-daily-expense-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    calculateDailyExpenseTotals();
}

function calculateDailyExpenseTotals() {
    const workingDays = parseFloat(document.getElementById('daily-expense-working-days')?.value) || 0;
    const travelPerDay = parseFloat(document.getElementById('daily-expense-travel')?.value) || 0;
    const mealPerDay = parseFloat(document.getElementById('daily-expense-meal')?.value) || 0;
    const fuelPerDay = parseFloat(document.getElementById('daily-expense-fuel')?.value) || 0;
    const otherPerDay = parseFloat(document.getElementById('daily-expense-other')?.value) || 0;

    const totalAmount = (travelPerDay + mealPerDay + fuelPerDay + otherPerDay) * workingDays;
    const totalDisplay = document.getElementById('daily-expense-total-display');
    if (totalDisplay) totalDisplay.textContent = formatPKR(totalAmount);

    return { workingDays, travelPerDay, mealPerDay, fuelPerDay, otherPerDay, totalAmount };
}

function saveDailyExpense(event) {
    event.preventDefault();

    const expenseId = document.getElementById('daily-expense-id')?.value;
    const employeeName = document.getElementById('daily-expense-employee-name')?.value.trim();
    const expenseDate = document.getElementById('daily-expense-date')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('daily-expense-notes')?.value.trim() || '';
    const totals = calculateDailyExpenseTotals();

    if (!employeeName) {
        alert('Please enter employee name');
        return;
    }

    if (!window.allDailyExpenses) {
        window.allDailyExpenses = [];
    }

    const payload = {
        employeeName,
        expenseDate,
        workingDays: totals.workingDays,
        travelPerDay: totals.travelPerDay,
        mealPerDay: totals.mealPerDay,
        fuelPerDay: totals.fuelPerDay,
        otherPerDay: totals.otherPerDay,
        totalAmount: totals.totalAmount,
        notes,
        note: notes
    };

    if (expenseId) {
        const index = window.allDailyExpenses.findIndex((item) => String(item.id) === String(expenseId));
        if (index === -1) {
            showNotification('Daily expense record not found', 'error');
            return;
        }
        window.allDailyExpenses[index] = {
            ...window.allDailyExpenses[index],
            ...payload,
            id: window.allDailyExpenses[index].id
        };
    } else {
        window.allDailyExpenses.unshift({
            id: Date.now(),
            ...payload
        });
    }

    saveDailyExpensesToStorage();

    const modal = document.getElementById('record-daily-expense-modal');
    if (modal) modal.remove();

    const contentEl = document.getElementById('expense-subtab-content');
    if (window.paymentActiveTab === 'expenses' && contentEl) {
        renderDailyExpensesTab(contentEl);
    }

    showNotification(`Daily expense for ${employeeName} ${expenseId ? 'updated' : 'saved'} successfully`, 'success');
}

function showEditDailyExpenseModal(expenseId) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const expenses = loadDailyExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);
    if (!expense) {
        showNotification('Daily expense record not found', 'error');
        return;
    }
    showRecordDailyExpenseModal(expense);
}

function deleteDailyExpense(expenseId) {
    if (!ensureDataActionPermission('delete')) {
        return;
    }

    const expenses = loadDailyExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);
    if (!expense) {
        showNotification('Daily expense record not found', 'error');
        return;
    }

    const confirmed = confirm(`Delete daily expense for ${expense.employeeName}? This cannot be undone.`);
    if (!confirmed) return;

    window.allDailyExpenses = expenses.filter((item) => item.id !== expenseId);
    saveDailyExpensesToStorage();

    const contentEl = document.getElementById('expense-subtab-content');
    if (window.paymentActiveTab === 'expenses' && contentEl) {
        renderDailyExpensesTab(contentEl);
    }

    showNotification('Daily expense deleted successfully', 'success');
}

function showDailyExpenseDetailsModal(expenseId) {
    const expenses = loadDailyExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);

    if (!expense) {
        showNotification('Daily expense record not found', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'daily-expense-details-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 700px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; max-height: 92vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--gray-200);">
                <div>
                    <h2 style="margin: 0;">Daily Expense Details</h2>
                    <p style="margin: 4px 0 0 0; color: var(--gray-600);">${expense.employeeName || '-'} • ${expense.expenseDate || '-'}</p>
                </div>
                <button onclick="document.getElementById('daily-expense-details-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <div style="background: var(--gray-100); padding: 14px; border-radius: 6px; margin-bottom: 14px;">
                <h3 style="margin: 0 0 10px 0; font-size: 15px;">Daily Expenses Structure</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
                    <div style="display: flex; justify-content: space-between;"><span>Working Days</span><strong>${Number(expense.workingDays) || 0}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Travel / Day</span><strong>${formatPKR(Number(expense.travelPerDay) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Meal / Day</span><strong>${formatPKR(Number(expense.mealPerDay) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Fuel / Day</span><strong>${formatPKR(Number(expense.fuelPerDay) || 0)}</strong></div>
                    <div style="display: flex; justify-content: space-between;"><span>Other / Day</span><strong>${formatPKR(Number(expense.otherPerDay) || 0)}</strong></div>
                    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; border-top: 1px solid var(--gray-300); padding-top: 8px; color: #2563eb;"><span><strong>Total Daily Expenses</strong></span><strong>${formatPKR(Number(expense.totalAmount) || 0)}</strong></div>
                </div>
            </div>

            ${getExpenseNotes(expense) ? `
                <div style="margin-bottom: 14px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 14px; color: var(--gray-700);">Notes</h4>
                    <p style="margin: 0; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; background: var(--gray-50);">${getExpenseNotes(expense)}</p>
                </div>
            ` : ''}

            <div style="display: flex; gap: 10px;">
                <button class="btn btn-secondary" onclick="printDailyExpenseDetails(${expense.id})" style="flex: 1;">Print</button>
                <button class="btn btn-primary" onclick="document.getElementById('daily-expense-details-modal').remove()" style="flex: 1;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function printDailyExpenseDetails(expenseId) {
    const expenses = loadDailyExpensesFromStorage() || [];
    const expense = expenses.find((item) => item.id === expenseId);
    const companyName = (typeof CONFIG !== 'undefined' && CONFIG.COMPANY_NAME) ? CONFIG.COMPANY_NAME : 'Company';
    const generatedAt = new Date().toLocaleString();

    if (!expense) {
        showNotification('Daily expense record not found', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showNotification('Unable to open print window. Please allow popups.', 'warning');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Daily Expense Details - ${expense.employeeName || ''}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
                h1 { margin: 0 0 6px 0; }
                .muted { color: #6b7280; margin-bottom: 20px; }
                .company { margin-bottom: 4px; font-size: 18px; font-weight: 700; }
                .section { border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; margin-bottom: 12px; }
                .section h3 { margin: 0 0 10px 0; font-size: 16px; }
                .row { display: flex; justify-content: space-between; margin: 6px 0; }
                .row strong { font-weight: 700; }
                .total { border-top: 1px solid #d1d5db; padding-top: 8px; margin-top: 8px; }
            </style>
        </head>
        <body>
            <div class="company">${companyName}</div>
            <h1>Daily Expense Details</h1>
            <div class="muted">${expense.employeeName || '-'} • ${expense.expenseDate || '-'} • Generated: ${generatedAt}</div>

            <div class="section">
                <h3>Daily Expenses Structure</h3>
                <div class="row"><span>Working Days</span><strong>${Number(expense.workingDays) || 0}</strong></div>
                <div class="row"><span>Travel / Day</span><strong>${formatPKR(Number(expense.travelPerDay) || 0)}</strong></div>
                <div class="row"><span>Meal / Day</span><strong>${formatPKR(Number(expense.mealPerDay) || 0)}</strong></div>
                <div class="row"><span>Fuel / Day</span><strong>${formatPKR(Number(expense.fuelPerDay) || 0)}</strong></div>
                <div class="row"><span>Other / Day</span><strong>${formatPKR(Number(expense.otherPerDay) || 0)}</strong></div>
                <div class="row total"><span><strong>Total Daily Expenses</strong></span><strong>${formatPKR(Number(expense.totalAmount) || 0)}</strong></div>
            </div>

            ${getExpenseNotes(expense) ? `<div class="section"><h3>Notes</h3><p style="margin: 0;">${getExpenseNotes(expense)}</p></div>` : ''}
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

async function refreshClientPayments() {
    try {
        // Show loading state
        const summaryContainer = document.getElementById('payment-summary-cards');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                    <small style="color: var(--gray-600); font-size: 11px;">Total Collected</small>
                    <div style="font-size: 18px; font-weight: 700; color: #059669;">Loading...</div>
                </div>
                
                <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                    <small style="color: var(--gray-600); font-size: 11px;">Pending Payments</small>
                    <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">Loading...</div>
                </div>
                
                <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                    <small style="color: var(--gray-600); font-size: 11px;">Collection Rate</small>
                    <div style="font-size: 18px; font-weight: 700; color: #2563eb;">--</div>
                </div>
            `;
        }
        
        // Fetch fresh payment data
        const payments = await Promise.race([
            API.getPayments(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
        
        const mergedPayments = mergePaymentsWithStorage(payments);
        window.allPayments = mergedPayments;
        
        // Populate client dropdown
        populatePaymentClientDropdown(mergedPayments);
        
        // Reset filters to default
        const currentMonth = new Date().toISOString().slice(0, 7);
        const clientEl = document.getElementById('payment-client');
        const monthFromEl = document.getElementById('payment-month-from');
        const monthToEl = document.getElementById('payment-month-to');
        const methodEl = document.getElementById('filter-method');
        const searchEl = document.getElementById('search-payments');
        
        if (clientEl) clientEl.value = '';
        if (monthFromEl) monthFromEl.value = currentMonth;
        if (monthToEl) monthToEl.value = currentMonth;
        if (methodEl) methodEl.value = '';
        if (searchEl) searchEl.value = '';
        
        // Update table and summary
        displayPaymentsTable(mergedPayments);
        savePaymentsToStorage();
        await updatePaymentSummary(mergedPayments);
        
        showNotification('Payment data refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing payments:', error);
        
        // Fall back to localStorage data
        const savedPayments = loadPaymentsFromStorage();
        if (savedPayments && savedPayments.length > 0) {
            window.allPayments = savedPayments;
            populatePaymentClientDropdown(savedPayments);
            displayPaymentsTable(savedPayments);
            await updatePaymentSummary(savedPayments);
            showNotification('Showing cached payment data', 'info');
        } else {
            showNotification('Failed to refresh payment data', 'error');
        }
    }
}

function refreshVendorPayments() {
    try {
        const previousVendor = document.getElementById('vendor-payment-vendor')?.value || '';
        const previousMonthFrom = document.getElementById('vendor-payment-month-from')?.value || '';
        const previousMonthTo = document.getElementById('vendor-payment-month-to')?.value || '';
        const previousMethod = document.getElementById('vendor-payment-method')?.value || '';
        const previousSearch = document.getElementById('vendor-payment-search')?.value || '';

        const vendors = loadVendorsFromStorage() || [];
        window.allVendors = vendors;
        populateVendorDropdown(vendors);

        const vendorPayments = loadVendorPaymentsFromStorage() || [];
        window.allVendorPayments = vendorPayments;

        const vendorEl = document.getElementById('vendor-payment-vendor');
        const monthFromEl = document.getElementById('vendor-payment-month-from');
        const monthToEl = document.getElementById('vendor-payment-month-to');
        const methodEl = document.getElementById('vendor-payment-method');
        const searchEl = document.getElementById('vendor-payment-search');

        if (vendorEl) vendorEl.value = previousVendor;
        if (monthFromEl) monthFromEl.value = previousMonthFrom;
        if (monthToEl) monthToEl.value = previousMonthTo;
        if (methodEl) methodEl.value = previousMethod;
        if (searchEl) searchEl.value = previousSearch;

        filterVendorPayments();
        showNotification('Vendor payments refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing vendor payments:', error);
        showNotification('Failed to refresh vendor payments', 'error');
    }
}

async function updatePaymentSummary(payments) {
    try {
        // Load invoices to calculate pending amounts
        let invoices = [];
        try {
            invoices = await Promise.race([
                API.getInvoices(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
        } catch (e) {
            // Try to load from localStorage
            invoices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]');
        }
        
        // Calculate total collected (sum of all payment net amounts)
        const totalCollected = payments.reduce((sum, payment) => {
            const rawAmount = Number(payment.totalAmount ?? payment.amount ?? payment.netAmount) || 0;
            const taxRate = Number(payment.taxRate) || 0;
            const storedTax = Number(payment.taxAmount);
            const taxDeduction = Number.isNaN(storedTax) ? (rawAmount * taxRate) / 100 : storedTax;
            const netAmount = Number(payment.netAmount);
            const creditAmount = Number.isNaN(netAmount) ? Math.max(rawAmount - taxDeduction, 0) : netAmount;
            return sum + creditAmount;
        }, 0);
        
        // Calculate total invoices amount
        const totalInvoices = invoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        
        // Calculate pending payments
        const totalPending = invoices.reduce((sum, inv) => {
            const total = Number(inv.totalAmount) || 0;
            const paid = Number(inv.paidAmount) || 0;
            const balance = Number(inv.balance);
            const pending = Number.isNaN(balance) ? Math.max(total - paid, 0) : Math.max(balance, 0);
            return sum + pending;
        }, 0);
        
        // Count pending invoices
        const pendingInvoicesCount = invoices.filter(inv => {
            const total = Number(inv.totalAmount) || 0;
            const paid = Number(inv.paidAmount) || 0;
            const balance = Number(inv.balance);
            const pending = Number.isNaN(balance) ? (total - paid) : balance;
            return pending > 0;
        }).length;
        
        // Calculate collection rate
        const collectionRate = totalInvoices > 0 ? ((totalCollected / totalInvoices) * 100).toFixed(1) : 0;
        
        // Count overdue invoices and amount
        const today = new Date();
        let overdueAmount = 0;
        let overdueCount = 0;
        invoices.forEach(inv => {
            if (inv.dueDate) {
                const dueDate = new Date(inv.dueDate);
                if (dueDate < today) {
                    const total = Number(inv.totalAmount) || 0;
                    const paid = Number(inv.paidAmount) || 0;
                    const balance = Number(inv.balance);
                    const pending = Number.isNaN(balance) ? Math.max(total - paid, 0) : Math.max(balance, 0);
                    if (pending > 0) {
                        overdueAmount += pending;
                        overdueCount++;
                    }
                }
            }
        });
        
        // Update the summary cards
        const summaryContainer = document.getElementById('payment-summary-cards');
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div style="background: #ecfdf5; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #059669;">
                    <small style="color: var(--gray-600); font-size: 11px;">Total Collected</small>
                    <div style="font-size: 18px; font-weight: 700; color: #059669;">${formatPKR(totalCollected)}</div>
                </div>
                
                <div style="background: #fef3c7; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #f59e0b;">
                    <small style="color: var(--gray-600); font-size: 11px;">Pending Payments</small>
                    <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${formatPKR(totalPending)}</div>
                </div>
                
                <div style="background: #e3f2fd; padding: 12px 10px; border-radius: 6px; border-left: 3px solid #2563eb;">
                    <small style="color: var(--gray-600); font-size: 11px;">Collection Rate</small>
                    <div style="font-size: 18px; font-weight: 700; color: #2563eb;">${collectionRate}%</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error updating payment summary:', error);
    }
}

function displayPaymentsTable(payments) {
    const container = document.getElementById('payments-table-container');
    const canEditData = Auth.hasDataActionPermission('edit');
    const canDeleteData = Auth.hasDataActionPermission('delete');
    
    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--gray-500);">
                <p style="margin-bottom: 16px;">No payments found</p>
                ${canEditData ? `<button class="btn btn-primary" onclick="showRecordPaymentModal()">
                    <i class="fas fa-plus"></i> Record Payment
                </button>` : ''}
            </div>
        `;
        return;
    }
    
    // Calculate totals
    let totalAmount = 0;
    let totalTax = 0;
    let totalNet = 0;
    
    payments.forEach(payment => {
        const taxAmount = payment.taxAmount || 0;
        const amount = payment.totalAmount || payment.amount || 0;
        const netAmount = payment.netAmount || amount;
        
        totalAmount += amount;
        totalTax += taxAmount;
        totalNet += netAmount;
    });
    
    // Header table (fixed)
    let html = '<div style="border: 1px solid var(--gray-200); border-radius: 4px; overflow: hidden;">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-bottom: none; table-layout: fixed; width: 100%;">';
    html += '<thead style="background: var(--gray-50);"><tr>';
    html += '<th style="width: 10%;">Transaction ID</th>';
    html += '<th style="width: 14%;">Invoice(s)</th>';
    html += '<th style="width: 12%;">Client</th>';
    html += '<th style="width: 9%; text-align: right;">Amount</th>';
    html += '<th style="width: 6%; text-align: center;">Tax (%)</th>';
    html += '<th style="width: 9%; text-align: right;">Tax Amount</th>';
    html += '<th style="width: 9%; text-align: right;">Net Amount</th>';
    html += '<th style="width: 9%; text-align: center;">Method</th>';
    html += '<th style="width: 8%; text-align: center;">Date</th>';
    html += '<th style="width: 14%; text-align: center;">Actions</th>';
    html += '</tr></thead></table></div>';

    // Scrollable body
    html += '<div style="max-height: 520px; overflow-y: auto; border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200);">';
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; table-layout: fixed; width: 100%;"><tbody>';
    
    payments.forEach(payment => {
        const taxRate = payment.taxRate || 0;
        const taxAmount = payment.taxAmount || 0;
        const amount = payment.totalAmount || payment.amount || 0;
        const netAmount = payment.netAmount || amount;
        
        html += '<tr>';
        html += `<td style="width: 10%;"><strong>${payment.reference}</strong></td>`;
        
        // Handle line items or single invoice
        if (payment.lineItems && payment.lineItems.length > 0) {
            const invoiceNumbers = payment.lineItems.map(item => item.invoiceNo).join(', ');
            html += `<td style="width: 14%; word-break: break-word;"><strong>${invoiceNumbers}</strong></td>`;
        } else {
            html += `<td style="width: 14%;">${payment.invoiceNo || '-'}</td>`;
        }
        
        html += `<td style="width: 12%;">${payment.clientName || '-'}</td>`;
        html += `<td style="width: 9%; text-align: right; white-space: nowrap;">${formatPKR(amount)}</td>`;
        html += `<td style="width: 6%; text-align: center; color: var(--danger); white-space: nowrap;">${taxRate}%</td>`;
        html += `<td style="width: 9%; text-align: right; color: var(--danger); white-space: nowrap;">- ${formatPKR(taxAmount)}</td>`;
        html += `<td style="width: 9%; text-align: right; color: var(--success); font-weight: 700; white-space: nowrap;">${formatPKR(netAmount)}</td>`;
        html += `<td style="width: 9%; text-align: center;"><span class="badge" style="background: #e3f2fd; color: #1976d2; font-size: 11px; padding: 4px 8px; display: inline-block; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${payment.method}</span></td>`;
        html += `<td style="width: 8%; text-align: center; white-space: nowrap;">${payment.paymentDate || '-'}</td>`;
        
        let actionButtons = '';
        if (payment.lineItems && payment.lineItems.length > 0) {
            actionButtons += `<button class="btn btn-sm btn-secondary" onclick="showPaymentDetails(${payment.id})" title="View Details" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-eye"></i></button>`;
        }
        if (canEditData) {
            actionButtons += `<button class="btn btn-sm btn-primary" onclick="showEditClientPaymentModal(${payment.id})" title="Edit Payment" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            actionButtons += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteClientPayment(${payment.id})" title="Delete Payment"><i class="fas fa-trash"></i></button>`;
        }
        html += `<td style="width: 14%; text-align: center; white-space: nowrap;">${actionButtons || '-'}</td>`;
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div></div>';

    // Footer table (fixed)
    html += '<div class="table-responsive"><table class="data-table" style="margin-bottom: 0; border-top: none; table-layout: fixed; width: 100%;">';
    html += '<tfoot style="background: var(--gray-100); font-weight: 700; border-top: 2px solid var(--gray-400);"><tr>';
    html += '<td colspan="3" style="width: 36%; text-align: right; padding: 12px; font-weight: 700;">Total:</td>';
    html += `<td style="width: 9%; text-align: right; font-weight: 700; white-space: nowrap;">${formatPKR(totalAmount)}</td>`;
    html += `<td style="width: 6%;"></td>`;
    html += `<td style="width: 9%; text-align: right; color: var(--danger); font-weight: 700; white-space: nowrap;">- ${formatPKR(totalTax)}</td>`;
    html += `<td style="width: 9%; text-align: right; color: var(--success); font-weight: 700; white-space: nowrap;">${formatPKR(totalNet)}</td>`;
    html += '<td colspan="3" style="width: 32%;"></td>';
    html += '</tr></tfoot></table></div>';
    
    html += '</div>';
    container.innerHTML = html;
}

// Save payments to localStorage

// Supabase replaces localStorage for payments
async function loadPaymentsFromStorage() {
    // Fetch from Supabase
    return await fetchPaymentsFromSupabase();
}

async function savePaymentsToStorage(payment) {
    // Insert single payment to Supabase
    return await savePaymentToSupabase(payment);
}

function mergePaymentsWithStorage(apiPayments) {
    const saved = loadPaymentsFromStorage() || [];
    const combined = [...(apiPayments || []), ...saved];
    const seen = new Set();
    return combined.filter(payment => {
        const key = payment?.reference || payment?.paymentReference || payment?.id || JSON.stringify(payment);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function saveVendorsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.VENDORS, JSON.stringify(window.allVendors || []));
    } catch (error) {
        console.error('Failed to save vendors to localStorage:', error);
    }
}

function loadVendorsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VENDORS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load vendors from localStorage:', error);
        return [];
    }
}

function saveVendorPaymentsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.VENDOR_PAYMENTS, JSON.stringify(window.allVendorPayments || []));
    } catch (error) {
        console.error('Failed to save vendor payments to localStorage:', error);
    }
}

function loadVendorPaymentsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VENDOR_PAYMENTS);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Failed to load vendor payments from localStorage:', error);
        return [];
    }
}

function getNextVendorId(vendors) {
    const list = vendors || [];
    return list.reduce((max, v) => Math.max(max, v.id || 0), 0) + 1;
}

function filterPayments(searchTerm) {
    if (!window.allPayments) return;
    
    const filtered = window.allPayments.filter(payment => {
        // Search in basic fields
        const matchesBasic = payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            payment.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Search in invoice number (old format)
        const matchesInvoiceNo = payment.invoiceNo && payment.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Search in line items (new format)
        const matchesLineItems = payment.lineItems && payment.lineItems.some(item => 
            item.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.clientName.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        return matchesBasic || matchesInvoiceNo || matchesLineItems;
    });
    
    displayPaymentsTable(filtered);
}

function filterPaymentsByMethod(method) {
    if (!window.allPayments) return;
    
    if (!method) {
        displayPaymentsTable(window.allPayments);
        return;
    }
    
    const filtered = window.allPayments.filter(payment => payment.method === method);
    displayPaymentsTable(filtered);
}

function populateVendorDropdown(vendors) {
    const vendorSelect = document.getElementById('vendor-payment-vendor');
    if (!vendorSelect) return;

    vendorSelect.innerHTML = '<option value="">All Vendors</option>';
    vendors.forEach(vendor => {
        const option = document.createElement('option');
        option.value = vendor.name;
        option.textContent = vendor.name;
        vendorSelect.appendChild(option);
    });
}

function filterVendorPayments(skipAutoReset = false) {
    const vendorFilter = document.getElementById('vendor-payment-vendor')?.value || '';
    const monthFrom = document.getElementById('vendor-payment-month-from')?.value || '';
    const monthTo = document.getElementById('vendor-payment-month-to')?.value || '';
    const methodFilter = document.getElementById('vendor-payment-method')?.value || '';
    const searchText = String(document.getElementById('vendor-payment-search')?.value || '').trim();
    const hadSearch = Boolean(window.lastVendorPaymentSearchTerm);
    const clearedAfterSearch = !searchText && hadSearch;
    window.lastVendorPaymentSearchTerm = searchText;

    if (clearedAfterSearch && !skipAutoReset) {
        resetVendorPaymentFilters(true);
        return;
    }

    if (!window.allVendorPayments) return;

    const filtered = window.allVendorPayments.filter(payment => {
        const vendorName = payment.vendorName || '';
        const matchesVendor = !vendorFilter || vendorName === vendorFilter;
        const matchesMonth = matchesMonthRangeFilterPayment(payment.paymentDate, monthFrom, monthTo);
        const matchesMethod = !methodFilter || payment.method === methodFilter;
        const search = searchText.toLowerCase();
        const matchesSearch = !search ||
            String(payment.reference || '').toLowerCase().includes(search) ||
            String(payment.notes || '').toLowerCase().includes(search) ||
            String(payment.invoiceNo || '').toLowerCase().includes(search) ||
            String(payment.invoiceMonth || '').toLowerCase().includes(search) ||
            vendorName.toLowerCase().includes(search) ||
            String(payment.method || '').toLowerCase().includes(search);

        return matchesVendor && matchesMonth && matchesMethod && matchesSearch;
    });

    displayVendorPaymentsTable(filtered);
}

function resetVendorPaymentFilters(triggerFilter = true) {
    const vendorEl = document.getElementById('vendor-payment-vendor');
    const monthFromEl = document.getElementById('vendor-payment-month-from');
    const monthToEl = document.getElementById('vendor-payment-month-to');
    const methodEl = document.getElementById('vendor-payment-method');
    const searchEl = document.getElementById('vendor-payment-search');
    const currentMonth = new Date().toISOString().slice(0, 7);

    if (vendorEl) vendorEl.value = '';
    if (monthFromEl) monthFromEl.value = currentMonth;
    if (monthToEl) monthToEl.value = currentMonth;
    if (methodEl) methodEl.value = '';
    if (searchEl) searchEl.value = '';

    if (triggerFilter) {
        filterVendorPayments(true);
    }
}

function displayVendorPaymentsTable(payments) {
    const container = document.getElementById('vendor-payments-table-container');
    const canEditData = Auth.hasDataActionPermission('edit');
    const canDeleteData = Auth.hasDataActionPermission('delete');
    if (!container) return;

    if (!payments || payments.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-500);">
                No vendor payments found
            </div>
        `;
        return;
    }

    let totalAmount = 0;
    let html = '<div class="table-responsive">';
    html += '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th style="width: 10%;">Date</th>';
    html += '<th style="width: 18%;">Vendor</th>';
    html += '<th style="width: 12%;">Invoice No</th>';
    html += '<th style="width: 10%;">Invoice Month</th>';
    html += '<th style="width: 12%;">Method</th>';
    html += '<th style="width: 16%;">Reference</th>';
    html += '<th style="width: 10%; text-align: right;">Amount</th>';
    html += '<th style="width: 10%;">Notes</th>';
    html += '<th style="width: 10%;">Actions</th>';
    html += '</tr></thead><tbody>';

    payments.forEach(payment => {
        const amount = Number(payment.amount || 0);
        totalAmount += amount;
        html += '<tr>';
        html += `<td style="padding: 12px;">${payment.paymentDate || '-'}</td>`;
        html += `<td style="padding: 12px;">${payment.vendorName || '-'}</td>`;
        html += `<td style="padding: 12px;">${payment.invoiceNo || '-'}</td>`;
        html += `<td style="padding: 12px;">${payment.invoiceMonth || '-'}</td>`;
        html += `<td style="padding: 12px;">${payment.method || '-'}</td>`;
        html += `<td style="padding: 12px;">${payment.reference || '-'}</td>`;
        html += `<td style="padding: 12px; text-align: right;">${formatPKR(amount)}</td>`;
        html += `<td style="padding: 12px;">${payment.notes || '-'}</td>`;
        let actionButtons = '';
        if (canEditData) {
            actionButtons += `<button class="btn btn-sm btn-primary" onclick="showEditVendorPaymentModal(${payment.id})" title="Edit Payment" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-edit"></i></button>`;
        }
        if (canDeleteData) {
            actionButtons += `<button class="btn btn-sm" style="background: var(--danger); color: white; width: 28px; height: 28px; padding: 0;" onclick="deleteVendorPayment(${payment.id})" title="Delete Payment"><i class="fas fa-trash"></i></button>`;
        }
        html += `<td style="padding: 12px; white-space: nowrap;">${actionButtons || '-'}</td>`;
        html += '</tr>';
    });

    html += '</tbody>';
    html += '<tfoot><tr style="background: var(--gray-100); font-weight: 700;">';
    html += '<td colspan="6" style="padding: 12px; text-align: right;">Total:</td>';
    html += `<td style="padding: 12px; text-align: right;">${formatPKR(totalAmount)}</td>`;
    html += '<td colspan="2"></td>';
    html += '</tr></tfoot>';
    html += '</table></div>';

    container.innerHTML = html;
}

// Global variable to track invoice rows
let invoiceRowCounter = 0;
let selectedInvoices = [];
let currentClientFilter = '';

function showRecordPaymentModal(prefillInvoiceNo = '') {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'record-payment-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 800px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Record Payment</h2>
                <button onclick="document.getElementById('record-payment-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="savePayment(event)">
                <!-- Payment Details Section -->
                <div style="background: var(--gray-100); padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--gray-700);">Payment Details</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Payment Method *</label>
                            <select id="payment-method" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                                <option value="">Select Method</option>
                                <option value="Cash">Cash</option>
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Online">Online (JazzCash/EasyPaisa/Debit Card)</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Payment Date</label>
                            <input type="date" id="payment-date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        
                        <div style="grid-column: 1 / -1;">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Reference/Cheque No</label>
                            <input type="text" id="payment-reference" placeholder="e.g., TRF-2026-001 or Cheque No" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                    </div>
                </div>
                
                <!-- Invoice Allocations Section -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 12px;">
                        <h3 style="margin: 0; font-size: 16px; color: var(--gray-700);">Invoice Allocations</h3>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <select id="client-filter" onchange="onClientFilterChange()" style="padding: 6px 10px; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 13px;">
                                <option value="">All Clients</option>
                            </select>
                            <button type="button" onclick="addInvoiceRow()" class="btn btn-sm btn-primary">
                                <i class="fas fa-plus"></i> Add Invoice
                            </button>
                        </div>
                    </div>
                    
                    <div id="invoice-rows-container" style="border: 1px solid var(--gray-300); border-radius: 6px; padding: 12px; background: white; min-height: 120px;">
                        <!-- Invoice rows will be added here -->
                        <div style="text-align: center; color: var(--gray-500); padding: 20px;" id="no-invoices-message">
                            <i class="fas fa-file-invoice" style="font-size: 32px; margin-bottom: 8px;"></i>
                            <p>Click "Add Invoice" to allocate payment to invoices</p>
                        </div>
                    </div>
                </div>
                
                <!-- Tax & Totals Section -->
                <div style="background: var(--gray-100); padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--gray-700);">Tax Deduction & Summary</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Tax Rate (%)</label>
                            <input type="number" id="tax-rate" value="0" min="0" max="100" step="0.01" onchange="calculatePaymentTotals()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Tax Amount</label>
                            <input type="text" id="tax-amount" readonly style="width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; box-sizing: border-box; background: white; color: var(--danger); font-weight: 600;">
                        </div>
                    </div>
                    
                    <div style="border-top: 2px solid var(--gray-300); padding-top: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--gray-600);">Total Payment Amount:</span>
                            <span style="font-weight: 700; font-size: 16px;" id="display-total-payment">PKR 0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: var(--gray-600);">Tax Deduction:</span>
                            <span style="font-weight: 700; font-size: 16px; color: var(--danger);" id="display-tax">- PKR 0</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--gray-300);">
                            <span style="font-weight: 600; color: var(--gray-700);">Net Payment:</span>
                            <span style="font-weight: 700; font-size: 20px; color: var(--success);" id="display-net">PKR 0</span>
                        </div>
                    </div>
                </div>
                
                <!-- Notes Section -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px;">Notes (Optional)</label>
                    <textarea id="payment-notes" placeholder="Add payment notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; min-height: 60px;"></textarea>
                </div>
                
                <!-- Action Buttons -->
                <div style="display: flex; gap: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">
                        <i class="fas fa-check"></i> Record Payment
                    </button>
                    <button type="button" onclick="document.getElementById('record-payment-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Reset invoice tracking
    invoiceRowCounter = 0;
    selectedInvoices = [];
    currentClientFilter = '';
    
    // Populate client filter
    setTimeout(() => {
        populateClientFilter();
        addInvoiceRow();

        if (prefillInvoiceNo) {
            prefillRecordPaymentInvoice(prefillInvoiceNo);
        }
    }, 100);
}

function prefillRecordPaymentInvoice(invoiceNo) {
    if (!invoiceNo) return;

    const availableInvoices = getAvailableInvoices();
    const targetInvoice = availableInvoices.find(inv => inv.invoiceNo === invoiceNo);
    if (!targetInvoice) return;

    const clientFilterEl = document.getElementById('client-filter');
    if (clientFilterEl) {
        clientFilterEl.value = targetInvoice.clientName || '';
        currentClientFilter = clientFilterEl.value;
        refreshInvoiceRowOptions();
    }

    let firstRowSelect = document.querySelector('[data-row="1"]');
    if (!firstRowSelect) {
        addInvoiceRow();
        firstRowSelect = document.querySelector('[data-row="1"]');
    }
    if (!firstRowSelect) return;

    firstRowSelect.value = invoiceNo;
    if (firstRowSelect.value === invoiceNo) {
        onInvoiceSelected(1);
    }
}

// Get available invoices (only unpaid/pending)
function getAvailableInvoices(clientFilter = '') {
    // Try to get from multiple sources
    let allInvoices = [];
    
    // First, try to get from global invoicesData (if loaded from invoices module)
    if (typeof window.invoicesData !== 'undefined' && window.invoicesData && window.invoicesData.length > 0) {
        allInvoices = window.invoicesData;
    } 
    // Then try localStorage
    else {
        try {
            const savedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
            if (savedInvoices) {
                allInvoices = JSON.parse(savedInvoices);
            }
        } catch (e) {
            console.log('Could not load invoices from storage');
        }
    }
    
    // Filter to only show unpaid/pending invoices (status !== 'Paid' and balance > 0)
    let filteredInvoices = allInvoices.filter(inv => {
        const status = inv.status || 'Pending';
        const balance = inv.balance || (inv.totalAmount - (inv.paidAmount || 0));
        // EXCLUDE if status is 'Paid' OR if balance is 0 or less
        return status !== 'Paid' && balance > 0;
    });
    
    // Apply client filter if specified
    if (clientFilter) {
        filteredInvoices = filteredInvoices.filter(inv => 
            inv.clientName === clientFilter
        );
    }
    
    return filteredInvoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        clientName: inv.clientName,
        balance: inv.balance || (inv.totalAmount - (inv.paidAmount || 0)),
        status: inv.status || 'Pending'
    }));
}

// Populate client filter dropdown
function populateClientFilter() {
    const clientFilter = document.getElementById('client-filter');
    if (!clientFilter) return;
    
    const invoices = getAvailableInvoices();
    const uniqueClients = [...new Set(invoices.map(inv => inv.clientName))].sort();
    
    let options = '<option value="">All Clients</option>';
    uniqueClients.forEach(client => {
        options += `<option value="${client}">${client}</option>`;
    });
    
    clientFilter.innerHTML = options;
}

// Handle client filter change
function onClientFilterChange() {
    const clientFilter = document.getElementById('client-filter');
    if (!clientFilter) return;
    
    currentClientFilter = clientFilter.value;
    
    // Refresh all existing invoice rows
    refreshInvoiceRowOptions();
}

// Refresh invoice options in all rows
function refreshInvoiceRowOptions() {
    for (let i = 1; i <= invoiceRowCounter; i++) {
        const selectEl = document.querySelector(`[data-row="${i}"]`);
        if (selectEl) {
            const currentValue = selectEl.value;
            const availableInvoices = getAvailableInvoices(currentClientFilter);
            
            let invoiceOptions = '<option value="">Select Invoice</option>';
            availableInvoices.forEach(inv => {
                if (!selectedInvoices.includes(inv.invoiceNo) || inv.invoiceNo === currentValue) {
                    const selected = inv.invoiceNo === currentValue ? 'selected' : '';
                    invoiceOptions += `<option value="${inv.invoiceNo}" data-balance="${inv.balance}" data-client="${inv.clientName}" ${selected}>${inv.invoiceNo} - ${inv.clientName} (Balance: ${formatPKR(inv.balance)})</option>`;
                }
            });
            
            selectEl.innerHTML = invoiceOptions;
        }
    }
}

// Add a new invoice row
function addInvoiceRow() {
    const container = document.getElementById('invoice-rows-container');
    const messageEl = document.getElementById('no-invoices-message');
    
    if (messageEl) {
        messageEl.remove();
    }
    
    const rowId = ++invoiceRowCounter;
    const availableInvoices = getAvailableInvoices(currentClientFilter);
    
    const row = document.createElement('div');
    row.id = `invoice-row-${rowId}`;
    row.style.cssText = 'border: 1px solid var(--gray-200); border-radius: 4px; padding: 12px; margin-bottom: 12px; background: var(--gray-50);';
    
    let invoiceOptions = '<option value="">Select Invoice</option>';
    availableInvoices.forEach(inv => {
        if (!selectedInvoices.includes(inv.invoiceNo)) {
            invoiceOptions += `<option value="${inv.invoiceNo}" data-balance="${inv.balance}" data-client="${inv.clientName}">${inv.invoiceNo} - ${inv.clientName} (Balance: ${formatPKR(inv.balance)})</option>`;
        }
    });
    
    row.innerHTML = `
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 12px; align-items: end;">
            <div>
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Invoice *</label>
                <select class="invoice-select" data-row="${rowId}" onchange="onInvoiceSelected(${rowId})" required style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 13px;">
                    ${invoiceOptions}
                </select>
            </div>
            
            <div>
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Balance</label>
                <input type="text" id="invoice-balance-${rowId}" readonly style="width: 100%; padding: 8px; border: 1px solid var(--gray-200); border-radius: 4px; background: white; font-size: 13px; color: var(--gray-600);">
            </div>
            
            <div>
                <label style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 13px;">Allocate Amount *</label>
                <input type="number" id="invoice-amount-${rowId}" class="invoice-amount-input" data-row="${rowId}" min="0" step="0.01" required onchange="calculatePaymentTotals()" oninput="calculatePaymentTotals()" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; font-size: 13px;">
            </div>
            
            <div>
                <button type="button" onclick="removeInvoiceRow(${rowId})" class="btn btn-sm" style="background: var(--danger); color: white; padding: 8px 12px;" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <input type="hidden" id="invoice-no-${rowId}" value="">
        <input type="hidden" id="client-name-${rowId}" value="">
    `;
    
    container.appendChild(row);
}

// Handle invoice selection
function onInvoiceSelected(rowId) {
    const selectEl = document.querySelector(`[data-row="${rowId}"]`);
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    
    if (selectedOption.value) {
        const balance = parseFloat(selectedOption.getAttribute('data-balance')) || 0;
        const clientName = selectedOption.getAttribute('data-client') || '';
        
        document.getElementById(`invoice-balance-${rowId}`).value = formatPKR(balance);
        document.getElementById(`invoice-amount-${rowId}`).value = balance;
        document.getElementById(`invoice-no-${rowId}`).value = selectedOption.value;
        document.getElementById(`client-name-${rowId}`).value = clientName;
        
        // Track selected invoice
        selectedInvoices.push(selectedOption.value);
        
        // Update totals
        calculatePaymentTotals();
    }
}

// Remove invoice row
function removeInvoiceRow(rowId) {
    const row = document.getElementById(`invoice-row-${rowId}`);
    if (row) {
        // Remove from selected invoices
        const invoiceNo = document.getElementById(`invoice-no-${rowId}`).value;
        selectedInvoices = selectedInvoices.filter(inv => inv !== invoiceNo);
        
        row.remove();
        calculatePaymentTotals();
        
        // Show message if no rows left
        const container = document.getElementById('invoice-rows-container');
        if (container.children.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: var(--gray-500); padding: 20px;" id="no-invoices-message">
                    <i class="fas fa-file-invoice" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <p>Click "Add Invoice" to allocate payment to invoices</p>
                </div>
            `;
        }
    }
}

// Calculate payment totals
function calculatePaymentTotals() {
    // Sum all invoice amounts
    const amountInputs = document.querySelectorAll('.invoice-amount-input');
    let totalAmount = 0;
    
    amountInputs.forEach(input => {
        totalAmount += parseFloat(input.value) || 0;
    });
    
    // Calculate tax
    const taxRate = parseFloat(document.getElementById('tax-rate')?.value) || 0;
    const taxAmount = (totalAmount * taxRate) / 100;
    const netPayment = totalAmount - taxAmount;
    
    // Update displays
    document.getElementById('tax-amount').value = formatPKR(taxAmount);
    document.getElementById('display-total-payment').textContent = formatPKR(totalAmount);
    document.getElementById('display-tax').textContent = '- ' + formatPKR(taxAmount);
    document.getElementById('display-net').textContent = formatPKR(netPayment);
}

function savePayment(event) {
    event.preventDefault();
    
    const method = document.getElementById('payment-method').value;
    const paymentDate = document.getElementById('payment-date').value;
    const reference = document.getElementById('payment-reference').value.trim();
    const notes = document.getElementById('payment-notes').value.trim();
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    
    if (!method) {
        alert('Please select a payment method');
        return;
    }
    
    // Collect all invoice line items
    const lineItems = [];
    let totalAmount = 0;
    let clientName = '';
    
    for (let i = 1; i <= invoiceRowCounter; i++) {
        const invoiceNoEl = document.getElementById(`invoice-no-${i}`);
        const amountEl = document.getElementById(`invoice-amount-${i}`);
        const clientNameEl = document.getElementById(`client-name-${i}`);
        const balanceEl = document.getElementById(`invoice-balance-${i}`);
        
        if (invoiceNoEl && amountEl && invoiceNoEl.value) {
            const allocatedAmount = parseFloat(amountEl.value) || 0;
            const balance = parseFloat(balanceEl.value.replace(/[^0-9.-]+/g, '')) || 0;
            
            if (allocatedAmount > 0) {
                lineItems.push({
                    invoiceNo: invoiceNoEl.value,
                    clientName: clientNameEl.value,
                    invoiceBalance: balance,
                    allocatedAmount: allocatedAmount
                });
                
                totalAmount += allocatedAmount;
                if (!clientName) clientName = clientNameEl.value;
            }
        }
    }
    
    if (lineItems.length === 0) {
        alert('Please add at least one invoice allocation');
        return;
    }
    
    // Calculate tax and net
    const taxAmount = (totalAmount * taxRate) / 100;
    const netPayment = totalAmount - taxAmount;
    
    // Generate unique payment reference
    const paymentReference = reference || 'PAY-' + Date.now();
    
    // Create payment object with line items
    const newPayment = {
        id: Math.max(...(window.allPayments || []).map(p => p.id), 0) + 1,
        paymentReference: paymentReference,
        clientName: clientName,
        totalAmount: totalAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        netAmount: netPayment,
        method: method,
        paymentDate: paymentDate,
        reference: paymentReference,
        status: 'Completed',
        notes: notes,
        lineItems: lineItems,
        invoiceCount: lineItems.length
    };
    
    // Initialize if needed
    if (!window.allPayments) {
        window.allPayments = [];
    }
    
    // Add to payments list
    window.allPayments.push(newPayment);
    
    // Save to localStorage
    savePaymentsToStorage();
    
    // Update invoice statuses
    updateInvoiceStatuses(lineItems);
    
    // Update table
    displayPaymentsTable(window.allPayments);
    
    // Update summary cards
    updatePaymentSummary(window.allPayments);
    
    // Close modal
    document.getElementById('record-payment-modal').remove();
    
    // Show success message
    const invoiceText = lineItems.length > 1 ? `${lineItems.length} invoices` : `invoice ${lineItems[0].invoiceNo}`;
    showNotification(`Payment of ${formatPKR(netPayment)} recorded successfully for ${invoiceText}!`, 'success');
}

function showEditClientPaymentModal(paymentId) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const payments = window.allPayments || loadPaymentsFromStorage() || [];
    const payment = payments.find((p) => p.id === paymentId);

    if (!payment) {
        showNotification('Client payment not found', 'error');
        return;
    }

    const totalAmount = Number(payment.totalAmount || payment.amount || 0);
    const currentTaxRate = Number(payment.taxRate) || 0;

    const modal = document.createElement('div');
    modal.id = 'edit-client-payment-modal';
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
        <div style="background: white; border-radius: 8px; width: min(95vw, 600px); max-width: 600px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; flex: 1; min-width: 0;">Edit Client Payment</h2>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button onclick="document.getElementById('edit-client-payment-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
                </div>
            </div>

            <form onsubmit="updateClientPayment(event, ${paymentId})" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Method *</label>
                    <select id="edit-client-payment-method" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Cash" ${payment.method === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Bank Transfer" ${payment.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                        <option value="Online" ${payment.method === 'Online' ? 'selected' : ''}>Online (JazzCash/EasyPaisa/Debit Card)</option>
                        <option value="Cheque" ${payment.method === 'Cheque' ? 'selected' : ''}>Cheque</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Date</label>
                        <input type="date" id="edit-client-payment-date" value="${payment.paymentDate || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Rate (%)</label>
                        <input type="number" id="edit-client-payment-tax-rate" min="0" max="100" step="0.01" value="${currentTaxRate}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Reference</label>
                    <input type="text" id="edit-client-payment-reference" value="${payment.reference || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Amount</label>
                    <input type="text" value="${formatPKR(totalAmount)}" readonly style="width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; box-sizing: border-box; background: var(--gray-100); color: var(--gray-700); font-weight: 600;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                    <textarea id="edit-client-payment-notes" rows="3" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; resize: vertical;">${payment.notes || ''}</textarea>
                </div>

                ${payment.lineItems && payment.lineItems.length > 0 ? `<div style="padding: 10px 12px; border-radius: 4px; background: var(--gray-100); color: var(--gray-700); font-size: 13px;">Invoice allocations remain unchanged in edit mode.</div>` : ''}

                <div style="display: flex; gap: 12px; margin-top: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Update Payment</button>
                    <button type="button" onclick="document.getElementById('edit-client-payment-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

function updateClientPayment(event, paymentId) {
    event.preventDefault();

    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const method = document.getElementById('edit-client-payment-method').value;
    const paymentDate = document.getElementById('edit-client-payment-date').value;
    const taxRate = parseFloat(document.getElementById('edit-client-payment-tax-rate').value) || 0;
    const reference = document.getElementById('edit-client-payment-reference').value.trim();
    const notes = document.getElementById('edit-client-payment-notes').value.trim();

    if (!method) {
        alert('Please select a payment method');
        return;
    }

    const payments = window.allPayments || loadPaymentsFromStorage() || [];
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) {
        showNotification('Client payment not found', 'error');
        return;
    }

    const existing = payments[index];
    const totalAmount = Number(existing.totalAmount || existing.amount || 0);
    const taxAmount = (totalAmount * taxRate) / 100;
    const netAmount = totalAmount - taxAmount;

    payments[index] = {
        ...existing,
        method,
        paymentDate,
        taxRate,
        taxAmount,
        netAmount,
        reference: reference || existing.reference || existing.paymentReference || `PAY-${paymentId}`,
        paymentReference: reference || existing.paymentReference || existing.reference || `PAY-${paymentId}`,
        notes
    };

    window.allPayments = payments;
    savePaymentsToStorage();

    const modal = document.getElementById('edit-client-payment-modal');
    if (modal) {
        modal.remove();
    }

    displayPaymentsTable(window.allPayments);
    updatePaymentSummary(window.allPayments);
    showNotification('Client payment updated successfully', 'success');
}

function deleteClientPayment(paymentId) {
    if (!ensureDataActionPermission('delete')) {
        return;
    }

    const payments = window.allPayments || loadPaymentsFromStorage() || [];
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
        showNotification('Client payment not found', 'error');
        return;
    }

    const confirmed = confirm(`Delete client payment ${payment.reference || payment.id}? This cannot be undone.`);
    if (!confirmed) return;

    window.allPayments = payments.filter((p) => p.id !== paymentId);
    savePaymentsToStorage();
    syncClientInvoiceBalancesFromPayments();
    displayPaymentsTable(window.allPayments);
    updatePaymentSummary(window.allPayments);
    showNotification('Client payment deleted successfully', 'success');
}

function deleteClientPaymentFromModal(paymentId) {
    const modal = document.getElementById('edit-client-payment-modal');
    if (modal) {
        modal.remove();
    }
    deleteClientPayment(paymentId);
}

function showAddVendorModal() {
    if (!ensureFeaturePermission('clients', 'create')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'add-vendor-modal';
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
                <h2 style="margin: 0;">Add New Vendor</h2>
                <button onclick="document.getElementById('add-vendor-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <form onsubmit="saveNewVendor(event)" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Vendor Name *</label>
                    <input type="text" id="vendor-name" placeholder="Enter vendor name" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email</label>
                    <input type="email" id="vendor-email" placeholder="Enter email address" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Phone</label>
                    <input type="tel" id="vendor-phone" placeholder="Enter phone number" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Address</label>
                    <input type="text" id="vendor-address" placeholder="Enter address" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">NTN (Optional)</label>
                    <input type="text" id="vendor-ntn" placeholder="Enter NTN" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Status</label>
                    <select id="vendor-status" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Add Vendor</button>
                    <button type="button" onclick="document.getElementById('add-vendor-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('vendor-name').focus();
}

function saveNewVendor(event) {
    event.preventDefault();

    if (!ensureFeaturePermission('clients', 'create')) {
        return;
    }

    const name = document.getElementById('vendor-name').value.trim();
    const email = document.getElementById('vendor-email').value.trim();
    const phone = document.getElementById('vendor-phone').value.trim();
    const address = document.getElementById('vendor-address').value.trim();
    const ntn = document.getElementById('vendor-ntn').value.trim();
    const status = document.getElementById('vendor-status').value;

    if (!name) {
        alert('Please enter vendor name');
        return;
    }

    const vendors = loadVendorsFromStorage() || [];
    const nextId = getNextVendorId(vendors);
    const newVendor = {
        id: nextId,
        vendorId: `VD${String(nextId).padStart(3, '0')}`,
        name,
        email,
        phone,
        address,
        ntn: ntn || '',
        status
    };

    vendors.push(newVendor);
    window.allVendors = vendors;
    saveVendorsToStorage();

    populateVendorDropdown(vendors);

    document.getElementById('add-vendor-modal').remove();
    showNotification('Vendor added successfully!', 'success');
}

function showRecordVendorPaymentModal() {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const vendors = loadVendorsFromStorage() || [];
    if (!vendors.length) {
        showNotification('Please add a vendor first', 'warning');
        return;
    }

    const vendorOptions = vendors
        .map(vendor => `<option value="${vendor.name}">${vendor.name}</option>`)
        .join('');

    const modal = document.createElement('div');
    modal.id = 'record-vendor-payment-modal';
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 600px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Record Vendor Payment</h2>
                <button onclick="document.getElementById('record-vendor-payment-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>

            <form onsubmit="saveVendorPayment(event)" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Vendor *</label>
                    <select id="vendor-payment-name" required onchange="onVendorSelectionChange()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Vendor</option>
                        ${vendorOptions}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Method *</label>
                        <select id="vendor-payment-method-input" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Date</label>
                        <input type="date" id="vendor-payment-date" value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice No</label>
                        <select id="vendor-payment-invoice" required onchange="onVendorInvoiceSelected()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                            <option value="">Select Vendor First</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice Month</label>
                        <input type="month" id="vendor-payment-invoice-month" value="${new Date().toISOString().slice(0, 7)}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Amount (Gross) *</label>
                    <input type="number" id="vendor-payment-amount" min="0" step="0.01" required placeholder="Enter amount" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Deduction (Optional)</label>
                    <input type="number" id="vendor-payment-tax-deduction" min="0" step="0.01" value="0" placeholder="Enter tax deduction" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Reference</label>
                    <input type="text" id="vendor-payment-reference" placeholder="Reference / Cheque No" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                    <textarea id="vendor-payment-notes" rows="3" placeholder="Additional notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save Payment</button>
                    <button type="button" onclick="document.getElementById('record-vendor-payment-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    onVendorSelectionChange();
}

function getVendorInvoicesForPayments() {
    if (typeof loadVendorInvoicesFromStorage === 'function') {
        return loadVendorInvoicesFromStorage() || [];
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEYS.VENDOR_INVOICES);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        return [];
    }
}

function saveVendorInvoicesForPayments(invoices) {
    try {
        window.vendorInvoicesData = invoices;
        localStorage.setItem(STORAGE_KEYS.VENDOR_INVOICES, JSON.stringify(invoices));
    } catch (error) {
        console.error('Failed to save vendor invoices:', error);
    }
}

function getVendorInvoiceMatchKey(vendorName, invoiceNo) {
    const normalizedVendor = String(vendorName || '').trim().toLowerCase();
    const normalizedInvoice = String(invoiceNo || '').trim().toLowerCase();
    return `${normalizedVendor}__${normalizedInvoice}`;
}

function getVendorInvoiceBalance(invoice) {
    const amount = Number(invoice.amount) || 0;
    const paid = Number(invoice.paidAmount) || 0;
    if (!Number.isNaN(Number(invoice.balance))) {
        return Math.max(Number(invoice.balance), 0);
    }
    return Math.max(amount - paid, 0);
}

function onVendorSelectionChange() {
    const vendorName = document.getElementById('vendor-payment-name')?.value || '';
    const invoiceSelect = document.getElementById('vendor-payment-invoice');
    const invoiceMonthEl = document.getElementById('vendor-payment-invoice-month');
    const amountEl = document.getElementById('vendor-payment-amount');

    if (!invoiceSelect || !invoiceMonthEl || !amountEl) return;

    invoiceSelect.innerHTML = '';

    if (!vendorName) {
        invoiceSelect.innerHTML = '<option value="">Select Vendor First</option>';
        invoiceMonthEl.value = new Date().toISOString().slice(0, 7);
        amountEl.value = '';
        return;
    }

    const invoices = getVendorInvoicesForPayments();
    const pendingInvoices = invoices.filter(inv => {
        const matchesVendor = inv.vendorName === vendorName;
        const balance = getVendorInvoiceBalance(inv);
        const status = String(inv.status || '').toLowerCase();
        return matchesVendor && balance > 0 && status !== 'paid';
    });

    if (pendingInvoices.length === 0) {
        invoiceSelect.innerHTML = '<option value="">No Pending Invoices</option>';
        invoiceMonthEl.value = new Date().toISOString().slice(0, 7);
        amountEl.value = '';
        return;
    }

    pendingInvoices.forEach((inv, index) => {
        const balance = getVendorInvoiceBalance(inv);
        const option = document.createElement('option');
        option.value = inv.invoiceNo;
        option.textContent = `${inv.invoiceNo} (Balance: ${formatPKR(balance)})`;
        option.dataset.invoiceMonth = inv.invoiceMonth || '';
        option.dataset.amount = balance;
        option.dataset.index = String(index);
        invoiceSelect.appendChild(option);
    });

    invoiceSelect.selectedIndex = 0;
    onVendorInvoiceSelected();
}

function onVendorInvoiceSelected() {
    const invoiceSelect = document.getElementById('vendor-payment-invoice');
    const invoiceMonthEl = document.getElementById('vendor-payment-invoice-month');
    const amountEl = document.getElementById('vendor-payment-amount');

    if (!invoiceSelect || !invoiceMonthEl || !amountEl) return;

    const selected = invoiceSelect.options[invoiceSelect.selectedIndex];
    if (!selected || !selected.value) {
        invoiceMonthEl.value = new Date().toISOString().slice(0, 7);
        amountEl.value = '';
        return;
    }

    const invoiceMonth = selected.dataset.invoiceMonth || '';
    const amount = selected.dataset.amount || '';

    if (invoiceMonth) {
        invoiceMonthEl.value = invoiceMonth;
    }
    if (amount) {
        amountEl.value = amount;
    }
}

function saveVendorPayment(event) {
    event.preventDefault();

    const vendorName = document.getElementById('vendor-payment-name').value;
    const method = document.getElementById('vendor-payment-method-input').value;
    const paymentDate = document.getElementById('vendor-payment-date').value;
    const invoiceNo = document.getElementById('vendor-payment-invoice')?.value || '';
    const invoiceMonth = document.getElementById('vendor-payment-invoice-month').value;
    const amount = parseFloat(document.getElementById('vendor-payment-amount').value) || 0;
    const taxDeduction = parseFloat(document.getElementById('vendor-payment-tax-deduction')?.value) || 0;
    const reference = document.getElementById('vendor-payment-reference').value.trim();
    const notes = document.getElementById('vendor-payment-notes').value.trim();

    if (!vendorName || !method || !invoiceNo || amount <= 0) {
        alert('Please fill in all required fields');
        return;
    }

    if (taxDeduction < 0 || taxDeduction > amount) {
        alert('Tax deduction must be between 0 and payment amount');
        return;
    }

    const vendorInvoices = getVendorInvoicesForPayments();
    const targetKey = getVendorInvoiceMatchKey(vendorName, invoiceNo);
    const invoiceIndex = vendorInvoices.findIndex(inv => getVendorInvoiceMatchKey(inv.vendorName, inv.invoiceNo) === targetKey);
    if (invoiceIndex === -1) {
        alert('Selected invoice not found for this vendor');
        return;
    }

    const selectedInvoice = vendorInvoices[invoiceIndex];
    const currentBalance = getVendorInvoiceBalance(selectedInvoice);
    if (currentBalance <= 0 || String(selectedInvoice.status || '').toLowerCase() === 'paid') {
        alert('This invoice is already paid and cannot be selected');
        onVendorSelectionChange();
        return;
    }

    if (amount > currentBalance) {
        alert(`Payment amount cannot be greater than pending balance (${formatPKR(currentBalance)})`);
        return;
    }

    const vendorPayments = loadVendorPaymentsFromStorage() || [];
    const newPayment = {
        id: Date.now(),
        vendorName,
        method,
        paymentDate,
        invoiceNo,
        invoiceMonth,
        amount,
        taxDeduction,
        netAmount: Math.max(amount - taxDeduction, 0),
        reference: reference || `VPAY-${Date.now()}`,
        notes
    };

    // Update selected invoice immediately (confirmed payment against selected invoice)
    const selectedInvoiceAmount = Number(selectedInvoice.amount) || 0;
    const selectedPaidBefore = Number(selectedInvoice.paidAmount) || 0;
    const selectedPaidAfter = selectedPaidBefore + amount;
    const selectedBalanceAfter = Math.max(selectedInvoiceAmount - selectedPaidAfter, 0);
    vendorInvoices[invoiceIndex] = {
        ...selectedInvoice,
        paidAmount: selectedPaidAfter,
        balance: selectedBalanceAfter,
        status: selectedBalanceAfter <= 0 ? 'Paid' : 'Partial'
    };
    saveVendorInvoicesForPayments(vendorInvoices);

    vendorPayments.unshift(newPayment);
    window.allVendorPayments = vendorPayments;
    saveVendorPaymentsToStorage();
    syncVendorInvoiceBalancesFromPayments();

    document.getElementById('record-vendor-payment-modal').remove();

    if (window.paymentActiveTab === 'vendor') {
        filterVendorPayments();
    }

    showNotification(`Vendor payment of ${formatPKR(amount)} recorded successfully`, 'success');
}

function syncVendorInvoiceBalancesFromPayments() {
    const vendorInvoices = getVendorInvoicesForPayments() || [];
    const vendorPayments = loadVendorPaymentsFromStorage() || [];

    const paidByInvoice = {};
    vendorPayments.forEach((payment) => {
        if (!payment?.invoiceNo || !payment?.vendorName) return;
        const key = getVendorInvoiceMatchKey(payment.vendorName, payment.invoiceNo);
        paidByInvoice[key] = (paidByInvoice[key] || 0) + (Number(payment.amount) || 0);
    });

    const updatedInvoices = vendorInvoices.map((invoice) => {
        const key = getVendorInvoiceMatchKey(invoice.vendorName, invoice.invoiceNo);
        const totalPaid = paidByInvoice[key] || 0;
        const invoiceAmount = Number(invoice.amount) || 0;
        const balance = Math.max(invoiceAmount - totalPaid, 0);
        const status = balance <= 0 ? 'Paid' : totalPaid > 0 ? 'Partial' : 'Pending';

        return {
            ...invoice,
            paidAmount: totalPaid,
            balance,
            status
        };
    });

    saveVendorInvoicesForPayments(updatedInvoices);

    // If vendor invoices tab is currently open, refresh it immediately
    if (window.invoiceActiveTab === 'vendor' && typeof loadVendorInvoices === 'function') {
        loadVendorInvoices();
    }
}

function showEditVendorPaymentModal(paymentId) {
    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const payments = loadVendorPaymentsFromStorage() || [];
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
        showNotification('Vendor payment not found', 'error');
        return;
    }

    const vendors = loadVendorsFromStorage() || [];
    const vendorOptions = vendors
        .map(vendor => `<option value="${vendor.name}" ${vendor.name === payment.vendorName ? 'selected' : ''}>${vendor.name}</option>`)
        .join('');

    const modal = document.createElement('div');
    modal.id = 'edit-vendor-payment-modal';
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
        <div style="background: white; border-radius: 8px; width: min(95vw, 600px); max-width: 600px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 20px;">
                <h2 style="margin: 0; flex: 1; min-width: 0;">Edit Vendor Payment</h2>
                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                    <button onclick="document.getElementById('edit-vendor-payment-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
                </div>
            </div>

            <form onsubmit="updateVendorPayment(event, ${paymentId})" style="display: flex; flex-direction: column; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Vendor *</label>
                    <select id="edit-vendor-payment-name" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        ${vendorOptions}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Method *</label>
                        <select id="edit-vendor-payment-method" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                            <option value="Cash" ${payment.method === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Bank Transfer" ${payment.method === 'Bank Transfer' ? 'selected' : ''}>Bank Transfer</option>
                            <option value="Cheque" ${payment.method === 'Cheque' ? 'selected' : ''}>Cheque</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Date</label>
                        <input type="date" id="edit-vendor-payment-date" value="${payment.paymentDate || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice No *</label>
                        <input type="text" id="edit-vendor-payment-invoice-no" value="${payment.invoiceNo || ''}" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice Month</label>
                        <input type="month" id="edit-vendor-payment-invoice-month" value="${payment.invoiceMonth || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                    </div>
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Amount *</label>
                    <input type="number" id="edit-vendor-payment-amount" min="0" step="0.01" value="${Number(payment.amount) || 0}" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Deduction (Optional)</label>
                    <input type="number" id="edit-vendor-payment-tax-deduction" min="0" step="0.01" value="${Number(payment.taxDeduction) || 0}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Reference</label>
                    <input type="text" id="edit-vendor-payment-reference" value="${payment.reference || ''}" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>

                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes</label>
                    <textarea id="edit-vendor-payment-notes" rows="3" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; resize: vertical;">${payment.notes || ''}</textarea>
                </div>

                <div style="display: flex; gap: 12px; margin-top: 12px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Update Payment</button>
                    <button type="button" onclick="document.getElementById('edit-vendor-payment-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
}

function updateVendorPayment(event, paymentId) {
    event.preventDefault();

    if (!ensureDataActionPermission('edit')) {
        return;
    }

    const vendorName = document.getElementById('edit-vendor-payment-name').value;
    const method = document.getElementById('edit-vendor-payment-method').value;
    const paymentDate = document.getElementById('edit-vendor-payment-date').value;
    const invoiceNo = document.getElementById('edit-vendor-payment-invoice-no').value.trim();
    const invoiceMonth = document.getElementById('edit-vendor-payment-invoice-month').value;
    const amount = parseFloat(document.getElementById('edit-vendor-payment-amount').value) || 0;
    const taxDeduction = parseFloat(document.getElementById('edit-vendor-payment-tax-deduction')?.value) || 0;
    const reference = document.getElementById('edit-vendor-payment-reference').value.trim();
    const notes = document.getElementById('edit-vendor-payment-notes').value.trim();

    if (!vendorName || !method || !invoiceNo || amount <= 0) {
        alert('Please fill in all required fields');
        return;
    }

    if (taxDeduction < 0 || taxDeduction > amount) {
        alert('Tax deduction must be between 0 and payment amount');
        return;
    }

    const payments = loadVendorPaymentsFromStorage() || [];
    const index = payments.findIndex((p) => p.id === paymentId);
    if (index === -1) {
        showNotification('Vendor payment not found', 'error');
        return;
    }

    payments[index] = {
        ...payments[index],
        vendorName,
        method,
        paymentDate,
        invoiceNo,
        invoiceMonth,
        amount,
        taxDeduction,
        netAmount: Math.max(amount - taxDeduction, 0),
        reference: reference || payments[index].reference || `VPAY-${paymentId}`,
        notes
    };

    window.allVendorPayments = payments;
    saveVendorPaymentsToStorage();
    syncVendorInvoiceBalancesFromPayments();
    document.getElementById('edit-vendor-payment-modal').remove();
    filterVendorPayments();
    showNotification('Vendor payment updated successfully', 'success');
}

function deleteVendorPayment(paymentId) {
    if (!ensureDataActionPermission('delete')) {
        return;
    }

    const payments = loadVendorPaymentsFromStorage() || [];
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
        showNotification('Vendor payment not found', 'error');
        return;
    }

    const confirmed = confirm(`Delete vendor payment ${payment.reference || payment.id}? This cannot be undone.`);
    if (!confirmed) return;

    const updated = payments.filter((p) => p.id !== paymentId);
    window.allVendorPayments = updated;
    saveVendorPaymentsToStorage();
    syncVendorInvoiceBalancesFromPayments();
    filterVendorPayments();
    showNotification('Vendor payment deleted successfully', 'success');
}

function deleteVendorPaymentFromModal(paymentId) {
    const modal = document.getElementById('edit-vendor-payment-modal');
    if (modal) {
        modal.remove();
    }
    deleteVendorPayment(paymentId);
}

function syncClientInvoiceBalancesFromPayments() {
    let invoices = [];

    if (Array.isArray(window.invoicesData) && window.invoicesData.length > 0) {
        invoices = [...window.invoicesData];
    } else {
        try {
            const savedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
            invoices = savedInvoices ? JSON.parse(savedInvoices) : [];
        } catch (error) {
            console.error('Failed to load invoices for payment sync:', error);
            invoices = [];
        }
    }

    if (!Array.isArray(invoices) || invoices.length === 0) {
        return;
    }

    const payments = window.allPayments || loadPaymentsFromStorage() || [];
    const paidByInvoice = {};

    payments.forEach((payment) => {
        if (Array.isArray(payment.lineItems) && payment.lineItems.length > 0) {
            payment.lineItems.forEach((item) => {
                if (!item?.invoiceNo) return;
                paidByInvoice[item.invoiceNo] = (paidByInvoice[item.invoiceNo] || 0) + (Number(item.allocatedAmount) || 0);
            });
            return;
        }

        if (payment?.invoiceNo) {
            const amount = Number(payment.totalAmount || payment.amount || 0);
            paidByInvoice[payment.invoiceNo] = (paidByInvoice[payment.invoiceNo] || 0) + amount;
        }
    });

    const updatedInvoices = invoices.map((invoice) => {
        const invoiceNo = invoice.invoiceNo;
        const invoiceTotal = Number(invoice.totalAmount) || 0;
        const paidAmount = Math.max(Number(paidByInvoice[invoiceNo] || 0), 0);
        const balance = Math.max(invoiceTotal - paidAmount, 0);

        return {
            ...invoice,
            paidAmount,
            balance,
            status: balance <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending'
        };
    });

    window.invoicesData = updatedInvoices;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));
}

// Update invoice statuses after payment
function updateInvoiceStatuses(lineItems) {
    syncClientInvoiceBalancesFromPayments();
}

// Show payment details modal (for multi-invoice payments)
function showPaymentDetails(paymentId) {
    const payment = window.allPayments.find(p => p.id === paymentId);
    
    if (!payment || !payment.lineItems) {
        alert('Payment details not found');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'payment-details-modal';
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
    
    let lineItemsHtml = '';
    payment.lineItems.forEach((item, index) => {
        lineItemsHtml += `
            <tr style="border-bottom: 1px solid var(--gray-200);">
                <td style="padding: 12px; font-weight: 600;">${index + 1}</td>
                <td style="padding: 12px;"><strong>${item.invoiceNo}</strong></td>
                <td style="padding: 12px;">${item.clientName}</td>
                <td style="padding: 12px; text-align: right;">${formatPKR(item.invoiceBalance)}</td>
                <td style="padding: 12px; text-align: right; color: var(--success); font-weight: 600;">${formatPKR(item.allocatedAmount)}</td>
            </tr>
        `;
    });
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 700px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--gray-200);">
                <div>
                    <h2 style="margin: 0;">Payment Details</h2>
                    <p style="margin: 4px 0 0 0; color: var(--gray-600);">Reference: ${payment.reference}</p>
                </div>
                <button onclick="document.getElementById('payment-details-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: var(--gray-100); padding: 16px; border-radius: 6px;">
                <div>
                    <small style="color: var(--gray-600); display: block; margin-bottom: 4px;">Payment Method</small>
                    <strong>${payment.method}</strong>
                </div>
                <div>
                    <small style="color: var(--gray-600); display: block; margin-bottom: 4px;">Payment Date</small>
                    <strong>${payment.paymentDate}</strong>
                </div>
                <div>
                    <small style="color: var(--gray-600); display: block; margin-bottom: 4px;">Client</small>
                    <strong>${payment.clientName}</strong>
                </div>
                <div>
                    <small style="color: var(--gray-600); display: block; margin-bottom: 4px;">Status</small>
                    <span class="badge" style="background: var(--success); color: white;">${payment.status}</span>
                </div>
            </div>
            
            <h3 style="margin: 20px 0 12px 0; font-size: 16px;">Invoice Allocations</h3>
            <div style="overflow-x: auto; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; border: 1px solid var(--gray-200); border-radius: 6px;">
                    <thead>
                        <tr style="background: var(--gray-100); border-bottom: 2px solid var(--gray-300);">
                            <th style="padding: 12px; text-align: left; font-size: 13px;">#</th>
                            <th style="padding: 12px; text-align: left; font-size: 13px;">Invoice No</th>
                            <th style="padding: 12px; text-align: left; font-size: 13px;">Client</th>
                            <th style="padding: 12px; text-align: right; font-size: 13px;">Invoice Balance</th>
                            <th style="padding: 12px; text-align: right; font-size: 13px;">Amount Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${lineItemsHtml}
                    </tbody>
                </table>
            </div>
            
            <div style="background: var(--gray-100); padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--gray-600);">Total Payment Amount:</span>
                    <span style="font-weight: 700; font-size: 16px;">${formatPKR(payment.totalAmount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: var(--gray-600);">Tax Deduction (${payment.taxRate}%):</span>
                    <span style="font-weight: 700; font-size: 16px; color: var(--danger);">- ${formatPKR(payment.taxAmount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid var(--gray-300);">
                    <span style="font-weight: 600; color: var(--gray-700);">Net Payment:</span>
                    <span style="font-weight: 700; font-size: 20px; color: var(--success);">${formatPKR(payment.netAmount)}</span>
                </div>
            </div>
            
            ${payment.notes ? `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--gray-700);">Notes</h4>
                    <p style="margin: 0; padding: 12px; background: var(--gray-50); border-radius: 4px; border: 1px solid var(--gray-200);">${payment.notes}</p>
                </div>
            ` : ''}
            
            <div>
                <button onclick="document.getElementById('payment-details-modal').remove()" class="btn btn-primary" style="width: 100%;">
                    <i class="fas fa-check"></i> Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ============================================ //
// EXPORT GLOBAL FUNCTIONS
// ============================================ //

// Make all functions globally available
window.loadPayments = loadPayments;
window.updatePaymentsHeaderActions = updatePaymentsHeaderActions;
window.setActivePaymentTab = setActivePaymentTab;
window.renderClientPayments = renderClientPayments;
window.renderVendorPayments = renderVendorPayments;
window.renderExpenses = renderExpenses;
window.refreshClientPayments = refreshClientPayments;
window.refreshVendorPayments = refreshVendorPayments;
window.populatePaymentClientDropdown = populatePaymentClientDropdown;
window.filterPaymentTransactions = filterPaymentTransactions;
window.matchesMonthRangeFilterPayment = matchesMonthRangeFilterPayment;
window.resetPaymentFilters = resetPaymentFilters;
window.updatePaymentSummary = updatePaymentSummary;
window.displayPaymentsTable = displayPaymentsTable;
window.filterPayments = filterPayments;
window.filterPaymentsByMethod = filterPaymentsByMethod;
window.showRecordPaymentModal = showRecordPaymentModal;
window.savePayment = savePayment;
window.showEditClientPaymentModal = showEditClientPaymentModal;
window.updateClientPayment = updateClientPayment;
window.deleteClientPayment = deleteClientPayment;
window.deleteClientPaymentFromModal = deleteClientPaymentFromModal;
window.syncClientInvoiceBalancesFromPayments = syncClientInvoiceBalancesFromPayments;
window.showAddVendorModal = showAddVendorModal;
window.saveNewVendor = saveNewVendor;
window.showRecordVendorPaymentModal = showRecordVendorPaymentModal;
window.saveVendorPayment = saveVendorPayment;
window.syncVendorInvoiceBalancesFromPayments = syncVendorInvoiceBalancesFromPayments;
window.showEditVendorPaymentModal = showEditVendorPaymentModal;
window.updateVendorPayment = updateVendorPayment;
window.deleteVendorPayment = deleteVendorPayment;
window.deleteVendorPaymentFromModal = deleteVendorPaymentFromModal;
window.saveVendorsToStorage = saveVendorsToStorage;
window.loadVendorsFromStorage = loadVendorsFromStorage;
window.saveVendorPaymentsToStorage = saveVendorPaymentsToStorage;
window.loadVendorPaymentsFromStorage = loadVendorPaymentsFromStorage;
window.populateVendorDropdown = populateVendorDropdown;
window.filterVendorPayments = filterVendorPayments;
window.displayVendorPaymentsTable = displayVendorPaymentsTable;
window.showPaymentDetails = showPaymentDetails;
window.savePaymentsToStorage = savePaymentsToStorage;
window.loadPaymentsFromStorage = loadPaymentsFromStorage;
window.addInvoiceRow = addInvoiceRow;
window.removeInvoiceRow = removeInvoiceRow;
window.onInvoiceSelected = onInvoiceSelected;
window.onClientFilterChange = onClientFilterChange;
window.calculatePaymentTotals = calculatePaymentTotals;
window.setActiveExpenseSubTab = setActiveExpenseSubTab;
window.showRecordSalaryExpenseModal = showRecordSalaryExpenseModal;
window.calculateExpenseTotals = calculateExpenseTotals;
window.saveSalaryExpense = saveSalaryExpense;
window.showEditSalaryExpenseModal = showEditSalaryExpenseModal;
window.showSalaryExpenseDetailsModal = showSalaryExpenseDetailsModal;
window.printSalaryExpenseDetails = printSalaryExpenseDetails;
window.deleteSalaryExpense = deleteSalaryExpense;
window.displaySalaryExpensesTable = displaySalaryExpensesTable;
window.saveSalaryExpensesToStorage = saveSalaryExpensesToStorage;
window.loadSalaryExpensesFromStorage = loadSalaryExpensesFromStorage;
window.showRecordDailyExpenseModal = showRecordDailyExpenseModal;
window.calculateDailyExpenseTotals = calculateDailyExpenseTotals;
window.saveDailyExpense = saveDailyExpense;
window.showEditDailyExpenseModal = showEditDailyExpenseModal;
window.showDailyExpenseDetailsModal = showDailyExpenseDetailsModal;
window.printDailyExpenseDetails = printDailyExpenseDetails;
window.deleteDailyExpense = deleteDailyExpense;
window.displayDailyExpensesTable = displayDailyExpensesTable;
window.saveDailyExpensesToStorage = saveDailyExpensesToStorage;
window.loadDailyExpensesFromStorage = loadDailyExpensesFromStorage;

// Backward compatibility aliases
window.showRecordExpenseModal = showRecordSalaryExpenseModal;
window.saveExpense = saveSalaryExpense;
window.showEditExpenseModal = showEditSalaryExpenseModal;
window.showExpenseDetailsModal = showSalaryExpenseDetailsModal;
window.printExpenseDetails = printSalaryExpenseDetails;
window.deleteExpense = deleteSalaryExpense;
window.displayExpensesTable = displaySalaryExpensesTable;
window.saveExpensesToStorage = saveSalaryExpensesToStorage;
window.loadExpensesFromStorage = loadSalaryExpensesFromStorage;

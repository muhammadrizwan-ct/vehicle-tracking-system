// Payments Module
async function loadPayments() {
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3>Payments Management</h3>
            <button class="btn btn-primary" onclick="showRecordPaymentModal()">
                <i class="fas fa-plus"></i>
                Record Payment
            </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div class="card">
                <div class="card-header">
                    <h4>Total Collected</h4>
                </div>
                <div class="card-body">
                    <div class="stat-number">${formatPKR(2150000)}</div>
                    <div class="stat-change positive">+12% this month</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h4>Pending Payments</h4>
                </div>
                <div class="card-body">
                    <div class="stat-number">${formatPKR(450000)}</div>
                    <div class="stat-change">23 invoices</div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h4>Collection Rate</h4>
                </div>
                <div class="card-body">
                    <div class="stat-number">82.7%</div>
                    <div class="stat-change">Overdue: ${formatPKR(185000)}</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>Payment Transactions</h3>
                <div style="display: flex; gap: 12px;">
                    <select id="filter-method" onchange="filterPaymentsByMethod(this.value)" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">All Methods</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                    <input type="text" id="search-payments" placeholder="Search transactions..." 
                        onkeyup="filterPayments(this.value)" style="width: 250px; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                </div>
            </div>
            <div class="card-body">
                <div id="payments-table-container"></div>
            </div>
        </div>
    `;
    
    try {
        try {
            const payments = await Promise.race([
                API.getPayments(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayPaymentsTable(payments);
        } catch (e) {
            // Try to load from localStorage first
            const savedPayments = loadPaymentsFromStorage();
            if (savedPayments && savedPayments.length > 0) {
                displayPaymentsTable(savedPayments);
            } else {
                // Use demo data
                displayPaymentsTable([
                    {
                        id: 1,
                        invoiceNo: 'CT001',
                        clientName: 'Connectia Tech',
                        amount: 150000,
                        method: 'Bank Transfer',
                        paymentDate: '2026-02-10',
                        reference: 'TRF-2026-001',
                        status: 'Completed'
                    },
                    {
                        id: 2,
                        invoiceNo: 'CT003',
                        clientName: 'Logistics Plus',
                        amount: 120000,
                        method: 'Cheque',
                        paymentDate: '2026-02-05',
                        reference: 'CHQ-2026-145',
                        status: 'Completed'
                    },
                    {
                        id: 3,
                        invoiceNo: 'CT005',
                        clientName: 'Fleet Management',
                        amount: 50000,
                        method: 'Cash',
                        paymentDate: '2026-02-09',
                        reference: 'CSH-2026-089',
                        status: 'Completed'
                    },
                    {
                        id: 4,
                        invoiceNo: 'CT006',
                        clientName: 'Prime Delivery',
                        amount: 100000,
                        method: 'Bank Transfer',
                        paymentDate: '2026-02-03',
                        reference: 'TRF-2026-002',
                        status: 'Completed'
                    },
                    {
                        id: 5,
                        invoiceNo: 'CT007',
                        clientName: 'Transport Ltd',
                        amount: 85000,
                        method: 'Bank Transfer',
                        paymentDate: '2026-02-01',
                        reference: 'TRF-2026-003',
                        status: 'Completed'
                    }
                ]);
            }
        }
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

function displayPaymentsTable(payments) {
    const container = document.getElementById('payments-table-container');
    
    if (!payments || payments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No payments found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Transaction ID</th>';
    html += '<th>Invoice(s)</th>';
    html += '<th>Client</th>';
    html += '<th>Amount</th>';
    html += '<th>Tax (%)</th>';
    html += '<th>Tax Amount</th>';
    html += '<th>Net Amount</th>';
    html += '<th>Method</th>';
    html += '<th>Date</th>';
    html += '<th>Details</th>';
    html += '</tr></thead><tbody>';
    
    payments.forEach(payment => {
        const taxRate = payment.taxRate || 0;
        const taxAmount = payment.taxAmount || 0;
        const amount = payment.totalAmount || payment.amount || 0;
        const netAmount = payment.netAmount || amount;
        
        html += '<tr>';
        html += `<td><strong>${payment.reference}</strong></td>`;
        
        // Handle line items or single invoice
        if (payment.lineItems && payment.lineItems.length > 0) {
            if (payment.lineItems.length === 1) {
                html += `<td>${payment.lineItems[0].invoiceNo}</td>`;
            } else {
                html += `<td><span class="badge" style="background: var(--primary); color: white;">${payment.lineItems.length} Invoices</span></td>`;
            }
        } else {
            html += `<td>${payment.invoiceNo || '-'}</td>`;
        }
        
        html += `<td>${payment.clientName}</td>`;
        html += `<td>${formatPKR(amount)}</td>`;
        html += `<td style="color: var(--danger);">${taxRate}%</td>`;
        html += `<td style="color: var(--danger);">- ${formatPKR(taxAmount)}</td>`;
        html += `<td style="color: var(--success); font-weight: 700;">${formatPKR(netAmount)}</td>`;
        html += `<td><span class="badge" style="background: #e3f2fd; color: #1976d2;">${payment.method}</span></td>`;
        html += `<td>${payment.paymentDate}</td>`;
        
        // Details button for multi-invoice payments
        if (payment.lineItems && payment.lineItems.length > 1) {
            html += `<td><button class="btn btn-sm btn-secondary" onclick="showPaymentDetails(${payment.id})" title="View Details"><i class="fas fa-eye"></i></button></td>`;
        } else {
            html += '<td>-</td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Store payments for search and filter
    window.allPayments = payments;
}

// Save payments to localStorage
function savePaymentsToStorage() {
    try {
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(window.allPayments || []));
    } catch (error) {
        console.error('Failed to save payments to localStorage:', error);
    }
}

// Load payments from localStorage
function loadPaymentsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error('Failed to load payments from localStorage:', error);
        return null;
    }
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

// Global variable to track invoice rows
let invoiceRowCounter = 0;
let selectedInvoices = [];
let currentClientFilter = '';

function showRecordPaymentModal() {
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
    }, 100);
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
    
    // If no saved invoices, use demo data matching the invoices module
    if (allInvoices.length === 0) {
        allInvoices = [
            { 
                invoiceNo: 'CT0001', 
                clientName: 'Connectia Technologies Pvt Ltd', 
                totalAmount: 149375, 
                paidAmount: 149375, 
                balance: 0, 
                status: 'Paid' 
            },
            { 
                invoiceNo: 'CT0002', 
                clientName: 'Transport Solutions Ltd', 
                totalAmount: 89625, 
                paidAmount: 0, 
                balance: 89625, 
                status: 'Pending' 
            },
            { 
                invoiceNo: 'CT0003', 
                clientName: 'Logistics Plus Pakistan', 
                totalAmount: 239000, 
                paidAmount: 100000, 
                balance: 139000, 
                status: 'Partial' 
            }
        ];
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
    
    // Close modal
    document.getElementById('record-payment-modal').remove();
    
    // Show success message
    const invoiceText = lineItems.length > 1 ? `${lineItems.length} invoices` : `invoice ${lineItems[0].invoiceNo}`;
    showNotification(`Payment of ${formatPKR(netPayment)} recorded successfully for ${invoiceText}!`, 'success');
}

// Update invoice statuses after payment
function updateInvoiceStatuses(lineItems) {
    // Check if we have access to invoicesData
    if (typeof window.invoicesData === 'undefined' || !window.invoicesData) {
        return;
    }
    
    lineItems.forEach(item => {
        const invoice = window.invoicesData.find(inv => inv.invoiceNo === item.invoiceNo);
        if (invoice) {
            // Update invoice payment information
            const currentPaid = invoice.paidAmount || 0;
            const newPaidAmount = currentPaid + item.allocatedAmount;
            const newBalance = (invoice.totalAmount || 0) - newPaidAmount;
            
            invoice.paidAmount = newPaidAmount;
            invoice.balance = newBalance;
            
            // Update status
            if (newBalance <= 0) {
                invoice.status = 'Paid';
            } else if (newPaidAmount > 0) {
                invoice.status = 'Partial';
            }
        }
    });
    
    // Save updated invoices if saveInvoicesToStorage function exists
    if (typeof saveInvoicesToStorage === 'function') {
        saveInvoicesToStorage();
    }
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
window.displayPaymentsTable = displayPaymentsTable;
window.filterPayments = filterPayments;
window.filterPaymentsByMethod = filterPaymentsByMethod;
window.showRecordPaymentModal = showRecordPaymentModal;
window.savePayment = savePayment;
window.showPaymentDetails = showPaymentDetails;
window.savePaymentsToStorage = savePaymentsToStorage;
window.loadPaymentsFromStorage = loadPaymentsFromStorage;
window.addInvoiceRow = addInvoiceRow;
window.removeInvoiceRow = removeInvoiceRow;
window.onInvoiceSelected = onInvoiceSelected;
window.onClientFilterChange = onClientFilterChange;
window.calculatePaymentTotals = calculatePaymentTotals;

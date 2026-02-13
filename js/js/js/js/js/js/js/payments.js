// Payments Module
async function loadPayments() {
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
    html += '<th>Invoice</th>';
    html += '<th>Client</th>';
    html += '<th>Amount</th>';
    html += '<th>Tax (%)</th>';
    html += '<th>Tax Amount</th>';
    html += '<th>Net Amount</th>';
    html += '<th>Method</th>';
    html += '<th>Date</th>';
    html += '</tr></thead><tbody>';
    
    payments.forEach(payment => {
        const taxRate = payment.taxRate || 0;
        const taxAmount = payment.taxAmount || 0;
        const netAmount = payment.netAmount || payment.amount;
        
        html += '<tr>';
        html += `<td><strong>${payment.reference}</strong></td>`;
        html += `<td>${payment.invoiceNo}</td>`;
        html += `<td>${payment.clientName}</td>`;
        html += `<td>${formatPKR(payment.amount)}</td>`;
        html += `<td style="color: var(--danger);">${taxRate}%</td>`;
        html += `<td style="color: var(--danger);">- ${formatPKR(taxAmount)}</td>`;
        html += `<td style="color: var(--success); font-weight: 700;">${formatPKR(netAmount)}</td>`;
        html += `<td><span class="badge" style="background: #e3f2fd; color: #1976d2;">${payment.method}</span></td>`;
        html += `<td>${payment.paymentDate}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Store payments for search and filter
    window.allPayments = payments;
}

function filterPayments(searchTerm) {
    if (!window.allPayments) return;
    
    const filtered = window.allPayments.filter(payment => 
        payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
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
        <div style="background: white; border-radius: 8px; width: 90%; max-width: 650px; padding: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0;">Record Payment</h2>
                <button onclick="document.getElementById('record-payment-modal').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--gray-500);">×</button>
            </div>
            
            <form onsubmit="savePayment(event)" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice No *</label>
                    <select id="payment-invoice" required onchange="loadInvoiceDetails()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Invoice</option>
                        <option value="CT001">CT001 - Connectia Tech</option>
                        <option value="CT002">CT002 - Transport Ltd</option>
                        <option value="CT003">CT003 - Logistics Plus</option>
                        <option value="CT004">CT004 - Prime Delivery</option>
                        <option value="CT005">CT005 - Fleet Management</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Invoice Amount</label>
                    <input type="text" id="invoice-amount" readonly style="width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; box-sizing: border-box; background: var(--gray-100);">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Amount *</label>
                    <input type="number" id="payment-amount" placeholder="Enter amount" min="0" step="0.01" required onchange="calculateTaxDeduction()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Payment Method *</label>
                    <select id="payment-method" required style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Online">Online (JazzCash/EasyPaisa/Debit Card)</option>
                        <option value="Cheque">Cheque</option>
                    </select>
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Rate (%) </label>
                    <input type="number" id="tax-rate" value="0" min="0" max="100" step="0.01" onchange="calculateTaxDeduction()" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div>
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Tax Amount</label>
                    <input type="text" id="tax-amount" readonly style="width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 4px; box-sizing: border-box; background: var(--gray-100);">
                </div>
                
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Reference/Cheque No</label>
                    <input type="text" id="payment-reference" placeholder="e.g., TRF-2026-001 or Cheque No" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box;">
                </div>
                
                <div style="grid-column: 1 / -1;">
                    <label style="display: block; margin-bottom: 6px; font-weight: 600;">Notes (Optional)</label>
                    <textarea id="payment-notes" placeholder="Add payment notes" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 4px; box-sizing: border-box; min-height: 60px;"></textarea>
                </div>
                
                <div style="grid-column: 1 / -1; background: #f9f9f9; padding: 16px; border-radius: 4px; border: 1px solid var(--gray-200);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr;">
                        <div>
                            <small style="color: var(--gray-600);">Payment Amt:</small>
                            <div style="font-weight: 700; font-size: 16px;" id="display-payment">PKR 0</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-600);">Tax Deduction:</small>
                            <div style="font-weight: 700; font-size: 16px; color: var(--danger);" id="display-tax">- PKR 0</div>
                        </div>
                    </div>
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--gray-300);">
                        <small style="color: var(--gray-600);">Net Payment:</small>
                        <div style="font-weight: 700; font-size: 18px; color: var(--success);" id="display-net">PKR 0</div>
                    </div>
                </div>
                
                <div style="grid-column: 1 / -1; display: flex; gap: 12px; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Record Payment</button>
                    <button type="button" onclick="document.getElementById('record-payment-modal').remove()" class="btn" style="flex: 1; background: var(--gray-200); color: var(--gray-800);">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('payment-invoice').focus();
}

function loadInvoiceDetails() {
    const invoiceNo = document.getElementById('payment-invoice').value;
    
    const invoiceAmounts = {
        'CT001': 150000,
        'CT002': 85000,
        'CT003': 120000,
        'CT004': 95000,
        'CT005': 75000
    };
    
    const amount = invoiceAmounts[invoiceNo] || 0;
    document.getElementById('invoice-amount').value = formatPKR(amount);
    document.getElementById('payment-amount').value = amount;
    calculateTaxDeduction();
}

function calculateTaxDeduction() {
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value) || 0;
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    
    const taxAmount = (paymentAmount * taxRate) / 100;
    const netPayment = paymentAmount - taxAmount;
    
    document.getElementById('tax-amount').value = formatPKR(taxAmount);
    document.getElementById('display-payment').textContent = formatPKR(paymentAmount);
    document.getElementById('display-tax').textContent = '- ' + formatPKR(taxAmount);
    document.getElementById('display-net').textContent = formatPKR(netPayment);
}

function savePayment(event) {
    event.preventDefault();
    
    const invoiceNo = document.getElementById('payment-invoice').value;
    const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
    const method = document.getElementById('payment-method').value;
    const taxRate = parseFloat(document.getElementById('tax-rate').value) || 0;
    const taxAmount = (paymentAmount * taxRate) / 100;
    const netPayment = paymentAmount - taxAmount;
    const reference = document.getElementById('payment-reference').value.trim();
    const notes = document.getElementById('payment-notes').value.trim();
    
    if (!invoiceNo || !paymentAmount || !method) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Find client name from invoice
    const invoiceClients = {
        'CT001': 'Connectia Tech',
        'CT002': 'Transport Ltd',
        'CT003': 'Logistics Plus',
        'CT004': 'Prime Delivery',
        'CT005': 'Fleet Management'
    };
    
    // Create new payment object
    const newPayment = {
        id: Math.max(...window.allPayments.map(p => p.id), 0) + 1,
        invoiceNo: invoiceNo,
        clientName: invoiceClients[invoiceNo] || 'Unknown',
        amount: paymentAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        netAmount: netPayment,
        method: method,
        paymentDate: new Date().toISOString().split('T')[0],
        reference: reference || 'AUTO-' + Date.now(),
        status: 'Completed',
        notes: notes
    };
    
    // Add to payments list
    window.allPayments.push(newPayment);
    
    // Update table
    displayPaymentsTable(window.allPayments);
    
    // Close modal
    document.getElementById('record-payment-modal').remove();
    
    // Show success message
    showNotification(`Payment of ${formatPKR(netPayment)} recorded successfully with ${taxRate}% tax deduction!`, 'success');
}

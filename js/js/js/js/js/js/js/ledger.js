// Client Ledger Module
async function loadClientLedger() {
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Client Ledger</h3>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>Ledger Transactions</h3>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <select id="ledger-client" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">All Clients</option>
                        <option value="Connectia Tech">Connectia Tech</option>
                        <option value="Transport Ltd">Transport Ltd</option>
                        <option value="Logistics Plus">Logistics Plus</option>
                        <option value="Prime Delivery Services">Prime Delivery Services</option>
                        <option value="Fleet Management Co">Fleet Management Co</option>
                    </select>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        From: 
                        <input type="date" id="ledger-from-date" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px;">
                        To: 
                        <input type="date" id="ledger-to-date" onchange="filterClientLedger()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                    </label>
                    <button class="btn btn-sm btn-primary" onclick="exportLedgerPDF()">
                        <i class="fas fa-download"></i>
                        Export PDF
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="ledger-summary" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 20px;"></div>
                <div id="ledger-table-container"></div>
            </div>
        </div>
    `;
    
    try {
        try {
            const ledger = await Promise.race([
                API.getClientLedger(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayClientLedger(ledger);
        } catch (e) {
            // Use demo data
            displayClientLedger(generateDemoLedger());
        }
    } catch (error) {
        console.error('Error loading ledger:', error);
    }
    
    // Set date range defaults
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('ledger-from-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('ledger-to-date').value = today.toISOString().split('T')[0];
}

function generateDemoLedger() {
    return [
        { date: '2026-02-01', client: 'Connectia Tech', type: 'Invoice', refNo: 'CT001', debit: 150000, credit: 0, balance: 150000 },
        { date: '2026-02-05', client: 'Connectia Tech', type: 'Payment', refNo: 'PAY-001', debit: 0, credit: 150000, balance: 0 },
        { date: '2026-02-08', client: 'Transport Ltd', type: 'Invoice', refNo: 'CT002', debit: 85000, credit: 0, balance: 85000 },
        { date: '2026-02-10', client: 'Logistics Plus', type: 'Invoice', refNo: 'CT003', debit: 120000, credit: 0, balance: 120000 },
        { date: '2026-02-12', client: 'Logistics Plus', type: 'Payment', refNo: 'PAY-002', debit: 0, credit: 120000, balance: 0 },
        { date: '2026-02-01', client: 'Prime Delivery Services', type: 'Invoice', refNo: 'CT004', debit: 95000, credit: 0, balance: 95000 },
        { date: '2026-02-08', client: 'Fleet Management Co', type: 'Invoice', refNo: 'CT005', debit: 75000, credit: 0, balance: 75000 },
        { date: '2026-02-05', client: 'Fleet Management Co', type: 'Payment', refNo: 'PAY-003', debit: 0, credit: 50000, balance: 25000 },
    ];
}

function displayClientLedger(ledger) {
    window.allLedger = ledger;
    displayLedgerTable(ledger);
    displayLedgerSummary(ledger);
}

function displayLedgerSummary(ledger) {
    const summaryEl = document.getElementById('ledger-summary');
    
    const totalDebit = ledger.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = ledger.reduce((sum, l) => sum + (l.credit || 0), 0);
    const balance = totalDebit - totalCredit;
    
    const clientCount = new Set(ledger.map(l => l.client)).size;
    
    summaryEl.innerHTML = `
        <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <small style="color: var(--gray-600);">Total Debit</small>
            <div style="font-size: 20px; font-weight: 700; color: #2563eb;">${formatPKR(totalDebit)}</div>
        </div>
        
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">
            <small style="color: var(--gray-600);">Total Credit</small>
            <div style="font-size: 20px; font-weight: 700; color: #059669;">${formatPKR(totalCredit)}</div>
        </div>
        
        <div style="background: ${balance > 0 ? '#fef3c7' : '#ecfdf5'}; padding: 16px; border-radius: 8px; border-left: 4px solid ${balance > 0 ? '#f59e0b' : '#059669'};">
            <small style="color: var(--gray-600);">Balance</small>
            <div style="font-size: 20px; font-weight: 700; color: ${balance > 0 ? '#f59e0b' : '#059669'};">${formatPKR(balance)}</div>
        </div>
        
        <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <small style="color: var(--gray-600);">No. of Clients</small>
            <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${clientCount}</div>
        </div>
    `;
}

function displayLedgerTable(ledger) {
    const container = document.getElementById('ledger-table-container');
    
    if (!ledger || ledger.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No ledger entries found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Date</th>';
    html += '<th>Client Name</th>';
    html += '<th>Type</th>';
    html += '<th>Reference No</th>';
    html += '<th>Debit (Dr)</th>';
    html += '<th>Credit (Cr)</th>';
    html += '<th>Balance</th>';
    html += '</tr></thead><tbody>';
    
    ledger.forEach(entry => {
        const typeClass = entry.type === 'Invoice' ? 'background: #fef3c7; color: #92400e;' : 'background: #ecfdf5; color: #065f46;';
        const balanceClass = entry.balance > 0 ? 'color: var(--danger);' : 'color: var(--success);';
        
        html += '<tr>';
        html += `<td>${entry.date}</td>`;
        html += `<td><strong>${entry.client}</strong></td>`;
        html += `<td><span style="${typeClass}; padding: 4px 8px; border-radius: 4px;">${entry.type}</span></td>`;
        html += `<td>${entry.refNo}</td>`;
        html += `<td>${entry.debit > 0 ? formatPKR(entry.debit) : '-'}</td>`;
        html += `<td>${entry.credit > 0 ? formatPKR(entry.credit) : '-'}</td>`;
        html += `<td style="${balanceClass} font-weight: 700;">${formatPKR(entry.balance)}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function filterClientLedger() {
    const client = document.getElementById('ledger-client').value;
    const fromDate = document.getElementById('ledger-from-date').value;
    const toDate = document.getElementById('ledger-to-date').value;
    
    let filtered = window.allLedger || [];
    
    if (client) {
        filtered = filtered.filter(l => l.client === client);
    }
    
    if (fromDate) {
        filtered = filtered.filter(l => l.date >= fromDate);
    }
    
    if (toDate) {
        filtered = filtered.filter(l => l.date <= toDate);
    }
    
    displayLedgerTable(filtered);
    displayLedgerSummary(filtered);
}

function exportLedgerPDF() {
    alert('Export Ledger to PDF - Coming Soon!');
}

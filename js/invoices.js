// ============================================ //
// INVOICES MODULE - Vehicle Tracking System
// Professional Invoice Format with Letterhead Support
// Version: 2.5 | Date: March 2024
// ============================================ //

// Global variables
let currentInvoicesPage = 1;
let invoicesData = [];
// Make invoicesData accessible globally
window.invoicesData = invoicesData;

// Main function to load invoices page
async function loadInvoices() {
    const contentEl = document.getElementById('content-body');
    const permissions = Auth.permissions;
    
    // Header action buttons
    let actionButtons = '';
    if (permissions.canManageInvoices) {
        actionButtons = `
            <button class="btn btn-primary" onclick="showGenerateInvoiceModal()">
                <i class="fas fa-plus"></i>
                Generate Invoice
            </button>
            <button class="btn btn-secondary" onclick="exportInvoices()">
                <i class="fas fa-download"></i>
                Export
            </button>
        `;
    }
    
    document.getElementById('header-actions').innerHTML = actionButtons;
    
    // Main content HTML
    contentEl.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">
                    <!-- Search Box -->
                    <div style="position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--gray-400);"></i>
                        <input 
                            type="text" 
                            id="invoice-search" 
                            placeholder="Search invoices..." 
                            style="padding: 10px 16px 10px 40px; border: 2px solid var(--gray-200); border-radius: var(--radius); width: 250px;"
                            onkeyup="filterInvoices()"
                        >
                    </div>
                    
                    <!-- Status Filter -->
                    <select id="invoice-status-filter" onchange="filterInvoices()" style="padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius);">
                        <option value="">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                    
                    <!-- Month Filter -->
                    <select id="invoice-month-filter" onchange="filterInvoices()" style="padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius);">
                        <option value="">All Months</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                    </select>
                    
                    <!-- Year Filter -->
                    <select id="invoice-year-filter" onchange="filterInvoices()" style="padding: 10px; border: 2px solid var(--gray-200); border-radius: var(--radius);">
                        ${generateYearOptions()}
                    </select>
                    
                    <!-- Refresh Button -->
                    <button class="btn btn-sm btn-secondary" onclick="refreshInvoicesList()" style="margin-left: auto;">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                </div>
            </div>
            
            <div class="card-body">
                <!-- Summary Cards -->
                <div id="invoices-summary" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
                    <!-- Summary will be loaded here -->
                </div>
                
                <!-- Invoices Table -->
                <div id="invoices-table" class="table-responsive">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--gray-400);"></i>
                        <p style="margin-top: 16px; color: var(--gray-500);">Loading invoices...</p>
                    </div>
                </div>
                
                <!-- Pagination -->
                <div id="invoices-pagination" style="margin-top: 20px; display: flex; justify-content: center; gap: 8px;"></div>
            </div>
        </div>
        
        <!-- Hidden iframe for PDF printing -->
        <iframe id="pdf-print-frame" style="display: none;"></iframe>
    `;
    
    // Load invoices data
    await refreshInvoicesList();
}

// Refresh invoices list from API
async function refreshInvoicesList() {
    try {
        const response = await API.getInvoices({
            page: currentInvoicesPage,
            limit: CONFIG.ITEMS_PER_PAGE
        });
        
        invoicesData = response.invoices || response;
        window.invoicesData = invoicesData; // Update global reference
        saveInvoicesToStorage();
        displayInvoices(invoicesData);
        updateInvoicesSummary(invoicesData);
        updatePagination(response.total, currentInvoicesPage, CONFIG.ITEMS_PER_PAGE, 'invoices-pagination', (page) => {
            currentInvoicesPage = page;
            refreshInvoicesList();
        });
        
        // Add event delegation for invoice action buttons
// Add onclick handlers for each invoice action
        attachInvoiceEventListeners();
        
    } catch (error) {
        console.error('Failed to load invoices:', error);
        // Try to load from localStorage first
        const savedInvoices = loadInvoicesFromStorage();
        if (savedInvoices && savedInvoices.length > 0) {
            invoicesData = savedInvoices;
            window.invoicesData = invoicesData; // Update global reference
        } else {
            // Load demo data for testing if no saved invoices
            loadDemoInvoices();
        }
        displayInvoices(invoicesData);
        updateInvoicesSummary(invoicesData);
        attachInvoiceEventListeners();
    }
}

// Attach event listeners for invoice action buttons
function attachInvoiceEventListeners() {
    // Event listeners are now handled via onclick attributes
    // This function is kept for compatibility
}

// Direct onclick handlers for invoice actions
function handleInvoiceViewClick(invoiceNo, event) {
    event.preventDefault();
    event.stopPropagation();
    viewInvoicePDF(invoiceNo);
}

function handleInvoiceDownloadClick(invoiceNo, event) {
    event.preventDefault();
    event.stopPropagation();
    downloadInvoicePDF(invoiceNo);
}

function handleInvoiceDetailsClick(invoiceNo, event) {
    event.preventDefault();
    event.stopPropagation();
    showInvoiceDetails(invoiceNo);
}

function handleInvoicePaymentClick(invoiceNo, event) {
    event.preventDefault();
    event.stopPropagation();
    recordPaymentForInvoice(invoiceNo);
}

// Load demo invoices for testing
function loadDemoInvoices() {
    invoicesData = [
        {
            invoiceNo: 'CT0001',
            invoiceDate: '2026-02-01',
            clientId: 'CLT001',
            clientName: 'Connectia Technologies Pvt Ltd',
            month: 'February BILL',
            dueDate: '2026-02-21',
            status: 'Paid',
            vehicleCount: 5,
            subtotal: 125000,
            taxAmount: 24375,
            totalAmount: 149375,
            paidAmount: 149375,
            balance: 0,
            invoiceType: 'detailed'
        },
        {
            invoiceNo: 'CT0002',
            invoiceDate: '2026-02-05',
            clientId: 'CLT002',
            clientName: 'Transport Solutions Ltd',
            month: 'February BILL',
            dueDate: '2026-02-25',
            status: 'Pending',
            vehicleCount: 3,
            subtotal: 75000,
            taxAmount: 14625,
            totalAmount: 89625,
            paidAmount: 0,
            balance: 89625,
            invoiceType: 'grouped'
        },
        {
            invoiceNo: 'CT0003',
            invoiceDate: '2026-02-08',
            clientId: 'CLT003',
            clientName: 'Logistics Plus Pakistan',
            month: 'February BILL',
            dueDate: '2026-02-28',
            status: 'Partial',
            vehicleCount: 8,
            subtotal: 200000,
            taxAmount: 39000,
            totalAmount: 239000,
            paidAmount: 100000,
            balance: 139000,
            invoiceType: 'summary'
        }
    ];
    
    window.invoicesData = invoicesData; // Update global reference
    displayInvoices(invoicesData);
    updateInvoicesSummary(invoicesData);
    attachInvoiceEventListeners();
}

// Save invoices to localStorage
function saveInvoicesToStorage() {
    try {
        window.invoicesData = invoicesData; // Always sync global reference
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoicesData));
    } catch (error) {
        console.error('Failed to save invoices to localStorage:', error);
    }
}

// Load invoices from localStorage
function loadInvoicesFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
        return saved ? JSON.parse(saved) : null;
    } catch (error) {
        console.error('Failed to load invoices from localStorage:', error);
        return null;
    }
}

// Display invoices in table
function displayInvoices(invoices) {
    const permissions = Auth.permissions;
    
    if (!invoices || invoices.length === 0) {
        document.getElementById('invoices-table').innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-file-invoice" style="font-size: 48px; color: var(--gray-400);"></i>
                <h3 style="margin: 20px 0 10px; color: var(--gray-600);">No Invoices Found</h3>
                <p style="color: var(--gray-500); margin-bottom: 20px;">Generate your first invoice to get started</p>
                ${permissions.canManageInvoices ? 
                    '<button class="btn btn-primary" onclick="showGenerateInvoiceModal()">Generate Invoice</button>' : 
                    ''
                }
            </div>
        `;
        return;
    }
    
    let html = '<table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Invoice No</th>';
    html += '<th>Date</th>';
    html += '<th>Client</th>';
    html += '<th>Month</th>';
    html += '<th>Vehicles</th>';
    html += '<th>Amount</th>';
    html += '<th>Paid</th>';
    html += '<th>Balance</th>';
    html += '<th>Due Date</th>';
    html += '<th>Status</th>';
    
    if (permissions.canManageInvoices || permissions.canManagePayments) {
        html += '<th>Actions</th>';
    }
    
    html += '</tr></thead><tbody>';
    
    invoices.forEach(inv => {
        const statusClass = `status-${inv.status?.toLowerCase() || 'pending'}`;
        const isOverdue = new Date(inv.dueDate) < new Date() && inv.status !== 'Paid';
        
        html += '<tr>';
        html += `<td><strong>${inv.invoiceNo}</strong></td>`;
        html += `<td>${formatDate(inv.invoiceDate)}</td>`;
        html += `<td>${inv.clientName || 'Unknown'}</td>`;
        html += `<td>${inv.month || '-'}</td>`;
        html += `<td style="text-align: center;">${inv.vehicleCount || 0}</td>`;
        html += `<td style="font-weight: 600;">${formatPKR(inv.totalAmount)}</td>`;
        html += `<td style="color: var(--success);">${formatPKR(inv.paidAmount || 0)}</td>`;
        html += `<td style="color: ${inv.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${formatPKR(inv.balance)}</td>`;
        html += `<td style="${isOverdue ? 'color: var(--danger); font-weight: 600;' : ''}">${formatDate(inv.dueDate)}</td>`;
        html += `<td><span class="status-badge ${statusClass}">${inv.status || 'Pending'}</span></td>`;
        
        if (permissions.canManageInvoices || permissions.canManagePayments) {
            html += '<td>';
            html += `<button class="btn btn-sm btn-primary" onclick="handleInvoiceViewClick('${inv.invoiceNo.replace(/'/g, "\\'")}', event)" title="View/Print Invoice" style="margin-right: 4px;">`;
            html += '<i class="fas fa-eye"></i> View';
            html += '</button>';
            
            html += `<button class="btn btn-sm btn-success" onclick="handleInvoiceDownloadClick('${inv.invoiceNo.replace(/'/g, "\\'")}', event)" title="Download as PDF" style="margin-right: 4px;">`;
            html += '<i class="fas fa-download"></i> PDF';
            html += '</button>';
            
            html += `<button class="btn btn-sm btn-secondary" onclick="handleInvoiceDetailsClick('${inv.invoiceNo.replace(/'/g, "\\'")}', event)" title="View Details">`;
            html += '<i class="fas fa-info-circle"></i>';
            html += '</button>';
            
            if (inv.status !== 'Paid' && permissions.canManagePayments) {
                html += `<button class="btn btn-sm btn-success" onclick="handleInvoicePaymentClick('${inv.invoiceNo.replace(/'/g, "\\'")}', event)" title="Record Payment">`;
                html += '<i class="fas fa-money-bill"></i>';
                html += '</button>';
            }
            
            html += '</td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    document.getElementById('invoices-table').innerHTML = html;
}

// Update summary cards
function updateInvoicesSummary(invoices) {
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const totalPending = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const paidCount = invoices.filter(inv => inv.status === 'Paid').length;
    const pendingCount = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Partial').length;
    
    const summaryEl = document.getElementById('invoices-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                <div style="font-size: 12px; color: var(--gray-500);">Total Invoices</div>
                <div style="font-size: 24px; font-weight: 700;">${invoices.length}</div>
                <div style="font-size: 12px; color: var(--gray-500); margin-top: 4px;">${paidCount} Paid, ${pendingCount} Pending</div>
            </div>
            <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                <div style="font-size: 12px; color: var(--gray-500);">Total Amount</div>
                <div style="font-size: 24px; font-weight: 700;">${formatPKR(totalAmount)}</div>
            </div>
            <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                <div style="font-size: 12px; color: var(--gray-500);">Total Received</div>
                <div style="font-size: 24px; font-weight: 700; color: var(--success);">${formatPKR(totalPaid)}</div>
            </div>
            <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                <div style="font-size: 12px; color: var(--gray-500);">Pending Amount</div>
                <div style="font-size: 24px; font-weight: 700; color: var(--danger);">${formatPKR(totalPending)}</div>
            </div>
        `;
    }
}

// Filter invoices based on search and filters
function filterInvoices() {
    const searchTerm = document.getElementById('invoice-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('invoice-status-filter')?.value || '';
    const monthFilter = document.getElementById('invoice-month-filter')?.value || '';
    const yearFilter = document.getElementById('invoice-year-filter')?.value || '';
    
    const filtered = invoicesData.filter(inv => {
        const matchesSearch = inv.invoiceNo?.toLowerCase().includes(searchTerm) ||
                             inv.clientName?.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || inv.status === statusFilter;
        const matchesMonth = !monthFilter || inv.month?.includes(monthFilter);
        const matchesYear = !yearFilter || (inv.invoiceDate && inv.invoiceDate.includes(yearFilter));
        
        return matchesSearch && matchesStatus && matchesMonth && matchesYear;
    });
    
    displayInvoices(filtered);
    updateInvoicesSummary(filtered);
}

// Generate year options for dropdown
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    let options = '';
    
    for (let year = currentYear - 2; year <= currentYear + 1; year++) {
        options += `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`;
    }
    
    return options;
}

// Update pagination
function updatePagination(total, currentPage, limit, containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button class="btn btn-sm btn-secondary" onclick="(${callback})(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
             </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" 
                            onclick="(${callback})(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 8px;">...</span>`;
        }
    }
    
    // Next button
    html += `<button class="btn btn-sm btn-secondary" onclick="(${callback})(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
             </button>`;
    
    container.innerHTML = html;
}

// ============================================ //
// PROFESSIONAL INVOICE GENERATION
// WITH LETTERHEAD SPACING - MATCHING GOOGLE SHEETS APP
// ============================================ //

// View and print invoice PDF
function viewInvoicePDF(invoiceNo) {
    // Find invoice data
    const invoice = invoicesData.find(inv => inv.invoiceNo === invoiceNo) || 
                   { invoiceNo, clientName: 'Client', totalAmount: 0, status: 'Pending' };
    
    // Generate professional invoice HTML
    const invoiceHTML = generateProfessionalInvoiceHTML(invoice);
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
    } else {
        showNotification('Popup blocked! Please allow popups for this site.', 'error');
    }
}

// Download invoice as PDF
function downloadInvoicePDF(invoiceNo) {
    try {
        // Find invoice data
        const invoice = invoicesData.find(inv => inv.invoiceNo === invoiceNo) || 
                       { invoiceNo, clientName: 'Client', totalAmount: 0, status: 'Pending' };
        
        // Generate invoice HTML
        const invoiceHTML = generateProfessionalInvoiceHTML(invoice);
        
        // Create a temporary div and add to document
        const element = document.createElement('div');
        element.innerHTML = invoiceHTML;
        element.style.display = 'none';
        document.body.appendChild(element);
        
        // Extract just the invoice content div
        const invoiceContent = element.querySelector('.invoice-container') || element;
        
        // PDF options
        const options = {
            margin: [10, 10, 10, 10],
            filename: `Invoice_${invoiceNo}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, allowTaint: true },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        // Generate and download PDF using html2pdf
        if (typeof html2pdf !== 'undefined') {
            html2pdf()
                .set(options)
                .from(invoiceContent)
                .save()
                .then(() => {
                    // Remove temporary element
                    if (document.body.contains(element)) {
                        document.body.removeChild(element);
                    }
                    showNotification(`Invoice ${invoiceNo} downloaded successfully!`, 'success');
                })
                .catch((error) => {
                    if (document.body.contains(element)) {
                        document.body.removeChild(element);
                    }
                    showNotification(`Failed to generate PDF: ${error.message}`, 'error');
                });
        } else {
            if (document.body.contains(element)) {
                document.body.removeChild(element);
            }
            showNotification('PDF library not loaded. Please refresh the page.', 'error');
        }
    } catch (error) {
        showNotification('Error downloading invoice: ' + error.message, 'error');
    }
}

// Show invoice details modal
function showInvoiceDetails(invoiceNo) {
    const invoice = invoicesData.find(inv => inv.invoiceNo === invoiceNo);
    if (!invoice) {
        showNotification('Invoice not found', 'error');
        return;
    }
    
    const content = generateInvoiceDetailsHTML(invoice);
    showModal(`Invoice Details: ${invoiceNo}`, content);
}

// ============================================ //
// PROFESSIONAL INVOICE HTML TEMPLATE
// WITH 0.75 INCH TOP MARGIN FOR LETTERHEAD
// NO DOTTED LINES - CLEAN PROFESSIONAL FORMAT
// ============================================ //

function generateProfessionalInvoiceHTML(invoice) {
    const invoiceDate = formatDateForInvoice(invoice.invoiceDate);
    const dueDate = formatDateForInvoice(invoice.dueDate);
    const subtotal = invoice.subtotal || invoice.totalAmount || 0;
    const taxAmount = invoice.taxAmount || (subtotal * CONFIG.TAX_RATE) || 0;
    const totalAmount = invoice.totalAmount || (subtotal + taxAmount) || 0;
    const paidAmount = invoice.paidAmount || 0;
    const balance = invoice.balance || (totalAmount - paidAmount) || 0;
    const status = invoice.status || 'Pending';
    
    // Get company config
    const companyName = CONFIG.COMPANY_NAME || 'Connectia Technologies Pvt Ltd';
    const bankName = 'Bank Islami Pakistan LTD';
    const iban = 'PK11BKIP0305415786690001';
    const ntn = '9794829-3';
    const strn = '3277876323252';
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoiceNo}</title>
    <style>
        /* PROFESSIONAL INVOICE STYLES - MATCHING GOOGLE SHEETS APP */
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                background: white;
            }
            @page { 
                margin: 0.75in 0.5in 0.5in 0.5in; 
                size: A4 portrait; 
            }
            .no-print { display: none !important; }
            .invoice-content { box-shadow: none; }
        }
        
        * {
            box-sizing: border-box;
            font-family: 'Arial', 'Helvetica', sans-serif;
            color: #000000;
        }
        
        body {
            margin: 0;
            padding: 0;
            background: white;
            display: flex;
            justify-content: center;
        }
        
        /* TOP MARGIN OF 0.75 INCH FOR LETTERHEAD - EXACTLY AS REQUESTED */
        .header-space {
            height: 0.75in;
            width: 100%;
            margin-bottom: 20px;
        }
        
        .invoice-container {
            width: 100%;
            max-width: 8in;
            margin: 0 auto;
            background: white;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            padding: 0;
        }
        
        .invoice-content {
            padding: 0 8px 8px 8px;
        }
        
        /* INVOICE TITLE - BOLD, CLEAN, NO DOTTED LINES */
        .invoice-title {
            text-align: center;
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.3px;
            margin: 2px 0 2px 0;
            padding-bottom: 2px;
            border-bottom: none;
            color: #1e40af;
            text-transform: uppercase;
        }
        
        /* COMPANY DETAILS SECTION */
        .company-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 6px 8px;
            background: white;
            border-radius: 3px;
            border-left: 2px solid #2563eb;
        }
        
        .company-info {
            font-size: 12px;
            line-height: 1.4;
        }
        
        .invoice-meta {
            text-align: right;
            font-size: 12px;
            font-size: 12px;
            line-height: 1.5;
        }
        
        /* CLIENT AND INVOICE DETAILS GRID */
        .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 6px;
            padding: 8px;
            background: white;
            border: none;
            border-radius: 0;
        }
        
        .details-box {
            line-height: 1.5;
            font-size: 12px;
        }
        
        .section-label {
            font-weight: 700;
            margin-bottom: 6px;
            font-size: 12px;
            color: #1e40af;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }
        
        /* MONTH BILLED - HIGHLIGHTED */
        .month-billed {
            background: white;
            color: #1e40af;
            padding: 4px 8px;
            border-radius: 0;
            font-weight: 700;
            font-size: 13px;
            display: inline-block;
            margin-top: 2px;
            border: 1px solid #1e40af;
        }
        
        /* ITEMS TABLE - PROFESSIONAL FORMAT */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0;
            font-size: 12px;
            border: 1px solid #000000;
        }
        
        .items-table th {
            background-color: #374151;
            color: white;
            border: 1px solid #000000;
            padding: 8px 6px;
            text-align: left;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
        }
        
        .items-table td {
            border: 1px solid #000000;
            padding: 6px 5px;
            vertical-align: top;
        }
        
        .items-table tfoot tr {
            background-color: white;
        }
        
        .items-table tfoot td {
            font-weight: 600;
            border: 1px solid #000000;
        }
        
        /* TOTALS BOX - RIGHT ALIGNED */
        .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-top: 6px;
        }
        
        .totals-box {
            width: 50%;
            border: none;
            padding: 0;
            background-color: white;
            border-radius: 0;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 3px 0;
            border-bottom: none;
            font-size: 12px;
        }
        
        .total-amount-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0 0 0;
            margin-top: 3px;
            border-top: none;
            font-size: 14px;
            font-weight: 700;
            color: #1e40af;
        }
        
        /* BANK INFORMATION SECTION */
        .bank-info {
            margin-top: 4px;
            padding: 12px;
            background-color: white;
            border-radius: 0;
            border: 1px solid #000;
            font-size: 13px;
            line-height: 1.6;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .bank-info-title {
            font-weight: 700;
            margin-bottom: 8px;
            color: #1e40af;
            font-size: 15px;
            grid-column: 1 / -1;
        }
        
        /* FOOTER NOTE - CLEAN, NO DOTTED LINES */
        .footer-note {
            text-align: center;
            font-size: 10px;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #000000;
            color: #4b5563;
            font-style: italic;
        }
        
        /* PRINT TOOLBAR */
        .print-toolbar {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            padding: 12px 18px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            border: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
        }
        
        .print-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s;
        }
        
        .print-btn:hover {
            background: #1e40af;
            transform: translateY(-1px);
        }
        
        .close-btn {
            background: #6b7280;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .status-badge {
            padding: 6px 14px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            display: inline-block;
            text-transform: uppercase;
        }
        
        .status-paid { background: #d1fae5; color: #059669; }
        .status-partial { background: #fef3c7; color: #d97706; }
        .status-pending { background: #fee2e2; color: #dc2626; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-bold { font-weight: 700; }
        
        hr {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <!-- PRINT TOOLBAR - WILL NOT PRINT -->
    <div class="print-toolbar no-print">
        <button class="print-btn" onclick="window.print()">
            <i class="fas fa-print"></i> Print Invoice
        </button>
        <button class="close-btn" onclick="window.close()">
            <i class="fas fa-times"></i> Close
        </button>
    </div>

    <div class="invoice-container">
        <!-- 0.75 INCH TOP SPACE FOR LETTERHEAD - EXACTLY AS REQUESTED -->
        <div class="header-space"></div>
        
        <div class="invoice-content">
            <!-- INVOICE TITLE - CLEAN, NO DOTTED LINES -->
            <div class="invoice-title">SALES TAX INVOICE</div>
            
            <!-- BILL TO AND INVOICE DETAILS -->
            <div class="details-grid">
                <div class="details-box">
                    <div class="section-label">BILL TO:</div>
                    <div style="font-size: 14px; font-weight: 700; margin-bottom: 3px;">${invoice.clientName || 'Client Name'}</div>
                    <div style="font-size: 12px; line-height: 1.4;">${invoice.clientAddress || 'Client Address'}</div>
                    <div style="font-size: 12px; line-height: 1.4;">Phone: ${invoice.clientPhone || 'N/A'}</div>
                    <div style="font-size: 12px; line-height: 1.4;">Email: ${invoice.clientEmail || 'client@example.com'}</div>
                    <div style="margin-top: 4px; font-size: 11px;"><strong>NTN:</strong> ${invoice.clientNTN || 'N/A'}</div>
                    <div style="font-size: 11px;"><strong>STRN:</strong> ${invoice.clientSTRN || 'N/A'}</div>
                </div>
                
                <div class="details-box" style="text-align: right;">
                    <div class="section-label">INVOICE DETAILS:</div>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 5px;">
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;">Invoice No:</td>
                            <td style="padding: 4px 0; font-weight: 700;">${invoice.invoiceNo}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;">Invoice Date:</td>
                            <td style="padding: 4px 0;">${invoiceDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;">Due Date:</td>
                            <td style="padding: 4px 0; font-weight: ${new Date(invoice.dueDate) < new Date() && status !== 'Paid' ? '700; color: #dc2626;' : '400;'}">${dueDate}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;">Bill Month:</td>
                            <td style="padding: 4px 0;"><span class="month-billed">${invoice.month || 'Monthly Service'}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #4b5563;">Status:</td>
                            <td style="padding: 4px 0;"><span class="status-badge status-${status.toLowerCase()}">${status}</span></td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- INVOICE ITEMS TABLE - PROFESSIONAL FORMAT -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th width="5%" style="text-align: center;">#</th>
                        <th width="50%">Vehicle / Service Description</th>
                        <th width="15%" style="text-align: right;">Unit Price</th>
                        <th width="15%" style="text-align: right;">Sales Tax (19.5%)</th>
                        <th width="15%" style="text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${generateInvoiceItemsRows(invoice)}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">Subtotal:</td>
                        <td style="text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">-</td>
                        <td style="text-align: right; font-weight: 700; border-bottom: 1px solid #000000;">${formatPKRForInvoice(subtotal)}</td>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: right;">Sales Tax (19.5%):</td>
                        <td style="text-align: right;">${formatPKRForInvoice(taxAmount)}</td>
                        <td style="text-align: right;">${formatPKRForInvoice(taxAmount)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <!-- TOTALS SECTION - RIGHT ALIGNED -->
            <div class="totals-container">
                <div class="totals-box">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span style="font-weight: 600;">${formatPKRForInvoice(subtotal)}</span>
                    </div>
                    <div class="total-row">
                        <span>Sales Tax (19.5%):</span>
                        <span style="font-weight: 600;">${formatPKRForInvoice(taxAmount)}</span>
                    </div>
                    <div class="total-amount-row">
                        <span>TOTAL AMOUNT:</span>
                        <span style="color: #1e40af;">${formatPKRForInvoice(totalAmount)}</span>
                    </div>
                </div>
            </div>
            
            <!-- 1 inch footer space for company signature and letterhead -->
            <div style="height: 1in; margin-top: 6px; border-top: 1px solid #ddd; padding-top: 8px;"></div>
            
            <!-- BANK PAYMENT INFORMATION -->
            <div class="bank-info">
                <div class="bank-info-title" style="font-size: 14px;">PAYMENT INFORMATION</div>
                <div style="font-size: 13px; line-height: 1.8; margin-top: 8px;">
                    <div><strong>Account Title:</strong> Connectia Technologies Pvt Ltd</div>
                    <div><strong>Bank Name:</strong> Bank Islami Pakistan LTD</div>
                    <div><strong>Account Number:</strong> 0305415786690001</div>
                </div>
                <div style="font-size: 13px; line-height: 1.8; margin-top: 8px;">
                    <div><strong>IBAN:</strong> PK11BKIP0305415786690001</div>
                    <div><strong>NTN:</strong> 9794829-3</div>
                    <div><strong>STRN:</strong> 3277876323252</div>
                </div>
                <div style="grid-column: 1 / -1; margin-top: 10px; font-size: 12px; color: #4b5563; border-top: 1px solid #dbeafe; padding-top: 12px;">
                    <strong>Terms:</strong> Payment is due within ${CONFIG.PAYMENT_TERMS_DAYS} days of invoice date. 
                    Please include invoice number with your payment.
                </div>
            </div>
        </div>
    </div>
    
    <!-- Font Awesome for icons (print toolbar) -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <script>
        // Auto-trigger print dialog when page loads? Set to false to let user click print button
        window.onload = function() {
            // Uncomment the line below if you want print dialog to open automatically
            // setTimeout(function() { window.print(); }, 500);
        };
        
        // Format PKR currency helper
        function formatPKR(amount) {
            return "PKR " + parseFloat(amount).toLocaleString('en-PK', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    </script>
</body>
</html>`;
}

// Generate invoice items rows based on invoice type
function generateInvoiceItemsRows(invoice) {
    let rows = '';
    let srNo = 1;
    
    // If we have actual items from the invoice
    if (invoice.items && invoice.items.length > 0) {
        if (invoice.invoiceType === 'category-details') {
            const descriptionMode = invoice.descriptionMode || 'categories-only';
            // Fleet Details: Show fleet name with vehicle count below
            const categories = {};
            invoice.items.forEach(item => {
                const category = item.category || 'Uncategorized';
                if (!categories[category]) categories[category] = [];
                categories[category].push(item);
            });
            
            Object.keys(categories).sort().forEach(category => {
                const categoryItems = categories[category];
                const categoryTotal = categoryItems.reduce((sum, item) => sum + (item.unitPrice || 0), 0);
                const categoryTax = categoryTotal * CONFIG.TAX_RATE;
                
                rows += `<tr>`;
                rows += `<td style="text-align: center; font-weight: 600;">${srNo++}</td>`;
                const vehicleList = categoryItems
                    .map(item => item.registrationNo || item.vehicleName || 'N/A')
                    .join(', ');
                const vehiclesLine = descriptionMode === 'include-vehicles'
                    ? `<br><span style="font-size: 9px; color: #6b7280;">Vehicles: ${vehicleList}</span>`
                    : '';
                     rows += `<td>
                                     <strong style="font-size: 11px;">${category}</strong><br>
                                     <span style="font-size: 9px; color: #6b7280; font-style: italic;">Count: ${categoryItems.length} vehicle${categoryItems.length > 1 ? 's' : ''}</span>
                                     ${vehiclesLine}
                                 </td>`;
                rows += `<td style="text-align: center;">${categoryItems.length}</td>`;
                rows += `<td style="text-align: right;">${formatPKR(categoryTotal / categoryItems.length)}</td>`;
                rows += `<td style="text-align: right; font-weight: 600;">${formatPKR(categoryTotal)}</td>`;
                rows += `</tr>`;
            });
        } else {
            // Vehicle Details: Show all individual vehicles with registration numbers
            invoice.items.forEach(item => {
                rows += `<tr>`;
                rows += `<td style="text-align: center; font-weight: 600;">${srNo++}</td>`;
                rows += `<td>
                            <strong style="font-size: 11px;">${item.registrationNo || 'N/A'}</strong><br>
                            <span style="font-size: 9px; color: #6b7280;">${item.brand || ''} ${item.model || ''} - ${item.category || 'N/A'}</span>
                         </td>`;
                rows += `<td style="text-align: center;">1</td>`;
                rows += `<td style="text-align: right;">${formatPKR(item.unitPrice || 0)}</td>`;
                rows += `<td style="text-align: right; font-weight: 600;">${formatPKR(item.unitPrice || 0)}</td>`;
                rows += `</tr>`;
            });
        }
    } else {
        // Default item if no items provided
        rows += `<tr>`;
        rows += `<td style="text-align: center;">1</td>`;
        rows += `<td><strong>Vehicle Tracking Services</strong><br><span style="font-size: 10px; color: #6b7280;">Monthly Fleet Management - ${invoice.month || 'Current Month'}</span></td>`;
        rows += `<td style="text-align: right;">${formatPKRForInvoice(invoice.subtotal || invoice.totalAmount || 0)}</td>`;
        rows += `<td style="text-align: right;">${formatPKRForInvoice(invoice.taxAmount || (invoice.totalAmount * CONFIG.TAX_RATE) || 0)}</td>`;
        rows += `<td style="text-align: right;">${formatPKRForInvoice(invoice.totalAmount || 0)}</td>`;
        rows += `</tr>`;
    }
    
    return rows;
}

// Generate invoice details HTML for modal
function generateInvoiceDetailsHTML(invoice) {
    return `
        <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Invoice Information</h4>
                    <table style="width: 100%;">
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Invoice No:</td><td style="padding: 6px 0; font-weight: 600;">${invoice.invoiceNo}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Date:</td><td style="padding: 6px 0;">${formatDate(invoice.invoiceDate)}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Month:</td><td style="padding: 6px 0; font-weight: 600; color: var(--primary);">${invoice.month}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Due Date:</td><td style="padding: 6px 0;">${formatDate(invoice.dueDate)}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Status:</td><td style="padding: 6px 0;"><span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span></td></tr>
                    </table>
                </div>
                <div style="background: var(--gray-100); padding: 16px; border-radius: var(--radius);">
                    <h4 style="margin-bottom: 12px; color: var(--primary);">Client Information</h4>
                    <table style="width: 100%;">
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Name:</td><td style="padding: 6px 0; font-weight: 600;">${invoice.clientName}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Vehicles:</td><td style="padding: 6px 0;">${invoice.vehicleCount || 0}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Total Amount:</td><td style="padding: 6px 0; font-weight: 600;">${formatPKR(invoice.totalAmount)}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Paid Amount:</td><td style="padding: 6px 0; color: var(--success); font-weight: 600;">${formatPKR(invoice.paidAmount || 0)}</td></tr>
                        <tr><td style="padding: 6px 0; color: var(--gray-600);">Balance:</td><td style="padding: 6px 0; color: ${invoice.balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${formatPKR(invoice.balance)}</td></tr>
                    </table>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button class="btn btn-primary" onclick="viewInvoicePDF('${invoice.invoiceNo}')">
                    <i class="fas fa-file-pdf"></i> View/Print Invoice
                </button>
            </div>
        </div>
    `;
}

// ============================================ //
// INVOICE GENERATION MODAL
// ============================================ //

// Show generate invoice modal
async function showGenerateInvoiceModal() {
    try {
        // Get clients for dropdown
        let clientsList = [];
        try {
            const response = await API.getClients({ limit: 1000 });
            clientsList = response.clients || response;
        } catch (e) {
            // Demo clients
            clientsList = [
                { clientId: 'CLT001', name: 'Connectia Technologies Pvt Ltd', status: 'Active' },
                { clientId: 'CLT002', name: 'Transport Solutions Ltd', status: 'Active' },
                { clientId: 'CLT003', name: 'Logistics Plus Pakistan', status: 'Active' }
            ];
        }
        
        // Get next invoice number
        const nextInvoiceNo = await getNextInvoiceNumber();
        
        const content = `
            <form id="generate-invoice-form" onsubmit="return false;">
                <!-- Invoice Header with Letterhead Spacing Notice -->
                <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 12px; margin-bottom: 20px; font-size: 13px;">
                    <i class="fas fa-info-circle" style="color: #2563eb;"></i> 
                    <strong>Print Ready:</strong> Generated invoices include 0.75 inch top margin for letterhead printing.
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label>Invoice Number</label>
                        <input type="text" id="invoice-no" value="${nextInvoiceNo}" readonly style="background: var(--gray-100); font-weight: 600;">
                    </div>
                    
                    <div class="form-group">
                        <label>Invoice Date</label>
                        <input type="date" id="invoice-date" value="${new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Select Client *</label>
                    <select id="invoice-client" onchange="loadClientVehiclesForInvoice()" required style="width: 100%; padding: 12px;">
                        <option value="">-- Select Client --</option>
                        ${clientsList.filter(c => c.status === 'Active').map(client => 
                            `<option value="${client.clientId || client.id}">${client.name}</option>`
                        ).join('')}
                    </select>
                </div>
                
                <div id="vehicles-selection" style="display: none;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Select Vehicles</label>
                    
                    <div style="background: var(--gray-100); padding: 12px; border-radius: var(--radius); margin-bottom: 12px;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="selectAllVehicles()">
                            <i class="fas fa-check-square"></i> Select All
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="deselectAllVehicles()">
                            <i class="fas fa-square"></i> Deselect All
                        </button>
                        <span id="selected-count" style="margin-left: 12px; font-size: 13px; color: var(--gray-600);"></span>
                    </div>
                    
                    <div id="vehicles-list" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--gray-200); border-radius: var(--radius); padding: 12px;">
                        <!-- Vehicles will be loaded here -->
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px;">
                    <div class="form-group">
                        <label>Billing Month *</label>
                        <select id="invoice-month" required style="width: 100%; padding: 12px;">
                            <option value="January BILL">January BILL</option>
                            <option value="February BILL" selected>February BILL</option>
                            <option value="March BILL">March BILL</option>
                            <option value="April BILL">April BILL</option>
                            <option value="May BILL">May BILL</option>
                            <option value="June BILL">June BILL</option>
                            <option value="July BILL">July BILL</option>
                            <option value="August BILL">August BILL</option>
                            <option value="September BILL">September BILL</option>
                            <option value="October BILL">October BILL</option>
                            <option value="November BILL">November BILL</option>
                            <option value="December BILL">December BILL</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="invoice-due-date" value="${getDefaultDueDate()}" required>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label>Display Format *</label>
                        <select id="invoice-type" onchange="updateInvoicePreview()" style="width: 100%; padding: 12px;">
                            <option value="vehicle-details">Vehicle Details (Show all vehicles)</option>
                            <option value="category-details">Fleet Details (Show fleet name with count)</option>
                        </select>
                        <small style="color: var(--gray-600); font-size: 12px; margin-top: 4px; display: block;">
                            <span id="format-hint">Shows registration numbers and details of each vehicle.</span>
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label>Tax Rate (%)</label>
                        <input type="number" id="tax-rate" value="${CONFIG.TAX_RATE * 100}" step="0.1" readonly style="background: var(--gray-100);">
                    </div>
                </div>
                
                <div id="description-mode-wrapper" class="form-group" style="margin-top: 8px; display: none;">
                    <label>Description Detail</label>
                    <select id="description-mode" onchange="updateInvoicePreview()" style="width: 100%; padding: 12px;">
                        <option value="categories-only">Show fleet names only</option>
                        <option value="include-vehicles">Show all vehicles in description</option>
                    </select>
                    <small style="color: var(--gray-600); font-size: 12px; margin-top: 4px; display: block;">
                        Applies when using Fleet Details.
                    </small>
                </div>
                
                <div id="invoice-preview" style="margin-top: 20px; padding: 16px; background: var(--gray-100); border-radius: var(--radius); display: none;">
                    <h4 style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                        <i class="fas fa-file-invoice" style="color: var(--primary);"></i>
                        Invoice Preview
                    </h4>
                    <div id="preview-content"></div>
                </div>
            </form>
        `;
        
        showModal('Generate Professional Invoice', content, async (modal) => {
            const clientId = document.getElementById('invoice-client').value;
            const invoiceNo = document.getElementById('invoice-no').value;
            const month = document.getElementById('invoice-month').value;
            const invoiceDate = document.getElementById('invoice-date').value;
            const dueDate = document.getElementById('invoice-due-date').value;
            const invoiceType = document.getElementById('invoice-type').value;
            const descriptionMode = document.getElementById('description-mode')?.value || 'categories-only';
            
            if (!clientId) {
                showNotification('Please select a client', 'error');
                return false;
            }
            
            // Get selected vehicles
            const selectedVehicles = [];
            document.querySelectorAll('.vehicle-checkbox:checked').forEach(cb => {
                selectedVehicles.push({
                    vehicleId: cb.value,
                    registrationNo: cb.dataset.reg,
                    vehicleName: cb.dataset.name,
                    category: cb.dataset.category || 'Uncategorized',
                    monthlyRate: parseFloat(cb.dataset.rate)
                });
            });
            
            if (selectedVehicles.length === 0) {
                showNotification('Please select at least one vehicle', 'error');
                return false;
            }
            
            try {
                // Create invoice object
                const client = clientsList.find(c => (c.clientId || c.id) === clientId);
                
                const subtotal = selectedVehicles.reduce((sum, v) => sum + v.monthlyRate, 0);
                const taxAmount = subtotal * CONFIG.TAX_RATE;
                const totalAmount = subtotal + taxAmount;
                
                const newInvoice = {
                    invoiceNo,
                    clientId,
                    clientName: client?.name || 'Client',
                    invoiceDate,
                    dueDate,
                    month,
                    status: 'Pending',
                    vehicleCount: selectedVehicles.length,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    paidAmount: 0,
                    balance: totalAmount,
                    invoiceType,
                    descriptionMode,
                    items: selectedVehicles,
                    createdDate: new Date().toISOString()
                };
                
                // Add to local array
                invoicesData.unshift(newInvoice);
                window.invoicesData = invoicesData; // Update global reference
                saveInvoicesToStorage();
                displayInvoices(invoicesData);
                updateInvoicesSummary(invoicesData);
                
                showNotification(`✅ Invoice ${invoiceNo} generated successfully!`, 'success');
                
                // Ask if user wants to view/print invoice
                setTimeout(() => {
                    if (confirm('Invoice generated successfully! Would you like to view/print it now?')) {
                        viewInvoicePDF(invoiceNo);
                    }
                }, 500);
                
                return true;
            } catch (error) {
                showNotification(error.message || 'Failed to generate invoice', 'error');
                return false;
            }
        });
        
    } catch (error) {
        console.error('Failed to load clients:', error);
        showNotification('Failed to load clients. Please try again.', 'error');
    }
}

// Load client vehicles for invoice generation
async function loadClientVehiclesForInvoice() {
    const clientId = document.getElementById('invoice-client').value;
    const vehiclesDiv = document.getElementById('vehicles-selection');
    const vehiclesList = document.getElementById('vehicles-list');
    
    if (!clientId) {
        vehiclesDiv.style.display = 'none';
        return;
    }
    
    vehiclesList.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading vehicles...</div>';
    vehiclesDiv.style.display = 'block';
    
    try {
        let vehicles = [];
        try {
            vehicles = await API.getClientVehicles(clientId);
        } catch (e) {
            // Demo vehicles
            vehicles = [
                { vehicleId: 'V001', registrationNo: 'LEH-456', vehicleName: 'Toyota Fortuner', category: 'SUV', monthlyRate: 45000, status: 'Active' },
                { vehicleId: 'V002', registrationNo: 'ISB-789', vehicleName: 'Hino 500', category: 'Truck', monthlyRate: 65000, status: 'Active' },
                { vehicleId: 'V003', registrationNo: 'KHI-123', vehicleName: 'Suzuki Alto', category: 'Hatchback', monthlyRate: 15000, status: 'Active' },
                { vehicleId: 'V004', registrationNo: 'LHR-567', vehicleName: 'Honda Civic', category: 'Sedan', monthlyRate: 35000, status: 'Active' },
                { vehicleId: 'V005', registrationNo: 'RWP-890', vehicleName: 'Toyota Hilux', category: 'Pickup', monthlyRate: 55000, status: 'Active' }
            ];
        }
        
        if (!vehicles || vehicles.length === 0) {
            vehiclesList.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px;">No active vehicles found for this client.</p>';
            return;
        }
        
        // Group vehicles by category
        const categories = {};
        vehicles.forEach(vehicle => {
            const category = vehicle.category || 'Uncategorized';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(vehicle);
        });
        
        let html = '';
        let totalVehicles = 0;
        
        Object.keys(categories).sort().forEach(category => {
            const categoryVehicles = categories[category];
            const categoryTotal = categoryVehicles.reduce((sum, v) => sum + (v.monthlyRate || 0), 0);
            totalVehicles += categoryVehicles.length;
            
            html += `<div style="margin-bottom: 16px;">`;
            html += `<div style="background: var(--gray-800); color: white; padding: 10px 12px; border-radius: 6px; display: flex; align-items: center;">`;
            html += `<label style="display: flex; align-items: center; cursor: pointer; flex: 1;">`;
            html += `<input type="checkbox" class="category-select-all" data-category="${category}" onchange="toggleCategoryVehicles('${category}')" style="margin-right: 12px;" checked>`;
            html += `<span style="font-weight: 600;">${category}</span>`;
            html += `<span style="margin-left: auto; font-size: 13px;">${categoryVehicles.length} vehicles - ${formatPKR(categoryTotal)}/month</span>`;
            html += `</label>`;
            html += `</div>`;
            
            html += `<div id="category-${category.replace(/[^a-zA-Z0-9]/g, '-')}" style="padding: 8px 0;">`;
            
            categoryVehicles.forEach(vehicle => {
                html += `
                    <div style="display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--gray-200);">
                        <input type="checkbox" class="vehicle-checkbox" data-category="${category}" 
                               value="${vehicle.vehicleId}" data-reg="${vehicle.registrationNo}" 
                               data-name="${vehicle.vehicleName}" data-rate="${vehicle.monthlyRate}" 
                               data-category="${category}" style="margin-right: 12px;" 
                               onchange="updateSelectedCount(); updateInvoicePreview();" checked>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 600;">${vehicle.registrationNo}</span>
                                <span style="font-size: 12px; color: var(--gray-500);">${vehicle.vehicleName}</span>
                            </div>
                            <div style="font-size: 11px; color: var(--gray-500); margin-top: 2px;">
                                <span class="badge" style="background: var(--gray-200); padding: 2px 8px; border-radius: 999px;">
                                    ${vehicle.category || 'Uncategorized'}
                                </span>
                            </div>
                        </div>
                        <div style="font-weight: 600; color: var(--success);">${formatPKR(vehicle.monthlyRate)}</div>
                    </div>
                `;
            });
            
            html += `</div>`;
            html += `</div>`;
        });
        
        vehiclesList.innerHTML = html;
        updateSelectedCount();
        updateInvoicePreview();
        
    } catch (error) {
        console.error('Failed to load vehicles:', error);
        vehiclesList.innerHTML = '<p style="color: var(--danger); text-align: center; padding: 20px;">Failed to load vehicles. Please try again.</p>';
    }
}

// Toggle all vehicles in a category
function toggleCategoryVehicles(category) {
    const categoryCheckbox = document.querySelector(`.category-select-all[data-category="${category}"]`);
    const vehicleCheckboxes = document.querySelectorAll(`.vehicle-checkbox[data-category="${category}"]`);
    
    vehicleCheckboxes.forEach(cb => {
        cb.checked = categoryCheckbox.checked;
    });
    
    updateSelectedCount();
    updateInvoicePreview();
}

// Select all vehicles
function selectAllVehicles() {
    document.querySelectorAll('.vehicle-checkbox').forEach(cb => {
        cb.checked = true;
    });
    document.querySelectorAll('.category-select-all').forEach(cb => {
        cb.checked = true;
    });
    updateSelectedCount();
    updateInvoicePreview();
}

// Deselect all vehicles
function deselectAllVehicles() {
    document.querySelectorAll('.vehicle-checkbox').forEach(cb => {
        cb.checked = false;
    });
    document.querySelectorAll('.category-select-all').forEach(cb => {
        cb.checked = false;
    });
    updateSelectedCount();
    updateInvoicePreview();
}

// Update selected vehicles count
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.vehicle-checkbox:checked');
    const countEl = document.getElementById('selected-count');
    if (countEl) {
        countEl.innerHTML = `<strong>${checkboxes.length}</strong> vehicle${checkboxes.length !== 1 ? 's' : ''} selected`;
    }
}

// Update invoice preview
function updateInvoicePreview() {
    const previewDiv = document.getElementById('invoice-preview');
    const previewContent = document.getElementById('preview-content');
    const invoiceType = document.getElementById('invoice-type')?.value;
    const formatHint = document.getElementById('format-hint');
    const descriptionMode = document.getElementById('description-mode')?.value;
    const descriptionModeWrapper = document.getElementById('description-mode-wrapper');
    
    // Update format hint
    if (formatHint) {
        if (invoiceType === 'category-details') {
            formatHint.textContent = descriptionMode === 'include-vehicles'
                ? 'Shows fleet names with all vehicles listed in the description.'
                : 'Shows fleet names with vehicle count below each fleet.';
        } else {
            formatHint.textContent = 'Shows registration numbers and details of each vehicle.';
        }
    }
    if (descriptionModeWrapper) {
        descriptionModeWrapper.style.display = invoiceType === 'category-details' ? 'block' : 'none';
    }
    
    const checkboxes = document.querySelectorAll('.vehicle-checkbox:checked');
    
    if (checkboxes.length === 0) {
        previewDiv.style.display = 'none';
        return;
    }
    
    let subtotal = 0;
    const categories = {};
    
    checkboxes.forEach(cb => {
        const rate = parseFloat(cb.dataset.rate || 0);
        subtotal += rate;
        
        const category = cb.dataset.category || 'Uncategorized';
        if (!categories[category]) {
            categories[category] = { count: 0, total: 0 };
        }
        categories[category].count++;
        categories[category].total += rate;
    });
    
    const taxAmount = subtotal * CONFIG.TAX_RATE;
    const grandTotal = subtotal + taxAmount;
    
    let previewHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--gray-300);">
            <span style="color: var(--gray-600);">Selected Vehicles:</span>
            <span style="font-weight: 700;">${checkboxes.length}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--gray-600);">Fleets:</span>
            <span style="font-weight: 700;">${Object.keys(categories).length}</span>
        </div>
    `;
    
    // Show fleet breakdown
    Object.keys(categories).sort().forEach(category => {
        const cat = categories[category];
        previewHTML += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; padding-left: 8px;">
                <span style="color: var(--gray-600);">${category} (${cat.count}):</span>
                <span>${formatPKR(cat.total)}</span>
            </div>
        `;
    });
    
    previewHTML += `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; margin-top: 8px;">
            <span style="color: var(--gray-600);">Subtotal:</span>
            <span>${formatPKR(subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--gray-600);">Sales Tax (${(CONFIG.TAX_RATE * 100).toFixed(1)}%):</span>
            <span>${formatPKR(taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 2px solid var(--gray-300);">
            <span style="font-weight: 700; font-size: 16px;">Grand Total:</span>
            <span style="font-weight: 700; font-size: 16px; color: var(--primary);">${formatPKR(grandTotal)}</span>
        </div>
    `;
    
    previewContent.innerHTML = previewHTML;
    previewDiv.style.display = 'block';
}

// ============================================ //
// UTILITY FUNCTIONS
// ============================================ //

// Get next invoice number
async function getNextInvoiceNumber() {
    try {
        const response = await API.getNextInvoiceNumber();
        return response.invoiceNo || 'CT0001';
    } catch (error) {
        // Generate next number from existing invoices
        let maxNum = 0;
        invoicesData.forEach(inv => {
            const num = parseInt(inv.invoiceNo?.replace('CT', '') || '0');
            if (num > maxNum) maxNum = num;
        });
        return 'CT' + (maxNum + 1).toString().padStart(4, '0');
    }
}

// Get default due date (invoice date + payment terms)
function getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + CONFIG.PAYMENT_TERMS_DAYS);
    return date.toISOString().split('T')[0];
}

// Format date for invoice display
function formatDateForInvoice(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
}

// Format PKR for invoice
function formatPKRForInvoice(amount) {
    if (amount === undefined || amount === null) return 'PKR 0.00';
    return 'PKR ' + parseFloat(amount).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Export invoices to Excel
function exportInvoices() {
    try {
        const data = invoicesData.map(inv => ({
            'Invoice No': inv.invoiceNo,
            'Date': formatDate(inv.invoiceDate),
            'Client': inv.clientName,
            'Month': inv.month,
            'Vehicles': inv.vehicleCount || 0,
            'Subtotal': inv.subtotal || 0,
            'Tax': inv.taxAmount || 0,
            'Total': inv.totalAmount || 0,
            'Paid': inv.paidAmount || 0,
            'Balance': inv.balance || inv.totalAmount || 0,
            'Due Date': formatDate(inv.dueDate),
            'Status': inv.status || 'Pending'
        }));
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
        XLSX.writeFile(wb, `invoices_export_${new Date().getTime()}.xlsx`);
        
        showNotification('Invoices exported successfully', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Failed to export invoices', 'error');
    }
}

// Record payment for invoice
function recordPaymentForInvoice(invoiceNo) {
    const invoice = invoicesData.find(inv => inv.invoiceNo === invoiceNo);
    if (!invoice) {
        showNotification('Invoice not found', 'error');
        return;
    }
    
    const balance = invoice.balance || (invoice.totalAmount - (invoice.paidAmount || 0));
    
    const content = `
        <form id="payment-form">
            <div class="form-group">
                <label>Invoice</label>
                <input type="text" value="${invoiceNo} - ${invoice.month}" readonly style="background: var(--gray-100);">
            </div>
            <div class="form-group">
                <label>Client</label>
                <input type="text" value="${invoice.clientName}" readonly style="background: var(--gray-100);">
            </div>
            <div class="form-group">
                <label>Balance Due</label>
                <input type="text" value="${formatPKR(balance)}" readonly style="background: var(--gray-100); color: var(--danger); font-weight: 600;">
            </div>
            <div class="form-group">
                <label>Payment Amount *</label>
                <input type="number" id="payment-amount" step="0.01" min="0" max="${balance}" value="${balance}" required>
            </div>
            <div class="form-group">
                <label>Payment Date *</label>
                <input type="date" id="payment-date" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Payment Mode *</label>
                <select id="payment-mode" required>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                </select>
            </div>
            <div class="form-group">
                <label>Remarks</label>
                <textarea id="payment-remarks" rows="2"></textarea>
            </div>
        </form>
    `;
    
    showModal('Record Payment', content, async (modal) => {
        const amount = parseFloat(document.getElementById('payment-amount').value);
        
        if (!amount || amount <= 0) {
            showNotification('Please enter a valid amount', 'error');
            return false;
        }
        
        if (amount > balance) {
            showNotification('Amount cannot exceed balance due', 'error');
            return false;
        }
        
        // Update invoice
        const paidAmount = (invoice.paidAmount || 0) + amount;
        const newBalance = (invoice.totalAmount || 0) - paidAmount;
        
        invoice.paidAmount = paidAmount;
        invoice.balance = newBalance;
        
        if (newBalance <= 0) {
            invoice.status = 'Paid';
        } else if (paidAmount > 0) {
            invoice.status = 'Partial';
        }
        
        saveInvoicesToStorage();
        displayInvoices(invoicesData);
        updateInvoicesSummary(invoicesData);
        
        showNotification(`✅ Payment of ${formatPKR(amount)} recorded successfully!`, 'success');
        return true;
    });
}

// ============================================ //
// EXPORT GLOBAL FUNCTIONS
// ============================================ //

// Make all functions globally available
window.loadInvoices = loadInvoices;
window.refreshInvoicesList = refreshInvoicesList;
window.filterInvoices = filterInvoices;
window.showGenerateInvoiceModal = showGenerateInvoiceModal;
window.viewInvoicePDF = viewInvoicePDF;
window.showInvoiceDetails = showInvoiceDetails;
window.recordPaymentForInvoice = recordPaymentForInvoice;
window.exportInvoices = exportInvoices;
window.loadClientVehiclesForInvoice = loadClientVehiclesForInvoice;
window.toggleCategoryVehicles = toggleCategoryVehicles;
window.selectAllVehicles = selectAllVehicles;
window.deselectAllVehicles = deselectAllVehicles;
window.updateSelectedCount = updateSelectedCount;
window.updateInvoicePreview = updateInvoicePreview;
window.getNextInvoiceNumber = getNextInvoiceNumber;
window.saveInvoicesToStorage = saveInvoicesToStorage;
// Reports Module
async function loadReports() {
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Reports & Analytics</h3>
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
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>Vehicle Fleet Analysis</h3>
                </div>
                <div class="card-body">
                    <canvas id="fleet-analysis-chart"></canvas>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>Collection Efficiency</h3>
                </div>
                <div class="card-body">
                    <canvas id="collection-efficiency-chart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <div class="card-header">
                <h3>Generate Reports</h3>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary btn-sm" onclick="generatePDFReport()">
                        <i class="fas fa-file-pdf"></i>
                        Export PDF
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="generateExcelReport()">
                        <i class="fas fa-file-excel"></i>
                        Export Excel
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div id="report-options">
                    <label style="display: block; margin-bottom: 12px;">
                        <input type="checkbox" checked> Revenue Report
                    </label>
                    <label style="display: block; margin-bottom: 12px;">
                        <input type="checkbox" checked> Payment Collections
                    </label>
                    <label style="display: block; margin-bottom: 12px;">
                        <input type="checkbox" checked> Vehicle Details
                    </label>
                    <label style="display: block; margin-bottom: 12px;">
                        <input type="checkbox" checked> Client Summary
                    </label>
                </div>
            </div>
        </div>
    `;
    
    // Generate demo charts
    generateRevenueReportChart();
    generateClientDistributionChart();
    generateFleetAnalysisChart();
    generateCollectionEfficiencyChart();
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
                    backgroundColor: '#e3f2fd'
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

function generateFleetAnalysisChart() {
    try {
        const ctx = document.getElementById('fleet-analysis-chart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        
        new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: ['Sedan', 'SUV', 'Truck', 'Van', 'Pickup'],
                datasets: [{
                    label: 'Fleet Count',
                    data: [35, 28, 20, 18, 26],
                    backgroundColor: '#7c3aed'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (e) {
        console.warn('Chart error:', e);
    }
}

function generateCollectionEfficiencyChart() {
    try {
        const ctx = document.getElementById('collection-efficiency-chart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        
        new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Collection %',
                    data: [75, 78, 81, 85],
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
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

function generateRevenueReport() {
    alert('Generate Revenue Report - Coming Soon!');
}

function generatePDFReport() {
    alert('Export PDF Report - Coming Soon!');
}

function generateExcelReport() {
    alert('Export Excel Report - Coming Soon!');
}

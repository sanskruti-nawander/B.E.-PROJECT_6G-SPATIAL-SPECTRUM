// Manual Tab Variables
const form = document.getElementById('allocationForm');
const submitBtn = document.getElementById('submitBtn');
const loadingState = document.getElementById('loadingState');
const resultsContainer = document.getElementById('resultsContainer');
const emptyState = document.getElementById('emptyState');
const demandContainer = document.getElementById('demandInputsContainer');
const multiselectDisplay = document.getElementById('multiselectDisplay');
const multiselectDropdown = document.getElementById('multiselectDropdown');
const regionSearch = document.getElementById('regionSearch');
const regionOptions = document.getElementById('regionOptions');
const selectedCount = document.getElementById('selectedCount');

// Real-Time Variables
let realtimeInterval = null;
let isRealtimeActive = false;
const rtRegionCheckboxes = document.getElementById('rtRegionCheckboxes');
const rtSliders = document.getElementById('rtSliders');
const rtResultsContainer = document.getElementById('rtResultsContainer');
const rtEmptyState = document.getElementById('rtEmptyState');
const rtLoadingState = document.getElementById('rtLoadingState');

// Dashboard Variables
let dashboardCharts = {};
let lastRealtimeData = null;
let lastRealtimeRegions = null;
let bandChart = null;
const allRegions = [
    'Kerala', 'Tamil Nadu', 'Andhra Pradesh', 'Karnataka', 'Telangana',
    'Maharashtra', 'Gujarat', 'Rajasthan', 'Delhi', 'Uttar Pradesh',
    'West Bengal', 'Punjab', 'Haryana', 'Madhya Pradesh', 'Bihar',
    'Odisha', 'Assam', 'Jharkhand', 'Chhattisgarh', 'Goa'
];

let selectedRegions = ['Kerala', 'Tamil Nadu', 'Andhra Pradesh'];
let rtSelectedRegions = ['Kerala', 'Tamil Nadu', 'Andhra Pradesh'];

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'manual') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('manualTab').classList.add('active');
        if (isRealtimeActive) stopRealtime();
    } else if (tab === 'realtime') {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('realtimeTab').classList.add('active');
        initializeRealtimeTab();
    } else if (tab === 'dashboard') {
        document.querySelector('.tab-btn:nth-child(3)').classList.add('active');
        document.getElementById('dashboardTab').classList.add('active');
        initializeDashboard();
    }
}

// Initialize Manual Tab
renderRegionOptions();
updateDisplay();
updateDemandInputs();

multiselectDisplay.addEventListener('click', () => {
    multiselectDropdown.classList.toggle('show');
    multiselectDisplay.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-multiselect')) {
        multiselectDropdown.classList.remove('show');
        multiselectDisplay.classList.remove('open');
    }
});

regionSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = regionOptions.querySelectorAll('.multiselect-option');
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchTerm) ? 'flex' : 'none';
    });
});

function renderRegionOptions() {
    regionOptions.innerHTML = '';
    allRegions.forEach(region => {
        const isSelected = selectedRegions.includes(region);
        const option = document.createElement('div');
        option.className = `multiselect-option ${isSelected ? 'selected' : ''}`;
        option.innerHTML = `
            <input type="checkbox" id="region_${region.replace(/\s+/g, '_')}" ${isSelected ? 'checked' : ''}>
            <label for="region_${region.replace(/\s+/g, '_')}">${region}</label>
        `;
        option.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                const checkbox = option.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
            toggleRegion(region);
        });
        regionOptions.appendChild(option);
    });
}

function toggleRegion(region) {
    const index = selectedRegions.indexOf(region);
    if (index > -1) {
        selectedRegions.splice(index, 1);
    } else {
        if (selectedRegions.length < 3) {
            selectedRegions.push(region);
        } else {
            alert('Maximum 3 regions can be selected');
            return;
        }
    }
    renderRegionOptions();
    updateDisplay();
    updateDemandInputs();
}

function updateDisplay() {
    multiselectDisplay.innerHTML = '';
    selectedCount.textContent = selectedRegions.length;
    if (selectedRegions.length === 0) {
        multiselectDisplay.innerHTML = '<span class="multiselect-placeholder">Click to select regions...</span>';
    } else {
        selectedRegions.forEach(region => {
            const tag = document.createElement('div');
            tag.className = 'selected-tag';
            tag.innerHTML = `${region}<span class="remove">×</span>`;
            tag.querySelector('.remove').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleRegion(region);
            });
            multiselectDisplay.appendChild(tag);
        });
    }
}

function updateDemandInputs() {
    demandContainer.innerHTML = '';
    const defaultValues = {
        'Kerala': 20,
        'Tamil Nadu': 1.5,
        'Andhra Pradesh': 40
    };
    selectedRegions.forEach(region => {
        const demandItem = document.createElement('div');
        demandItem.className = 'demand-item';
        demandItem.innerHTML = `
            <label>${region}</label>
            <input type="number" id="demand${region.replace(/\s+/g, '')}" 
                   value="${defaultValues[region] || 10}" step="0.1" required>
        `;
        demandContainer.appendChild(demandItem);
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (selectedRegions.length !== 3) {
        alert('Please select exactly 3 regions');
        return;
    }

    const demand = {};
    selectedRegions.forEach(region => {
        const inputId = `demand${region.replace(/\s+/g, '')}`;
        demand[region] = parseFloat(document.getElementById(inputId).value);
    });

    const requestData = {
        region: document.getElementById('region').value,
        regions: selectedRegions,
        bands: ["low", "mid", "high"],
        use_case: document.getElementById('useCase').value,
        demand: demand
    };

    const apiEndpoint = document.getElementById('apiEndpoint').value;
    submitBtn.disabled = true;
    loadingState.style.display = 'block';
    resultsContainer.classList.remove('show');
    emptyState.style.display = 'none';

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const data = await response.json();
        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        resultsContainer.innerHTML = `
            <div style="padding: 20px; background: #ffebee; border-radius: 8px; color: #c62828;">
                <strong>Error:</strong> Failed to fetch allocation. Please check your API endpoint and try again.
                <br><br><small>${error.message}</small>
            </div>
        `;
        resultsContainer.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        loadingState.style.display = 'none';
    }
});

// Real-Time Functions
function initializeRealtimeTab() {
    renderRealtimeRegionCheckboxes();
    updateRealtimeSliders();
}

function renderRealtimeRegionCheckboxes() {
    rtRegionCheckboxes.innerHTML = '';
    allRegions.forEach(region => {
        const isChecked = rtSelectedRegions.includes(region);
        const checkbox = document.createElement('label');
        checkbox.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; background: #f5f5f5; border-radius: 5px;';
        checkbox.innerHTML = `
            <input type="checkbox" ${isChecked ? 'checked' : ''} 
                   onchange="toggleRealtimeRegion('${region}')" 
                   style="width: 18px; height: 18px; cursor: pointer;">
            <span style="flex: 1;">${region}</span>
        `;
        rtRegionCheckboxes.appendChild(checkbox);
    });
}

window.toggleRealtimeRegion = function(region) {
    const index = rtSelectedRegions.indexOf(region);
    if (index > -1) {
        if (rtSelectedRegions.length > 1) {
            rtSelectedRegions.splice(index, 1);
        } else {
            alert('At least 1 region must be selected');
            renderRealtimeRegionCheckboxes();
            return;
        }
    } else {
        if (rtSelectedRegions.length < 3) {
            rtSelectedRegions.push(region);
        } else {
            alert('Maximum 3 regions can be selected');
            renderRealtimeRegionCheckboxes();
            return;
        }
    }
    updateRealtimeSliders();
};

function updateRealtimeSliders() {
    rtSliders.innerHTML = '';
    const defaultValues = {
        'Kerala': 20,
        'Tamil Nadu': 1.5,
        'Andhra Pradesh': 40
    };

    rtSelectedRegions.forEach(region => {
        const sliderGroup = document.createElement('div');
        sliderGroup.className = 'slider-group';
        const regionId = region.replace(/\s+/g, '');
        const defaultVal = defaultValues[region] || 10;
        
        sliderGroup.innerHTML = `
            <div class="slider-header">
                <label>${region} Demand</label>
                <span class="slider-value" id="value_${regionId}">${defaultVal} MHz</span>
            </div>
            <input type="range" id="slider_${regionId}" 
                   min="0.5" max="100" step="0.5" value="${defaultVal}"
                   oninput="updateSliderValue('${regionId}', this.value)">
        `;
        rtSliders.appendChild(sliderGroup);
    });
}

window.updateSliderValue = function(regionId, value) {
    document.getElementById(`value_${regionId}`).textContent = `${value} MHz`;
};

window.startRealtime = async function() {
    const apiEndpoint = document.getElementById('rtApiEndpoint').value;
    if (!apiEndpoint) {
        alert('Please enter API endpoint');
        return;
    }

    isRealtimeActive = true;
    document.getElementById('startRealtimeBtn').style.display = 'none';
    document.getElementById('stopRealtimeBtn').style.display = 'block';
    document.getElementById('realtimeStatus').className = 'realtime-status active';
    document.getElementById('realtimeStatus').innerHTML = '<span class="status-indicator active"></span><strong>Status: Active</strong>';
    rtEmptyState.style.display = 'none';

    const intervalSeconds = parseInt(document.getElementById('updateInterval').value);
    
    await performRealtimeAllocation();
    realtimeInterval = setInterval(performRealtimeAllocation, intervalSeconds * 1000);
};

window.stopRealtime = function() {
    isRealtimeActive = false;
    clearInterval(realtimeInterval);
    document.getElementById('startRealtimeBtn').style.display = 'block';
    document.getElementById('stopRealtimeBtn').style.display = 'none';
    document.getElementById('realtimeStatus').className = 'realtime-status inactive';
    document.getElementById('realtimeStatus').innerHTML = '<span class="status-indicator inactive"></span><strong>Status: Stopped</strong>';
};

async function performRealtimeAllocation() {
    const randomizeRegions = document.getElementById('randomizeRegions').checked;
    const randomizeDemand = document.getElementById('randomizeDemand').checked;

    // Randomly select 3 regions if randomization is enabled
    let currentRegions = rtSelectedRegions;
    if (randomizeRegions) {
        const shuffled = [...allRegions].sort(() => Math.random() - 0.5);
        currentRegions = shuffled.slice(0, 3);
        
        // Update the UI to reflect random regions
        rtSelectedRegions = currentRegions;
        renderRealtimeRegionCheckboxes();
        updateRealtimeSliders();
    }

    const demand = {};
    currentRegions.forEach(region => {
        if (randomizeDemand) {
            // Generate random demand between 1 and 80 MHz
            const randomDemand = (Math.random() * 79 + 1).toFixed(1);
            demand[region] = parseFloat(randomDemand);
            
            // Update slider if it exists
            const regionId = region.replace(/\s+/g, '');
            const slider = document.getElementById(`slider_${regionId}`);
            if (slider) {
                slider.value = randomDemand;
                updateSliderValue(regionId, randomDemand);
            }
        } else {
            const regionId = region.replace(/\s+/g, '');
            const slider = document.getElementById(`slider_${regionId}`);
            demand[region] = slider ? parseFloat(slider.value) : 10;
        }
    });

    const requestData = {
        region: document.getElementById('rtZone').value,
        regions: currentRegions,
        bands: ["low", "mid", "high"],
        use_case: document.getElementById('rtUseCase').value,
        demand: demand
    };

    const apiEndpoint = document.getElementById('rtApiEndpoint').value;
    
    try {
        rtLoadingState.style.display = 'block';
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        const data = await response.json();
        displayRealtimeResults(data, currentRegions);
        
        // STORE DATA FOR DASHBOARD
        updateDashboardData(data, currentRegions);
        
    } catch (error) {
        console.error('Real-time error:', error);
        rtResultsContainer.innerHTML = `
            <div style="padding: 20px; background: #ffebee; border-radius: 8px; color: #c62828;">
                <strong>Error:</strong> ${error.message}
            </div>
        `;
        rtResultsContainer.classList.add('show');
    } finally {
        rtLoadingState.style.display = 'none';
    }
}

function displayResults(data) {
    const result = data.result.result;
    let html = '';

    const policy = result.policy;
    html += `
        <div class="policy-section ${policy.compliant ? '' : 'non-compliant'}">
            <div class="policy-header">
                <span class="policy-icon">${policy.compliant ? '✅' : '⚠️'}</span>
                <h3>Policy Compliance: ${policy.compliant ? 'Compliant' : 'Non-Compliant'}</h3>
            </div>
            <div class="policy-reason">
                <strong>Reason:</strong>
                <div class="policy-reason-text" id="policyReasonText">
                    ${policy.reason.substring(0, 200)}...
                </div>
                <button class="expand-toggle" onclick="toggleReason()">Show Full Reason</button>
            </div>
        </div>
    `;

    window.fullPolicyReason = policy.reason;

    html += '<h3 style="margin-top: 30px; color: #667eea;">Spectrum Allocation</h3>';
    html += '<div class="allocation-grid">';
    
    const allocation = result.allocation;
    const monitoring = result.monitoring.metrics;

    for (const [region, band] of Object.entries(allocation.allocation_map)) {
        const metrics = allocation.region_metrics[region];
        const status = monitoring[region];
        
        html += `
            <div class="allocation-card">
                <h3>${region}</h3>
                <div class="band">${band}</div>
                <div class="metric-row">
                    <span class="metric-label">Avg Bandwidth</span>
                    <span class="metric-value">${metrics.avg_bw.toFixed(2)} MHz</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Avg Power</span>
                    <span class="metric-value">${metrics.avg_power.toFixed(2)} dBm</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Efficiency</span>
                    <span class="metric-value">${metrics.efficiency.toFixed(3)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Traffic Load</span>
                    <span class="metric-value">${(status.traffic_load * 100).toFixed(0)}%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Interference</span>
                    <span class="metric-value">${(status.interference_index * 100).toFixed(0)}%</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Status</span>
                    <span class="metric-value">
                        <span class="status-badge status-${status.status}">${status.status.toUpperCase()}</span>
                    </span>
                </div>
            </div>
        `;
    }
    html += '</div>';

    const fairness = result.fairness;
    html += `
        <div class="fairness-section">
            <h3>Fairness & Performance Metrics</h3>
            <div class="fairness-metric">
                <span class="metric-label">Jain's Fairness Index</span>
                <span class="metric-value">${fairness.jain.toFixed(4)}</span>
            </div>
            <div class="fairness-metric">
                <span class="metric-label">Overall Score</span>
                <span class="metric-value">${allocation.score.toFixed(3)}</span>
            </div>
        </div>
    `;

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('show');
}

function displayRealtimeResults(data, currentRegions) {
    const result = data.result.result;
    let html = '<div class="update-indicator">Updated ✓</div>';

    // Show which regions are being processed
    html += `
        <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #2196f3;">
            <strong style="color: #1976d2;">🎲 Current Regions:</strong>
            <span style="color: #333; margin-left: 10px;">${currentRegions.join(', ')}</span>
        </div>
    `;

    const policy = result.policy;
    html += `
        <div class="policy-section ${policy.compliant ? '' : 'non-compliant'}">
            <div class="policy-header">
                <span class="policy-icon">${policy.compliant ? '✅' : '⚠️'}</span>
                <h3>Policy: ${policy.compliant ? 'Compliant' : 'Non-Compliant'}</h3>
            </div>
        </div>
    `;

    html += '<h3 style="margin-top: 20px; color: #667eea;">Live Spectrum Allocation</h3>';
    html += '<div class="allocation-grid">';
    
    const allocation = result.allocation;
    const monitoring = result.monitoring.metrics;

    for (const [region, band] of Object.entries(allocation.allocation_map)) {
        const metrics = allocation.region_metrics[region];
        const status = monitoring[region];
        
        html += `
            <div class="allocation-card">
                <h3>${region}</h3>
                <div class="band">${band}</div>
                <div class="metric-row">
                    <span class="metric-label">Bandwidth</span>
                    <span class="metric-value">${metrics.avg_bw.toFixed(2)} MHz</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Power</span>
                    <span class="metric-value">${metrics.avg_power.toFixed(2)} dBm</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Efficiency</span>
                    <span class="metric-value">${metrics.efficiency.toFixed(3)}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">Status</span>
                    <span class="metric-value">
                        <span class="status-badge status-${status.status}">${status.status.toUpperCase()}</span>
                    </span>
                </div>
            </div>
        `;
    }
    html += '</div>';

    const fairness = result.fairness;
    html += `
        <div class="fairness-section">
            <h3>Performance Metrics</h3>
            <div class="fairness-metric">
                <span class="metric-label">Fairness Index</span>
                <span class="metric-value">${fairness.jain.toFixed(4)}</span>
            </div>
            <div class="fairness-metric">
                <span class="metric-label">Overall Score</span>
                <span class="metric-value">${allocation.score.toFixed(3)}</span>
            </div>
        </div>
    `;

    rtResultsContainer.innerHTML = html;
    rtResultsContainer.classList.add('show');
}

let reasonExpanded = false;
window.toggleReason = function() {
    const reasonText = document.getElementById('policyReasonText');
    const toggleBtn = document.querySelector('.expand-toggle');
    
    if (!reasonExpanded) {
        reasonText.textContent = window.fullPolicyReason;
        toggleBtn.textContent = 'Show Less';
        reasonExpanded = true;
    } else {
        reasonText.textContent = window.fullPolicyReason.substring(0, 200) + '...';
        toggleBtn.textContent = 'Show Full Reason';
        reasonExpanded = false;
    }
};

// ==================== DASHBOARD FUNCTIONS ====================

function updateDashboardData(data, regions) {
    // Store the latest data for dashboard
    lastRealtimeData = data;
    lastRealtimeRegions = regions;
    
    // If dashboard is currently active, update it immediately
    if (document.getElementById('dashboardTab').classList.contains('active')) {
        updateDashboardWithRealtimeData(data, regions);
    }
}

function initializeDashboard() {
    console.log("Initializing Dashboard...");
    
    // Create charts
    createAllocationChart();
    createEfficiencyChart();
    createTrafficChart();
    createBandChart();
    updateHeatmap();
    updateMetrics();
    
    // If we have real-time data, use it to populate dashboard
    if (lastRealtimeData && lastRealtimeRegions) {
        updateDashboardWithRealtimeData(lastRealtimeData, lastRealtimeRegions);
    } else {
        // Show placeholder message if no data
        showDashboardPlaceholder();
    }
}

function showDashboardPlaceholder() {
    const heatmapContainer = document.getElementById('heatmapContainer');
    
    if (heatmapContainer) {
        heatmapContainer.innerHTML = `
            <div class="heatmap-cell low">
                <div>Start</div>
                <div>REAL-TIME</div>
            </div>
            <div class="heatmap-cell medium">
                <div>To See</div>
                <div>LIVE DATA</div>
            </div>
            <div class="heatmap-cell high">
                <div>Dashboard</div>
                <div>UPDATES</div>
            </div>
        `;
    }
    
    // Set placeholder metrics
    document.getElementById('fairnessValue').textContent = '0.0000';
    document.getElementById('bandwidthValue').textContent = '0.00';
    document.getElementById('complianceValue').textContent = '0%';
    document.getElementById('interferenceValue').textContent = '0%';
    document.getElementById('efficiencyValue').textContent = '0.00';
}

function createAllocationChart() {
    const ctx = document.getElementById('allocationChart').getContext('2d');
    
    dashboardCharts.allocation = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Bandwidth (MHz)',
                data: [],
                backgroundColor: '#667eea',
                borderColor: '#764ba2',
                borderWidth: 2,
                borderRadius: 5,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Bandwidth (MHz)'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createEfficiencyChart() {
    const canvas = document.getElementById('efficiencyChart');
    if (!canvas) {
        console.error('Efficiency chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (dashboardCharts.efficiency) {
        dashboardCharts.efficiency.destroy();
    }
    
    dashboardCharts.efficiency = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low Efficiency', 'Mid Efficiency', 'High Efficiency'],
            datasets: [{
                data: [30, 40, 30],
                backgroundColor: [
                    'rgba(244, 67, 54, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(76, 175, 80, 0.7)'
                ],
                borderColor: [
                    'rgba(244, 67, 54, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(76, 175, 80, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
    
    console.log('Efficiency chart created successfully');
}

// Also replace your updateBandChart function with this improved version:


function createTrafficChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');
    
    dashboardCharts.traffic = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['5m', '4m', '3m', '2m', '1m', 'Now'],
            datasets: [{
                label: 'Traffic Load (%)',
                data: [45, 52, 48, 61, 55, 50],
                fill: true,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function createBandChart() {
    const canvas = document.getElementById('bandChart');
    if (!canvas) {
        console.error('Band chart canvas not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (dashboardCharts.band) {
        dashboardCharts.band.destroy();
    }
    
    dashboardCharts.band = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Low Band', 'Mid Band', 'High Band'],
            datasets: [{
                data: [33, 34, 33],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(244, 67, 54, 0.7)'
                ],
                borderColor: [
                    'rgba(76, 175, 80, 1)',
                    'rgba(255, 152, 0, 1)',
                    'rgba(244, 67, 54, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
    
    console.log('Band chart created successfully');
}
function updateHeatmap() {
    const heatmapContainer = document.getElementById('heatmapContainer');
    if (!heatmapContainer) return;
    
    heatmapContainer.innerHTML = '';
    
    // Generate placeholder heatmap
    const regions = ['Start Real-Time', 'To See', 'Live Data'];
    const statuses = ['low', 'medium', 'high'];
    
    regions.forEach((region, index) => {
        const cell = document.createElement('div');
        cell.className = `heatmap-cell ${statuses[index]}`;
        cell.innerHTML = `
            <div style="font-weight: bold; font-size: 0.9em;">${region}</div>
            <div style="font-size: 0.8em;">${statuses[index].toUpperCase()}</div>
        `;
        heatmapContainer.appendChild(cell);
    });
}

function updateMetrics() {
    // Initialize with placeholder values
    document.getElementById('fairnessValue').textContent = '0.0000';
    document.getElementById('bandwidthValue').textContent = '0.00';
    document.getElementById('complianceValue').textContent = '0%';
    document.getElementById('interferenceValue').textContent = '0%';
    document.getElementById('efficiencyValue').textContent = '0.00';
}

function updateDashboardWithRealtimeData(data, currentRegions) {
    console.log("Updating dashboard with real-time data");
    
    if (!data || !data.result || !data.result.result) {
        console.error("Invalid data structure for dashboard");
        return;
    }
    
    const result = data.result.result;
    const allocation = result.allocation;
    const monitoring = result.monitoring.metrics;
    
    // Update Allocation Chart
    updateAllocationChart(allocation, currentRegions);
    
    // Update Efficiency Chart
    updateEfficiencyChart(allocation);
    
    // Update Traffic Chart
    updateTrafficChart(monitoring);
    
    // Update Band Chart
    updateBandChart(allocation);
    
    // Update Heatmap
    updateHeatmapWithData(monitoring, currentRegions);
    
    // Update Metrics
    updateMetricsWithData(result);
}

function updateAllocationChart(allocation, regions) {
    if (!dashboardCharts.allocation) return;
    
    const bandwidths = regions.map(region => allocation.region_metrics[region]?.avg_bw || 0);
    
    dashboardCharts.allocation.data.labels = regions;
    dashboardCharts.allocation.data.datasets[0].data = bandwidths;
    
    // Adjust Y-axis scale based on data range
    const maxBandwidth = Math.max(...bandwidths);
    const yMax = Math.ceil(maxBandwidth / 10) * 10 + 10;
    
    dashboardCharts.allocation.options.scales.y.max = yMax;
    dashboardCharts.allocation.update();
}

function updateEfficiencyChart(allocation) {
    if (!dashboardCharts.efficiency) {
        console.warn('Efficiency chart not initialized, creating it now...');
        createEfficiencyChart();
        if (!dashboardCharts.efficiency) return;
    }
    
    const efficiencies = Object.values(allocation.region_metrics).map(metrics => metrics.efficiency);
    
    if (efficiencies.length === 0) {
        console.warn('No efficiency data available');
        return;
    }
    
    const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    
    // Categorize efficiencies
    let low = 0, mid = 0, high = 0;
    
    efficiencies.forEach(eff => {
        if (eff < 0.6) {
            low++;
        } else if (eff < 0.8) {
            mid++;
        } else {
            high++;
        }
    });
    
    const total = efficiencies.length;
    const percentages = [
        (low / total) * 100,
        (mid / total) * 100,
        (high / total) * 100
    ];
    
    dashboardCharts.efficiency.data.datasets[0].data = percentages;
    dashboardCharts.efficiency.update();
    
    console.log('Efficiency chart updated:', { low, mid, high, avgEfficiency });
}


function updateTrafficChart(monitoring) {
    if (!dashboardCharts.traffic) return;
    
    // Calculate average traffic load
    const avgTraffic = Object.values(monitoring).reduce((sum, region) => 
        sum + (region.traffic_load * 100), 0) / Object.values(monitoring).length;
    
    // Update chart data
    const currentData = dashboardCharts.traffic.data.datasets[0].data;
    currentData.shift();
    currentData.push(Math.round(avgTraffic));
    
    dashboardCharts.traffic.update();
}

function updateBandChart(allocation) {
    if (!dashboardCharts.band) {
        console.warn('Band chart not initialized, creating it now...');
        createBandChart();
        if (!dashboardCharts.band) return;
    }
    
    const bandAllocation = { low: 0, mid: 0, high: 0 };
    
    // Count band allocations
    Object.values(allocation.allocation_map).forEach(band => {
        const bandName = band.toLowerCase();
        if (bandName.includes('low')) {
            bandAllocation.low++;
        } else if (bandName.includes('mid')) {
            bandAllocation.mid++;
        } else if (bandName.includes('high')) {
            bandAllocation.high++;
        }
    });
    
    const total = bandAllocation.low + bandAllocation.mid + bandAllocation.high;
    
    if (total > 0) {
        const percentages = [
            (bandAllocation.low / total) * 100,
            (bandAllocation.mid / total) * 100,
            (bandAllocation.high / total) * 100
        ];
        
        dashboardCharts.band.data.datasets[0].data = percentages;
    } else {
        // Default equal distribution if no data
        dashboardCharts.band.data.datasets[0].data = [33, 34, 33];
    }
    
    dashboardCharts.band.update();
    console.log('Band chart updated:', bandAllocation);
}


function updateHeatmapWithData(monitoring, regions) {
    const heatmapContainer = document.getElementById('heatmapContainer');
    if (!heatmapContainer) return;
    
    heatmapContainer.innerHTML = '';
    
    regions.forEach(region => {
        const statusData = monitoring[region];
        if (!statusData) return;
        
        // Calculate overall status score
        const trafficScore = statusData.traffic_load * 100;
        const interferenceScore = statusData.interference_index * 100;
        const overallScore = (trafficScore + interferenceScore) / 2;
        
        let status = 'low';
        let statusText = 'GOOD';
        let statusIcon = '✅';
        
        if (overallScore > 80) {
            status = 'critical';
            statusText = 'CRITICAL';
            statusIcon = '🚨';
        } else if (overallScore > 60) {
            status = 'high';
            statusText = 'HIGH';
            statusIcon = '⚠️';
        } else if (overallScore > 40) {
            status = 'medium';
            statusText = 'MEDIUM';
            statusIcon = '🔶';
        }
        
        const cell = document.createElement('div');
        cell.className = `heatmap-cell ${status}`;
        cell.innerHTML = `
            <div style="font-size: 1.5em; margin-bottom: 5px;">${statusIcon}</div>
            <div style="font-weight: bold; font-size: 0.85em; margin-bottom: 3px;">${region}</div>
            <div style="font-size: 0.75em; font-weight: 700; margin-bottom: 2px;">${statusText}</div>
            <div style="font-size: 0.65em; opacity: 0.9;">Load: ${(statusData.traffic_load * 100).toFixed(0)}%</div>
            <div style="font-size: 0.65em; opacity: 0.9;">Intf: ${(statusData.interference_index * 100).toFixed(0)}%</div>
        `;
        heatmapContainer.appendChild(cell);
    });
}

function updateMetricsWithData(result) {
    const fairness = result.fairness.jain;
    const allocation = result.allocation;
    const policy = result.policy;
    const monitoring = result.monitoring.metrics;
    
    // Calculate metrics
    const bandwidths = Object.values(allocation.region_metrics).map(m => m.avg_bw);
    const avgBandwidth = bandwidths.reduce((sum, bw) => sum + bw, 0) / bandwidths.length;
    
    const efficiencies = Object.values(allocation.region_metrics).map(m => m.efficiency);
    const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    
    const interferences = Object.values(monitoring).map(m => m.interference_index * 100);
    const avgInterference = interferences.reduce((sum, intf) => sum + intf, 0) / interferences.length;
    
    // Update DOM
    document.getElementById('fairnessValue').textContent = fairness.toFixed(4);
    document.getElementById('bandwidthValue').textContent = avgBandwidth.toFixed(2);
    document.getElementById('complianceValue').textContent = policy.compliant ? '100%' : '0%';
    document.getElementById('interferenceValue').textContent = avgInterference.toFixed(1) + '%';
    document.getElementById('efficiencyValue').textContent = avgEfficiency.toFixed(3);
}

window.changeChartType = function(chartName, type) {
    if (!dashboardCharts[chartName]) return;
    
    dashboardCharts[chartName].destroy();
    
    const ctx = document.getElementById(`${chartName}Chart`).getContext('2d');
    const buttons = event.target.parentElement.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (chartName === 'allocation') {
        if (type === 'bar') {
            createAllocationChart();
        } else if (type === 'radar') {
            dashboardCharts.allocation = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: lastRealtimeRegions || ['Region 1', 'Region 2', 'Region 3'],
                    datasets: [{
                        label: 'Bandwidth (MHz)',
                        data: lastRealtimeData ? 
                            lastRealtimeRegions.map(r => lastRealtimeData.result.result.allocation.region_metrics[r]?.avg_bw || 0) :
                            [45, 52, 38],
                        backgroundColor: 'rgba(102, 126, 234, 0.2)',
                        borderColor: '#667eea',
                        borderWidth: 2,
                        pointBackgroundColor: '#667eea'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } else if (type === 'line') {
            dashboardCharts.allocation = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: lastRealtimeRegions || ['Region 1', 'Region 2', 'Region 3'],
                    datasets: [{
                        label: 'Bandwidth (MHz)',
                        data: lastRealtimeData ? 
                            lastRealtimeRegions.map(r => lastRealtimeData.result.result.allocation.region_metrics[r]?.avg_bw || 0) :
                            [45, 52, 38],
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        fill: true,
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }
    
    // Update with current data if available
    if (lastRealtimeData && lastRealtimeRegions) {
        updateDashboardWithRealtimeData(lastRealtimeData, lastRealtimeRegions);
    }
};
// ============================================
// ADD THESE FUNCTIONS TO THE END OF YOUR script1.js FILE
// ============================================

// Band Chart Type Switching Function
window.changeBandChartType = function(type) {
    console.log('Changing band chart type to:', type);
    
    if (!dashboardCharts.band) {
        console.error('Band chart not initialized');
        createBandChart();
        return;
    }
    
    // Update button states
    const buttons = event.target.parentElement.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Get current data
    const currentData = dashboardCharts.band.data.datasets[0].data;
    const labels = dashboardCharts.band.data.labels;
    
    console.log('Current data:', currentData);
    console.log('Labels:', labels);
    
    // Destroy old chart
    dashboardCharts.band.destroy();
    
    // Get canvas context
    const canvas = document.getElementById('bandChart');
    if (!canvas) {
        console.error('Band chart canvas not found!');
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // Create new chart based on type
    if (type === 'doughnut') {
        dashboardCharts.band = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: currentData,
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(255, 152, 0, 0.7)',
                        'rgba(244, 67, 54, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    } else if (type === 'bar') {
        dashboardCharts.band = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Band Usage (%)',
                    data: currentData,
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(255, 152, 0, 0.7)',
                        'rgba(244, 67, 54, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Usage (%)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    } else if (type === 'polarArea') {
        dashboardCharts.band = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    data: currentData,
                    backgroundColor: [
                        'rgba(76, 175, 80, 0.7)',
                        'rgba(255, 152, 0, 0.7)',
                        'rgba(244, 67, 54, 0.7)'
                    ],
                    borderColor: [
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 152, 0, 1)',
                        'rgba(244, 67, 54, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                }
            }
        });
    }
    
    // Update with current data if available
    if (lastRealtimeData && lastRealtimeRegions) {
        updateBandChart(lastRealtimeData.result.result.allocation);
    }
    
    console.log('Band chart type changed successfully to:', type);
};

// ============================================
// DEBUG AND TESTING FUNCTIONS
// ============================================

// Enhanced initializeDashboard with better error handling
const originalInitializeDashboard = initializeDashboard;
initializeDashboard = function() {
    console.log("=== Initializing Dashboard ===");
    
    // Check if all required canvas elements exist
    const requiredCanvases = [
        'allocationChart',
        'bandChart',
        'efficiencyChart',
        'trafficChart'
    ];
    
    const missingCanvases = [];
    requiredCanvases.forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) {
            missingCanvases.push(id);
            console.error(`❌ Missing canvas: ${id}`);
        } else {
            console.log(`✅ Found canvas: ${id}`);
        }
    });
    
    if (missingCanvases.length > 0) {
        console.error('⚠️ Missing canvases:', missingCanvases);
        alert(`Dashboard Error: Missing chart canvases:\n${missingCanvases.join(', ')}\n\nPlease check your HTML Dashboard tab.`);
    }
    
    // Call original function
    originalInitializeDashboard();
    
    console.log("=== Dashboard Initialization Complete ===");
    console.log("Active charts:", Object.keys(dashboardCharts));
};

// Debug function
window.debugDashboard = function() {
    console.log("=== DASHBOARD DEBUG INFO ===");
    console.log("Charts initialized:", dashboardCharts);
    console.log("Last real-time data:", lastRealtimeData);
    console.log("Last real-time regions:", lastRealtimeRegions);
    
    // Check each chart
    const chartIds = ['allocationChart', 'bandChart', 'efficiencyChart', 'trafficChart'];
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
        const chartKey = id.replace('Chart', '');
        console.log(`${id}:`, {
            canvasExists: !!canvas,
            chartInitialized: !!dashboardCharts[chartKey],
            canvasSize: canvas ? `${canvas.width}x${canvas.height}` : 'N/A'
        });
    });
    
    console.log("=== END DEBUG INFO ===");
};

// Force refresh all charts
window.refreshDashboardCharts = function() {
    console.log("Force refreshing all dashboard charts...");
    
    if (lastRealtimeData && lastRealtimeRegions) {
        updateDashboardWithRealtimeData(lastRealtimeData, lastRealtimeRegions);
        console.log("✅ Dashboard refreshed with real-time data");
    } else {
        console.warn("⚠️ No data available to refresh");
        // Reinitialize with placeholder data
        showDashboardPlaceholder();
    }
};

// Test function to populate dashboard with sample data
window.testDashboardWithSampleData = function() {
    console.log("Testing dashboard with sample data...");
    
    const sampleData = {
        result: {
            result: {
                allocation: {
                    allocation_map: {
                        'Kerala': 'Low Band',
                        'Tamil Nadu': 'Mid Band',
                        'Andhra Pradesh': 'High Band'
                    },
                    region_metrics: {
                        'Kerala': { avg_bw: 45.5, avg_power: 23.4, efficiency: 0.85 },
                        'Tamil Nadu': { avg_bw: 52.3, avg_power: 25.1, efficiency: 0.78 },
                        'Andhra Pradesh': { avg_bw: 38.7, avg_power: 21.8, efficiency: 0.92 }
                    },
                    score: 0.85
                },
                monitoring: {
                    metrics: {
                        'Kerala': { 
                            traffic_load: 0.65, 
                            interference_index: 0.25,
                            status: 'stable'
                        },
                        'Tamil Nadu': { 
                            traffic_load: 0.72, 
                            interference_index: 0.42,
                            status: 'warning'
                        },
                        'Andhra Pradesh': { 
                            traffic_load: 0.55, 
                            interference_index: 0.18,
                            status: 'stable'
                        }
                    }
                },
                fairness: {
                    jain: 0.8373
                },
                policy: {
                    compliant: true,
                    reason: "All allocations meet regulatory requirements"
                }
            }
        }
    };
    
    const sampleRegions = ['Kerala', 'Tamil Nadu', 'Andhra Pradesh'];
    
    lastRealtimeData = sampleData;
    lastRealtimeRegions = sampleRegions;
    
    // Switch to dashboard if not already there
    if (!document.getElementById('dashboardTab').classList.contains('active')) {
        switchTab('dashboard');
    }
    
    updateDashboardWithRealtimeData(sampleData, sampleRegions);
    
    console.log("✅ Dashboard populated with sample data");
    console.log("You should now see all charts with data!");
};

// Auto-fix function to recreate missing charts
window.fixDashboardCharts = function() {
    console.log("Attempting to fix dashboard charts...");
    
    // Destroy all existing charts
    Object.keys(dashboardCharts).forEach(key => {
        if (dashboardCharts[key]) {
            try {
                dashboardCharts[key].destroy();
                console.log(`Destroyed old chart: ${key}`);
            } catch (e) {
                console.warn(`Could not destroy chart ${key}:`, e);
            }
        }
    });
    
    // Clear the object
    dashboardCharts = {};
    
    // Reinitialize
    createAllocationChart();
    createBandChart();
    createEfficiencyChart();
    createTrafficChart();
    updateHeatmap();
    updateMetrics();
    
    console.log("✅ Dashboard charts fixed and reinitialized");
    
    // If we have data, update charts
    if (lastRealtimeData && lastRealtimeRegions) {
        setTimeout(() => {
            updateDashboardWithRealtimeData(lastRealtimeData, lastRealtimeRegions);
            console.log("✅ Charts updated with existing data");
        }, 100);
    }
};

// Log available commands
console.log("===========================================");
console.log("📊 Dashboard Debug Helpers Loaded!");
console.log("===========================================");
console.log("Available commands:");
console.log("• debugDashboard() - Show debug info");
console.log("• testDashboardWithSampleData() - Load sample data");
console.log("• refreshDashboardCharts() - Force refresh");
console.log("• fixDashboardCharts() - Fix broken charts");
console.log("===========================================");
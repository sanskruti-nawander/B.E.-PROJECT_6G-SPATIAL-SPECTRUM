
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
                document.querySelector('.tab-btn:first-child').classList.add('active');
                document.getElementById('manualTab').classList.add('active');
                if (isRealtimeActive) stopRealtime();
            } else {
                document.querySelector('.tab-btn:last-child').classList.add('active');
                document.getElementById('realtimeTab').classList.add('active');
                initializeRealtimeTab();
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
                        <span class="slider-value" id="value_${regionId}">${defaultVal} </span>
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
    
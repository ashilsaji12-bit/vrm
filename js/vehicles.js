/* vehicles.js - Vehicle management page logic */

let allVehicles = [];

// Load vehicles from backend on page load
async function loadVehicles() {
    try {
        allVehicles = await apiFetch('/vehicles');
        renderVehicles(allVehicles);
    } catch (err) {
        document.getElementById('vehicles-container').innerHTML =
            `<div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Failed to load vehicles</h3>
                <p>${err.message}</p>
            </div>`;
        showToast(err.message, 'error');
    }
}

// Render vehicles as cards
function renderVehicles(vehicles) {
    const container = document.getElementById('vehicles-container');
    const countEl = document.getElementById('vehicle-count');

    countEl.textContent = `Showing ${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`;

    if (vehicles.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🚘</div>
                <h3>No vehicles found</h3>
                <p>Try adjusting your search or <a href="#" onclick="openModal('add-vehicle-modal')" style="color:var(--primary-light)">add a new vehicle</a>.</p>
            </div>`;
        return;
    }

    container.innerHTML = `<div class="vehicles-grid fade-in">
        ${vehicles.map(v => vehicleCard(v)).join('')}
    </div>`;
}

// Build a vehicle card HTML
function vehicleCard(v) {
    const isTruck = v.vehicleType === 'Truck';
    const rateDisplay = isTruck
        ? `₹${v.baseRate.toLocaleString('en-IN')}/day + ₹${v.perKilometerCharge || 0}/km`
        : `₹${v.baseRate.toLocaleString('en-IN')}/day`;

    return `
    <div class="vehicle-card" data-id="${v.vehicleId}">
        <div class="vehicle-card-header">
            <div class="vehicle-icon">${vehicleIcon(v.vehicleType)}</div>
            <div class="vehicle-title">
                <h3>${v.model}</h3>
                <p>${vehicleTypeBadge(v.vehicleType)} &nbsp; <code style="font-size:0.78rem; color:var(--text-muted)">${v.vehicleId}</code></p>
            </div>
        </div>
        <div class="vehicle-card-body">
            <div class="vehicle-meta">
                <div class="meta-row">
                    <span class="meta-label">Daily Rate</span>
                    <span class="meta-value" style="color:var(--success)">${rateDisplay}</span>
                </div>
                ${isTruck ? `
                <div class="meta-row">
                    <span class="meta-label">Per Km</span>
                    <span class="meta-value">₹${v.perKilometerCharge || 0}</span>
                </div>` : ''}
                <div class="meta-row">
                    <span class="meta-label">Status</span>
                    <span>${availabilityBadge(v.available)}</span>
                </div>
            </div>
        </div>
        <div class="vehicle-card-footer">
            ${v.available
                ? `<a href="rental.html?vehicleId=${v.vehicleId}" class="btn btn-primary btn-sm" style="flex:1; justify-content:center;">🔑 Rent Now</a>`
                : `<button class="btn btn-outline btn-sm" style="flex:1; justify-content:center;" disabled>Unavailable</button>`
            }
            <button class="btn btn-danger btn-sm" onclick="deleteVehicle('${v.vehicleId}')">🗑️</button>
        </div>
    </div>`;
}

// Filter vehicles based on search/type/availability
function filterVehicles() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    const availFilter = document.getElementById('avail-filter').value;

    let filtered = allVehicles;

    if (search) {
        filtered = filtered.filter(v =>
            v.vehicleId.toLowerCase().includes(search) ||
            v.model.toLowerCase().includes(search) ||
            v.vehicleType.toLowerCase().includes(search)
        );
    }
    if (typeFilter) {
        filtered = filtered.filter(v => v.vehicleType === typeFilter);
    }
    if (availFilter === 'available') {
        filtered = filtered.filter(v => v.available);
    } else if (availFilter === 'rented') {
        filtered = filtered.filter(v => !v.available);
    }

    renderVehicles(filtered);
}

// Show/hide truck-specific fields
function toggleTruckFields() {
    const type = document.getElementById('v-type').value;
    document.getElementById('truck-km-field').style.display = type === 'Truck' ? 'block' : 'none';
    document.getElementById('bike-info').style.display = type === 'Bike' ? 'block' : 'none';
    const kmInput = document.getElementById('v-km-charge');
    kmInput.required = type === 'Truck';
}

// Submit add vehicle form
async function submitVehicle(e) {
    e.preventDefault();
    const btn = document.getElementById('add-vehicle-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Registering...';

    const type = document.getElementById('v-type').value;
    const body = {
        vehicleType: type,
        vehicleId: document.getElementById('v-id').value.trim().toUpperCase(),
        model: document.getElementById('v-model').value.trim(),
        baseRate: parseFloat(document.getElementById('v-rate').value)
    };

    if (type === 'Truck') {
        const kmVal = document.getElementById('v-km-charge').value;
        if (!kmVal || parseFloat(kmVal) < 0) {
            showToast('Please enter a valid per kilometer charge.', 'error');
            btn.disabled = false;
            btn.textContent = 'Register Vehicle';
            return;
        }
        body.perKilometerCharge = parseFloat(kmVal);
    }

    try {
        await apiFetch('/vehicles', { method: 'POST', body });
        showToast(`Vehicle ${body.vehicleId} registered successfully!`, 'success');
        closeModal('add-vehicle-modal');
        document.getElementById('add-vehicle-form').reset();
        toggleTruckFields();
        await loadVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Register Vehicle';
    }
}

// Delete a vehicle
async function deleteVehicle(vehicleId) {
    if (!confirm(`Are you sure you want to delete vehicle ${vehicleId}?`)) return;
    try {
        await apiFetch(`/vehicles/${vehicleId}`, { method: 'DELETE' });
        showToast(`Vehicle ${vehicleId} deleted.`, 'success');
        await loadVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Initialize
loadVehicles();

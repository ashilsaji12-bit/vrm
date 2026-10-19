/* rental.js - Rental page logic */

let allVehiclesForRent = [];
let allCustomersForRent = [];
let selectedVehicle = null;
let selectedCustomer = null;

async function initRentalPage() {
    await Promise.all([loadCustomersForSelect(), loadVehiclesForSelect()]);

    // Pre-select from URL params (e.g. rental.html?vehicleId=C101&customerId=CUST001)
    const params = new URLSearchParams(window.location.search);
    if (params.get('vehicleId')) {
        document.getElementById('r-vehicle').value = params.get('vehicleId');
        onVehicleChange();
    }
    if (params.get('customerId')) {
        document.getElementById('r-customer').value = params.get('customerId');
        onCustomerChange();
    }
}

async function loadCustomersForSelect() {
    try {
        allCustomersForRent = await apiFetch('/customers');
        const sel = document.getElementById('r-customer');
        sel.innerHTML = `<option value="">— Select Customer —</option>` +
            allCustomersForRent.map(c =>
                `<option value="${c.customerId}">${c.name} (${c.customerId})</option>`
            ).join('');
    } catch (err) {
        showToast('Failed to load customers: ' + err.message, 'error');
    }
}

async function loadVehiclesForSelect() {
    try {
        allVehiclesForRent = await apiFetch('/vehicles?available=true');
        const sel = document.getElementById('r-vehicle');
        sel.innerHTML = `<option value="">— Select Available Vehicle —</option>` +
            allVehiclesForRent.map(v =>
                `<option value="${v.vehicleId}">${vehicleIcon(v.vehicleType)} ${v.model} [${v.vehicleId}] — ₹${v.baseRate}/day</option>`
            ).join('');
    } catch (err) {
        showToast('Failed to load vehicles: ' + err.message, 'error');
    }
}

function onCustomerChange() {
    const id = document.getElementById('r-customer').value;
    selectedCustomer = allCustomersForRent.find(c => c.customerId === id);
    const box = document.getElementById('customer-info-box');
    const text = document.getElementById('customer-info-text');

    if (selectedCustomer) {
        text.innerHTML = `👤 <strong>${selectedCustomer.name}</strong> | 📱 ${selectedCustomer.phone} | ✉️ ${selectedCustomer.email || '—'}`;
        box.style.display = 'block';
    } else {
        box.style.display = 'none';
    }
    updateCalculation();
}

function onVehicleChange() {
    const id = document.getElementById('r-vehicle').value;
    selectedVehicle = allVehiclesForRent.find(v => v.vehicleId === id);
    const box = document.getElementById('vehicle-info-box');
    const text = document.getElementById('vehicle-info-text');
    const kmField = document.getElementById('km-field');

    if (selectedVehicle) {
        const isTruck = selectedVehicle.vehicleType === 'Truck';
        text.innerHTML = `${vehicleIcon(selectedVehicle.vehicleType)} <strong>${selectedVehicle.model}</strong> [${selectedVehicle.vehicleId}]
            &nbsp;|&nbsp; ₹${selectedVehicle.baseRate}/day
            ${isTruck ? ` &nbsp;+&nbsp; ₹${selectedVehicle.perKilometerCharge}/km` : ''}`;
        box.style.display = 'block';
        kmField.style.display = isTruck ? 'block' : 'none';
        document.getElementById('r-km').required = isTruck;
    } else {
        box.style.display = 'none';
        kmField.style.display = 'none';
    }
    updateCalculation();
}

function updateCalculation() {
    const days = parseInt(document.getElementById('r-days').value) || 0;
    const km = parseFloat(document.getElementById('r-km').value) || 0;
    const preview = document.getElementById('amount-preview');
    const calcDetails = document.getElementById('calc-details');
    const calcTotal = document.getElementById('calc-total-amount');

    if (!selectedVehicle || days <= 0) {
        preview.style.display = 'none';
        return;
    }

    preview.style.display = 'block';
    let total = 0;
    let details = '';
    const type = selectedVehicle.vehicleType;
    const rate = selectedVehicle.baseRate;

    if (type === 'Car') {
        total = rate * days;
        details = `
            <div class="calc-row"><span>₹${rate} × ${days} day(s)</span><span>₹${(rate * days).toFixed(2)}</span></div>`;
    } else if (type === 'Bike') {
        total = rate * days * 0.85;
        details = `
            <div class="calc-row"><span>₹${rate} × ${days} day(s)</span><span>₹${(rate * days).toFixed(2)}</span></div>
            <div class="calc-row"><span>15% Bike Discount</span><span style="color:var(--success)">-₹${(rate * days * 0.15).toFixed(2)}</span></div>`;
    } else if (type === 'Truck') {
        const daysCost = rate * days;
        const kmCost = km * (selectedVehicle.perKilometerCharge || 0);
        total = daysCost + kmCost;
        details = `
            <div class="calc-row"><span>₹${rate} × ${days} day(s)</span><span>₹${daysCost.toFixed(2)}</span></div>
            <div class="calc-row"><span>₹${selectedVehicle.perKilometerCharge || 0}/km × ${km} km</span><span>₹${kmCost.toFixed(2)}</span></div>`;
    }

    calcDetails.innerHTML = details;
    calcTotal.textContent = `₹${total.toFixed(2)}`;
}

async function confirmRental(e) {
    e.preventDefault();

    if (!selectedCustomer || !selectedVehicle) {
        showToast('Please select both a customer and a vehicle.', 'warning');
        return;
    }

    const days = parseInt(document.getElementById('r-days').value);
    if (!days || days <= 0) {
        showToast('Please enter a valid number of days.', 'warning');
        return;
    }

    const km = parseFloat(document.getElementById('r-km').value) || 0;
    if (selectedVehicle.vehicleType === 'Truck' && km < 0) {
        showToast('Kilometers cannot be negative.', 'warning');
        return;
    }

    const btn = document.getElementById('rent-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Processing...';

    try {
        const rental = await apiFetch('/rentals', {
            method: 'POST',
            body: {
                customerId: selectedCustomer.customerId,
                vehicleId: selectedVehicle.vehicleId,
                days: days,
                kilometers: km
            }
        });

        showConfirmation(rental);
        showToast('Rental confirmed successfully!', 'success');

        // Refresh available vehicles
        await loadVehiclesForSelect();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔑 Confirm Rental';
    }
}

function showConfirmation(rental) {
    document.getElementById('rental-form').style.display = 'none';
    document.getElementById('info-panel').style.display = 'none';
    const panel = document.getElementById('confirmation-panel');
    panel.style.display = 'block';

    const isTruck = rental.vehicle?.vehicleType === 'Truck';

    document.getElementById('receipt-content').innerHTML = `
        <div class="receipt-box">
            <div class="receipt-row"><span class="label">Rental ID</span><span class="value" style="color:var(--primary-light); font-size:1rem;">${rental.rentalId}</span></div>
            <div class="receipt-row"><span class="label">Customer</span><span class="value">${rental.customer?.name} <span style="color:var(--text-muted)">(${rental.customer?.customerId})</span></span></div>
            <div class="receipt-row"><span class="label">Vehicle</span><span class="value">${rental.vehicle?.model} [${rental.vehicle?.vehicleId}]</span></div>
            <div class="receipt-row"><span class="label">Type</span><span class="value">${vehicleTypeBadge(rental.vehicle?.vehicleType)}</span></div>
            <div class="receipt-row"><span class="label">Rental Days</span><span class="value">${rental.numberOfDays} day(s)</span></div>
            <div class="receipt-row"><span class="label">Daily Rate</span><span class="value">₹${rental.vehicle?.baseRate?.toFixed(2)}</span></div>
            ${isTruck && rental.kilometers > 0 ? `
            <div class="receipt-row"><span class="label">Kilometers</span><span class="value">${rental.kilometers} km</span></div>` : ''}
            <div class="receipt-row"><span class="label">Rental Date</span><span class="value">${formatDate(rental.rentalDate)}</span></div>
            <div class="receipt-row"><span class="label">Expected Return</span><span class="value">${formatDate(rental.expectedReturnDate)}</span></div>
            <div class="receipt-total">
                <div class="row">
                    <span>Total Amount</span>
                    <span class="amount">${formatCurrency(rental.baseAmount)}</span>
                </div>
            </div>
        </div>
        <div style="margin-top:1rem; text-align:center;">
            <span class="badge badge-rented" style="font-size:0.85rem;">Vehicle Status: RENTED</span>
        </div>
    `;
}

function resetForm() {
    document.getElementById('rental-form').reset();
    document.getElementById('rental-form').style.display = 'block';
    document.getElementById('info-panel').style.display = 'block';
    document.getElementById('confirmation-panel').style.display = 'none';
    document.getElementById('customer-info-box').style.display = 'none';
    document.getElementById('vehicle-info-box').style.display = 'none';
    document.getElementById('amount-preview').style.display = 'none';
    document.getElementById('km-field').style.display = 'none';
    selectedVehicle = null;
    selectedCustomer = null;
    loadVehiclesForSelect();
}

initRentalPage();

/* customer-portal.js - Logic for Customer Facing Portal */

let allVehicles = [];
let currentCategory = 'ALL';
let selectedVehicle = null;
let currentCustomerMode = 'existing'; // 'existing' | 'new'
let verifiedCustomer = null;

// ======================================================
// INITIALIZATION
// ======================================================
document.addEventListener('DOMContentLoaded', async () => {
    updateAdminNavButton();
    await loadCustomerFleet();

    // Check URL parameters (e.g. ?book=C101)
    const params = new URLSearchParams(window.location.search);
    const bookId = params.get('book');
    if (bookId) {
        setTimeout(() => openBookingModal(bookId), 500);
    }
});

// Update navbar button based on admin login state
function updateAdminNavButton() {
    const adminBtnContainer = document.getElementById('admin-nav-container');
    if (!adminBtnContainer) return;

    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    if (isAdmin) {
        adminBtnContainer.innerHTML = `
            <a href="admin.html" class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,0.4);">
                👑 Admin Dashboard
            </a>
            <button onclick="logoutAdminPortal()" class="btn btn-sm" style="background:rgba(255,255,255,0.08); border:1px solid var(--border);" title="Logout Admin">
                🚪 Logout
            </button>
        `;
    } else {
        adminBtnContainer.innerHTML = `
            <button onclick="openModal('admin-login-modal')" class="admin-switch-btn" id="admin-login-btn">
                <span>🔐</span> Admin Login
            </button>
        `;
    }
}

function logoutAdminPortal() {
    sessionStorage.removeItem('isAdmin');
    showToast('Logged out of Admin mode.', 'info');
    updateAdminNavButton();
}

// ======================================================
// FLEET LOADING & FILTERING
// ======================================================

async function loadCustomerFleet() {
    const container = document.getElementById('fleet-container');
    if (!container) return;

    try {
        container.innerHTML = `<div class="loading-overlay"><div class="spinner"></div> Loading available fleet...</div>`;
        allVehicles = await apiFetch('/vehicles');
        renderCustomerFleet();
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Unable to Connect to Server</h3>
                <p>${err.message}</p>
                <button class="btn btn-outline btn-sm" onclick="loadCustomerFleet()" style="margin-top:1rem;">↻ Retry</button>
            </div>`;
        showToast(err.message, 'error');
    }
}

function setCategoryFilter(category, btnElement) {
    currentCategory = category;
    document.querySelectorAll('.category-tab-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderCustomerFleet();
}

function renderCustomerFleet() {
    const container = document.getElementById('fleet-container');
    if (!container) return;

    const search = (document.getElementById('search-vehicle')?.value || '').toLowerCase();
    const availOnly = document.getElementById('filter-available-only')?.checked;
    const sortVal = document.getElementById('sort-vehicles')?.value || 'default';

    let filtered = allVehicles.filter(v => {
        const matchesCategory = (currentCategory === 'ALL' || v.vehicleType.toUpperCase() === currentCategory.toUpperCase());
        const matchesSearch = v.model.toLowerCase().includes(search) || 
                              v.vehicleId.toLowerCase().includes(search) ||
                              v.vehicleType.toLowerCase().includes(search);
        const matchesAvail = availOnly ? v.available : true;
        return matchesCategory && matchesSearch && matchesAvail;
    });

    // Sorting
    if (sortVal === 'price-asc') {
        filtered.sort((a, b) => a.baseRate - b.baseRate);
    } else if (sortVal === 'price-desc') {
        filtered.sort((a, b) => b.baseRate - a.baseRate);
    } else if (sortVal === 'name') {
        filtered.sort((a, b) => a.model.localeCompare(b.model));
    }

    // Update count indicator
    const countEl = document.getElementById('fleet-count');
    if (countEl) {
        countEl.textContent = `Showing ${filtered.length} of ${allVehicles.length} vehicles`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="icon">🔍</div>
                <h3>No vehicles match your criteria</h3>
                <p>Try clearing filters or searching for something else.</p>
                <button class="btn btn-outline btn-sm" onclick="clearFilters()" style="margin-top:1rem;">Reset Filters</button>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(v => {
        const specs = getVehicleSpecs(v);
        const icon = vehicleIcon(v.vehicleType);

        return `
            <div class="customer-vehicle-card fade-in">
                <div>
                    <!-- Visual Box -->
                    <div class="vehicle-visual-box">
                        <span>${icon}</span>
                        <div style="position:absolute; top:10px; right:10px;">
                            ${availabilityBadge(v.available)}
                        </div>
                        <div style="position:absolute; bottom:10px; left:12px;">
                            ${vehicleTypeBadge(v.vehicleType)}
                        </div>
                    </div>

                    <!-- Title & ID -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;">
                        <h3 style="font-size:1.15rem; font-weight:700; color:var(--text-primary); line-height:1.2;">
                            ${v.model}
                        </h3>
                        <code style="font-size:0.75rem; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">${v.vehicleId}</code>
                    </div>

                    <!-- Specs Chips -->
                    <div class="specs-list">
                        ${specs.map(s => `<span class="spec-chip">${s}</span>`).join('')}
                    </div>
                </div>

                <!-- Footer / Price & Book -->
                <div style="border-top:1px solid var(--border); padding-top:1rem; margin-top:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                    <div class="vehicle-price-tag">
                        <span class="vehicle-price-val">${formatCurrency(v.baseRate)}</span>
                        <span class="vehicle-price-unit">/ day</span>
                    </div>

                    ${v.available ? `
                        <button class="btn btn-primary" onclick="openBookingModal('${v.vehicleId}')">
                            ⚡ Book Now
                        </button>
                    ` : `
                        <button class="btn btn-outline" disabled style="opacity:0.5; cursor:not-allowed;">
                            Booked Out
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function getVehicleSpecs(vehicle) {
    if (vehicle.vehicleType === 'Car') {
        return ['5 Seater', 'AC & Audio', 'Petrol / Diesel', 'Smooth Drive'];
    } else if (vehicle.vehicleType === 'Bike') {
        return ['Cruiser / Commuter', 'Helmet Included', 'Economical', 'Easy Parking'];
    } else if (vehicle.vehicleType === 'Truck') {
        return [
            'Heavy Cargo', 
            `₹${vehicle.perKmCharge || 15}/km charge`, 
            'Intercity Delivery', 
            'Commercial Ready'
        ];
    }
    return ['Standard Features'];
}

function clearFilters() {
    document.getElementById('search-vehicle').value = '';
    document.getElementById('filter-available-only').checked = false;
    document.getElementById('sort-vehicles').value = 'default';
    setCategoryFilter('ALL', document.querySelector('.category-tab-btn'));
}

// ======================================================
// BOOKING MODAL LOGIC
// ======================================================

function openBookingModal(vehicleId) {
    selectedVehicle = allVehicles.find(v => v.vehicleId === vehicleId);
    if (!selectedVehicle) {
        showToast('Vehicle not found.', 'error');
        return;
    }

    if (!selectedVehicle.available) {
        showToast('This vehicle is currently rented and unavailable.', 'warning');
        return;
    }

    // Populate Vehicle Summary Box
    document.getElementById('modal-vehicle-icon').textContent = vehicleIcon(selectedVehicle.vehicleType);
    document.getElementById('modal-vehicle-model').textContent = selectedVehicle.model;
    document.getElementById('modal-vehicle-id').textContent = selectedVehicle.vehicleId;
    document.getElementById('modal-vehicle-rate').textContent = `${formatCurrency(selectedVehicle.baseRate)} / day`;
    document.getElementById('modal-vehicle-type').innerHTML = vehicleTypeBadge(selectedVehicle.vehicleType);

    // Show/hide truck KM field
    const kmContainer = document.getElementById('book-truck-km-group');
    if (selectedVehicle.vehicleType === 'Truck') {
        kmContainer.style.display = 'block';
        document.getElementById('book-km').value = 50;
    } else {
        kmContainer.style.display = 'none';
        document.getElementById('book-km').value = 0;
    }

    // Reset customer mode
    switchCustomerTab('existing');
    document.getElementById('book-days').value = 1;
    verifiedCustomer = null;
    document.getElementById('verified-customer-box').style.display = 'none';
    document.getElementById('verify-id-input').value = '';

    updateBookingQuote();
    openModal('booking-modal');
}

function switchCustomerTab(mode) {
    currentCustomerMode = mode;
    const btnExisting = document.getElementById('tab-btn-existing');
    const btnNew = document.getElementById('tab-btn-new');
    const sectionExisting = document.getElementById('customer-existing-section');
    const sectionNew = document.getElementById('customer-new-section');

    if (mode === 'existing') {
        btnExisting.classList.add('active');
        btnNew.classList.remove('active');
        sectionExisting.style.display = 'block';
        sectionNew.style.display = 'none';
    } else {
        btnNew.classList.add('active');
        btnExisting.classList.remove('active');
        sectionNew.style.display = 'block';
        sectionExisting.style.display = 'none';
    }
}

// Verify existing customer ID or Phone
async function verifyCustomer() {
    const input = document.getElementById('verify-id-input').value.trim();
    if (!input) {
        showToast('Please enter your Customer ID or phone number.', 'warning');
        return;
    }

    const verifyBtn = document.getElementById('verify-cust-btn');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<div class="spinner"></div> Checking...';

    try {
        let foundCustomer = null;

        // Try direct ID lookup first
        try {
            foundCustomer = await apiFetch(`/customers/${input.toUpperCase()}`);
        } catch (e) {
            // Not found by ID, try searching by phone or name
            const results = await apiFetch(`/customers?search=${encodeURIComponent(input)}`);
            if (results && results.length > 0) {
                foundCustomer = results[0];
            }
        }

        if (foundCustomer) {
            verifiedCustomer = foundCustomer;
            document.getElementById('verified-customer-box').style.display = 'flex';
            document.getElementById('verified-cust-name').textContent = `${foundCustomer.name}`;
            document.getElementById('verified-cust-details').textContent = `ID: ${foundCustomer.customerId} · 📞 ${foundCustomer.phone}`;
            showToast(`Welcome back, ${foundCustomer.name}!`, 'success');
        } else {
            verifiedCustomer = null;
            document.getElementById('verified-customer-box').style.display = 'none';
            showToast('Customer ID or phone number not found. If you are a new customer, click "New Customer" tab.', 'warning');
        }
    } catch (err) {
        showToast('Error verifying customer: ' + err.message, 'error');
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify ID';
    }
}

// Live Quote Calculation
function updateBookingQuote() {
    if (!selectedVehicle) return;

    const days = parseInt(document.getElementById('book-days').value) || 1;
    const baseAmount = selectedVehicle.baseRate * days;
    let kmAmount = 0;

    let detailsHtml = `
        <div class="calc-row">
            <span>Base Rate (${formatCurrency(selectedVehicle.baseRate)} × ${days} day${days > 1 ? 's' : ''})</span>
            <span>${formatCurrency(baseAmount)}</span>
        </div>
    `;

    if (selectedVehicle.vehicleType === 'Truck') {
        const km = parseFloat(document.getElementById('book-km').value) || 0;
        const kmRate = selectedVehicle.perKmCharge || 15.0;
        kmAmount = km * kmRate;
        detailsHtml += `
            <div class="calc-row">
                <span>Distance Charge (${km} km × ₹${kmRate}/km)</span>
                <span>${formatCurrency(kmAmount)}</span>
            </div>
        `;
    }

    const total = baseAmount + kmAmount;
    document.getElementById('quote-details').innerHTML = detailsHtml;
    document.getElementById('quote-total').textContent = formatCurrency(total);
}

// Confirm and Submit Rental
async function submitCustomerBooking(e) {
    e.preventDefault();
    if (!selectedVehicle) return;

    const bookBtn = document.getElementById('confirm-booking-btn');
    bookBtn.disabled = true;
    bookBtn.innerHTML = '<div class="spinner"></div> Confirming Booking...';

    try {
        let customerIdToUse = null;
        let customerNameToUse = '';
        let customerPhoneToUse = '';
        let isNewlyCreated = false;

        if (currentCustomerMode === 'existing') {
            if (!verifiedCustomer) {
                // If not verified yet, try checking the input directly
                const input = document.getElementById('verify-id-input').value.trim();
                if (!input) {
                    throw new Error('Please enter your Customer ID and click Verify, or switch to New Customer.');
                }
                const cust = await apiFetch(`/customers/${input.toUpperCase()}`);
                if (!cust) throw new Error('Customer ID not found. Please register as New Customer.');
                verifiedCustomer = cust;
            }
            customerIdToUse = verifiedCustomer.customerId;
            customerNameToUse = verifiedCustomer.name;
            customerPhoneToUse = verifiedCustomer.phone;
        } else {
            // New Customer: Register and Auto-generate unique Customer ID!
            const newName = document.getElementById('new-cust-name').value.trim();
            const newPhone = document.getElementById('new-cust-phone').value.trim();
            const newEmail = document.getElementById('new-cust-email').value.trim();

            if (!newName) throw new Error('Please enter your full name.');
            if (!newPhone || newPhone.length < 10) throw new Error('Phone number must be at least 10 digits.');

            // Register customer via API (backend will auto-generate unique customerId!)
            const regBody = {
                name: newName,
                phone: newPhone,
                email: newEmail
            };

            const createdCustomer = await apiFetch('/customers', {
                method: 'POST',
                body: regBody
            });

            customerIdToUse = createdCustomer.customerId;
            customerNameToUse = createdCustomer.name;
            customerPhoneToUse = createdCustomer.phone;
            isNewlyCreated = true;
        }

        const days = parseInt(document.getElementById('book-days').value) || 1;
        const kilometers = parseFloat(document.getElementById('book-km').value) || 0;

        // Create the Rental
        const rentalPayload = {
            customerId: customerIdToUse,
            vehicleId: selectedVehicle.vehicleId,
            days: days,
            kilometers: kilometers
        };

        const rental = await apiFetch('/rentals', {
            method: 'POST',
            body: rentalPayload
        });

        // Close booking modal
        closeModal('booking-modal');

        // Show Success Receipt Modal with the customer's Unique ID!
        showBookingSuccessReceipt(rental, customerIdToUse, customerNameToUse, customerPhoneToUse, isNewlyCreated);

        // Refresh fleet cards so this vehicle is marked Rented
        await loadCustomerFleet();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        bookBtn.disabled = false;
        bookBtn.innerHTML = '⚡ Confirm & Book Vehicle';
    }
}

// Celebratory Receipt Modal
function showBookingSuccessReceipt(rental, customerId, customerName, customerPhone, isNew) {
    const receiptContainer = document.getElementById('receipt-content-area');

    receiptContainer.innerHTML = `
        <div style="text-align:center; margin-bottom:1.25rem;">
            <div style="font-size:3rem; margin-bottom:0.5rem;">🎉</div>
            <h2 style="font-size:1.4rem; font-weight:800; color:#fff; margin-bottom:0.3rem;">Booking Confirmed!</h2>
            <p style="color:var(--text-secondary); font-size:0.875rem;">Your reservation has been recorded successfully.</p>
        </div>

        <!-- UNIQUE CUSTOMER ID HIGHLIGHT -->
        <div class="customer-id-box">
            <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:700;">
                ${isNew ? '✨ YOUR NEW UNIQUE CUSTOMER CODE' : 'YOUR CUSTOMER CODE'}
            </div>
            <div class="customer-id-badge">
                <span id="receipt-cust-id">${customerId}</span>
                <button onclick="copyCustomerId('${customerId}')" style="background:transparent; border:none; color:#fff; cursor:pointer; font-size:1rem;" title="Copy to clipboard">
                    📋
                </button>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">
                📌 <strong>Keep this Customer ID saved!</strong> Use it anytime to rent vehicles or check booking status without re-registering.
            </p>
        </div>

        <!-- RECEIPT CARD -->
        <div class="booking-receipt">
            <div class="receipt-header">
                <div style="font-weight:700; font-size:1.1rem; color:#fff;">RENTX RENTAL RECEIPT</div>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">Booking ID: <code style="color:#fff;">${rental.rentalId}</code></div>
            </div>

            <div class="receipt-row">
                <span>Customer</span>
                <strong>${customerName} (${customerPhone})</strong>
            </div>
            <div class="receipt-row">
                <span>Vehicle</span>
                <strong>${rental.vehicle?.model || selectedVehicle.model} [${rental.vehicle?.vehicleId || selectedVehicle.vehicleId}]</strong>
            </div>
            <div class="receipt-row">
                <span>Vehicle Type</span>
                <span>${rental.vehicle?.vehicleType || selectedVehicle.vehicleType}</span>
            </div>
            <div class="receipt-row">
                <span>Rental Period</span>
                <strong>${rental.numberOfDays} Day(s)</strong>
            </div>
            <div class="receipt-row">
                <span>Booking Date</span>
                <span>${formatDate(rental.rentalDate)}</span>
            </div>
            <div class="receipt-row">
                <span>Status</span>
                <span>${statusBadge(rental.status)}</span>
            </div>

            <div class="receipt-total">
                <span>Total Amount Due</span>
                <span style="color:#FFFFFF;">${formatCurrency(rental.totalAmount)}</span>
            </div>
        </div>
    `;

    openModal('booking-success-modal');
}

function copyCustomerId(id) {
    navigator.clipboard.writeText(id).then(() => {
        showToast(`Customer ID ${id} copied to clipboard!`, 'success');
    }).catch(() => {
        showToast(`Customer ID: ${id}`, 'info');
    });
}

// ======================================================
// MY BOOKINGS LOOKUP
// ======================================================

async function lookupMyBookings(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('my-bookings-input').value.trim();
    const resultBox = document.getElementById('my-bookings-results');

    if (!input) {
        showToast('Please enter your Customer ID or Phone Number.', 'warning');
        return;
    }

    resultBox.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Finding your bookings...</div>';

    try {
        let customer = null;

        // Direct ID lookup
        try {
            customer = await apiFetch(`/customers/${input.toUpperCase()}`);
        } catch (e) {
            const results = await apiFetch(`/customers?search=${encodeURIComponent(input)}`);
            if (results && results.length > 0) customer = results[0];
        }

        if (!customer) {
            resultBox.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <h3>No Customer Found</h3>
                    <p>We couldn't find an account matching "${input}". Please check your Customer ID or phone number.</p>
                </div>`;
            return;
        }

        const rentals = await apiFetch(`/rentals/customer/${customer.customerId}`);

        if (!rentals || rentals.length === 0) {
            resultBox.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>No Bookings Yet</h3>
                    <p>Welcome, <strong>${customer.name}</strong> (${customer.customerId})! You have no vehicle rentals recorded yet.</p>
                    <a href="#fleet-section" class="btn btn-primary btn-sm" style="margin-top:1rem;">Browse Fleet</a>
                </div>`;
            return;
        }

        resultBox.innerHTML = `
            <div style="margin-bottom:1.25rem; display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:0.85rem 1.25rem; border-radius:8px; border:1px solid var(--border);">
                <div>
                    <h3 style="font-size:1rem; color:#fff;">👤 ${customer.name}</h3>
                    <div style="font-size:0.8rem; color:var(--text-muted);">Customer ID: <code style="color:#fff;">${customer.customerId}</code> · 📞 ${customer.phone}</div>
                </div>
                <div style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">
                    ${rentals.length} Total Rental(s)
                </div>
            </div>

            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Vehicle</th>
                            <th>Duration</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rentals.map(r => `
                            <tr>
                                <td><code style="color:#fff; font-weight:700;">${r.rentalId}</code></td>
                                <td>
                                    <strong>${r.vehicle?.model || '—'}</strong>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${r.vehicle?.vehicleType || ''} [${r.vehicle?.vehicleId || ''}]</div>
                                </td>
                                <td>${r.numberOfDays} Day(s)</td>
                                <td style="font-weight:700; color:#fff;">${formatCurrency(r.totalAmount)}</td>
                                <td>${statusBadge(r.status)}</td>
                                <td style="color:var(--text-secondary); font-size:0.85rem;">${formatDate(r.rentalDate)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (err) {
        resultBox.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <p>${err.message}</p>
            </div>`;
    }
}

// ======================================================
// ADMIN LOGIN MODAL LOGIC
// ======================================================

function submitAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();

    // Default admin credentials
    if ((user === 'admin' && pass === 'admin123') || (user === 'owner' && pass === 'owner123')) {
        sessionStorage.setItem('isAdmin', 'true');
        showToast('Admin login successful! Redirecting to Owner Portal...', 'success');
        closeModal('admin-login-modal');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 600);
    } else {
        showToast('Invalid credentials. (Hint: Use admin / admin123)', 'error');
    }
}

function quickAdminLogin() {
    document.getElementById('admin-user').value = 'admin';
    document.getElementById('admin-pass').value = 'admin123';
    submitAdminLogin(new Event('submit'));
}

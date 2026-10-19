/* customers.js - Customer management page logic */

let allCustomers = [];

async function loadCustomers() {
    try {
        allCustomers = await apiFetch('/customers');
        renderCustomers(allCustomers);
    } catch (err) {
        document.getElementById('customer-table-wrapper').innerHTML =
            `<div class="empty-state"><div class="icon">⚠️</div><h3>Failed to load</h3><p>${err.message}</p></div>`;
        showToast(err.message, 'error');
    }
}

function renderCustomers(customers) {
    const wrapper = document.getElementById('customer-table-wrapper');

    if (customers.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state">
                <div class="icon">👥</div>
                <h3>No customers found</h3>
                <p><a href="#" onclick="openModal('add-customer-modal')" style="color:var(--primary-light)">Register a customer</a> to get started.</p>
            </div>`;
        return;
    }

    wrapper.innerHTML = `
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Customer ID</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.map(c => `
                        <tr>
                            <td><code style="color:var(--primary-light); font-size:0.85rem;">${c.customerId}</code></td>
                            <td>
                                <div style="font-weight:600;">${c.name}</div>
                            </td>
                            <td>${c.phone}</td>
                            <td style="color:var(--text-secondary)">${c.email || '—'}</td>
                            <td>
                                <div style="display:flex; gap:0.5rem;">
                                    <button class="btn btn-outline btn-sm" onclick="viewCustomerRentals('${c.customerId}', '${c.name}')">
                                        📋 Rentals
                                    </button>
                                    <a href="rental.html?customerId=${c.customerId}" class="btn btn-primary btn-sm">
                                        🔑 Rent
                                    </a>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function filterCustomers() {
    const search = document.getElementById('customer-search').value.toLowerCase();
    const filtered = allCustomers.filter(c =>
        c.customerId.toLowerCase().includes(search) ||
        c.name.toLowerCase().includes(search) ||
        (c.phone && c.phone.includes(search))
    );
    renderCustomers(filtered);
}

async function submitCustomer(e) {
    e.preventDefault();
    const btn = document.getElementById('add-customer-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Registering...';

    const phone = document.getElementById('c-phone').value.trim();
    if (phone.length < 10) {
        showToast('Phone number must be at least 10 digits.', 'error');
        btn.disabled = false;
        btn.textContent = 'Register Customer';
        return;
    }

    const rawId = document.getElementById('c-id').value.trim().toUpperCase();
    const body = {
        customerId: rawId || "",
        name: document.getElementById('c-name').value.trim(),
        phone: phone,
        email: document.getElementById('c-email').value.trim()
    };

    try {
        const registered = await apiFetch('/customers', { method: 'POST', body });
        showToast(`Customer registered! ID: ${registered.customerId}`, 'success');
        closeModal('add-customer-modal');
        document.getElementById('add-customer-form').reset();
        await loadCustomers();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Register Customer';
    }
}

async function viewCustomerRentals(customerId, name) {
    document.getElementById('customer-rentals-title').textContent = `📋 ${name}'s Rentals`;
    document.getElementById('customer-rentals-body').innerHTML =
        '<div class="loading-overlay"><div class="spinner"></div></div>';
    openModal('customer-rentals-modal');

    try {
        const rentals = await apiFetch(`/rentals/customer/${customerId}`);
        const body = document.getElementById('customer-rentals-body');

        if (!rentals || rentals.length === 0) {
            body.innerHTML = `<div class="empty-state"><div class="icon">📋</div><p>No rentals found for this customer.</p></div>`;
            return;
        }

        body.innerHTML = `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr><th>Rental ID</th><th>Vehicle</th><th>Days</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                        ${rentals.map(r => `
                            <tr>
                                <td><code style="color:var(--primary-light)">${r.rentalId}</code></td>
                                <td>${r.vehicle?.model || '—'} <span style="color:var(--text-muted); font-size:0.78rem;">[${r.vehicle?.vehicleId || '—'}]</span></td>
                                <td>${r.numberOfDays}</td>
                                <td style="color:var(--success); font-weight:600;">${formatCurrency(r.totalAmount)}</td>
                                <td>${statusBadge(r.status)}</td>
                                <td style="color:var(--text-muted); font-size:0.8rem;">${formatDate(r.rentalDate)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    } catch (err) {
        document.getElementById('customer-rentals-body').innerHTML =
            `<div class="empty-state"><p>${err.message}</p></div>`;
    }
}

loadCustomers();

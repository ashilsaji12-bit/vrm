/* history.js - Rental history page logic */

let allRentals = [];

async function loadHistory() {
    try {
        allRentals = await apiFetch('/rentals');
        renderHistory(allRentals);
    } catch (err) {
        document.getElementById('history-table-wrapper').innerHTML =
            `<div class="empty-state"><div class="icon">⚠️</div><h3>Failed to load</h3><p>${err.message}</p></div>`;
        showToast(err.message, 'error');
    }
}

function renderHistory(rentals) {
    const wrapper = document.getElementById('history-table-wrapper');
    const countEl = document.getElementById('history-count');
    countEl.textContent = `Showing ${rentals.length} rental record${rentals.length !== 1 ? 's' : ''}`;

    if (rentals.length === 0) {
        wrapper.innerHTML = `
            <div class="empty-state">
                <div class="icon">📋</div>
                <h3>No rental records found</h3>
                <p><a href="rental.html" style="color:var(--primary-light)">Rent a vehicle</a> to create rental records.</p>
            </div>`;
        return;
    }

    // Sort newest first
    const sorted = [...rentals].reverse();

    wrapper.innerHTML = `
        <div class="table-wrapper">
            <table class="table">
                <thead>
                    <tr>
                        <th>Rental ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Type</th>
                        <th>Days</th>
                        <th>Rental Date</th>
                        <th>Return Date</th>
                        <th>Base Amount</th>
                        <th>Late Fee</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${sorted.map(r => `
                        <tr>
                            <td><code style="color:var(--primary-light); font-size:0.82rem;">${r.rentalId}</code></td>
                            <td>
                                <div style="font-weight:600; font-size:0.875rem;">${r.customer?.name || '—'}</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">${r.customer?.customerId || ''}</div>
                            </td>
                            <td>
                                <div style="font-weight:600; font-size:0.875rem;">${r.vehicle?.model || '—'}</div>
                                <div style="font-size:0.75rem; color:var(--text-muted);">[${r.vehicle?.vehicleId || ''}]</div>
                            </td>
                            <td>${vehicleTypeBadge(r.vehicle?.vehicleType)}</td>
                            <td style="text-align:center;">${r.numberOfDays}</td>
                            <td style="font-size:0.82rem; color:var(--text-secondary);">${formatDate(r.rentalDate)}</td>
                            <td style="font-size:0.82rem; color:var(--text-secondary);">${r.actualReturnDate ? formatDate(r.actualReturnDate) : '—'}</td>
                            <td style="font-weight:600; color:var(--text-primary);">${formatCurrency(r.baseAmount)}</td>
                            <td style="color:${r.lateFee > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:${r.lateFee > 0 ? 600 : 400};">
                                ${r.lateFee > 0 ? formatCurrency(r.lateFee) : '—'}
                            </td>
                            <td style="font-weight:700; color:var(--success);">${formatCurrency(r.totalAmount)}</td>
                            <td>${statusBadge(r.status)}</td>
                            <td>
                                ${r.status === 'ACTIVE'
                                    ? `<a href="return.html" class="btn btn-success btn-sm">↩️ Return</a>`
                                    : `<span style="color:var(--text-muted); font-size:0.78rem;">Completed</span>`
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function filterHistory() {
    const search = document.getElementById('history-search').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    const typeFilter = document.getElementById('type-filter-h').value;

    let filtered = allRentals;

    if (search) {
        filtered = filtered.filter(r =>
            r.rentalId.toLowerCase().includes(search) ||
            (r.customer?.name || '').toLowerCase().includes(search) ||
            (r.customer?.customerId || '').toLowerCase().includes(search) ||
            (r.vehicle?.vehicleId || '').toLowerCase().includes(search) ||
            (r.vehicle?.model || '').toLowerCase().includes(search)
        );
    }

    if (statusFilter) {
        filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (typeFilter) {
        filtered = filtered.filter(r => r.vehicle?.vehicleType === typeFilter);
    }

    renderHistory(filtered);
}

loadHistory();

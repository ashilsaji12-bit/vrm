/* app.js - Shared utilities for all pages */

const API_BASE = 'http://localhost:8080/api';

// ======================================================
// API HELPERS
// ======================================================

async function apiFetch(path, options = {}) {
    const url = API_BASE + path;
    const defaults = {
        headers: { 'Content-Type': 'application/json' }
    };
    const config = { ...defaults, ...options };
    if (options.body && typeof options.body !== 'string') {
        config.body = JSON.stringify(options.body);
    }

    try {
        const res = await fetch(url, config);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            const msg = data?.message || `HTTP ${res.status}: ${res.statusText}`;
            throw new Error(msg);
        }
        return data;
    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('Cannot connect to backend. Make sure Spring Boot is running on port 8080.');
        }
        throw err;
    }
}

// ======================================================
// TOAST NOTIFICATIONS
// ======================================================

function showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInToast 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ======================================================
// MODAL HELPERS
// ======================================================

function openModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) overlay.classList.add('active');
}

function closeModal(modalId) {
    const overlay = document.getElementById(modalId);
    if (overlay) overlay.classList.remove('active');
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ======================================================
// FORMATTING HELPERS
// ======================================================

function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function vehicleIcon(type) {
    const icons = { Car: '🚗', Bike: '🏍️', Truck: '🚛' };
    return icons[type] || '🚘';
}

function vehicleTypeBadge(type) {
    const cls = { Car: 'badge-car', Bike: 'badge-bike', Truck: 'badge-truck' };
    return `<span class="badge ${cls[type] || ''}">${vehicleIcon(type)} ${type}</span>`;
}

function availabilityBadge(available) {
    return available
        ? `<span class="badge badge-available">● Available</span>`
        : `<span class="badge badge-rented">● Rented</span>`;
}

function statusBadge(status) {
    return status === 'ACTIVE'
        ? `<span class="badge badge-active">⏳ Active</span>`
        : `<span class="badge badge-returned">✓ Returned</span>`;
}

// ======================================================
// NAVIGATION: SET ACTIVE LINK
// ======================================================

function setActiveNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') && path.endsWith(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdmin');
    showToast('Logged out of Admin Portal.', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 400);
}

document.addEventListener('DOMContentLoaded', setActiveNav);

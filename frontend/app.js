// BizFlow ERP Frontend JavaScript
// API Configuration
const API_BASE = window.location.origin + '/api/v1';
let currentUser = null;
let currentToken = null;

// Authentication Functions
async function login(event) {
    if (event) event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            currentUser = data.user;
            currentToken = data.accessToken;
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showDashboard();
            loadDashboardData();
        } else {
            alert('Σφάλμα σύνδεσης: ' + (data.error || 'Άγνωστο σφάλμα'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Σφάλμα σύνδεσης με τον server');
    }
}

async function register() {
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    if (password !== confirmPassword) {
        alert('Οι κωδικοί δεν ταιριάζουν');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                name, 
                email, 
                password, 
                confirmPassword 
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Εγγραφή επιτυχής! Ελέγξτε το email σας για επιβεβαίωση.');
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            // Reset form
            document.getElementById('registerForm').reset();
        } else {
            alert('Σφάλμα εγγραφής: ' + (data.error || data.errors?.map(e => e.msg).join(', ') || 'Άγνωστο σφάλμα'));
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Σφάλμα σύνδεσης με τον server');
    }
}

function logout() {
    currentUser = null;
    currentToken = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showLogin();
}

// UI Functions
function showLogin() {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';
    showSection('dashboard');
}

function showRegister() {
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

function showSection(sectionName) {
    // Hide all sections
    const sections = ['dashboard', 'companies', 'invoices', 'members', 'reports'];
    sections.forEach(section => {
        document.getElementById(`${section}Section`).style.display = 'none';
    });

    // Show selected section
    document.getElementById(`${sectionName}Section`).style.display = 'block';

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event?.target.classList.add('active');

    // Load section data
    if (sectionName === 'companies') {
        loadCompanies();
    }
}

// Data Loading Functions
async function loadDashboardData() {
    try {
        // Load dashboard statistics
        await Promise.all([
            loadCompaniesCount(),
            loadInvoicesCount(),
            loadMembersCount(),
            loadTotalRevenue()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadCompaniesCount() {
    try {
        const response = await fetch(`${API_BASE}/companies`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('companiesCount').textContent = data.companies?.length || 0;
        }
    } catch (error) {
        console.error('Error loading companies count:', error);
    }
}

async function loadInvoicesCount() {
    try {
        const response = await fetch(`${API_BASE}/invoices`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('invoicesCount').textContent = data.invoices?.length || 0;
        }
    } catch (error) {
        console.error('Error loading invoices count:', error);
        document.getElementById('invoicesCount').textContent = '0';
    }
}

async function loadMembersCount() {
    try {
        const response = await fetch(`${API_BASE}/members`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('membersCount').textContent = data.members?.length || 0;
        }
    } catch (error) {
        console.error('Error loading members count:', error);
        document.getElementById('membersCount').textContent = '0';
    }
}

async function loadTotalRevenue() {
    // Placeholder for revenue calculation
    document.getElementById('totalRevenue').textContent = '€0';
}

async function loadCompanies() {
    try {
        const response = await fetch(`${API_BASE}/companies`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            displayCompanies(data.companies || []);
        } else {
            console.error('Failed to load companies');
        }
    } catch (error) {
        console.error('Error loading companies:', error);
    }
}

function displayCompanies(companies) {
    const tableBody = document.getElementById('companiesTable');
    
    if (companies.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Δεν υπάρχουν εταιρείες</td></tr>';
        return;
    }

    tableBody.innerHTML = companies.map(company => `
        <tr>
            <td>${company.name}</td>
            <td>${company.afm}</td>
            <td>${company.email}</td>
            <td>${company.phone}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editCompany('${company.id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCompany('${company.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Company Management Functions
function showAddCompanyModal() {
    alert('Λειτουργία προσθήκης εταιρείας σε ανάπτυξη');
}

function editCompany(companyId) {
    alert(`Επεξεργασία εταιρείας: ${companyId}`);
}

function deleteCompany(companyId) {
    if (confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε αυτή την εταιρεία;')) {
        alert(`Διαγραφή εταιρείας: ${companyId}`);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check for existing authentication
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
        loadDashboardData();
    } else {
        showLogin();
    }

    // Login form handler
    document.getElementById('loginForm').addEventListener('submit', login);
});

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, logout user
                logout();
                return null;
            }
            throw new Error(data.message || data.error || 'API Error');
        }

        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Test API Connection
async function testConnection() {
    try {
        const response = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);
        const data = await response.json();
        console.log('API Connection Test:', data);
        return data.status === 'healthy';
    } catch (error) {
        console.error('API Connection Test Failed:', error);
        return false;
    }
}

// Initialize app
testConnection().then(isHealthy => {
    if (!isHealthy) {
        console.warn('API connection test failed');
    }
});
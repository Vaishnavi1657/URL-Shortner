// Elements
const urlInput = document.getElementById('urlInput');
const customCode = document.getElementById('customCode');
const shortenBtn = document.getElementById('shortenBtn');
const errorMessage = document.getElementById('errorMessage');
const resultSection = document.getElementById('resultSection');
const shortUrlDisplay = document.getElementById('shortUrlDisplay');
const originalUrlDisplay = document.getElementById('originalUrlDisplay');
const copyBtn = document.getElementById('copyBtn');
const newLinkBtn = document.getElementById('newLinkBtn');
const urlsList = document.getElementById('urlsList');
const refreshBtn = document.getElementById('refreshBtn');
const authButtons = document.getElementById('authButtons');
const userProfile = document.getElementById('userProfile');
const logoutBtn = document.getElementById('logoutBtn');
const usernameDisplay = document.getElementById('username');

const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// Check authentication on page load
function checkAuthentication() {
    if (authToken && currentUser) {
        // User is logged in
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex';
        usernameDisplay.textContent = `Welcome, ${currentUser.username}!`;
        document.querySelector('.shortener-section').style.display = 'block';
        document.querySelector('.recent-urls-section').style.display = 'block';
    } else {
        // User is not logged in
        authButtons.style.display = 'flex';
        userProfile.style.display = 'none';
        document.querySelector('.shortener-section').style.display = 'none';
        document.querySelector('.recent-urls-section').style.display = 'none';
        
        // Show login/signup prompt
        urlsList.innerHTML = `
            <div class="login-prompt">
                <h3>Get Started</h3>
                <p>Please <a href="login.html">login</a> or <a href="signup.html">sign up</a> to shorten URLs</p>
            </div>
        `;
    }
}

// Event Listeners
shortenBtn.addEventListener('click', handleShortenUrl);
copyBtn.addEventListener('click', handleCopyUrl);
newLinkBtn.addEventListener('click', resetForm);
refreshBtn.addEventListener('click', loadRecentUrls);
logoutBtn.addEventListener('click', handleLogout);

// Enter key support
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && urlInput.value) {
        handleShortenUrl();
    }
});

// Handle Logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Handle Shorten URL
async function handleShortenUrl() {
    if (!authToken) {
        showError('Please login to shorten URLs');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const url = urlInput.value.trim();
    const code = customCode.value.trim();

    // Validate
    if (!url) {
        showError('Please enter a URL');
        return;
    }

    if (!isValidUrl(url)) {
        showError('Please enter a valid URL (must start with http:// or https://)');
        return;
    }

    if (code && !/^[a-zA-Z0-9]{3,20}$/.test(code)) {
        showError('Custom code must be 3-20 alphanumeric characters');
        return;
    }

    // Disable button and show loading state
    shortenBtn.disabled = true;
    errorMessage.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/shorten`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                url: url,
                customCode: code || undefined
            })
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                showError('Session expired. Please login again.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                return;
            }
            throw new Error(data.error || 'Failed to shorten URL');
        }

        // Display result
        shortUrlDisplay.value = data.shortUrl;
        originalUrlDisplay.value = data.originalUrl;
        resultSection.style.display = 'block';
        document.querySelector('.shortener-section').style.display = 'none';

        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth' });

        // Reload recent URLs
        loadRecentUrls();

    } catch (error) {
        showError(error.message);
    } finally {
        shortenBtn.disabled = false;
    }
}

// Copy to clipboard
function handleCopyUrl() {
    const text = shortUrlDisplay.value;
    navigator.clipboard.writeText(text).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        showError('Failed to copy URL');
    });
}

// Reset Form
function resetForm() {
    urlInput.value = '';
    customCode.value = '';
    resultSection.style.display = 'none';
    document.querySelector('.shortener-section').style.display = 'block';
    errorMessage.style.display = 'none';
    urlInput.focus();
}

// Load Recent URLs
async function loadRecentUrls() {
    if (!authToken) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/urls/user`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const urls = await response.json();

        if (!response.ok) {
            throw new Error('Failed to load URLs');
        }

        if (urls.length === 0) {
            urlsList.innerHTML = '<p class="loading">No URLs shortened yet. Create your first one!</p>';
            return;
        }

        urlsList.innerHTML = urls.map(item => `
            <div class="url-item">
                <div class="url-item-content">
                    <div class="url-item-short">
                        <a href="/${item.short_code}" target="_blank" rel="noopener noreferrer">
                            localhost:3000/${item.short_code}
                        </a>
                    </div>
                    <div class="url-item-info">
                        <span>📊 Clicks: ${item.clicks}</span>
                        <span>📅 ${formatDate(item.created_at)}</span>
                    </div>
                    <div style="margin-top: 8px; word-break: break-all; color: #666; font-size: 0.85rem;">
                        ${item.original_url}
                    </div>
                </div>
                <div class="url-item-actions">
                    <button class="btn-copy" onclick="copyToClipboard('http://localhost:3000/${item.short_code}')">
                        📋 Copy
                    </button>
                    <button class="btn-delete" onclick="deleteUrl('${item.short_code}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        urlsList.innerHTML = `<p class="loading" style="color: red;">Error loading URLs: ${error.message}</p>`;
    }
}

// Copy URL to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('URL copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy URL');
    });
}

// Delete URL
async function deleteUrl(shortCode) {
    if (!confirm(`Are you sure you want to delete /${shortCode}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/urls/${shortCode}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete URL');
        }

        loadRecentUrls();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Utility Functions

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.scrollIntoView({ behavior: 'smooth' });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Initialize on page load
checkAuthentication();
if (authToken) {
    loadRecentUrls();
}

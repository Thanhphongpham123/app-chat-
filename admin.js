// Auth keys
const AUTH_USERS_KEY = 'appChat_users';
const AUTH_CURRENT_KEY = 'appChat_currentUser';
const CHATS_KEY_PREFIX = 'appChat_chats_';

// Check if user is admin
function checkAdminAuth() {
    const currentUser = localStorage.getItem(AUTH_CURRENT_KEY);
    if (!currentUser || currentUser !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Load users from localStorage
function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

// Hash password (simple encoding)
function hashPw(pw) {
    return btoa(pw);
}

// Initialize admin page
function init() {
    if (!checkAdminAuth()) return;
    
    // Display admin username
    const adminUsername = localStorage.getItem(AUTH_CURRENT_KEY);
    document.getElementById('adminUsername').textContent = adminUsername;
    
    // Wire up navigation
    setupNavigation();
    
    // Wire up buttons
    setupEventListeners();
    
    // Load dashboard data
    loadDashboard();
    
    // Load users list
    loadUsersTable();
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = item.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(sectionId + 'Section').classList.add('active');
            
            // Update page title
            const titles = {
                dashboard: 'Dashboard',
                users: 'Quản lý tài khoản',
                chats: 'Quản lý chat'
            };
            document.getElementById('pageTitle').textContent = titles[sectionId];
            
            // Load section data
            if (sectionId === 'users') loadUsersTable();
            if (sectionId === 'chats') loadChatsTable();
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadDashboard();
        loadUsersTable();
        loadChatsTable();
    });
    
    // Add user modal
    document.getElementById('addUserBtn').addEventListener('click', () => {
        document.getElementById('addUserModal').classList.add('active');
    });
    
    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Confirm add user
    document.getElementById('confirmAddUser').addEventListener('click', addUser);
    
    // Confirm edit user
    document.getElementById('confirmEditUser').addEventListener('click', updateUser);
    
    // Search user
    document.getElementById('searchUser')?.addEventListener('input', filterUsers);
    
    // Filter by role
    document.getElementById('filterRole')?.addEventListener('change', filterUsers);
}

// Load dashboard data
function loadDashboard() {
    const users = loadUsers();
    
    // Count stats
    const totalUsers = users.length;
    const normalUsers = users.filter(u => !u.isAdmin).length;
    const adminUsers = users.filter(u => u.isAdmin).length;
    
    // Count total chats across all users
    let totalChats = 0;
    users.forEach(user => {
        const chats = loadUserChats(user.user);
        totalChats += chats.length;
    });
    
    // Update stats
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('normalUsers').textContent = normalUsers;
    document.getElementById('adminUsers').textContent = adminUsers;
    document.getElementById('totalChats').textContent = totalChats;
    
    // Load recent activity
    loadRecentActivity(users);
}

// Load recent activity
function loadRecentActivity(users) {
    const activityList = document.getElementById('recentActivity');
    activityList.innerHTML = '';
    
    // Get last 5 users (simulated activity)
    const recentUsers = users.slice(-5).reverse();
    
    recentUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <strong>${escapeHtml(user.user)}</strong> 
            ${user.isAdmin ? '(Admin)' : ''}
            - Tạo: ${user.createdAt || 'N/A'}
        `;
        activityList.appendChild(item);
    });
    
    if (recentUsers.length === 0) {
        activityList.innerHTML = '<div class="activity-item">Chưa có hoạt động nào</div>';
    }
}

// Load users table
function loadUsersTable() {
    const users = loadUsers();
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(user.user)}</strong></td>
            <td><span class="badge ${user.isAdmin ? 'badge-admin' : 'badge-user'}">${user.isAdmin ? 'Admin' : 'User'}</span></td>
            <td>${user.createdAt || 'N/A'}</td>
            <td><span class="badge badge-active">Hoạt động</span></td>
            <td class="action-btns">
                <button class="btn-icon btn-edit" onclick="editUser('${escapeHtml(user.user)}')" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-reset" onclick="resetPassword('${escapeHtml(user.user)}')" title="Reset mật khẩu">
                    <i class="fas fa-key"></i>
                </button>
                ${user.user !== 'admin' ? `
                <button class="btn-icon btn-delete" onclick="deleteUser('${escapeHtml(user.user)}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có tài khoản nào</td></tr>';
    }
}

// Filter users
function filterUsers() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const roleFilter = document.getElementById('filterRole').value;
    const users = loadUsers();
    
    const filtered = users.filter(user => {
        const matchSearch = user.user.toLowerCase().includes(searchTerm);
        const matchRole = roleFilter === 'all' || 
                         (roleFilter === 'admin' && user.isAdmin) ||
                         (roleFilter === 'user' && !user.isAdmin);
        return matchSearch && matchRole;
    });
    
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    filtered.forEach((user, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(user.user)}</strong></td>
            <td><span class="badge ${user.isAdmin ? 'badge-admin' : 'badge-user'}">${user.isAdmin ? 'Admin' : 'User'}</span></td>
            <td>${user.createdAt || 'N/A'}</td>
            <td><span class="badge badge-active">Hoạt động</span></td>
            <td class="action-btns">
                <button class="btn-icon btn-edit" onclick="editUser('${escapeHtml(user.user)}')" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-reset" onclick="resetPassword('${escapeHtml(user.user)}')" title="Reset mật khẩu">
                    <i class="fas fa-key"></i>
                </button>
                ${user.user !== 'admin' ? `
                <button class="btn-icon btn-delete" onclick="deleteUser('${escapeHtml(user.user)}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Add new user
function addUser() {
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const isAdmin = document.getElementById('isAdminCheck').checked;
    
    if (!username) {
        alert('Vui lòng nhập tên tài khoản');
        return;
    }
    
    if (!password) {
        alert('Vui lòng nhập mật khẩu');
        return;
    }
    
    if (password !== confirmPass) {
        alert('Mật khẩu không khớp');
        return;
    }
    
    const users = loadUsers();
    
    if (users.find(u => u.user === username)) {
        alert('Tài khoản đã tồn tại');
        return;
    }
    
    users.push({
        user: username,
        pass: hashPw(password),
        isAdmin: isAdmin,
        createdAt: new Date().toLocaleDateString('vi-VN')
    });
    
    saveUsers(users);
    
    // Close modal
    document.getElementById('addUserModal').classList.remove('active');
    
    // Reset form
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('isAdminCheck').checked = false;
    
    // Reload table
    loadUsersTable();
    loadDashboard();
    
    alert('Đã thêm tài khoản thành công');
}

// Edit user
function editUser(username) {
    const users = loadUsers();
    const user = users.find(u => u.user === username);
    
    if (!user) {
        alert('Không tìm thấy tài khoản');
        return;
    }
    
    // Fill form
    document.getElementById('editUsername').value = user.user;
    document.getElementById('editPassword').value = '';
    document.getElementById('editIsAdmin').checked = user.isAdmin || false;
    
    // Show modal
    document.getElementById('editUserModal').classList.add('active');
}

// Update user
function updateUser() {
    const username = document.getElementById('editUsername').value;
    const newPassword = document.getElementById('editPassword').value;
    const isAdmin = document.getElementById('editIsAdmin').checked;
    
    const users = loadUsers();
    const user = users.find(u => u.user === username);
    
    if (!user) {
        alert('Không tìm thấy tài khoản');
        return;
    }
    
    // Update password if provided
    if (newPassword) {
        user.pass = hashPw(newPassword);
    }
    
    // Update admin status (but not for main admin)
    if (username !== 'admin') {
        user.isAdmin = isAdmin;
    }
    
    saveUsers(users);
    
    // Close modal
    document.getElementById('editUserModal').classList.remove('active');
    
    // Reload table
    loadUsersTable();
    loadDashboard();
    
    alert('Đã cập nhật tài khoản thành công');
}

// Reset password
function resetPassword(username) {
    if (!confirm(`Reset mật khẩu cho tài khoản "${username}" về "123"?`)) return;
    
    const users = loadUsers();
    const user = users.find(u => u.user === username);
    
    if (!user) {
        alert('Không tìm thấy tài khoản');
        return;
    }
    
    user.pass = hashPw('123');
    saveUsers(users);
    
    alert(`Đã reset mật khẩu cho "${username}" về "123"`);
}

// Delete user
function deleteUser(username) {
    if (!confirm(`Xóa vĩnh viễn tài khoản "${username}"? Hành động này không thể hoàn tác!`)) return;
    
    const users = loadUsers();
    const filtered = users.filter(u => u.user !== username);
    
    saveUsers(filtered);
    
    // Delete user's chats
    localStorage.removeItem(CHATS_KEY_PREFIX + username);
    
    loadUsersTable();
    loadDashboard();
    
    alert(`Đã xóa tài khoản "${username}"`);
}

// Load chats table
function loadChatsTable() {
    const users = loadUsers();
    const tbody = document.getElementById('chatsTableBody');
    tbody.innerHTML = '';
    
    let chatIndex = 1;
    
    users.forEach(user => {
        if (user.user === 'admin') return; // Skip admin
        
        const chats = loadUserChats(user.user);
        
        chats.forEach(chat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${chatIndex++}</td>
                <td><strong>${escapeHtml(chat.name)}</strong></td>
                <td><span class="badge ${chat.isGroup ? 'badge-admin' : 'badge-user'}">${chat.isGroup ? 'Nhóm' : '1-1'}</span></td>
                <td>${chat.isGroup ? (chat.members?.length || 0) : 2}</td>
                <td>${chat.messages?.length || 0}</td>
                <td class="action-btns">
                    <button class="btn-icon btn-edit" onclick="viewChatDetail('${escapeHtml(user.user)}', ${chat.id})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteChat('${user.user}', ${chat.id})" title="Xóa cuộc trò chuyện">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    });
    
    if (chatIndex === 1) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có cuộc trò chuyện nào</td></tr>';
    }
}

// View chat detail
function viewChatDetail(username, chatId) {
    const chats = loadUserChats(username);
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) {
        alert('Không tìm thấy cuộc trò chuyện');
        return;
    }
    
    // Fill modal info
    document.getElementById('chatDetailName').textContent = chat.name;
    document.getElementById('chatOwner').textContent = username;
    document.getElementById('chatType').textContent = chat.isGroup ? 'Nhóm chat' : 'Chat 1-1';
    document.getElementById('chatMessageCount').textContent = chat.messages?.length || 0;
    
    // Display messages
    const messagesContent = document.getElementById('chatMessagesContent');
    messagesContent.innerHTML = '';
    
    if (!chat.messages || chat.messages.length === 0) {
        messagesContent.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Chưa có tin nhắn nào</p>';
    } else {
        chat.messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message-item ${msg.sender === 'me' ? 'message-sent' : 'message-received'}`;
            
            const senderName = msg.sender === 'me' ? username : chat.name;
            const timestamp = msg.time || msg.timestamp || 'N/A';
            
            msgDiv.innerHTML = `
                <div class="message-header">
                    <strong>${escapeHtml(senderName)}</strong>
                    <span class="message-time">${escapeHtml(timestamp)}</span>
                </div>
                <div class="message-text">${escapeHtml(msg.text || msg.content || '')}</div>
            `;
            messagesContent.appendChild(msgDiv);
        });
    }
    
    // Show modal
    document.getElementById('viewChatModal').classList.add('active');
}

// Delete chat
function deleteChat(username, chatId) {
    if (!confirm('Xóa cuộc trò chuyện này?')) return;
    
    const chats = loadUserChats(username);
    const filtered = chats.filter(c => c.id !== chatId);
    
    localStorage.setItem(CHATS_KEY_PREFIX + username, JSON.stringify(filtered));
    
    loadChatsTable();
    loadDashboard();
    
    alert('Đã xóa cuộc trò chuyện');
}

// Load user chats
function loadUserChats(username) {
    try {
        return JSON.parse(localStorage.getItem(CHATS_KEY_PREFIX + username) || '[]');
    } catch {
        return [];
    }
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('adminDarkMode', isDark ? 'on' : 'off');
    
    // Update icon
    const icon = document.querySelector('#darkModeToggle i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// Logout
function logout() {
    if (!confirm('Đăng xuất khỏi trang quản trị?')) return;
    
    localStorage.removeItem(AUTH_CURRENT_KEY);
    window.location.href = 'index.html';
}

// Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Check dark mode preference
if (localStorage.getItem('adminDarkMode') === 'on') {
    document.body.classList.add('dark');
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) icon.className = 'fas fa-sun';
}

// Initialize on page load
init();

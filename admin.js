// Khóa xác thực
const AUTH_USERS_KEY = 'appChat_users';
const AUTH_CURRENT_KEY = 'appChat_currentUser';
const CHATS_KEY_PREFIX = 'appChat_chats_';
const ACTIVITY_LOG_KEY = 'appChat_activityLogs';

// Các hành động Nhật ký Hoạt động
const LOG_ACTIONS = {
    USER_CREATED: 'user_created',
    USER_EDITED: 'user_edited',
    USER_DELETED: 'user_deleted',
    USER_LOCKED: 'user_locked',
    USER_UNLOCKED: 'user_unlocked',
    PASSWORD_RESET: 'password_reset',
    CHAT_DELETED: 'chat_deleted',
    LOGIN: 'login',
    LOGOUT: 'logout'
};

const LOG_ACTION_LABELS = {
    'user_created': 'Tạo tài khoản',
    'user_edited': 'Sửa tài khoản',
    'user_deleted': 'Xóa tài khoản',
    'user_locked': 'Khóa tài khoản',
    'user_unlocked': 'Mở khóa tài khoản',
    'password_reset': 'Reset mật khẩu',
    'chat_deleted': 'Xóa cuộc trò chuyện',
    'login': 'Đăng nhập Admin',
    'logout': 'Đăng xuất Admin'
};

// Các hàm Nhật ký Hoạt động
function logActivity(action, target, details = '') {
    const logs = loadActivityLogs();
    const currentAdmin = localStorage.getItem(AUTH_CURRENT_KEY);
    
    const log = {
        id: Date.now(),
        timestamp: new Date().toLocaleString('vi-VN'),
        admin: currentAdmin,
        action: action,
        target: target,
        details: details
    };
    
    logs.unshift(log); // Thêm vào đầu
    
    // Chỉ giữ lại 1000 nhật ký gần nhất
    if (logs.length > 1000) {
        logs.splice(1000);
    }
    
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs));
}

function loadActivityLogs() {
    try {
        return JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');
    } catch {
        return [];
    }
}

function clearOldLogs(daysToKeep = 30) {
    const logs = loadActivityLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const filtered = logs.filter(log => {
        try {
            const logDate = parseVietnameseDate(log.timestamp);
            return logDate >= cutoffDate;
        } catch {
            return true; // Giữ lại nếu không thể phân tích
        }
    });
    
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(filtered));
    return logs.length - filtered.length;
}

// Phân tích ngày tháng tiếng Việt
function parseVietnameseDate(dateStr) {
    // Phân tích định dạng: "15/01/2026, 10:30:45"
    const parts = dateStr.split(', ');
    if (parts.length !== 2) return new Date(dateStr);
    
    const [day, month, year] = parts[0].split('/');
    const [hours, minutes, seconds] = parts[1].split(':');
    
    return new Date(year, month - 1, day, hours, minutes, seconds);
}

function exportLogs() {
    const logs = loadActivityLogs();
    const dataStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Kiểm tra xem người dùng có phải admin không
function checkAdminAuth() {
    const currentUser = localStorage.getItem(AUTH_CURRENT_KEY);
    if (!currentUser || currentUser !== 'admin') {
        alert('Bạn không có quyền truy cập trang này!');
        window.location.href = 'index.html';
        return false;
    }
    
    // Ghi nhật ký đăng nhập admin
    logActivity(LOG_ACTIONS.LOGIN, currentUser, 'Đăng nhập vào Admin Panel');
    
    return true;
}

// Tải danh sách người dùng từ localStorage
function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

// Lưu danh sách người dùng vào localStorage
function saveUsers(users) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

// Mã hóa mật khẩu (mã hóa đơn giản)
function hashPw(pw) {
    return btoa(pw);
}

// Khởi tạo trang admin
function init() {
    if (!checkAdminAuth()) return;
    
    // Display admin username
    const adminUsername = localStorage.getItem(AUTH_CURRENT_KEY);
    document.getElementById('adminUsername').textContent = adminUsername;
    
    // Wire up navigation
    setupNavigation();
    
    // Kết nối các nút
    setupEventListeners();
    
    // Tải dữ liệu dashboard
    loadDashboard();
    
    // Tải danh sách người dùng
    loadUsersTable();
}

// Thiết lập điều hướng
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
                chats: 'Quản lý chat',
                search: 'Tìm kiếm nâng cao',
                logs: 'Nhật ký hoạt động'
            };
            document.getElementById('pageTitle').textContent = titles[sectionId];
            
            // Load section data
            if (sectionId === 'users') loadUsersTable();
            if (sectionId === 'chats') loadChatsTable();
            if (sectionId === 'search') initSearchSection();
            if (sectionId === 'logs') initLogsSection();
        });
    });
}

// Thiết lập các sự kiện
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
    
    // Confirm lock/unlock user
    document.getElementById('confirmLockUser').addEventListener('click', confirmLockUnlock);
    
    // Search user
    document.getElementById('searchUser')?.addEventListener('input', filterUsers);
    
    // Filter by role
    document.getElementById('filterRole')?.addEventListener('change', filterUsers);
    
    // Search section
    setupSearchListeners();
    
    // Activity Log section
    setupLogListeners();
}

// Tải dữ liệu bảng điều khiển
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

// Tải hoạt động gần đây
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

// Tải bảng người dùng
function loadUsersTable() {
    const users = loadUsers();
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    
    users.forEach((user, index) => {
        const isLocked = user.isLocked || false;
        const statusBadge = isLocked 
            ? '<span class="badge badge-locked"><i class="fas fa-lock"></i> Đã khóa</span>' 
            : '<span class="badge badge-active"><i class="fas fa-check-circle"></i> Hoạt động</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(user.user)}</strong></td>
            <td><span class="badge ${user.isAdmin ? 'badge-admin' : 'badge-user'}">${user.isAdmin ? 'Admin' : 'User'}</span></td>
            <td>${user.createdAt || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td class="action-btns">
                ${user.user !== 'admin' ? `
                <button class="btn-icon ${isLocked ? 'btn-unlock' : 'btn-lock'}" 
                        onclick="${isLocked ? 'unlockUser' : 'lockUser'}('${escapeHtml(user.user)}')" 
                        title="${isLocked ? 'Mở khóa' : 'Khóa tài khoản'}">
                    <i class="fas fa-${isLocked ? 'unlock' : 'lock'}"></i>
                </button>
                ` : ''}
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

// Lọc người dùng
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
        const isLocked = user.isLocked || false;
        const statusBadge = isLocked 
            ? '<span class="badge badge-locked"><i class="fas fa-lock"></i> Đã khóa</span>' 
            : '<span class="badge badge-active"><i class="fas fa-check-circle"></i> Hoạt động</span>';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(user.user)}</strong></td>
            <td><span class="badge ${user.isAdmin ? 'badge-admin' : 'badge-user'}">${user.isAdmin ? 'Admin' : 'User'}</span></td>
            <td>${user.createdAt || 'N/A'}</td>
            <td>${statusBadge}</td>
            <td class="action-btns">
                ${user.user !== 'admin' ? `
                <button class="btn-icon ${isLocked ? 'btn-unlock' : 'btn-lock'}" 
                        onclick="${isLocked ? 'unlockUser' : 'lockUser'}('${escapeHtml(user.user)}')" 
                        title="${isLocked ? 'Mở khóa' : 'Khóa tài khoản'}">
                    <i class="fas fa-${isLocked ? 'unlock' : 'lock'}"></i>
                </button>
                ` : ''}
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

// Thêm người dùng mới
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
    
    // Log activity
    logActivity(LOG_ACTIONS.USER_CREATED, username, `Tạo tài khoản mới (${isAdmin ? 'Admin' : 'User'})`);
    
    // Reload table
    loadUsersTable();
    loadDashboard();
    
    alert('Đã thêm tài khoản thành công');
}

// Chỉnh sửa người dùng
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
    
    // Log activity
    const changes = [];
    if (newPassword) changes.push('mật khẩu');
    if (username !== 'admin') changes.push(`vai trò: ${isAdmin ? 'Admin' : 'User'}`);
    logActivity(LOG_ACTIONS.USER_EDITED, username, `Cập nhật ${changes.join(', ')}`);
    
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
    
    // Log activity
    logActivity(LOG_ACTIONS.PASSWORD_RESET, username, 'Reset mật khẩu về "123"');
    
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
    
    // Log activity
    logActivity(LOG_ACTIONS.USER_DELETED, username, 'Xóa tài khoản và toàn bộ dữ liệu');
    
    loadUsersTable();
    loadDashboard();
    
    alert(`Đã xóa tài khoản "${username}"`);
}

// Lock user
let lockingUsername = null;
let isLockingAction = true;

function lockUser(username) {
    lockingUsername = username;
    isLockingAction = true;
    
    // Update modal content
    document.getElementById('lockModalTitle').textContent = 'Khóa tài khoản';
    document.getElementById('lockModalMessage').textContent = `Bạn có chắc chắn muốn khóa tài khoản "${username}"? Người dùng sẽ không thể đăng nhập sau khi bị khóa.`;
    document.getElementById('lockReasonGroup').style.display = 'block';
    document.getElementById('lockReason').value = '';
    document.getElementById('confirmLockUser').textContent = 'Khóa tài khoản';
    document.getElementById('confirmLockUser').className = 'btn-danger';
    
    // Show modal
    document.getElementById('lockUserModal').classList.add('active');
}

function unlockUser(username) {
    lockingUsername = username;
    isLockingAction = false;
    
    // Update modal content
    document.getElementById('lockModalTitle').textContent = 'Mở khóa tài khoản';
    document.getElementById('lockModalMessage').textContent = `Bạn có chắc chắn muốn mở khóa tài khoản "${username}"? Người dùng sẽ có thể đăng nhập lại.`;
    document.getElementById('lockReasonGroup').style.display = 'none';
    document.getElementById('confirmLockUser').textContent = 'Mở khóa';
    document.getElementById('confirmLockUser').className = 'btn-primary';
    
    // Show modal
    document.getElementById('lockUserModal').classList.add('active');
}

function confirmLockUnlock() {
    if (!lockingUsername) return;
    
    const users = loadUsers();
    const user = users.find(u => u.user === lockingUsername);
    
    if (!user) {
        alert('Không tìm thấy tài khoản');
        return;
    }
    
    if (isLockingAction) {
        // Lock user
        user.isLocked = true;
        user.lockReason = document.getElementById('lockReason').value.trim() || 'Không có lý do';
        user.lockedAt = new Date().toLocaleString('vi-VN');
        user.lockedBy = localStorage.getItem(AUTH_CURRENT_KEY);
        
        saveUsers(users);
        
        // Log activity
        logActivity(LOG_ACTIONS.USER_LOCKED, lockingUsername, `Lý do: ${user.lockReason}`);
        
        // Close modal
        document.getElementById('lockUserModal').classList.remove('active');
        
        // Reload table
        loadUsersTable();
        
        alert(`Đã khóa tài khoản "${lockingUsername}"`);
    } else {
        // Unlock user
        user.isLocked = false;
        user.lockReason = null;
        user.lockedAt = null;
        user.lockedBy = null;
        user.unlockedAt = new Date().toLocaleString('vi-VN');
        user.unlockedBy = localStorage.getItem(AUTH_CURRENT_KEY);
        
        saveUsers(users);
        
        // Log activity
        logActivity(LOG_ACTIONS.USER_UNLOCKED, lockingUsername, 'Mở khóa tài khoản');
        
        // Close modal
        document.getElementById('lockUserModal').classList.remove('active');
        
        // Reload table
        loadUsersTable();
        
        alert(`Đã mở khóa tài khoản "${lockingUsername}"`);
    }
    
    lockingUsername = null;
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

// Xem chi tiết chat
function viewChatDetail(username, chatId) {
    const chats = loadUserChats(username);
    const chat = chats.find(c => c.id === chatId);
    
    if (!chat) {
        alert('Không tìm thấy cuộc trò chuyện');
        return;
    }
    
    // Điền thông tin modal
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
        // Helper function to format date label
        function getDateLabel(dateStr) {
            if (!dateStr) return new Date().toLocaleDateString('vi-VN');
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            // Parse the date string
            let msgDate;
            try {
                // Try parsing DD/MM/YYYY format
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    msgDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    msgDate.setHours(0, 0, 0, 0);
                } else {
                    msgDate = new Date(dateStr);
                    msgDate.setHours(0, 0, 0, 0);
                }
            } catch (e) {
                return dateStr;
            }
            
            if (msgDate.getTime() === today.getTime()) {
                return `Hôm nay (${dateStr})`;
            } else if (msgDate.getTime() === yesterday.getTime()) {
                return `Hôm qua (${dateStr})`;
            } else {
                return dateStr;
            }
        }
        
        // Group messages by date
        const messagesByDate = {};
        
        chat.messages.forEach(msg => {
            // Get date from message
            let dateStr;
            
            if (msg.date) {
                // Has explicit date field
                dateStr = msg.date;
            } else if (msg.id) {
                // Try to extract date from ID (which is a timestamp)
                try {
                    const msgDate = new Date(msg.id);
                    if (!isNaN(msgDate.getTime())) {
                        dateStr = msgDate.toLocaleDateString('vi-VN');
                    } else {
                        dateStr = 'Tin nhắn cũ (không xác định được ngày)';
                    }
                } catch (e) {
                    dateStr = 'Tin nhắn cũ (không xác định được ngày)';
                }
            } else {
                // No date and no ID - truly old message
                dateStr = 'Tin nhắn cũ (không có ngày)';
            }
            
            if (!messagesByDate[dateStr]) {
                messagesByDate[dateStr] = [];
            }
            messagesByDate[dateStr].push(msg);
        });
        
        // Sắp xếp ngày (mới nhất trước)
        const sortedDates = Object.keys(messagesByDate).sort((a, b) => {
            // Always put "old messages" at the beginning
            if (a.includes('Tin nhắn cũ')) return -1;
            if (b.includes('Tin nhắn cũ')) return 1;
            
            const parseDate = (str) => {
                const parts = str.split('/');
                if (parts.length === 3) {
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                }
                return new Date(str);
            };
            return parseDate(a) - parseDate(b);
        });
        
        // Hiển thị tin nhắn được nhóm theo ngày
        sortedDates.forEach(dateStr => {
            // Add date separator with nice formatting
            const dateSeparator = document.createElement('div');
            dateSeparator.className = 'date-separator';
            dateSeparator.style.cssText = 'text-align:center; padding:12px 0; margin:8px 0; color:#65676b; font-size:13px; font-weight:600; position:relative;';
            
            const dateLabel = getDateLabel(dateStr);
            dateSeparator.innerHTML = `
                <span style="background:#f0f2f5; padding:4px 12px; border-radius:12px; display:inline-block;">
                    ${dateLabel}
                </span>
            `;
            messagesContent.appendChild(dateSeparator);
            
            // Add messages for this date
            messagesByDate[dateStr].forEach(msg => {
                const msgDiv = document.createElement('div');
                msgDiv.className = `message-item ${msg.sender === 'me' || msg.sender === 'you' ? 'message-sent' : 'message-received'}`;
                
                const senderName = (msg.sender === 'me' || msg.sender === 'you') ? username : (msg.sender === 'system' ? 'Hệ thống' : chat.name);
                const timestamp = msg.time || msg.timestamp || 'N/A';
                
                // Tạo header
                const headerDiv = document.createElement('div');
                headerDiv.className = 'message-header';
                headerDiv.innerHTML = `
                    <strong>${escapeHtml(senderName)}</strong>
                    <span class="message-time">${escapeHtml(timestamp)}</span>
                `;
                msgDiv.appendChild(headerDiv);
                
                // Tạo nội dung dựa trên loại tin nhắn
                const contentDiv = document.createElement('div');
                contentDiv.className = 'message-text';
                
                // Check if it's a voice message
                if (msg.type === 'voice' && msg.audio) {
                    contentDiv.innerHTML = `
                        <div style="display:flex; align-items:center; gap:8px; padding:8px; background:rgba(0,123,255,0.1); border-radius:8px;">
                            <i class="fas fa-microphone" style="color:#0084ff;"></i>
                            <audio controls style="height:32px;">
                                <source src="${msg.audio}" type="audio/webm">
                                Trình duyệt không hỗ trợ phát audio
                            </audio>
                            <span style="font-size:12px; color:#65676b;">${msg.duration || 0}s</span>
                        </div>
                    `;
                }
                // Check if it's an image message
                else if (msg.image) {
                    contentDiv.innerHTML = `
                        <img src="${msg.image}" 
                             alt="Ảnh đã gửi" 
                             style="max-width:280px; max-height:280px; border-radius:8px; display:block; cursor:pointer; object-fit:cover;"
                             onclick="window.open('${msg.image}', '_blank')"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div style="display:none; padding:8px; color:#999; font-style:italic;">
                            <i class="fas fa-image"></i> Không thể tải ảnh
                        </div>
                        ${msg.text ? `<div style="margin-top:4px;">${escapeHtml(msg.text)}</div>` : ''}
                    `;
                }
                // Check if it's a sticker
                else if (msg.type === 'sticker' && msg.sticker) {
                    contentDiv.innerHTML = `
                        <img src="${msg.sticker}" 
                             alt="Sticker" 
                             style="width:120px; height:120px; object-fit:contain;">
                    `;
                }
                // Regular text message
                else if (msg.text || msg.content) {
                    contentDiv.textContent = msg.text || msg.content || '';
                }
                // System message or unknown type
                else {
                    contentDiv.innerHTML = '<i style="color:#999;">Tin nhắn không có nội dung</i>';
                }
                
                msgDiv.appendChild(contentDiv);
                messagesContent.appendChild(msgDiv);
            });
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
    
    // Log activity
    const deletedChat = chats.find(c => c.id === chatId);
    logActivity(LOG_ACTIONS.CHAT_DELETED, `${username}/${deletedChat?.name || 'Unknown'}`, `Xóa cuộc trò chuyện của ${username}`);
    
    loadChatsTable();
    loadDashboard();
    
    alert('Đã xóa cuộc trò chuyện');
}

// Tải chat của người dùng
function loadUserChats(username) {
    try {
        return JSON.parse(localStorage.getItem(CHATS_KEY_PREFIX + username) || '[]');
    } catch {
        return [];
    }
}

// Chuyển đổi chế độ tối
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('adminDarkMode', isDark ? 'on' : 'off');
    
    // Update icon
    const icon = document.querySelector('#darkModeToggle i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// Đăng xuất
function logout() {
    if (!confirm('Đăng xuất khỏi trang quản trị?')) return;
    
    const currentAdmin = localStorage.getItem(AUTH_CURRENT_KEY);
    logActivity(LOG_ACTIONS.LOGOUT, currentAdmin, 'Đăng xuất khỏi Admin Panel');
    
    localStorage.removeItem(AUTH_CURRENT_KEY);
    window.location.href = 'index.html';
}

// ============================================
// HÀM NHẬT KÝ HOẠT ĐỘNG
// ============================================

function setupLogListeners() {
    document.getElementById('exportLogsBtn')?.addEventListener('click', () => {
        exportLogs();
        showNotification('Đã xuất logs thành công');
    });
    
    document.getElementById('clearLogsBtn')?.addEventListener('click', () => {
        if (!confirm('Xóa logs cũ hơn 30 ngày? Hành động này không thể hoàn tác!')) return;
        const deleted = clearOldLogs(30);
        showNotification(`Đã xóa ${deleted} logs cũ`);
        loadLogsTable();
    });
    
    document.getElementById('applyLogFilters')?.addEventListener('click', () => {
        loadLogsTable();
    });
    
    document.getElementById('resetLogFilters')?.addEventListener('click', () => {
        document.getElementById('filterLogType').value = 'all';
        document.getElementById('filterLogAdmin').value = 'all';
        document.getElementById('filterLogDateFrom').value = '';
        document.getElementById('filterLogDateTo').value = '';
        loadLogsTable();
    });
}

function initLogsSection() {
    populateAdminFilter();
    loadLogsTable();
}

function populateAdminFilter() {
    const logs = loadActivityLogs();
    const admins = [...new Set(logs.map(log => log.admin))].filter(Boolean);
    
    const select = document.getElementById('filterLogAdmin');
    select.innerHTML = '<option value="all">Tất cả</option>';
    
    admins.forEach(admin => {
        const option = document.createElement('option');
        option.value = admin;
        option.textContent = admin;
        select.appendChild(option);
    });
}

function loadLogsTable() {
    const logs = loadActivityLogs();
    const tbody = document.getElementById('logsTableBody');
    
    if (!tbody) return;
    
    // Apply filters
    const typeFilter = document.getElementById('filterLogType')?.value || 'all';
    const adminFilter = document.getElementById('filterLogAdmin')?.value || 'all';
    const dateFromStr = document.getElementById('filterLogDateFrom')?.value;
    const dateToStr = document.getElementById('filterLogDateTo')?.value;
    
    let filtered = logs;
    
    // Filter by type
    if (typeFilter !== 'all') {
        filtered = filtered.filter(log => log.action === typeFilter);
    }
    
    // Filter by admin
    if (adminFilter !== 'all') {
        filtered = filtered.filter(log => log.admin === adminFilter);
    }
    
    // Filter by date range
    if (dateFromStr) {
        const dateFrom = new Date(dateFromStr);
        dateFrom.setHours(0, 0, 0, 0);
        filtered = filtered.filter(log => {
            try {
                const logDate = parseVietnameseDate(log.timestamp);
                return logDate >= dateFrom;
            } catch {
                return true;
            }
        });
    }
    
    if (dateToStr) {
        const dateTo = new Date(dateToStr);
        dateTo.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => {
            try {
                const logDate = parseVietnameseDate(log.timestamp);
                return logDate <= dateTo;
            } catch {
                return true;
            }
        });
    }
    
    // Render table
    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Không có logs nào</td></tr>';
        return;
    }
    
    filtered.forEach((log, index) => {
        const row = document.createElement('tr');
        const actionLabel = LOG_ACTION_LABELS[log.action] || log.action;
        const actionColor = getActionColor(log.action);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(log.timestamp)}</td>
            <td><span class="badge badge-admin">${escapeHtml(log.admin)}</span></td>
            <td><span class="badge" style="background:${actionColor};">${actionLabel}</span></td>
            <td><strong>${escapeHtml(log.target)}</strong></td>
            <td>${escapeHtml(log.details || '-')}</td>
        `;
        tbody.appendChild(row);
    });
}

function getActionColor(action) {
    const colors = {
        'user_created': '#27ae60',
        'user_edited': '#3498db',
        'user_deleted': '#e74c3c',
        'user_locked': '#e67e22',
        'user_unlocked': '#2ecc71',
        'password_reset': '#f39c12',
        'chat_deleted': '#c0392b',
        'login': '#1abc9c',
        'logout': '#95a5a6'
    };
    return colors[action] || '#7f8c8d';
}

function showNotification(message) {
    // Thông báo đơn giản - bạn có thể cải thiện điều này
    alert(message);
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

// ============================================
// HÀM TÌM KIẾM NÂNG CAO
// ============================================

// Khởi tạo phần tìm kiếm
function initSearchSection() {
    // Clear previous results
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('exportSearchBtn').style.display = 'none';
}

// Thiết lập các sự kiện tìm kiếm
function setupSearchListeners() {
    // Search tabs
    const searchTabs = document.querySelectorAll('.search-tab');
    searchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            // Update active tab
            searchTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            document.querySelectorAll('.search-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tabName + 'SearchTab').classList.add('active');
        });
    });
    
    // Search buttons
    document.getElementById('searchMessagesBtn')?.addEventListener('click', searchMessages);
    document.getElementById('searchUsersBtn')?.addEventListener('click', searchUsers);
    document.getElementById('searchChatsBtn')?.addEventListener('click', searchChatsAdvanced);
    
    // Clear results
    document.getElementById('clearResultsBtn')?.addEventListener('click', clearSearchResults);
    
    // Export results
    document.getElementById('exportSearchBtn')?.addEventListener('click', exportSearchResults);
}

// Tìm kiếm tin nhắn
function searchMessages() {
    const content = document.getElementById('searchMessageContent').value.trim();
    
    if (!content) {
        alert('Vui lòng nhập nội dung tin nhắn cần tìm');
        return;
    }
    
    const results = [];
    const users = loadUsers();
    
    // Convert search term to lowercase for case-insensitive search
    const contentLower = content.toLowerCase();
    
    users.forEach(user => {
        const chats = loadUserChats(user.user);
        
        chats.forEach(chat => {
            if (chat.messages && chat.messages.length > 0) {
                chat.messages.forEach(msg => {
                    // Check if message text contains search content
                    if (msg.text && msg.text.toLowerCase().includes(contentLower)) {
                        results.push({
                            type: 'message',
                            chatName: chat.name,
                            chatType: chat.isGroup ? 'Nhóm' : '1-1',
                            owner: user.user,
                            sender: msg.sender,
                            text: msg.text,
                            time: msg.time,
                            date: msg.date,
                            chatId: chat.id,
                            searchTerm: content
                        });
                    }
                });
            }
        });
    });
    
    displaySearchResults(results, 'messages');
}

// Tìm kiếm người dùng nâng cao
function searchUsers() {
    const username = document.getElementById('searchUserName').value.trim();
    const role = document.getElementById('searchUserRole').value;
    
    if (!username && role === 'all') {
        alert('Vui lòng nhập ít nhất một tiêu chí tìm kiếm');
        return;
    }
    
    const users = loadUsers();
    const results = [];
    const usernameLower = username.toLowerCase();
    
    users.forEach(user => {
        let match = true;
        
        // Check username - only if username is provided
        if (username && user.user) {
            if (!user.user.toLowerCase().includes(usernameLower)) {
                match = false;
            }
        }
        
        // Check role - only if role filter is set
        if (role !== 'all') {
            if (role === 'admin' && !user.isAdmin) match = false;
            if (role === 'user' && user.isAdmin) match = false;
        }
        
        if (match) {
            const chats = loadUserChats(user.user);
            let totalMessages = 0;
            chats.forEach(chat => {
                totalMessages += chat.messages?.length || 0;
            });
            
            results.push({
                type: 'user',
                username: user.user,
                role: user.isAdmin ? 'Admin' : 'User',
                createdAt: user.createdAt || 'N/A',
                totalChats: chats.length,
                totalMessages: totalMessages,
                searchTerm: username
            });
        }
    });
    
    displaySearchResults(results, 'users');
}

// Tìm kiếm chat nâng cao
function searchChatsAdvanced() {
    const chatName = document.getElementById('searchChatName').value.trim();
    
    if (!chatName) {
        alert('Vui lòng nhập tên nhóm/chat cần tìm');
        return;
    }
    
    const users = loadUsers();
    const results = [];
    const chatNameLower = chatName.toLowerCase();
    
    users.forEach(user => {
        const chats = loadUserChats(user.user);
        
        chats.forEach(chat => {
            // Check chat name
            if (chat.name && chat.name.toLowerCase().includes(chatNameLower)) {
                const memberCount = chat.isGroup ? (chat.members?.length || 0) : 2;
                results.push({
                    type: 'chat',
                    chatName: chat.name,
                    chatType: chat.isGroup ? 'Nhóm' : '1-1',
                    owner: user.user,
                    members: memberCount,
                    messages: chat.messages?.length || 0,
                    chatId: chat.id,
                    searchTerm: chatName
                });
            }
        });
    });
    
    displaySearchResults(results, 'chats');
}

// Hiển thị kết quả tìm kiếm
function displaySearchResults(results, type) {
    const resultsContainer = document.getElementById('searchResults');
    const resultsContent = document.getElementById('searchResultsContent');
    const resultsCount = document.getElementById('resultsCount');
    const exportBtn = document.getElementById('exportSearchBtn');
    
    resultsCount.textContent = results.length;
    resultsContainer.style.display = 'block';
    
    if (results.length > 0) {
        exportBtn.style.display = 'flex';
    } else {
        exportBtn.style.display = 'none';
    }
    
    if (results.length === 0) {
        resultsContent.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>Không tìm thấy kết quả nào phù hợp</p>
            </div>
        `;
        return;
    }
    
    resultsContent.innerHTML = '';
    
    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        if (type === 'messages') {
            const highlightedText = highlightSearchTerm(result.text, result.searchTerm);
            item.innerHTML = `
                <div class="result-item-header">
                    <div class="result-item-title">
                        <i class="fas fa-comment"></i> ${escapeHtml(result.chatName)}
                    </div>
                    <span class="badge ${result.chatType === 'Nhóm' ? 'badge-admin' : 'badge-user'}">${result.chatType}</span>
                </div>
                <div class="result-item-meta">
                    <span><i class="fas fa-user"></i> ${escapeHtml(result.sender)}</span>
                    <span><i class="fas fa-clock"></i> ${result.time || 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${result.date || 'N/A'}</span>
                    <span><i class="fas fa-folder"></i> Chủ sở hữu: ${escapeHtml(result.owner)}</span>
                </div>
                <div class="result-item-content">
                    ${highlightedText}
                </div>
                <div class="result-item-actions">
                    <button class="btn-icon btn-edit" onclick="viewChatDetail('${escapeHtml(result.owner)}', ${result.chatId})" title="Xem chi tiết chat">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            `;
        } else if (type === 'users') {
            const highlightedUsername = highlightSearchTerm(result.username, result.searchTerm);
            item.innerHTML = `
                <div class="result-item-header">
                    <div class="result-item-title">
                        <i class="fas fa-user"></i> ${highlightedUsername}
                    </div>
                    <span class="badge ${result.role === 'Admin' ? 'badge-admin' : 'badge-user'}">${result.role}</span>
                </div>
                <div class="result-item-meta">
                    <span><i class="fas fa-calendar"></i> Tạo: ${result.createdAt}</span>
                    <span><i class="fas fa-comments"></i> ${result.totalChats} cuộc trò chuyện</span>
                    <span><i class="fas fa-comment"></i> ${result.totalMessages} tin nhắn</span>
                </div>
                <div class="result-item-actions">
                    <button class="btn-icon btn-edit" onclick="editUser('${escapeHtml(result.username)}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${result.username !== 'admin' ? `
                    <button class="btn-icon btn-delete" onclick="deleteUser('${escapeHtml(result.username)}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            `;
        } else if (type === 'chats') {
            const highlightedChatName = highlightSearchTerm(result.chatName, result.searchTerm);
            item.innerHTML = `
                <div class="result-item-header">
                    <div class="result-item-title">
                        <i class="fas fa-comments"></i> ${highlightedChatName}
                    </div>
                    <span class="badge ${result.chatType === 'Nhóm' ? 'badge-admin' : 'badge-user'}">${result.chatType}</span>
                </div>
                <div class="result-item-meta">
                    <span><i class="fas fa-user"></i> Chủ sở hữu: ${escapeHtml(result.owner)}</span>
                    <span><i class="fas fa-users"></i> ${result.members} thành viên</span>
                    <span><i class="fas fa-comment"></i> ${result.messages} tin nhắn</span>
                </div>
                <div class="result-item-actions">
                    <button class="btn-icon btn-edit" onclick="viewChatDetail('${escapeHtml(result.owner)}', ${result.chatId})" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteChat('${escapeHtml(result.owner)}', ${result.chatId})" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        resultsContent.appendChild(item);
    });
    
    // Store results for export
    window.currentSearchResults = results;
    window.currentSearchType = type;
}

// Làm nổi bật từ khóa tìm kiếm trong văn bản
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapedText.replace(regex, '<span class="result-item-highlight">$1</span>');
}

// Escape ký tự đặc biệt của regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Phân tích chuỗi ngày thành đối tượng Date
function parseDateString(dateStr) {
    if (!dateStr) return new Date();
    
    // Try DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    
    // Fallback to default parsing
    return new Date(dateStr);
}

// Xóa kết quả tìm kiếm
function clearSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('exportSearchBtn').style.display = 'none';
    
    // Clear form inputs
    document.querySelectorAll('.search-form input').forEach(input => {
        if (input.type !== 'button') {
            input.value = '';
        }
    });
    document.querySelectorAll('.search-form select').forEach(select => {
        select.selectedIndex = 0;
    });
    
    window.currentSearchResults = null;
    window.currentSearchType = null;
}

// Xuất kết quả tìm kiếm
function exportSearchResults() {
    if (!window.currentSearchResults || window.currentSearchResults.length === 0) {
        alert('Không có kết quả để xuất');
        return;
    }
    
    const results = window.currentSearchResults;
    const type = window.currentSearchType;
    
    // Create CSV content
    let csv = '';
    
    if (type === 'messages') {
        csv = 'STT,Tên Chat,Loại,Người gửi,Nội dung,Thời gian,Ngày,Chủ sở hữu\n';
        results.forEach((r, i) => {
            csv += `${i + 1},"${r.chatName}","${r.chatType}","${r.sender}","${r.text}","${r.time}","${r.date}","${r.owner}"\n`;
        });
    } else if (type === 'users') {
        csv = 'STT,Tài khoản,Vai trò,Ngày tạo,Số cuộc trò chuyện,Số tin nhắn\n';
        results.forEach((r, i) => {
            csv += `${i + 1},"${r.username}","${r.role}","${r.createdAt}",${r.totalChats},${r.totalMessages}\n`;
        });
    } else if (type === 'chats') {
        csv = 'STT,Tên nhóm/chat,Loại,Chủ sở hữu,Số thành viên,Số tin nhắn\n';
        results.forEach((r, i) => {
            csv += `${i + 1},"${r.chatName}","${r.chatType}","${r.owner}",${r.members},${r.messages}\n`;
        });
    }
    
    // Create download link
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `search_results_${type}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Đã xuất kết quả tìm kiếm thành công!');
}

// Khởi tạo khi trang được tải
init();

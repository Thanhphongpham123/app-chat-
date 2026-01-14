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
                chats: 'Quản lý chat',
                search: 'Tìm kiếm nâng cao'
            };
            document.getElementById('pageTitle').textContent = titles[sectionId];
            
            // Load section data
            if (sectionId === 'users') loadUsersTable();
            if (sectionId === 'chats') loadChatsTable();
            if (sectionId === 'search') initSearchSection();
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
    
    // Search section
    setupSearchListeners();
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
        
        // Sort dates (newest first)
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
        
        // Display messages grouped by date
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
                
                // Create header
                const headerDiv = document.createElement('div');
                headerDiv.className = 'message-header';
                headerDiv.innerHTML = `
                    <strong>${escapeHtml(senderName)}</strong>
                    <span class="message-time">${escapeHtml(timestamp)}</span>
                `;
                msgDiv.appendChild(headerDiv);
                
                // Create content based on message type
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

// ============================================
// ADVANCED SEARCH FUNCTIONS
// ============================================

// Initialize search section
function initSearchSection() {
    // Clear previous results
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('exportSearchBtn').style.display = 'none';
}

// Setup search event listeners
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

// Search messages
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

// Search users advanced
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

// Search chats advanced
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

// Display search results
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

// Highlight search term in text
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm) return escapeHtml(text);
    
    const escapedText = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    return escapedText.replace(regex, '<span class="result-item-highlight">$1</span>');
}

// Escape regex special characters
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Parse date string to Date object
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

// Clear search results
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

// Export search results
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

// Initialize on page load
init();

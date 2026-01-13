// Mock data
const mockData = [
    {
        id: 1,
        name: 'Long',
        avatar: 'https://i.pravatar.cc/150?img=11',
        lastMessage: 'Chào bạn!',
        timestamp: '5 phút trước',
        online: true,
        unread: 1,
        messages: [
            { id: 1, sender: 'them', text: 'Chào bạn!', time: '10:00', reactions: [] }
        ]
    },
    {
        id: 2,
        name: 'Phong',
        avatar: 'https://i.pravatar.cc/150?img=12',
        lastMessage: 'Hẹn gặp lại!',
        timestamp: '30 phút trước',
        online: false,
        unread: 0,
        messages: [
            { id: 1, sender: 'them', text: 'Hẹn gặp lại!', time: '09:30', reactions: [] }
        ]
    },
    {
        id: 3,
        name: 'Toản',
        avatar: 'https://i.pravatar.cc/150?img=13',
        lastMessage: 'OK nhé!',
        timestamp: '1 giờ trước',
        online: true,
        unread: 0,
        messages: [
            { id: 1, sender: 'them', text: 'OK nhé!', time: '09:00', reactions: [] }
        ]
    }
];

let currentChat = null;
let allChats = [];
const inactiveTimers = {};
let typingTimer = null;
let mentionStartIndex = -1;
let mentionSearch = "";
let conversationFilter = "all";
let activeCategoryFilters = new Set();
let replyingMessage = null;
let hideActionsTimer = null;

// DOM Elements
const conversationsList = document.getElementById('conversationsList');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const chatWindow = document.getElementById('chatWindow');
const emptyChat = document.getElementById('emptyChat');
const searchInput = document.getElementById('searchInput');
const chatName = document.getElementById('chatName');
const chatAvatar = document.getElementById('chatAvatar');
const chatStatus = document.getElementById('chatStatus');
const filterAllBtn = document.getElementById("filterAll");
const filterUnreadBtn = document.getElementById("filterUnread");
const filterMenuIcon = document.getElementById("filterMenuIcon");
const filterPopupMenu = document.getElementById("filterPopupMenu");
const markAllRead = document.getElementById("markAllRead");
const filterCategoryBtn = document.getElementById('filterCategoryBtn');
const categoryFilterPopup = document.getElementById('categoryFilterPopup');

const CHAT_CATEGORIES = [
    { key: 'gia-dinh', label: 'Gia đình', color: '#e53935' },
    { key: 'khach-hang', label: 'Khách hàng', color: '#1e88e5' },
    { key: 'cong-viec', label: 'Công việc', color: '#43a047' },
    { key: 'ban-be', label: 'Bạn bè', color: '#fb8c00' },
    { key: 'dong-nghiep', label: 'Đồng nghiệp', color: '#8e24aa' }
];

//kh filter
filterAllBtn.onclick = () => {
    conversationFilter = "all";
    filterAllBtn.classList.add("active");
    filterUnreadBtn.classList.remove("active");
    renderConversations(allChats);
};

filterUnreadBtn.onclick = () => {
    conversationFilter = "unread";
    filterUnreadBtn.classList.add("active");
    filterAllBtn.classList.remove("active");
    renderConversations(allChats);
};

// mention box
let mentionBox = document.createElement("div");
mentionBox.className = "mention-box";
document.body.appendChild(mentionBox);

// Initialize
function init() {
    // Tạo sẵn các tài khoản mặc định nếu chưa có
    initializeDefaultAccounts();

    const currentUser = getCurrentUser();
    const reloginCode = localStorage.getItem(AUTH_RELOGIN_CODE_KEY);

    if (currentUser) {
        allChats = loadUserChats(currentUser);
        
        // Tự động RE_LOGIN nếu có code
        if (reloginCode && fakeApiEnabled) {
            fakeReLogin(currentUser, reloginCode);
        }
    }

    renderConversations(allChats);
    attachEvents();
    wireAuthUI();
    updateUserUI();
    // Group notification toggle UI
    try {
        const groupToggle = document.getElementById('groupNotifToggle');
        if (groupToggle) {
            groupToggle.checked = isGroupNotificationEnabled();
            groupToggle.addEventListener('change', () => {
                setGroupNotificationEnabled(groupToggle.checked);
            });
        }
    } catch (e) {
        console.warn('groupNotif toggle init error', e);
    }
    // if not logged in, show auth overlay
    if (!currentUser) showAuthOverlay(true);
}

function initializeDefaultAccounts() {
    const users = loadUsers();
    const defaultAccounts = [
        { user: 'admin', pass: hashPw('admin'), isAdmin: true, createdAt: new Date().toLocaleDateString('vi-VN') },
        { user: 'Long', pass: hashPw('123') },
        { user: 'Phong', pass: hashPw('123') },
        { user: 'Toản', pass: hashPw('123') },
        { user: 'Buu', pass: hashPw('123') }
    ];

    let updated = false;
    defaultAccounts.forEach(account => {
        if (!users.find(u => u.user === account.user)) {
            users.push(account);
            updated = true;
        }
    });

    if (updated) {
        saveUsers(users);
        console.log('Tài khoản mặc định đã được tạo: admin/admin (Admin), Long/123, Phong/123, Toản/123, Buu/123');
    }
}

// -----------------------------
// Client-side Auth (localStorage)
// -----------------------------
const AUTH_USERS_KEY = 'appChat_users';
const AUTH_CURRENT_KEY = 'appChat_currentUser';
const AUTH_RELOGIN_CODE_KEY = 'appChat_reloginCode';
const CHATS_KEY_PREFIX = 'appChat_chats_';
const GROUP_NOTIF_KEY = 'appChat_groupNotifications';
const SHOW_HIDDEN_KEY = 'appChat_showHiddenChats';

function isGroupNotificationEnabled() {
    const v = localStorage.getItem(GROUP_NOTIF_KEY);
    // default: enabled
    if (v === null) return true;
    return v === '1';
}

function setGroupNotificationEnabled(enabled) {
    localStorage.setItem(GROUP_NOTIF_KEY, enabled ? '1' : '0');
}

function isShowHiddenChats() {
    const v = localStorage.getItem(SHOW_HIDDEN_KEY);
    if (v === null) return false;
    return v === '1';
}

function setShowHiddenChats(enabled) {
    localStorage.setItem(SHOW_HIDDEN_KEY, enabled ? '1' : '0');
}

// ===== FAKE API LAYER =====
let fakeApiEnabled = true; // Bật fake API

// Fake API: REGISTER
function fakeRegister(user, pass) {
    console.log('📤 FAKE API: REGISTER', { user, pass });
    setTimeout(() => {
        console.log('📥 FAKE API Response: REGISTER success');
        alert('Đăng ký thành công!');
    }, 500);
}

// Fake API: LOGIN
function fakeLogin(user, pass) {
    console.log('📤 FAKE API: LOGIN', { user, pass });
    setTimeout(() => {
        const fakeCode = 'nlu_' + Date.now();
        localStorage.setItem(AUTH_RELOGIN_CODE_KEY, fakeCode);
        console.log('📥 FAKE API Response: LOGIN success, RE_LOGIN_CODE:', fakeCode);
        
        // Fake get user list
        fakeGetUserList();
    }, 500);
}

// Fake API: RE_LOGIN
function fakeReLogin(user, code) {
    console.log('📤 FAKE API: RE_LOGIN', { user, code });
    setTimeout(() => {
        console.log('📥 FAKE API Response: RE_LOGIN success');
    }, 300);
}

// Fake API: LOGOUT
function fakeLogout() {
    console.log('📤 FAKE API: LOGOUT');
    setTimeout(() => {
        console.log('📥 FAKE API Response: LOGOUT success');
    }, 300);
}

// Fake API: SEND_CHAT (people)
function fakeSendChatPeople(to, message) {
    console.log('📤 FAKE API: SEND_CHAT (people)', { to, message });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Message sent to', to);
    }, 300);
}

// Fake API: SEND_CHAT (room)
function fakeSendChatRoom(to, message) {
    console.log('📤 FAKE API: SEND_CHAT (room)', { to, message });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Message sent to room', to);
    }, 300);
}

// Fake API: GET_USER_LIST
function fakeGetUserList() {
    console.log('📤 FAKE API: GET_USER_LIST');
    setTimeout(() => {
        const users = loadUsers().map(u => u.user);
        console.log('📥 FAKE API Response: User list', users);
    }, 300);
}

// Fake API: CHECK_USER_ONLINE
function fakeCheckUserOnline(user) {
    console.log('📤 FAKE API: CHECK_USER_ONLINE', { user });
    setTimeout(() => {
        const isOnline = Math.random() > 0.5;
        console.log('📥 FAKE API Response:', user, 'is', isOnline ? 'online' : 'offline');
    }, 300);
}

// Fake API: CHECK_USER_EXIST
function fakeCheckUserExist(user) {
    console.log('📤 FAKE API: CHECK_USER_EXIST', { user });
    setTimeout(() => {
        const users = loadUsers();
        const exists = users.some(u => u.user === user);
        console.log('📥 FAKE API Response:', user, exists ? 'exists' : 'does not exist');
    }, 300);
}

// Fake API: CREATE_ROOM
function fakeCreateRoom(name) {
    console.log('📤 FAKE API: CREATE_ROOM', { name });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Room created', name);
    }, 300);
}

// Fake API: JOIN_ROOM
function fakeJoinRoom(name) {
    console.log('📤 FAKE API: JOIN_ROOM', { name });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Joined room', name);
    }, 300);
}

// Fake API: GET_PEOPLE_CHAT_MES
function fakeGetPeopleChatMes(name, page = 1) {
    console.log('📤 FAKE API: GET_PEOPLE_CHAT_MES', { name, page });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Chat messages for', name);
    }, 300);
}

// Fake API: GET_ROOM_CHAT_MES
function fakeGetRoomChatMes(name, page = 1) {
    console.log('📤 FAKE API: GET_ROOM_CHAT_MES', { name, page });
    setTimeout(() => {
        console.log('📥 FAKE API Response: Room messages for', name);
    }, 300);
}
// ===== END FAKE API LAYER =====

function getUserChatsKey(username) {
    return CHATS_KEY_PREFIX + username;
}

function loadUserChats(username) {
    if (!username) return [];
    try {
        const data = localStorage.getItem(getUserChatsKey(username));
        if (!data) {
            // Nếu người dùng chưa có dữ liệu chat, khởi tạo với danh sách phù hợp
            const initialChats = generateInitialChats(username);
            saveUserChats(username, initialChats);
            return initialChats;
        }
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function generateInitialChats(username) {
    // Danh sách tất cả users có thể chat
    const allUsers = [
        { name: 'Long', avatar: 'https://i.pravatar.cc/150?img=11' },
        { name: 'Phong', avatar: 'https://i.pravatar.cc/150?img=12' },
        { name: 'Toản', avatar: 'https://i.pravatar.cc/150?img=13' },
        { name: 'Buu', avatar: 'https://i.pravatar.cc/150?img=14' }
    ];

    // Lọc bỏ chính user đang đăng nhập và tạo danh sách chat
    const chatList = allUsers
        .filter(user => user.name.toLowerCase() !== username.toLowerCase())
        .map((user, index) => ({
            id: index + 1,
            name: user.name,
            avatar: user.avatar,
            lastMessage: 'Bắt đầu cuộc trò chuyện',
            timestamp: 'Mới',
            online: index === 0, // User đầu tiên online
            unread: 0,
            lastActive: Date.now(),
            category: null,
            messages: []
        }));

    return chatList;
}

function saveUserChats(username, chats) {
    if (!username) return;
    localStorage.setItem(getUserChatsKey(username), JSON.stringify(chats));
}

function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch { return []; }
}

function saveUsers(list) {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(list));
}

// ---------- Group membership helpers ----------
// Trả về danh sách nhóm (objects) mà cả `userA` và `userB` đều là thành viên
function getGroupsContainingUsers(userA, userB) {
    if (!userA || !userB) return [];
    try {
        return (allChats || []).filter(c => c.isGroup && Array.isArray(c.members) && c.members.includes(userA) && c.members.includes(userB));
    } catch (e) {
        console.warn('getGroupsContainingUsers error', e);
        return [];
    }
}

// Trả về true nếu hai user cùng ít nhất một nhóm chung
function areUsersInSameGroup(userA, userB) {
    return getGroupsContainingUsers(userA, userB).length > 0;
}

// Expose ra `window` để dễ thử nghiệm từ console
try {
    window.getGroupsContainingUsers = getGroupsContainingUsers;
    window.areUsersInSameGroup = areUsersInSameGroup;
} catch (e) {
    // ignore if window not available in some environments
}


function hashPw(pw) {
    // simple client-side encoding (not secure) - sufficient for demo without SQL
    return btoa(pw);
}

function createAccount(user, pass) {
    const users = loadUsers();
    if (users.find(u => u.user === user)) return { ok: false, error: 'Tài khoản đã tồn tại' };
    users.push({ user, pass: hashPw(pass) });
    saveUsers(users);
    
    // Gọi fake API REGISTER
    if (fakeApiEnabled) {
        fakeRegister(user, pass);
    }
    
    return { ok: true };
}

function loginAccount(user, pass) {
    const users = loadUsers();
    const u = users.find(x => x.user === user && x.pass === hashPw(pass));
    if (!u) return { ok: false, error: 'Sai tài khoản hoặc mật khẩu' };
    localStorage.setItem(AUTH_CURRENT_KEY, user);

    // Gọi fake API LOGIN
    if (fakeApiEnabled) {
        fakeLogin(user, pass);
    }

    // Kiểm tra nếu là admin thì chuyển sang trang admin
    if (user === 'admin' || u.isAdmin) {
        window.location.href = 'admin.html';
        return { ok: true, isAdmin: true };
    }

    // Load chats cho user này
    allChats = loadUserChats(user);
    renderConversations(allChats);

    return { ok: true };
}

function logoutAccount() {
    // Lưu chats của user hiện tại trước khi logout
    const currentUser = getCurrentUser();
    if (currentUser) {
        saveUserChats(currentUser, allChats);
    }

    // Gọi fake API LOGOUT
    if (fakeApiEnabled) {
        fakeLogout();
    }

    localStorage.removeItem(AUTH_CURRENT_KEY);
    localStorage.removeItem(AUTH_RELOGIN_CODE_KEY);
    allChats = [];
    currentChat = null;

    // Clear UI
    conversationsList.innerHTML = '';
    chatWindow.style.display = 'none';
    emptyChat.style.display = 'flex';
}

function getCurrentUser() {
    return localStorage.getItem(AUTH_CURRENT_KEY) || null;
}

function showAuthOverlay(show) {
    const ov = document.getElementById('authOverlay');
    if (!ov) return;
    ov.style.display = show ? 'flex' : 'none';
    document.querySelector('.messenger-container').style.filter = show ? 'blur(2px)' : 'none';
}

function updateUserUI() {
    const u = getCurrentUser();
    const display = document.getElementById('currentUserDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    if (u) {
        display.textContent = u;
        logoutBtn.style.display = 'inline-block';
    } else {
        display.textContent = '';
        logoutBtn.style.display = 'none';
    }
}

// Wire auth UI
function wireAuthUI() {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = '';
        registerForm.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.style.display = '';
        loginForm.style.display = 'none';
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('loginUser').value.trim();
        const pass = document.getElementById('loginPass').value;
        const r = loginAccount(user, pass);
        if (!r.ok) return alert(r.error);
        showAuthOverlay(false);
        updateUserUI();
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('regUser').value.trim();
        const pass = document.getElementById('regPass').value;
        const pass2 = document.getElementById('regPass2').value;
        if (pass !== pass2) return alert('Mật khẩu xác nhận không khớp');
        const r = createAccount(user, pass);
        if (!r.ok) return alert(r.error);
        alert('Tạo tài khoản thành công. Vui lòng đăng nhập.');
        tabLogin.click();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        logoutAccount();
        updateUserUI();
        showAuthOverlay(true);
    });
}

//danh dau da doc
function markAllAsRead() {
    allChats.forEach(c => c.unread = 0);
    const cu = getCurrentUser?.();
    if (cu) saveUserChats(cu, allChats);
    renderConversations(allChats);
}

// mo popup
filterMenuIcon.onclick = (e) => {
    e.stopPropagation();
    filterPopupMenu.style.display =
        filterPopupMenu.style.display === "block" ? "none" : "block";
};

//khi nhan ra ngoai la dong
document.addEventListener("click", () => {
    filterPopupMenu.style.display = "none";
});

markAllRead.onclick = (e) => {
    e.stopPropagation();
    markAllAsRead();
    filterPopupMenu.style.display = "none";
};

//render popup loc phan loai
function renderCategoryFilterPopup() {
    const list = categoryFilterPopup.querySelector('.filter-category-list');
    list.innerHTML = CHAT_CATEGORIES.map(c => `
        <label class="filter-category-item">
            <input type="checkbox"
                   value="${c.key}"
                   ${activeCategoryFilters.has(c.key) ? 'checked' : ''}>
            <span class="color-box" style="background:${c.color}"></span>
            ${c.label}
        </label>
    `).join('');
}

//xu ly su kien loc phan laoi
filterCategoryBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderCategoryFilterPopup();
    const rect = filterCategoryBtn.getBoundingClientRect();
    categoryFilterPopup.style.top = rect.bottom + 6 + 'px';
    categoryFilterPopup.style.left = rect.left + 'px';
    categoryFilterPopup.style.display = 'block';
});

//xu ly su kien tick de loc phan loai
categoryFilterPopup.addEventListener('change', (e) => {
    const checkbox = e.target;
    if (checkbox.tagName !== 'INPUT') return;
    const key = checkbox.value;
    if (checkbox.checked) {
        activeCategoryFilters.add(key);
    } else {
        activeCategoryFilters.delete(key);
    }
    renderConversations(allChats);
});

categoryFilterPopup.addEventListener('click', (e) => {
    e.stopPropagation();
});

//dong pop loc phan loai
document.addEventListener('click', () => {
    categoryFilterPopup.style.display = 'none';
});


//category menu
const categoryMenu = document.createElement('div');
categoryMenu.className = 'conv-menu';
categoryMenu.style.display = 'none';

categoryMenu.innerHTML = CHAT_CATEGORIES.map(c => `
    <div class="conv-menu-item category-item" data-category="${c.key}">
        <span class="color-box" style="background:${c.color}"></span>
        ${c.label}
    </div>
`).join('');
document.body.appendChild(categoryMenu);

//xu ly sk category menu
categoryMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    const item = e.target.closest('.category-item');
    if (!item) return;
    const chat = categoryMenu.currentChat;
    const selected = item.dataset.category;

    // chon lai cung loai thi bo
    if (chat.category === selected) {
        delete chat.category;
    } else {
        chat.category = selected;
    }
    saveUserChats(getCurrentUser(), allChats);
    categoryMenu.style.display = 'none';
    renderConversations(allChats);
});

//dong tat ca menu khi nhan ra ngoai
document.addEventListener('click', () => {
    document.querySelectorAll('.conv-menu').forEach(m => {
        m.style.display = 'none';
    });
});

// Render conversations list
function renderConversations(chats) {
    conversationsList.innerHTML = '';

    //loc theo tag
    let chatsToRender = chats;
    if (conversationFilter === "unread") {
        chatsToRender = chatsToRender.filter(c => c.unread > 0);
    }

    //loc theo o tim kiem
    const keyword = searchInput.value.trim().toLowerCase();
    if (keyword) {
        chatsToRender = chatsToRender.filter(c =>
            c.name.toLowerCase().includes(keyword)
        );
    }

    // loc phan loai theo tick
    if (activeCategoryFilters.size > 0) {
        chatsToRender = chatsToRender.filter(chat =>
            chat.category && activeCategoryFilters.has(chat.category)
        );
    }

    // render ds
    chatsToRender.forEach(chat => {
        const div = document.createElement('div');
        div.className = `conversation ${currentChat?.id === chat.id ? 'active' : ''}`;
        div.style.position = 'relative';
        const category = CHAT_CATEGORIES.find(c => c.key === chat.category);
        div.innerHTML = `
            <img src="${chat.avatar}" alt="" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-header">
                    <span class="conversation-name">
                        <span class="name-text">${chat.name}</span>
                        ${chat.unread > 0 ? `<span class="badge-unread">${chat.unread}</span>` : ''}
                    </span>
                    <span class="conversation-time">${chat.timestamp ? formatTimestamp(chat.timestamp) : ''}</span>
                </div>
                <div class="conversation-meta">
                    ${category ? `
                    <span class="category-dot" style="background:${category.color}"></span>` : ''}
                    <span class="conversation-message ${chat.unread > 0 ? 'unread' : ''}">
                        ${chat.lastMessage || ''}
                    </span>
                    <span class="conversation-time">${chat.timestamp ? formatTimestamp(chat.timestamp) : ''}</span>
                </div>
            </div>
            ${chat.online ? '<div class="online-badge"></div>' : ''}
        `;

        // Tạo context menu cho right-click trên avatar
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            display:none;
            position:fixed;
            background:white;
            border:1px solid #ddd;
            border-radius:8px;
            padding:4px 0;
            box-shadow:0 4px 12px rgba(0,0,0,0.15);
            z-index:9999;
            min-width:180px;
        `;
        menu.innerHTML = `
            <div class="conv-menu-item delete">Xóa hội thoại</div>
            <div class="conv-menu-item classify">Phân loại</div>
        `;
        div.appendChild(menu);

        //xu ly hover
        const timeEl = div.querySelector('.conversation-time');
        const menuIcon = div.querySelector('.conversation-menu-icon');

        div.addEventListener('mouseenter', () => {
            timeEl.style.display = 'none';
            menuIcon.style.display = 'inline';
        });

        div.addEventListener('mouseleave', () => {
            timeEl.style.display = 'inline';
            menuIcon.style.display = 'none';
        });

        // Right-click trên avatar để mở context menu
        const avatar = div.querySelector('.conversation-avatar');
        avatar.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });

        //click mo menu item
        menu.addEventListener('click', (e) => {
            e.stopPropagation();

            // xóa hội thoại
            if (e.target.closest('.delete')) {
                if (!confirm(`Xóa hội thoại với ${chat.name}?`)) return;
                allChats = allChats.filter(c => c.id !== chat.id);
                saveUserChats(getCurrentUser(), allChats);
                if (currentChat?.id === chat.id) {
                    currentChat = null;
                    chatWindow.style.display = 'none';
                    emptyChat.style.display = 'flex';
                }
                renderConversations(allChats);
                return;
            }
            
            // Restore messages
            else if (target.classList.contains('restore-messages')) {
                e.stopPropagation();
                
                if (!chat.hiddenMessages || chat.hiddenMessages.length === 0) {
                    menu.style.display = 'none';
                    return;
                }
                
                if (!confirm(`Khôi phục tin nhắn với ${chat.name}?`)) {
                    menu.style.display = 'none';
                    return;
                }
                
                // Khôi phục từ backup
                chat.messages = [...chat.hiddenMessages];
                chat.hiddenMessages = [];
                
                // Cập nhật lastMessage từ tin nhắn cuối
                if (chat.messages.length > 0) {
                    const lastMsg = chat.messages[chat.messages.length - 1];
                    chat.lastMessage = lastMsg.text || lastMsg.image || 'Tin nhắn';
                }
                chat.timestamp = 'Bây giờ';

            // mo popup 2 phan loaii
            if (e.target.closest('.classify')) {
                e.stopPropagation();
                const rect = menu.getBoundingClientRect();
                categoryMenu.style.top = rect.top + 'px';
                categoryMenu.style.left = rect.right + 6 + 'px';
                categoryMenu.style.display = 'block';
                categoryMenu.currentChat = chat;
            }
        });

        div.addEventListener('click', () => {
            openChat(chat);
            // Nếu là nhóm, mở ngay panel thông tin sang tab 'members'
            if (chat && chat.isGroup) {
                // nhỏ delay để đảm bảo currentChat đã được cập nhật và UI render xong
                setTimeout(() => openChangeAvatarModal('members'), 60);
            }
        });
        conversationsList.appendChild(div);
    });
}

// set format thoi gian
function formatTimestamp(ts) {
    if (typeof ts !== "number") return ts;
    const now = Date.now();
    const diff = Math.floor((now - ts) / 1000);

    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return Math.floor(diff / 60) + " phút trước";
    if (diff < 86400) return Math.floor(diff / 3600) + " giờ trước";

    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString('vi-VN') + " " +
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// format nhom tin nhan theo ngay
function formatChatDateLabel(dateStr){
    let d = new Date(dateStr);
    if(isNaN(d)) return "";

    const today = new Date();
    today.setHours(0,0,0,0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const target = new Date(d);
    target.setHours(0,0,0,0);

    //hom nay
    if(target.getTime() === today.getTime()) return "Hôm nay";

    //hom qua (gio + hom qua)
    if (target.getTime() === yesterday.getTime()){
        const hh = d.getHours().toString().padStart(2,"0");
        const mm = d.getMinutes().toString().padStart(2,"0");
        return `${hh}:${mm} • Hôm qua`;
    }

    //cac ngay truoc hom qua
    const weekdays = ["CN","T2","T3","T4","T5","T6","T7"];
    const weekday = weekdays[d.getDay()];
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    return `${weekday} ${day}/${month}/${year}`;
}

// nhan tin nhan tu nhan tu dong tu doi phuong
setInterval(() => {

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    allChats = loadUserChats(currentUser);
    if (!allChats || allChats.length === 0) return;

    const randomChat = allChats[Math.floor(Math.random() * allChats.length)];

    const autoReplies = [
        "Bạn đang làm gì vậy?",
        "Tối nay rảnh không?",
        "Ok nhé.",
        "Để mai mình trả lời nha.",
        "👌",
        "Có bài tập chưa?",
        "Ăn cơm chưa?",
        "Đang làm gì đó?"
    ];

    const msg = {
        id: Date.now(),
        sender: "them",
        text: autoReplies[Math.floor(Math.random() * autoReplies.length)],
        time: new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    randomChat.messages.push(msg);
    randomChat.lastMessage = msg.text;
    randomChat.timestamp = Date.now();

    if (!currentChat || currentChat.id !== randomChat.id) {
        // Nếu là cuộc trò chuyện nhóm và người dùng đã tắt thông báo nhóm → không tăng unread
        if (!(randomChat.isGroup && !isGroupNotificationEnabled())) {
            randomChat.unread = (randomChat.unread || 0) + 1;
        }
    } else {
        renderMessages(randomChat.messages);
    }

    saveUserChats(currentUser, allChats);
    renderConversations(allChats);

}, 30 * 1000);


// Open chat
function openChat(chat) {
    currentChat = chat;
    chatWindow.style.display = 'flex';
    emptyChat.style.display = 'none';

    // Update header
    chatName.textContent = chat.name;
    chatAvatar.src = chat.avatar;
    chatStatus.textContent = chat.online ? 'Đang hoạt động' : 'Không hoạt động';
    chatStatus.className = `status ${chat.online ? 'online' : ''}`;

    // Clear unread
    chat.unread = 0;

    // Lưu lại danh sách chat sau khi clear unread
    saveUserChats(getCurrentUser(), allChats);

    // Render messages
    renderMessages(chat.messages);
    renderPinnedMessage();
    renderConversations(allChats);

    messageInput.focus();

    typingStatus.style.display = 'none';
    clearTimeout(typingTimer);

    // Gọi fake API để kiểm tra user online
    if (fakeApiEnabled) {
        fakeCheckUserOnline(chat.name);
    }

    // info button always visible; panel will show group-specific controls
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) infoBtn.style.display = 'inline-flex';
}

function setUserActive(chat) {
    chat.online = true;
    chat.lastActive = Date.now();

    renderConversations(allChats);

    // clear timer cũ nếu có
    if (inactiveTimers[chat.id]) {
        clearTimeout(inactiveTimers[chat.id]);
    }

    // tạo lại timer 5 phút
    inactiveTimers[chat.id] = setTimeout(() => {
        chat.online = false;
        renderConversations(allChats);

        if (currentChat && currentChat.id === chat.id) {
            chatStatus.textContent = "Không hoạt động";
            chatStatus.className = "status";
        }

        // lưu vào localStorage
        const u = getCurrentUser();
        if (u) saveUserChats(u, allChats);

    }, 5 * 60 * 1000); // 5 phút

    renderConversations(allChats);

    if (currentChat && currentChat.id === chat.id) {
        chatStatus.textContent = "Đang hoạt động";
        chatStatus.className = "status online";
    }
}


// Open info panel (shows group avatar controls when current chat is a group)
function openChangeAvatarModal(defaultTab) {
    try {
        console.log('openChangeAvatarModal called', { currentChat });
        const currentUser = getCurrentUser();
        if (!currentUser) return alert('Vui lòng đăng nhập');
        const isGroup = !!(currentChat && currentChat.isGroup);
    const panel = document.getElementById('infoPanel');
    if (!panel) {
        console.error('infoPanel element not found in DOM');
        alert('Lỗi: không tìm thấy info panel trong trang. Mở console để biết thêm chi tiết.');
        return;
    }
            // apply fallback inline styles to ensure visibility if external CSS didn't load
            panel.style.position = panel.style.position || 'fixed';
            panel.style.top = panel.style.top || '0';
            panel.style.right = panel.style.right || '0';
            panel.style.bottom = panel.style.bottom || '0';
            panel.style.width = panel.style.width || '360px';
            panel.style.background = panel.style.background || '#fff';
            panel.style.zIndex = panel.style.zIndex || '2000';
            panel.style.boxShadow = panel.style.boxShadow || '-8px 0 24px rgba(0,0,0,0.08)';
    const input = document.getElementById('changeAvatarInput');
    const fileInput = document.getElementById('changeAvatarFile');
    const preview = document.getElementById('changeAvatarPreview');
    const defaultGrid = document.getElementById('defaultAvatars');
    const addImageBtn = document.getElementById('addImageBtn');
    const updateAvatarBtn = document.getElementById('updateAvatarBtn');
    const membersList = document.getElementById('panelMembersList');
    const renameInput = document.getElementById('renameGroupInput');
    const renameBtn = document.getElementById('renameGroupBtn');
    const addMemberInput = document.getElementById('addMemberInput');
    const addMemberBtn = document.getElementById('addMemberBtn');
    const tabAvatar = document.getElementById('tabAvatar');
    const tabMembers = document.getElementById('tabMembers');
    const sectionAvatar = document.getElementById('sectionAvatar');
    const sectionMembers = document.getElementById('sectionMembers');
    const membersCountBadge = document.getElementById('membersCountBadge');
    input.value = (currentChat && currentChat.avatar) || '';
    preview.src = (currentChat && currentChat.avatar) || '';
    if (fileInput) fileInput.value = '';
    if (renameInput) renameInput.value = (currentChat && currentChat.name) || '';
    function renderMembersPanel() {
        if (!membersList) return;
        membersList.innerHTML = '';
            if (!isGroup) {
                membersList.textContent = 'Thông tin chỉ khả dụng cho cuộc trò chuyện nhóm.';
                if (addMemberInput) addMemberInput.disabled = true;
                if (addMemberBtn) addMemberBtn.disabled = true;
                updateMembersCount('-');
                return;
            }
        if (addMemberInput) addMemberInput.disabled = false;
        if (addMemberBtn) addMemberBtn.disabled = false;

        const cu = getCurrentUser();
        function getMemberAvatar(name) {
            const chat = allChats.find(c => !c.isGroup && c.name === name);
            if (chat && chat.avatar) return chat.avatar;
            const DEFAULTS = {
                'Long': 'https://i.pravatar.cc/150?img=11',
                'Phong': 'https://i.pravatar.cc/150?img=12',
                'Toản': 'https://i.pravatar.cc/150?img=13',
                'Buu': 'https://i.pravatar.cc/150?img=14'
            };
            return DEFAULTS[name] || `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`;
        }
        (currentChat.members || []).forEach(name => {
            const row = document.createElement('div');
            row.className = 'members-row';

            const left = document.createElement('div');
            left.className = 'members-left';
            const avatar = document.createElement('img');
            avatar.className = 'members-avatar';
            avatar.src = getMemberAvatar(name);
            avatar.alt = name;
            const label = document.createElement('div');
            label.className = 'members-name';
            label.textContent = name;
            // show admin badge
            if (currentChat && currentChat.admin === name) {
                const b = document.createElement('span');
                b.className = 'members-admin-badge';
                b.style.marginLeft = '8px';
                b.style.fontSize = '12px';
                b.style.color = '#2c7';
                b.textContent = 'Quản trị';
                label.appendChild(b);
            }
            left.appendChild(avatar);
            left.appendChild(label);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'members-remove';
            removeBtn.type = 'button'; // Thêm type button để tránh submit form
            // Button text: allow current user to "Rời" (leave), allow removing others
            const isCurrentUser = (name === cu);
            console.log('Creating remove button for:', name, 'Current user:', cu, 'Is same?', isCurrentUser);
            if (isCurrentUser) {
                removeBtn.disabled = false;
                removeBtn.textContent = 'Rời';
                removeBtn.title = 'Rời nhóm';
            } else {
                // Only admin can remove other members
                if (cu && currentChat && currentChat.admin === cu) {
                    removeBtn.disabled = false;
                    removeBtn.textContent = 'Xóa';
                    removeBtn.title = `Xóa ${name} khỏi nhóm`;
                } else {
                    removeBtn.disabled = true;
                    removeBtn.textContent = 'Xóa';
                    removeBtn.title = 'Chỉ quản trị viên mới có thể xóa thành viên';
                }
            }
            
            removeBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Remove button clicked for:', name);
                console.log('Button disabled?', removeBtn.disabled);
                if (!removeBtn.disabled) {
                    onRemoveMember(name);
                }
            };

            row.appendChild(left);
            row.appendChild(removeBtn);
                membersList.appendChild(row);

                // Khi click vào hàng thành viên, cuộn đến vị trí và làm nổi bật (trừ khi click vào nút Xóa/Rời)
                row.addEventListener('click', (e) => {
                    if (e.target && (e.target === removeBtn || e.target.closest('.members-remove'))) return;
                    try {
                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        const prevBg = row.style.background;
                        row.style.transition = 'background 0.35s ease';
                        row.style.background = '#fff8d6';
                        setTimeout(() => {
                            row.style.background = prevBg || '';
                        }, 1200);
                    } catch (err) {
                        console.warn('member row click handler error', err);
                    }
                });
        });

        updateMembersCount((currentChat.members || []).length);
    }

    function updateMembersCount(value) {
        if (!membersCountBadge) return;
        if (value === '-' || !isGroup) {
            membersCountBadge.textContent = '';
            membersCountBadge.style.display = 'none';
            return;
        }
        membersCountBadge.textContent = value;
        membersCountBadge.style.display = 'inline-block';
    }

    function onAddMember() {
        if (!isGroup) return alert('Chỉ nhóm mới có thể thêm thành viên');
        const cu = getCurrentUser();
        let name = (addMemberInput && addMemberInput.value || '').trim();
        if (!name) return alert('Nhập tên thành viên');
        const allUsers = loadUsers().map(u => u.user);
        if (!allUsers.includes(name)) return alert('Thành viên không tồn tại trong hệ thống');
        if ((currentChat.members || []).includes(name)) return alert('Thành viên đã có trong nhóm');
        currentChat.members.push(name);
        // tin nhan he thong them thanh vien
        addSystemMessage(currentChat, `${name} đã được thêm vào nhóm`);

        // persist
        const user = getCurrentUser();
        if (user) saveUserChats(user, allChats);
        renderMembersPanel();
        renderMessages(currentChat.messages);
        if (addMemberInput) addMemberInput.value = '';
        //thong bao them thanh vien thanh cong
        alert(`Đã thêm ${name} vào nhóm thành công!`);
    }

    function onRemoveMember(name) {
        console.log('onRemoveMember called with:', name);
        console.log('isGroup:', isGroup);
        console.log('currentChat:', currentChat);
        console.log('currentChat.members:', currentChat?.members);
        
        if (!isGroup) return alert('Chỉ nhóm mới có thể xóa thành viên');
        const cu = getCurrentUser();
        console.log('Current user:', cu);
        
        // prevent non-admin removing others
        if (name !== cu && currentChat.admin !== cu) return alert('Chỉ quản trị viên mới có thể xóa thành viên khác');

        // allow leaving (name === cu) or removing others
        const leavingSelf = name === cu;
        if (!window.confirm(leavingSelf ? `Bạn có chắc muốn rời nhóm "${currentChat.name}"?` : `Xóa thành viên "${name}" khỏi nhóm?`)) return;

        // perform removal
        currentChat.members = (currentChat.members || []).filter(n => n !== name);

        // If the member leaving was the admin, transfer admin to another member (if any)
        if (currentChat.admin === name) {
            if ((currentChat.members || []).length > 0) {
                // pick first member as new admin
                currentChat.admin = currentChat.members[0];
                const sysMsg = {
                    id: Date.now(),
                    sender: 'system',
                    text: `Quyền quản trị đã được chuyển cho ${currentChat.admin}`,
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                };
                currentChat.messages.push(sysMsg);
                currentChat.lastMessage = sysMsg.text;
                currentChat.timestamp = 'Bây giờ';
            } else {
                // no members left — delete group
                const cuUser = getCurrentUser();
                allChats = allChats.filter(c => c.id !== currentChat.id);
                if (cuUser) saveUserChats(cuUser, allChats);
                // close panel and chat
                alert('Nhóm đã bị xóa vì không còn thành viên');
                const panel = document.getElementById('infoPanel');
                if (panel) panel.style.display = 'none';
                currentChat = null;
                chatWindow.style.display = 'none';
                emptyChat.style.display = 'flex';
                renderConversations(allChats);
                return;
            }
        } else {
            // update last message for removal by others
            currentChat.lastMessage = `${name} đã bị xóa khỏi nhóm`;
            currentChat.timestamp = 'Bây giờ';
            const systemMsg = {
                id: Date.now(),
                sender: 'system',
                text: `${getCurrentUser()} đã xóa ${name} khỏi nhóm`,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            };
            currentChat.messages.push(systemMsg);
        }

        // If leaving self and group still exists, notify in system message
        if (leavingSelf && currentChat) {
            const sysMsg = {
                id: Date.now(),
                sender: 'system',
                text: `${name} đã rời nhóm`,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            };
            currentChat.messages.push(sysMsg);
            currentChat.lastMessage = sysMsg.text;
            currentChat.timestamp = 'Bây giờ';
        }

        // If after removal group has less than 2 members, delete it
        if ((currentChat.members || []).length < 2) {
            const cuUser = getCurrentUser();
            allChats = allChats.filter(c => c.id !== currentChat.id);
            if (cuUser) saveUserChats(cuUser, allChats);
            alert('Nhóm đã được xóa vì không còn đủ thành viên');
            const panel = document.getElementById('infoPanel');
            if (panel) panel.style.display = 'none';
            currentChat = null;
            chatWindow.style.display = 'none';
            emptyChat.style.display = 'flex';
            renderConversations(allChats);
            return;
        }

        // Update chat header if viewing
        if (currentChat) {
            const chatNameEl = document.getElementById('chatName');
            if (chatNameEl) chatNameEl.textContent = currentChat.name;
        }

        // persist
        const user = getCurrentUser();
        if (user) saveUserChats(user, allChats);

        // Update UI
        renderMembersPanel();
        renderConversations(allChats);
        if (currentChat) renderMessages(currentChat.messages);

        // Notify
        alert(leavingSelf ? 'Bạn đã rời nhóm' : `Đã xóa ${name} khỏi nhóm`);
    }
    panel.style.display = 'block';
    function selectTab(tab) {
        const isMembers = tab === 'members';
        if (tabAvatar) tabAvatar.classList.toggle('active', !isMembers);
        if (tabMembers) tabMembers.classList.toggle('active', isMembers);
        if (sectionAvatar) sectionAvatar.style.display = isMembers ? 'none' : '';
        if (sectionMembers) sectionMembers.style.display = isMembers ? '' : 'none';
        if (isMembers) {
            renderMembersPanel();
        } else {
            updateMembersCount('-');
        }
    }
    selectTab(defaultTab || 'avatar');

    const closeBtn = document.getElementById('closeInfoPanel');
    const deleteBtn = document.getElementById('deleteGroupBtn');
    const confirmBtn = document.getElementById('confirmChangeAvatar');

    let avatarProcessTimer = null;

    function close() {
        try {
            panel.style.display = 'none';
            if (closeBtn) closeBtn.removeEventListener('click', onCancel);
            if (deleteBtn) deleteBtn.removeEventListener('click', onDeleteGroup);
            if (confirmBtn) confirmBtn.removeEventListener('click', onConfirm);
            if (input) input.removeEventListener('input', onInput);
            if (fileInput) fileInput.removeEventListener('change', onFile);
            if (addImageBtn) addImageBtn.removeEventListener('click', onAddImage);
            if (updateAvatarBtn) updateAvatarBtn.removeEventListener('click', onConfirm);
            if (avatarProcessTimer) { clearTimeout(avatarProcessTimer); avatarProcessTimer = null; }
            if (addMemberBtn) addMemberBtn.removeEventListener('click', onAddMember);
            if (addMemberInput) addMemberInput.removeEventListener('keypress', onAddMemberKeypress);
            if (tabAvatar) tabAvatar.removeEventListener('click', onClickTabAvatar);
            if (tabMembers) tabMembers.removeEventListener('click', onClickTabMembers);
            if (renameBtn) renameBtn.removeEventListener('click', onRename);
            if (renameInput) renameInput.removeEventListener('keypress', onRenameKeypress);
            // cleanup default avatars listeners
            if (defaultGrid) {
                Array.from(defaultGrid.children).forEach(img => {
                    if (img._handler) img.removeEventListener('click', img._handler);
                    delete img._handler;
                });
                defaultGrid.innerHTML = '';
            }
        } catch (err) {
            console.error('Error during close():', err);
        }
    }

    function onCancel() { close(); }

    function onInput() {
        const val = (input.value || '').trim();
        if (!val) { preview.src = ''; return; }
        if (avatarProcessTimer) clearTimeout(avatarProcessTimer);
        avatarProcessTimer = setTimeout(() => {
            processImageToSquare(val, 256, (processed, err) => {
                if (processed) {
                    preview.src = processed;
                    input.value = processed;
                } else {
                    console.warn('processImageToSquare failed for URL, using original value', err);
                    preview.src = val;
                }
            });
        }, 250);
    }

    function onFile(e) {
        const f = e.target.files && e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            const dataUrl = ev.target.result;
            // process and resize/crop to square before setting
            processImageToSquare(dataUrl, 256, (processed, err) => {
                if (processed) {
                    preview.src = processed;
                    input.value = processed;
                } else {
                    console.warn('Failed to process uploaded image, using original', err);
                    preview.src = dataUrl;
                    input.value = dataUrl;
                }
                // clear selection of default avatars
                if (defaultGrid) Array.from(defaultGrid.children).forEach(c => c.classList.remove('selected'));
            });
        };
        reader.readAsDataURL(f);
    }

    function onAddImage(e) {
        e.preventDefault();
        if (fileInput) fileInput.click();
    }

    function onConfirm() {
        if (!isGroup) return alert('Chỉ nhóm mới có thể thay avatar');
        const url = input.value.trim();
        if (!url) return alert('Nhập URL ảnh hợp lệ');
        // update current chat avatar
        currentChat.avatar = url;
        // update UI
        const chatAvatarEl = document.getElementById('chatAvatar');
        if (chatAvatarEl) chatAvatarEl.src = url;
        renderConversations(allChats);
        // save
        const cu = getCurrentUser();
        if (cu) saveUserChats(cu, allChats);
        close();
    }

    if (closeBtn) closeBtn.addEventListener('click', onCancel);
    if (confirmBtn) confirmBtn.addEventListener('click', onConfirm);
    input.addEventListener('input', onInput);
    if (fileInput) fileInput.addEventListener('change', onFile);
    // show/hide delete button in Members section and wire handler
    if (deleteBtn) {
        deleteBtn.style.display = isGroup ? '' : 'none';
        // ensure no duplicate listeners
        deleteBtn.removeEventListener('click', onDeleteGroup);
        deleteBtn.addEventListener('click', onDeleteGroup);
    }

    // populate default avatars
    if (defaultGrid) {
        const DEFAULT_AVATARS = [
            'https://i.pravatar.cc/150?img=21',
            'https://i.pravatar.cc/150?img=22',
            'https://i.pravatar.cc/150?img=23',
            'https://i.pravatar.cc/150?img=24',
            'https://i.pravatar.cc/150?img=25',
            'https://i.pravatar.cc/150?img=26',
            'https://i.pravatar.cc/150?img=27',
            'https://i.pravatar.cc/150?img=28'
        ];

        DEFAULT_AVATARS.forEach(url => {
            const el = document.createElement('img');
            el.src = url;
            el.alt = 'avatar';
            el.className = 'default-avatar';
            el.style.cursor = 'pointer';

            const handler = (e) => {
                // mark selection
                Array.from(defaultGrid.children).forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
                input.value = url;
                preview.src = url;
            };
            el._handler = handler;
            el.addEventListener('click', handler);
            defaultGrid.appendChild(el);
        });
    }

    // wire add image button
    if (addImageBtn && fileInput) {
        addImageBtn.addEventListener('click', onAddImage);
    }
    if (updateAvatarBtn) {
        updateAvatarBtn.addEventListener('click', onConfirm);
    }
    // members controls
    function onAddMemberKeypress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            onAddMember();
        }
    }
    if (addMemberBtn) addMemberBtn.addEventListener('click', onAddMember);
    if (addMemberInput) addMemberInput.addEventListener('keydown', onAddMemberKeypress);
    function onClickTabAvatar() { selectTab('avatar'); }
    function onClickTabMembers() { selectTab('members'); }
    if (tabAvatar) tabAvatar.addEventListener('click', onClickTabAvatar);
    if (tabMembers) tabMembers.addEventListener('click', onClickTabMembers);

    // Rename group handlers
    function onRename() {
        if (!isGroup) return alert('Chỉ nhóm mới có thể đổi tên');
        const cu = getCurrentUser();
        if (!cu) return alert('Vui lòng đăng nhập');
        const newName = (renameInput && renameInput.value || '').trim();
        if (!newName) return alert('Nhập tên nhóm hợp lệ');
        const oldName = currentChat.name;
        currentChat.name = newName;
        currentChat.lastMessage = `${cu} đã đổi tên nhóm thành "${newName}"`;
        currentChat.timestamp = 'Bây giờ';

        //tin nhan he thong(rename group)
        addSystemMessage(currentChat, `Tên nhóm đã đổi thành "${newName}"`);

        // Update header and UI
        const chatNameEl = document.getElementById('chatName');
        if (chatNameEl) chatNameEl.textContent = currentChat.name;
        renderConversations(allChats);
        if (currentChat) renderMessages(currentChat.messages);

        // persist
        const user = getCurrentUser();
        if (user) saveUserChats(user, allChats);

        alert('Đã đổi tên nhóm');
    }

    function onRenameKeypress(e) {
        if (e.key === 'Enter') { e.preventDefault(); onRename(); }
    }

    if (renameBtn) renameBtn.addEventListener('click', onRename);
    if (renameInput) renameInput.addEventListener('keypress', onRenameKeypress);
    
    // Delete group handler
    function onDeleteGroup(e) {
        e && e.preventDefault();
        if (!currentChat || !currentChat.isGroup) return alert('Chỉ nhóm mới có thể xóa');
        const cu = getCurrentUser();
        if (!cu) return alert('Vui lòng đăng nhập');
        if (!confirm(`Bạn có chắc muốn xóa nhóm "${currentChat.name}"?`)) return;

        // Remove from chats
        allChats = allChats.filter(c => c.id !== currentChat.id);

        // Persist for current user
        if (cu) saveUserChats(cu, allChats);

        // Close panel
        close();

        // If the deleted group is currently open, close chat window
        if (currentChat && currentChat.id === undefined) {
            // no-op
        }
        // reset currentChat and UI
        currentChat = null;
        chatWindow.style.display = 'none';
        emptyChat.style.display = 'flex';

        renderConversations(allChats);
        alert('Nhóm đã được xóa');
    }
    } catch (err) {
        console.error('openChangeAvatarModal error', err);
        alert('Lỗi khi mở panel. Xem console để biết chi tiết.');
    }
}

// Process an image source (dataURL or URL) into a square dataURL of given size.
// callback(resultDataUrl, err)
function processImageToSquare(src, size, callback) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
        try {
            const min = Math.min(img.width, img.height);
            const sx = Math.max(0, Math.floor((img.width - min) / 2));
            const sy = Math.max(0, Math.floor((img.height - min) / 2));
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            // draw center-cropped image to canvas resized to size x size
            ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            callback(dataUrl);
        } catch (err) {
            console.warn('processImageToSquare error during draw', err);
            callback(null, err);
        }
    };
    img.onerror = function(err) {
        console.warn('processImageToSquare load error', err);
        callback(null, err);
    };
    img.src = src;
}

// Render messages
function renderMessages(messages) {
    messagesContainer.innerHTML = '';

    // Group consecutive messages from same sender
    const groups = [];
    messages.forEach((msg, idx) => {
        if (msg.type === "system" || msg.sender === "system") {
            groups.push([msg]);
            return;
        }
        if (idx === 0 || messages[idx - 1].sender !== msg.sender) {
            groups.push([msg]);
        } else {
            groups[groups.length - 1].push(msg);
        }
    });

    let lastDate = null;
    let lastTime = null;
    const TIME_GAP_MIN = 120;

    groups.forEach(group => {
        const firstMsg = group[0];
        // tin nhan hẹ thong render đơn giản rồi return
        if (firstMsg.type === "system" || firstMsg.sender === "system") {
            const systemDiv = document.createElement('div');
            systemDiv.className = 'system-message';
            systemDiv.style.textAlign = 'center';
            systemDiv.style.padding = '8px';
            systemDiv.style.color = '#65676b';
            systemDiv.style.fontSize = '12px';
            systemDiv.style.fontStyle = 'italic';

            systemDiv.textContent = firstMsg.text;
            messagesContainer.appendChild(systemDiv);
            return;
        }

        let dateObj;
        if (firstMsg.fullTime) {
            dateObj = new Date(firstMsg.fullTime);
        } else {
            // neu chua co ngay thi lay hom nay
            let dateStr = firstMsg.date;
            if (!dateStr) {
                dateStr = new Date().toISOString().split("T")[0];
                firstMsg.date = dateStr;
            }
            // neu co time
            if (firstMsg.time) {
                dateObj = new Date(`${dateStr}T${firstMsg.time}:00`);
            } else {
                dateObj = new Date(dateStr);
            }
        }
        const dateKey = dateObj.getFullYear() + "-" +
            String(dateObj.getMonth() + 1).padStart(2, "0") + "-" +
            String(dateObj.getDate()).padStart(2, "0");

        const today = new Date();
        const isToday =
            dateObj.getDate() === today.getDate() &&
            dateObj.getMonth() === today.getMonth() &&
            dateObj.getFullYear() === today.getFullYear();

        // chi tao separator khi doi ngay
        if (dateKey !== lastDate) {
            lastDate = dateKey;
            lastTime = dateObj.getTime(); // reset moc gio trong ngay

            const sep = document.createElement("div");
            sep.className = "day-separator";
            sep.innerHTML = `<span>${formatChatDateLabel(dateObj)}</span>`;
            messagesContainer.appendChild(sep);
        }

        // cung hom nay neu cach xa thoi gian thi them gio + hom nay
        const diffMinutes = Math.abs(dateObj.getTime() - lastTime) / 60000;
        if (diffMinutes >= TIME_GAP_MIN) {
            lastTime = dateObj.getTime();
            const hh = dateObj.getHours().toString().padStart(2, "0");
            const mm = dateObj.getMinutes().toString().padStart(2, "0");
            const sep = document.createElement("div");
            sep.className = "day-separator";

            if (isToday) {
                sep.innerHTML = `<span>${hh}:${mm} Hôm nay</span>`;
            } else {
                sep.innerHTML = `<span>${hh}:${mm} ${formatChatDateLabel(dateObj)}</span>`;
            }
            messagesContainer.appendChild(sep);
        }

        // Kiểm tra nếu là tin nhắn hệ thống
        if (group[0].sender === 'system') {
            const systemDiv = document.createElement('div');
            systemDiv.className = 'system-message';
            systemDiv.style.textAlign = 'center';
            systemDiv.style.padding = '8px';
            systemDiv.style.color = '#65676b';
            systemDiv.style.fontSize = '12px';
            systemDiv.style.fontStyle = 'italic';

            group.forEach(msg => {
                const msgText = document.createElement('div');
                msgText.textContent = msg.text;
                systemDiv.appendChild(msgText);
            });

            messagesContainer.appendChild(systemDiv);
            return;
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message-group ${group[0].sender === 'you' ? 'sent' : 'received'}`;

        if (firstMsg.isGroup) {
            const nameDiv = document.createElement('div');
            nameDiv.className = 'group-sender-name';
            nameDiv.style.fontSize = '12px';
            nameDiv.style.color = '#0a66c2';
            nameDiv.style.margin = '2px 4px';

            nameDiv.textContent = firstMsg.sender === 'you'
                ? 'Bạn'
                : firstMsg.sender;
            msgDiv.appendChild(nameDiv);
        }

        group.forEach(msg => {
            // wrapper để hover icon
            const bubbleWrapper = document.createElement('div');
            bubbleWrapper.className = 'message-bubble-wrapper';
            bubbleWrapper.style.position = 'relative';
            bubbleWrapper.dataset.messageId = msg.id;

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            // Support voice messages
            if (msg.type === 'voice' && msg.audio) {
                const voiceMsg = createVoiceMessageElement(msg);
                bubble.appendChild(voiceMsg);
            }
            // support image messages
            else if (msg.image) {
                const imgEl = document.createElement('img');
                imgEl.src = msg.image;
                imgEl.style.maxWidth = '320px';
                imgEl.style.maxHeight = '320px';
                imgEl.style.borderRadius = '8px';
                imgEl.style.display = 'block';
                imgEl.style.objectFit = 'cover';
                bubble.appendChild(imgEl);
                if (msg.text) {
                    const caption = document.createElement('div');
                    caption.textContent = msg.text;
                    bubble.appendChild(caption);
                }
            } else {
                const textDiv = document.createElement('div');
                textDiv.innerHTML = highlightMentions(msg.text || '');
                bubble.appendChild(textDiv);
            }

            // ===== actions (reply + menu) =====
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            // icon trả lời
            const replyIcon = document.createElement('div');
            replyIcon.className = 'message-reply-icon';
            replyIcon.textContent = '❝';

            // icon menu 3 chấm
            const menuIcon = document.createElement('div');
            menuIcon.className = 'message-actions-icon';
            menuIcon.textContent = '⋯';

            actions.appendChild(replyIcon);
            actions.appendChild(menuIcon);

            // menu
            const menu = document.createElement('div');
            menu.className = 'message-actions-menu';
            menu.innerHTML = `
                <div class="react-msg">Thả cảm xúc</div>
                <div class="copy-msg">Copy</div>
                 <div class="pin-msg">Ghim tin nhắn</div>
                <div class="recall-msg">Thu hồi</div>
                <div class="delete-msg">Xóa</div>
            `;

            actions.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            // click icon hiện menu
            menuIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });

            // các chức năng menu
            menu.querySelector('.copy-msg').addEventListener('click', () => {
                navigator.clipboard.writeText(msg.text || msg.image || '');
                menu.style.display = 'none';
            });
            menu.querySelector('.recall-msg').addEventListener('click', () => {
                // Thu hồi: đổi nội dung tin nhắn thành thông báo thu hồi
                msg.image = undefined;
                msg.text = 'Tin nhắn đã thu hồi';
                renderMessages(messages);
                // lưu lại
                const cu = getCurrentUser();
                if (cu) saveUserChats(cu, allChats);
                menu.style.display = 'none';
            });
            menu.querySelector('.delete-msg').addEventListener('click', () => {
                const index = messages.indexOf(msg);
                if (index > -1) messages.splice(index, 1);
                renderMessages(messages);
                const cu = getCurrentUser();
                if (cu) saveUserChats(cu, allChats);
                menu.style.display = 'none';
            });

            //xu ly click ghim tinn nhan
            menu.querySelector('.pin-msg').addEventListener('click', () => {
                const cu = getCurrentUser();
                currentChat.pinnedMessage = {
                    id: msg.id,
                    text: msg.text,
                    senderId: msg.sender,
                    senderName:
                        msg.sender === 'you'
                            ? cu?.name || 'Bạn'
                            : msg.senderName || currentChat.name
                };
                if (cu) saveUserChats(cu, allChats);
                renderPinnedMessage();
                menu.style.display = 'none';
            });

            // xu ly click reaction
            menu.querySelector('.react-msg').addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = 'none';
                showReactionPicker(bubbleWrapper, msg, messages);
            });
            
            //xu ly sk reply icon
            replyIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                replyingMessage = {
                    id: msg.id,
                    text: msg.text,
                    sender: msg.sender,
                    senderName:
                        msg.sender === 'you'
                            ? 'Bạn'
                            : (msg.senderName || currentChat.name)
                };
                document.getElementById('replySender').textContent =
                    msg.sender === 'you'
                        ? 'Bạn'
                        : (msg.senderName || currentChat.name);
                document.getElementById('replyText').textContent =
                    msg.text || '[Hình ảnh]';
                document.getElementById('replyBox').style.display = 'flex';
            });

            // Long-press (hold) to show actions menu — supports touch and mouse
            let pressTimer = null;
            const LONG_PRESS_MS = 600;
            const startPress = (e) => {
                if (e && e.type === 'touchstart') e.preventDefault();
                if (pressTimer) clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    menu.style.display = 'block';
                }, LONG_PRESS_MS);
            };
            const cancelPress = () => {
                if (pressTimer) clearTimeout(pressTimer);
                pressTimer = null;
            };
            bubbleWrapper.addEventListener('touchstart', startPress, { passive: false });
            bubbleWrapper.addEventListener('mousedown', startPress);
            bubbleWrapper.addEventListener('touchend', cancelPress);
            bubbleWrapper.addEventListener('touchcancel', cancelPress);
            bubbleWrapper.addEventListener('mouseup', cancelPress);
            bubbleWrapper.addEventListener('mouseleave', cancelPress);

            // hiển thị reactions
            if (msg.reactions && msg.reactions.length > 0) {
                const reactionsDiv = document.createElement('div');
                reactionsDiv.className = 'message-reactions';
                reactionsDiv.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; font-size:14px;';
                
                // nhóm reactions theo emoji
                const reactionCounts = {};
                msg.reactions.forEach(r => {
                    if (!reactionCounts[r.emoji]) {
                        reactionCounts[r.emoji] = { count: 0, users: [] };
                    }
                    reactionCounts[r.emoji].count++;
                    reactionCounts[r.emoji].users.push(r.user);
                });
                
                // hiển thị từng emoji với count
                Object.keys(reactionCounts).forEach(emoji => {
                    const reactionItem = document.createElement('span');
                    const cu = getCurrentUser();
                    const hasReacted = reactionCounts[emoji].users.includes(cu);
                    reactionItem.className = hasReacted ? 'reaction-item active' : 'reaction-item';
                    reactionItem.style.cssText = `
                        padding:2px 6px;
                        border-radius:12px;
                        background:${hasReacted ? '#e7f3ff' : '#f0f0f0'};
                        border:${hasReacted ? '1px solid #0a66c2' : '1px solid transparent'};
                        cursor:pointer;
                        display:flex;
                        align-items:center;
                        gap:2px;
                        transition:all 0.2s;
                    `;
                    reactionItem.innerHTML = `${emoji} ${reactionCounts[emoji].count}`;
                    reactionItem.title = reactionCounts[emoji].users.join(', ');
                    
                    // click để thêm/xóa reaction
                    reactionItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        toggleReaction(msg, emoji, messages);
                    });
                    
                    reactionsDiv.appendChild(reactionItem);
                });
                
                // nút thêm reaction
                const addReactionBtn = document.createElement('span');
                addReactionBtn.className = 'add-reaction-btn';
                addReactionBtn.style.cssText = `
                    padding:2px 6px;
                    border-radius:12px;
                    background:#f0f0f0;
                    cursor:pointer;
                    font-size:16px;
                    display:flex;
                    align-items:center;
                    transition:all 0.2s;
                `;
                addReactionBtn.textContent = '+';
                addReactionBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showReactionPicker(bubbleWrapper, msg, messages);
                });
                addReactionBtn.addEventListener('mouseenter', () => {
                    addReactionBtn.style.background = '#e4e6eb';
                });
                addReactionBtn.addEventListener('mouseleave', () => {
                    addReactionBtn.style.background = '#f0f0f0';
                });
                
                reactionsDiv.appendChild(addReactionBtn);
                bubbleWrapper.appendChild(reactionsDiv);
            }

            bubbleWrapper.addEventListener('mouseenter', () => {
                actions.style.display = 'flex';
                if (hideActionsTimer) {
                    clearTimeout(hideActionsTimer);
                    hideActionsTimer = null;
                }
            });
            actions.addEventListener('mouseleave', () => {
                hideActionsTimer = setTimeout(() => {
                    actions.style.display = 'none';
                }, 1000);
            });
            actions.addEventListener('mouseenter', () => {
                if (hideActionsTimer) {
                    clearTimeout(hideActionsTimer);
                    hideActionsTimer = null;
                }
            });

            bubbleWrapper.appendChild(bubble);
            bubbleWrapper.appendChild(actions);
            bubbleWrapper.appendChild(menu);
            msgDiv.appendChild(bubbleWrapper);
        });

        if (group[0].sender === 'you') {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'message-status';
            const lastMsg = group[group.length - 1];
            switch (lastMsg.status) {
                case 'sending':
                    statusDiv.textContent = 'Đang gửi...';
                    break;
                case 'sent':
                    statusDiv.textContent = 'Đã gửi';
                    break;
                case 'received':
                    statusDiv.textContent = 'Đã nhận';
                    break;
                case 'error':
                    statusDiv.innerHTML = `
                        Gửi lỗi 
                        <button class="retry-btn" style="margin-left:6px; cursor:pointer;">Thử lại</button>
                    `;
                    const retryBtn = statusDiv.querySelector('.retry-btn');
                    retryBtn.addEventListener('click', () => retryMessage(lastMsg));
                    break;
            }
            msgDiv.appendChild(statusDiv);
        }
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = group[group.length - 1].time;

        msgDiv.appendChild(timeDiv);
        messagesContainer.appendChild(msgDiv);
    });
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

document.addEventListener('click', () => {
    document.querySelectorAll('.message-actions-menu')
        .forEach(m => m.style.display = 'none');
});

// xu ly su kien tat khung reply
const closeReplyBtn = document.getElementById('closeReply');
closeReplyBtn.addEventListener('click', () => {
    replyingMessage = null;
    document.getElementById('replyBox').style.display = 'none';
});

//ham ghim tin nhan
function renderPinnedMessage() {
    const box = document.getElementById('pinnedMessageBox');
    const content = document.getElementById('pinnedMessageContent');
    if (!box || !content) return;
    const pinned = currentChat?.pinnedMessage;
    if (!pinned) {
        box.style.display = 'none';
        content.innerHTML = '';
        return;
    }
    content.innerHTML = `
        <div class="pinned-click" data-id="${pinned.id}">
            <span class="pin-icon">📌</span>
            <b>${pinned.senderName}:</b>
            ${pinned.text || '[Hình ảnh]'}
        </div>
    `;
    box.style.display = 'block';
}

//ham popup ghim tin nhan
function initPinnedMenu() {
    const pinnedMenuIcon = document.getElementById('pinnedMenuIcon');
    const pinnedMenu = document.getElementById('pinnedMenu');
    const unpinMessage = document.getElementById('unpinMessage');

    if (!pinnedMenuIcon || !pinnedMenu || !unpinMessage) return;

    //mo menu popup
    pinnedMenuIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedMenu.style.display =
            pinnedMenu.style.display === 'block' ? 'none' : 'block';
    });

    // chuc nang bo ghim tn
    unpinMessage.addEventListener('click', () => {
        if (!currentChat) return;
        delete currentChat.pinnedMessage;
        const cu = getCurrentUser();
        if (cu) saveUserChats(cu, allChats);
        renderPinnedMessage();
        pinnedMenu.style.display = 'none';
    });

    // nhan ra ngoai dong popup
    document.addEventListener('click', () => {
        pinnedMenu.style.display = 'none';
    });
}

//ham su kien khi nhan vao tin nhan da ghim se scroll den tin nhan
function initPinnedScroll() {
    document.addEventListener('click', (e) => {
        const pinned = e.target.closest('.pinned-click');
        if (!pinned) return;
        const messageId = pinned.dataset.id;
        if (!messageId) return;
        const targetMsg = document.querySelector(
            `.message-bubble-wrapper[data-message-id="${messageId}"]`
        );
        if (!targetMsg) return;
        // scroll tin nhắn
        targetMsg.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        // highlight khung
        targetMsg.classList.add('highlight');
        setTimeout(() => {
            targetMsg.classList.remove('highlight');
        }, 2000);
    });
}

//highlight mention
function highlightMentions(text){
    if(!text) return "";
    return text.replace(/@[\p{L}\p{M}0-9_ ]+/gu, match =>
        `<span class="mention">${match.trim()}</span>`);
}

function retryMessage(msg) {
    msg.status = 'sending';
    renderMessages(currentChat.messages);
    simulateSendResult(msg);
}

function handleIncomingMessage(data) {
    const chat = allChats.find(c => c.name === data.from);
    if (!chat) return;

    const msg = {
        id: Date.now(),
        sender: 'them',
        text: data.text,
        time: data.time || new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        })
    };

    // khi đối phương đang nhập
    if (data.event === "TYPING") {
        if (currentChat && currentChat.name === data.from) {
            const typingStatus = document.getElementById("typingStatus");
            if (!typingStatus) return;
            typingStatus.textContent = "Đang nhập...";
            typingStatus.style.display = "block";

            // auto ẩn sau 3s nếu không nhập nữa
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                const typingStatus = document.getElementById("typingStatus");
                if (!typingStatus) return
                typingStatus.style.display = "none";
            }, 3000);
        }
        return;
    }

    chat.messages.push(msg);

    const typingStatus = document.getElementById("typingStatus");
    if (typingStatus) typingStatus.style.display = "none";

    chat.lastMessage = msg.text;
    chat.timestamp = 'Bây giờ';

    setUserActive(chat);

    if (!currentChat || currentChat.name !== chat.name) {
        chat.unread++;
    } else {
        renderMessages(chat.messages);
    }

    renderConversations(allChats);

    // Lưu chats của user hiện tại
    const currentUser = getCurrentUser();
    if (currentUser) {
        saveUserChats(currentUser, allChats);
    }
}

// Send message
function sendMessage() {
    if (!currentChat) return;
    const text = messageInput.value.trim();
    if (!text) return;
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    const date = now.toLocaleDateString('vi-VN');

    const msg = {
        id: Date.now(),
        sender: 'you',
        text: messageInput.value,
        time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        date: now.toISOString().split("T")[0],
        fullTime: new Date().toISOString(),
        status: 'sending', // trạng thái mới
        isGroup: currentChat.type === 'group',
        replyTo: replyingMessage
            ? {
                id: replyingMessage.id,
                senderId: replyingMessage.sender,
                senderName: replyingMessage.senderName,
                text: replyingMessage.text
            }
            : null
    };

    //xu ly tag trong group
    if (currentChat.type === 'group') {
        if (text.includes('@all')) {
            msg.tagAll = true;
        }
    }

    currentChat.messages.push(msg);

    replyingMessage = null;
    const replyBox = document.getElementById('replyBox');
    if (replyBox) replyBox.style.display = 'none';

    currentChat.lastMessage = text;
    currentChat.timestamp = 'Bây giờ';

    renderMessages(currentChat.messages);
    renderConversations(allChats);

    messageInput.value = '';
    mentionSearch = "";
    if (mentionBox) {
        mentionBox.style.display = "none";
    }

    // Gọi fake API SEND_CHAT
    if (fakeApiEnabled) {
        fakeSendChatPeople(currentChat.name, text);
    }

    simulateSendResult(msg);

    // Lưu chats của user hiện tại
    const currentUser = getCurrentUser();
    if (currentUser) {
        saveUserChats(currentUser, allChats);
    }

    setTimeout(() => {
        const success = Math.random() < 0.8;
        if (success) {
            msg.status = 'sent';
            renderMessages(currentChat.messages);
            setTimeout(() => {
                msg.status = 'received';
                renderMessages(currentChat.messages);
            }, 1000);
        } else {
            msg.status = 'error';
            renderMessages(currentChat.messages);
        }
    }, 1000);

    // Auto reply
    setTimeout(() => {

        msg.status = 'sent'; // chuyển trạng thái
        renderMessages(currentChat.messages);

        const responses = [
            'Đúng thế!',
            'OK bạn',
            'Tuyệt vời!',
            'Tôi cũng vậy',
            'Haha đúng',
            'Mình sẽ kiểm tra',
            'Cảm ơn bạn!',
            'Được rồi'
        ];

        const reply = {
            id: Date.now(),
            sender: 'them',
            text: responses[Math.floor(Math.random() * responses.length)],
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        };

        currentChat.messages.push(reply);
        currentChat.lastMessage = reply.text;
        currentChat.timestamp = 'Bây giờ';

        setUserActive(currentChat);

        renderMessages(currentChat.messages);
        renderConversations(allChats);

        // Lưu lại sau khi nhận reply
        const currentUser = getCurrentUser();
        if (currentUser) {
            saveUserChats(currentUser, allChats);
        }
    }, 800);
}

// gui tin nhan he thong
function addSystemMessage(chat, text) {
    if (!chat || !chat.messages) return;
    const msg = {
        id: Date.now(),
        sender: "system",
        text: text,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        type: 'system'
    };
    chat.messages.push(msg);
    chat.lastMessage = text;
    chat.timestamp = 'Bây giờ';
}

// gia lap khi gửi tin nhan cần retry
function simulateSendResult(msg) {
    // giả lập network delay
    setTimeout(() => {

        // 30% thất bại
        const failed = Math.random() < 0.3;

        if (failed) {
            msg.status = 'failed';
        } else {
            msg.status = 'sent';
        }

        renderMessages(currentChat.messages);
    }, 1000);
}


// Search
function searchChats(query) {
    const filtered = allChats.filter(chat =>
        chat.name.toLowerCase().includes(query.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(query.toLowerCase())
    );
    renderConversations(filtered);
}

// Create a group chat (allows any number of members >= 2 including current user)
function createGroup(members, groupName) {
    const currentUser = getCurrentUser();
    if (!currentUser) return alert('Vui lòng đăng nhập trước khi tạo nhóm');

    // Ensure members is an array and contains current user
    const uniqueMembers = Array.from(new Set(members.map(m => m.trim()).filter(Boolean)));
    if (!uniqueMembers.includes(currentUser)) uniqueMembers.unshift(currentUser);

    if (uniqueMembers.length < 2) return alert('Nhóm phải có ít nhất 2 thành viên (gồm bạn)');

    // tin nhan he thong dau tien
    const systemMessage = {
        id: Date.now(),
        type: 'system',
        content: `${currentUser} đã tạo nhóm`,
        timestamp: new Date().toISOString()
    };

    const newChat = {
        id: Date.now(),
        name: groupName || `Nhóm: ${uniqueMembers.filter(m => m !== currentUser).join(', ')}`,
        avatar: 'https://i.pravatar.cc/150?img=20',
        lastMessage: 'Nhóm mới',
        timestamp: Date.now(),
        online: false,
        unread: 0,
        isGroup: true,
        admin: currentUser,
        members: uniqueMembers,
        messages: [systemMessage]
    };

    // add to top of chats and save
    allChats.unshift(newChat);
    saveUserChats(currentUser, allChats);
    addSystemMessage(newChat, "Nhóm đã được tạo");
    renderConversations(allChats);
    openChat(newChat);
}

function createGroupPrompt() {
    openCreateGroupModal();
}

// Modal-based group creation UI
function openCreateGroupModal() {
    const currentUser = getCurrentUser();
    if (!currentUser) return alert('Vui lòng đăng nhập để tạo nhóm');

    const modal = document.getElementById('createGroupModal');
    const list = document.getElementById('groupUsersList');
    const nameInput = document.getElementById('groupNameInput');
    list.innerHTML = '';
    nameInput.value = '';

    const users = loadUsers().map(u => u.user).filter(u => u !== currentUser);
    if (users.length < 1) return alert('Không đủ người dùng khác để tạo nhóm');

    users.forEach(u => {
        const id = `guser_${u}`;
        const row = document.createElement('div');
        row.style.padding = '6px 4px';

        // kiểm tra xem currentUser và u đã cùng nhóm chưa
        const existingGroups = getGroupsContainingUsers(currentUser, u) || [];
        if (existingGroups.length > 0) {
            // nếu đã cùng nhóm, disable checkbox và hiển thị tên nhóm
            const names = existingGroups.map(g => g.name || '(nhóm)').join(', ');
            row.innerHTML = `<label style="display:flex; gap:8px; align-items:center"><input type="checkbox" id="${id}" value="${u}" disabled> <span>${u} <small style=\"color:#777; margin-left:8px\">(đã cùng nhóm: ${escapeHtml(names)})</small></span></label>`;
        } else {
            row.innerHTML = `<label style="display:flex; gap:8px; align-items:center"><input type="checkbox" id="${id}" value="${u}"> <span>${u}</span></label>`;
        }

        list.appendChild(row);
    });

    // wire select-all checkbox
    const selectAll = document.getElementById('selectAllGroupUsers');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.addEventListener('change', () => {
            const checkboxes = list.querySelectorAll('input[type=checkbox]');
            checkboxes.forEach(cb => {
                if (!cb.disabled) cb.checked = selectAll.checked;
            });
        });
    }

    modal.style.display = 'flex';

    const cancel = document.getElementById('cancelCreateGroup');
    const confirm = document.getElementById('confirmCreateGroup');

    // Kiểm tra nếu không có checkbox nào có thể chọn được (tất cả đều disabled)
    function updateSelectableState() {
        const selectable = list.querySelectorAll('input[type=checkbox]:not([disabled])');
        const noteId = 'noSelectableNote';
        const existingNote = document.getElementById(noteId);
        if (selectable.length === 0) {
            if (!existingNote) {
                const note = document.createElement('div');
                note.id = noteId;
                note.style.color = '#c0392b';
                note.style.fontSize = '13px';
                note.style.margin = '8px 0';
                note.textContent = 'Không có thành viên hợp lệ để tạo nhóm — tất cả đã cùng nhóm với bạn.';
                // chèn trước ô nhập tên nhóm
                if (nameInput && nameInput.parentNode) nameInput.parentNode.insertBefore(note, nameInput.nextSibling);
                else list.parentNode.insertBefore(note, list.nextSibling);
            }
            if (confirm) confirm.disabled = true;
        } else {
            if (existingNote) existingNote.remove();
            if (confirm) confirm.disabled = false;
        }
    }

    // Gắn listener để cập nhật trạng thái khi checkbox thay đổi
    Array.from(list.querySelectorAll('input[type=checkbox]')).forEach(cb => cb.addEventListener('change', updateSelectableState));
    // khởi tạo trạng thái
    updateSelectableState();

    function onClose() {
        modal.style.display = 'none';
        cancel.removeEventListener('click', onClose);
        confirm.removeEventListener('click', onConfirm);
    }

    function onConfirm() {
        const checked = Array.from(list.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
        if (checked.length < 1) return alert('Vui lòng chọn ít nhất 1 thành viên (hoặc chọn tất cả)');
        const groupName = nameInput.value.trim() || undefined;
        createGroup([currentUser, ...checked], groupName);
        onClose();
    }

    cancel.addEventListener('click', onClose);
    confirm.addEventListener('click', onConfirm);
}

// Utility
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Events
function attachEvents() {
    sendBtn.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    let typingTimeout = null;
    messageInput.addEventListener('input', () => {
        if (!currentChat || !currentChat.isGroup) return;

        const value = messageInput.value;
        const pos = messageInput.selectionStart;

        // Nếu gõ @
        if (value[pos - 1] === "@") {
            mentionStartIndex = pos - 1;
            showMentionList();
            return;
        }

        // nếu xóa tới trước vị trí @
        if (mentionStartIndex !== -1 && pos <= mentionStartIndex) {
            closeMention();
        }

        window.api.sendRaw({
            action: 'onchat',
            data: { event: 'TYPING', data: { to: currentChat.name } }
        });

        // nếu bạn muốn hiện “Đang nhập…” ở phía bạn luôn
        const typingStatus = document.getElementById("typingStatus");
        typingStatus.textContent = "Đang nhập...";
        typingStatus.style.display = "block";

        // reset timeout ẩn sau 3s không gõ
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            typingStatus.style.display = "none";
        }, 3000);
    });


    searchInput.addEventListener('input', (e) => {
        searchChats(e.target.value);
    });

    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPopup = document.getElementById('emojiPopup');

    const createGroupBtn = document.getElementById('createGroupBtn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            createGroupPrompt();
        });
    }

    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openChangeAvatarModal();
        });
    }

    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPopup.style.display =
            emojiPopup.style.display === 'none' ? 'block' : 'none';
    });

    emojiPopup.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            messageInput.value += e.target.textContent;
            messageInput.focus();
            emojiPopup.style.display = 'none';
        }
    });

    // Image send button and file input
    const imageBtn = document.getElementById('imageBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    if (imageBtn) {
        imageBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            if (!currentChat) return alert('Vui lòng mở cuộc trò chuyện');
            if (imageFileInput) imageFileInput.click();
        });
    }
    if (imageFileInput) {
        imageFileInput.addEventListener('change', (ev) => {
            const f = ev.target.files && ev.target.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function(e2) {
                const dataUrl = e2.target.result;
                // resize/process to reasonable size
                processImageToSquare(dataUrl, 800, (processed) => {
                    const imgData = processed || dataUrl;
                    if (!currentChat) return alert('Vui lòng mở cuộc trò chuyện');

                    const now = new Date();
                    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

                    // For group chats we send directly to the group (no confirmation)
                    // (Private-send-to-all can be added as a separate UI action if needed)

                    // send to current chat (group or individual)
                    const msg = {
                        id: Date.now(),
                        sender: 'you',
                        image: imgData,
                        text: '',
                        time: time,
                        status: 'sending'
                    };

                    currentChat.messages.push(msg);
                    currentChat.lastMessage = '[Ảnh]';
                    currentChat.timestamp = 'Bây giờ';
                    renderMessages(currentChat.messages);
                    renderConversations(allChats);

                    // fake API: send to room or person
                    if (fakeApiEnabled) {
                        if (currentChat.isGroup) fakeSendChatRoom(currentChat.name, imgData);
                        else fakeSendChatPeople(currentChat.name, imgData);
                    }

                    simulateSendResult(msg);

                    const cu = getCurrentUser();
                    if (cu) saveUserChats(cu, allChats);
                });
            };
            reader.readAsDataURL(f);
            // clear value so selecting same file again will trigger change
            ev.target.value = '';
        });
    }
    // Click ra ngoài thì đóng popup (giống Messenger)
    document.addEventListener('click', () => {
        emojiPopup.style.display = 'none';
    });
}

//hien thi ds member
function showMentionList() {
    if (!currentChat || !currentChat.members) return;

    mentionBox.innerHTML = "";
    const allItem = document.createElement("div");
    allItem.className = "mention-item";
    allItem.style.cssText = `
        padding:6px 10px;
        cursor:pointer;
    `;
    allItem.textContent = "mọi người (@all)";
    allItem.onclick = () => selectMention("all");
    mentionBox.appendChild(allItem);

    //ds member
    currentChat.members.forEach(m => {
        const item = document.createElement("div");
        item.className = "mention-item";
        item.style.cssText = `
            padding:6px 10px;
            cursor:pointer;
        `;
        item.textContent = m;
        item.onclick = () => selectMention(m);
        mentionBox.appendChild(item);
    });

    const rect = messageInput.getBoundingClientRect();
    mentionBox.style.left = rect.left + "px";
    mentionBox.style.top = (rect.top - 200) + "px";
    mentionBox.style.display = "block";
}

//chon menber sau khi nhan chon
function selectMention(name) {
    if (name === "all") {
        name = "mọi người";
    }
    const value = messageInput.value;
    messageInput.value =
        value.substring(0, mentionStartIndex) +
        "@" + name + " " +
        value.substring(messageInput.selectionStart);
    closeMention();
}

//dong menu popup
function closeMention() {
    mentionStartIndex = -1;
    mentionBox.style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    initPinnedScroll();
});
initPinnedMenu();

// Start
init();

const darkModeToggle = document.getElementById("darkModeToggle");

// load trạng thái đã lưu
if (localStorage.getItem("darkMode") === "on") {
    document.body.classList.add("dark");
}

darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
        localStorage.setItem("darkMode", "on");
    } else {
        localStorage.setItem("darkMode", "off");
    }
});

// ========================================
// VOICE RECORDING SYSTEM
// ========================================
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingStartTime = 0;
let currentAudioBlob = null;

const voiceRecordBtn = document.getElementById('voiceRecordBtn');
const recordingStatus = document.getElementById('recordingStatus');
const recordingTime = document.getElementById('recordingTime');
const cancelRecordBtn = document.getElementById('cancelRecordBtn');
const sendVoiceBtn = document.getElementById('sendVoiceBtn');
const messageInputArea = document.querySelector('.message-input-area');

// Initialize voice recording
function initVoiceRecording() {
    if (!voiceRecordBtn) return;

    voiceRecordBtn.addEventListener('click', startRecording);
    cancelRecordBtn.addEventListener('click', cancelRecording);
    sendVoiceBtn.addEventListener('click', sendVoiceMessage);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            currentAudioBlob = audioBlob;
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
        });
        
        // Start recording
        mediaRecorder.start();
        recordingStartTime = Date.now();
        
        // Show recording UI
        messageInputArea.style.display = 'none';
        recordingStatus.style.display = 'flex';
        
        // Start timer
        updateRecordingTime();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        console.log('Recording started');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Không thể truy cập microphone. Vui lòng cho phép truy cập trong cài đặt trình duyệt.');
    }
}

function updateRecordingTime() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    recordingTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    clearInterval(recordingTimer);
    audioChunks = [];
    currentAudioBlob = null;
    
    // Hide recording UI
    recordingStatus.style.display = 'none';
    messageInputArea.style.display = 'flex';
    
    console.log('Recording cancelled');
}

function sendVoiceMessage() {
    if (!currentChat || !currentAudioBlob) return;
    
    // Stop recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    clearInterval(recordingTimer);
    
    // Convert blob to base64 for storage
    const reader = new FileReader();
    reader.onloadend = function() {
        const base64Audio = reader.result;
        const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
        
        const now = new Date();
        
        // Create voice message
        const message = {
            id: Date.now(),
            sender: 'you',
            type: 'voice',
            audio: base64Audio,
            duration: duration,
            time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: now.toISOString().split("T")[0],
            fullTime: now.toISOString(),
            reactions: [],
            isGroup: currentChat.type === 'group'
        };
        
        currentChat.messages.push(message);
        
        // Update last message
        currentChat.lastMessage = '🎤 Tin nhắn thoại';
        currentChat.timestamp = Date.now();
        
        // Save and render
        saveUserChats(getCurrentUser(), allChats);
        renderMessages(currentChat.messages);
        renderConversations(allChats);
        
        // Reset UI
        recordingStatus.style.display = 'none';
        messageInputArea.style.display = 'flex';
        currentAudioBlob = null;
        
        console.log('Voice message sent');
    };
    
    reader.readAsDataURL(currentAudioBlob);
}

// Initialize voice recording on load
initVoiceRecording();

// ========================================
// VOICE MESSAGE UI
// ========================================
function createVoiceMessageElement(msg) {
    const voiceDiv = document.createElement('div');
    voiceDiv.className = 'voice-message';
    
    // Play button
    const playBtn = document.createElement('button');
    playBtn.className = 'voice-play-btn';
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
    
    // Waveform visualization
    const waveform = document.createElement('div');
    waveform.className = 'voice-waveform';
    
    // Create random bars for waveform effect
    const barCount = 20;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'voice-bar';
        const height = 10 + Math.random() * 30;
        bar.style.height = height + 'px';
        waveform.appendChild(bar);
    }
    
    // Duration
    const duration = document.createElement('span');
    duration.className = 'voice-duration';
    const mins = Math.floor(msg.duration / 60);
    const secs = msg.duration % 60;
    duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    // Hidden audio element
    const audio = document.createElement('audio');
    audio.className = 'hidden-audio';
    audio.src = msg.audio;
    audio.preload = 'metadata';
    
    // Play/Pause functionality
    let isPlaying = false;
    playBtn.addEventListener('click', () => {
        if (isPlaying) {
            audio.pause();
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            voiceDiv.classList.remove('playing');
            isPlaying = false;
        } else {
            audio.play();
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            voiceDiv.classList.add('playing');
            isPlaying = true;
        }
    });
    
    // Update duration while playing
    audio.addEventListener('timeupdate', () => {
        const currentTime = audio.currentTime;
        const mins = Math.floor(currentTime / 60);
        const secs = Math.floor(currentTime % 60);
        duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    });
    
    // Reset when ended
    audio.addEventListener('ended', () => {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        voiceDiv.classList.remove('playing');
        isPlaying = false;
        
        // Reset duration display
        const mins = Math.floor(msg.duration / 60);
        const secs = msg.duration % 60;
        duration.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    });
    
    voiceDiv.appendChild(playBtn);
    voiceDiv.appendChild(waveform);
    voiceDiv.appendChild(duration);
    voiceDiv.appendChild(audio);
    
    return voiceDiv;
}


// -----------------------------
// WebSocket & API helper
// -----------------------------
let ws = null;
let wsUrl = null;

function connectWs(url) {
    if (ws) ws.close();
    wsUrl = url;
    ws = new WebSocket(url);

    ws.addEventListener('open', () => {
        console.log('WebSocket connected to', url);
        document.getElementById('connectionStatus').textContent = 'Connected';
        document.getElementById('connectionStatus').className = 'connection-status online';
    });

    ws.addEventListener('message', (ev) => {
        let msg;
        try {
            msg = JSON.parse(ev.data);
        } catch {
            return;
        }

        if (msg.action !== 'onchat') return;

        const { event, data } = msg.data;

        switch (event) {
            case 'NEW_MESSAGE':
                handleIncomingMessage(data);
                break;

            case 'TYPING':
                handleTyping(data);
                break;

            case 'USER_ONLINE':
                updateUserStatus(data.user, true);
                break;

            case 'USER_OFFLINE':
                updateUserStatus(data.user, false);
                break;
        }
    });

    ws.addEventListener('close', (e) => {
        console.log('WebSocket closed', e);
        document.getElementById('connectionStatus').textContent = 'Disconnected';
        document.getElementById('connectionStatus').className = 'connection-status offline';

        const code = localStorage.getItem('reloginCode');
        if (code) {
            window.api.re_login('long', code);
        }
    });

    ws.addEventListener('error', (err) => {
        console.error('WebSocket error', err);
    });
}

function disconnectWs() {
    if (ws) {
        ws.close();
        ws = null;
        console.log('WebSocket disconnected');
    }
}

function _sendOnChat(eventName, payload) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not open. Call connectWs(url) first.');
        return;
    }
    const msg = { action: 'onchat', data: { event: eventName, data: payload } };
    ws.send(JSON.stringify(msg));
    console.log('Sent', msg);
}

// Convenience API wrappers based on the provided examples
const api = {
    connect: connectWs,
    disconnect: disconnectWs,
    register: (user, pass) => _sendOnChat('REGISTER', { user, pass }),
    login: (user, pass) => _sendOnChat('LOGIN', { user, pass }),
    re_login: (user, code) => _sendOnChat('RE_LOGIN', { user, code }),
    logout: () => _sendOnChat('LOGOUT', {}),
    createRoom: (name) => _sendOnChat('CREATE_ROOM', { name }),
    joinRoom: (name) => _sendOnChat('JOIN_ROOM', { name }),
    getRoomChatMes: (name, page = 1) => _sendOnChat('GET_ROOM_CHAT_MES', { name, page }),
    getPeopleChatMes: (name, page = 1) => _sendOnChat('GET_PEOPLE_CHAT_MES', { name, page }),
    sendChatRoom: (to, mes) => _sendOnChat('SEND_CHAT', { type: 'room', to, mes }),
    sendChatPeople: (to, mes) => _sendOnChat('SEND_CHAT', { type: 'people', to, mes }),
    checkUser: (user) => _sendOnChat('CHECK_USER', { user }),
    getUserList: () => _sendOnChat('GET_USER_LIST', {}),
    // send arbitrary payload (object) as an onchat action
    sendRaw: (obj) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not open. Call connectWs(url) first.');
            return;
        }
        ws.send(JSON.stringify(obj));
        console.log('Sent raw', obj);
    }
};

// expose to console for quick testing
window.api = api;
console.log('API helpers loaded. Use window.api.connect(url) to connect.');

// ========== VOICE/VIDEO CALL FEATURE ==========
let callTimer = null;
let callDuration = 0;
let currentCallType = null;

function initCallButtons() {
    const voiceCallBtn = document.getElementById('voiceCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    
    if (voiceCallBtn) {
        voiceCallBtn.addEventListener('click', () => startCall('voice'));
    }
    
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', () => startCall('video'));
    }
    
    const endCallBtn = document.getElementById('endCallBtn');
    if (endCallBtn) {
        endCallBtn.addEventListener('click', endCall);
    }
}

function startCall(type) {
    if (!currentChat) {
        alert('Vui lòng chọn một cuộc trò chuyện để gọi');
        return;
    }
    
    currentCallType = type;
    const callModal = document.getElementById('callModal');
    const callType = document.getElementById('callType');
    const callAvatar = document.getElementById('callAvatar');
    const callName = document.getElementById('callName');
    const callStatus = document.getElementById('callStatus');
    const callTimerEl = document.getElementById('callTimer');
    
    // Set call info
    callType.textContent = type === 'voice' ? 'Cuộc gọi thoại' : 'Cuộc gọi video';
    callAvatar.src = currentChat.avatar;
    callName.textContent = currentChat.name;
    callStatus.textContent = 'Đang gọi...';
    callStatus.style.display = 'block';
    callTimerEl.style.display = 'none';
    
    // Show modal
    callModal.style.display = 'flex';
    
    // Play ringtone sound (simulated)
    console.log('📞 Calling:', currentChat.name, 'Type:', type);
    
    // Fake API call
    if (fakeApiEnabled) {
        console.log('📤 FAKE API: START_CALL', { to: currentChat.name, type });
    }
    
    // Simulate answer after 2-3 seconds
    setTimeout(() => {
        answerCall();
    }, 2500);
}

function answerCall() {
    const callStatus = document.getElementById('callStatus');
    const callTimerEl = document.getElementById('callTimer');
    
    callStatus.textContent = 'Đã kết nối';
    callStatus.style.display = 'none';
    callTimerEl.style.display = 'block';
    
    console.log('📞 Call answered');
    
    // Reset and start timer
    callDuration = 0;
    callTimerEl.textContent = '00:00';
    
    // Clear any existing timer first
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    // Start new timer
    callTimer = setInterval(() => {
        callDuration++;
        const minutes = Math.floor(callDuration / 60);
        const seconds = callDuration % 60;
        callTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function endCall() {
    const callModal = document.getElementById('callModal');
    callModal.style.display = 'none';
    
    // Stop timer first
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    const finalDuration = callDuration;
    console.log('📞 Call ended. Duration:', finalDuration, 'seconds');
    
    // Fake API call
    if (fakeApiEnabled) {
        console.log('📤 FAKE API: END_CALL', { duration: finalDuration, type: currentCallType });
    }
    
    // Add system message to chat
    if (currentChat && finalDuration > 0) {
        const minutes = Math.floor(finalDuration / 60);
        const seconds = finalDuration % 60;
        const timeStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
        const now = new Date();
        
        const callMsg = {
            id: Date.now(),
            sender: 'system',
            text: `Cuộc gọi ${currentCallType === 'voice' ? 'thoại' : 'video'} - Thời gian: ${timeStr}`,
            time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: now.toLocaleDateString('vi-VN')
        };
        currentChat.messages.push(callMsg);
        
        // Update last message
        currentChat.lastMessage = `Cuộc gọi ${currentCallType === 'voice' ? 'thoại' : 'video'}`;
        currentChat.timestamp = 'Bây giờ';
        
        // Save and update UI
        const cu = getCurrentUser();
        if (cu) saveUserChats(cu, allChats);
        renderMessages(currentChat.messages);
        renderConversations(allChats);
    }
    // Reset
    callDuration = 0;
    currentCallType = null;
}

// Initialize call buttons when page loads
document.addEventListener('DOMContentLoaded', () => {
    initCallButtons();
});

// Also initialize in case DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCallButtons);
} else {
    initCallButtons();
}

// ===== REACTION FUNCTIONS =====
function showReactionPicker(parentElement, msg, messages) {
    // Xóa picker cũ nếu có
    const oldPicker = document.querySelector('.reaction-picker');
    if (oldPicker) oldPicker.remove();
    
    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    picker.style.cssText = `
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border: 1px solid #e5e5e5;
        border-radius: 24px;
        padding: 8px 12px;
        display: flex;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        margin-bottom: 8px;
    `;
    
    const reactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉'];
    
    reactions.forEach(emoji => {
        const emojiBtn = document.createElement('span');
        emojiBtn.textContent = emoji;
        emojiBtn.style.cssText = `
            font-size: 24px;
            cursor: pointer;
            padding: 4px;
            border-radius: 50%;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        emojiBtn.addEventListener('mouseenter', () => {
            emojiBtn.style.transform = 'scale(1.3)';
            emojiBtn.style.background = '#f0f0f0';
        });
        
        emojiBtn.addEventListener('mouseleave', () => {
            emojiBtn.style.transform = 'scale(1)';
            emojiBtn.style.background = 'transparent';
        });
        
        emojiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReaction(msg, emoji, messages);
            picker.remove();
        });
        
        picker.appendChild(emojiBtn);
    });
    
    parentElement.appendChild(picker);
    
    // Tự động đóng khi click ra ngoài
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

function toggleReaction(msg, emoji, messages) {
    const cu = getCurrentUser();
    if (!cu) return;
    
    // Khởi tạo reactions array nếu chưa có
    if (!msg.reactions) {
        msg.reactions = [];
    }
    
    // Kiểm tra xem user đã react emoji này chưa
    const existingIndex = msg.reactions.findIndex(r => r.user === cu && r.emoji === emoji);
    
    if (existingIndex > -1) {
        // Đã react rồi thì xóa
        msg.reactions.splice(existingIndex, 1);
    } else {
        // Chưa react thì thêm mới
        msg.reactions.push({
            user: cu,
            emoji: emoji,
            timestamp: new Date().toISOString()
        });
    }
    
    // Lưu lại và render lại
    saveUserChats(cu, allChats);
    renderMessages(messages);
    
    // Fake API call
    if (fakeApiEnabled) {
        console.log('📤 FAKE API: TOGGLE_REACTION', { 
            messageId: msg.id, 
            emoji, 
            action: existingIndex > -1 ? 'remove' : 'add' 
        });
    }
}

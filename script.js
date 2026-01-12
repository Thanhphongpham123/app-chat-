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
            { id: 1, sender: 'them', text: 'Chào bạn!', time: '10:00' }
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
            { id: 1, sender: 'them', text: 'Hẹn gặp lại!', time: '09:30' }
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
            { id: 1, sender: 'them', text: 'OK nhé!', time: '09:00' }
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
    // if not logged in, show auth overlay
    if (!currentUser) showAuthOverlay(true);
}

function initializeDefaultAccounts() {
    const users = loadUsers();
    const defaultAccounts = [
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
        console.log('Tài khoản mặc định đã được tạo: Long, Phong, Toản, Buu (mật khẩu: 123)');
    }
}

// -----------------------------
// Client-side Auth (localStorage)
// -----------------------------
const AUTH_USERS_KEY = 'appChat_users';
const AUTH_CURRENT_KEY = 'appChat_currentUser';
const AUTH_RELOGIN_CODE_KEY = 'appChat_reloginCode';
const CHATS_KEY_PREFIX = 'appChat_chats_';

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
                    <span class="conversation-menu-icon" style="display:none; cursor:pointer;">⋯</span>
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

        // tạo menu popup
        const menu = document.createElement('div');
        menu.className = 'conv-menu';
        menu.style.cssText = `
            display:none;
            position:absolute;
            right:10px;
            top:35px;
            background:white;
            border:1px solid #ddd;
            border-radius:6px;
            padding:6px 10px;
            cursor:pointer;
            z-index:10;
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

        // click icon mở menu
        menuIcon.addEventListener('click', (e) => {
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

        div.addEventListener('click', () => openChat(chat));
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
        randomChat.unread = (randomChat.unread || 0) + 1;
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
function openChangeAvatarModal() {
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
            left.appendChild(avatar);
            left.appendChild(label);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'members-remove';
            removeBtn.textContent = 'Xóa';
            // prevent removing yourself
            if (name === cu) {
                removeBtn.disabled = true;
                removeBtn.title = 'Không thể xóa chính bạn';
            }
            removeBtn.addEventListener('click', () => {
                onRemoveMember(name);
            });

            row.appendChild(left);
            row.appendChild(removeBtn);
            membersList.appendChild(row);
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
        if (!isGroup) return alert('Chỉ nhóm mới có thể xóa thành viên');
        const cu = getCurrentUser();
        if (name === cu) return alert('Bạn không thể xóa chính mình khỏi nhóm');
        if (!confirm(`Xóa thành viên "${name}" khỏi nhóm?`)) return;
        if ((currentChat.members || []).length <= 2) return alert('Nhóm phải có ít nhất 2 thành viên');
        currentChat.members = (currentChat.members || []).filter(n => n !== name);
<<<<<<< HEAD
=======
        
        // Cập nhật tên nhóm nếu tên nhóm được tạo tự động
        const otherMembers = currentChat.members.filter(m => m !== cu);
        if (currentChat.name.startsWith('Nhóm: ')) {
            currentChat.name = `Nhóm: ${otherMembers.join(', ')}`;
        }

        // tin nhan he thong theo dk
        if (name === cu) {
            // tự rời nhóm
            addSystemMessage(currentChat, `${name} đã rời nhóm`);
        } else {
            // bị người khác xóa
            addSystemMessage(currentChat, `${cu} đã xóa ${name} khỏi nhóm`);
        }
        
        // Cập nhật lastMessage để thông báo
        currentChat.lastMessage = `${name} đã bị xóa khỏi nhóm`;
        currentChat.timestamp = Date.now();

>>>>>>> 1b0eefb (hien thi tin nhan he thong)
        // persist
        const user = getCurrentUser();
        if (user) saveUserChats(user, allChats);
        renderMembersPanel();
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
    selectTab('avatar');

    const closeBtn = document.getElementById('closeInfoPanel');
    const confirm = document.getElementById('confirmChangeAvatar');

    let avatarProcessTimer = null;

    function close() {
        try {
            panel.style.display = 'none';
            if (closeBtn) closeBtn.removeEventListener('click', onCancel);
            if (confirm) confirm.removeEventListener('click', onConfirm);
            if (input) input.removeEventListener('input', onInput);
            if (fileInput) fileInput.removeEventListener('change', onFile);
            if (addImageBtn) addImageBtn.removeEventListener('click', onAddImage);
            if (updateAvatarBtn) updateAvatarBtn.removeEventListener('click', onConfirm);
            if (avatarProcessTimer) { clearTimeout(avatarProcessTimer); avatarProcessTimer = null; }
            if (addMemberBtn) addMemberBtn.removeEventListener('click', onAddMember);
            if (addMemberInput) addMemberInput.removeEventListener('keypress', onAddMemberKeypress);
            if (tabAvatar) tabAvatar.removeEventListener('click', onClickTabAvatar);
            if (tabMembers) tabMembers.removeEventListener('click', onClickTabMembers);
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
    if (confirm) confirm.addEventListener('click', onConfirm);
    input.addEventListener('input', onInput);
    if (fileInput) fileInput.addEventListener('change', onFile);

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
<<<<<<< HEAD
=======

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
>>>>>>> 1b0eefb (hien thi tin nhan he thong)
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
<<<<<<< HEAD
=======
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

>>>>>>> c663155 (nhom tin nhan theo ngay)
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
<<<<<<< HEAD
<<<<<<< HEAD
            bubble.textContent = msg.text;
=======
=======

            // reply
            if (msg.replyTo) {
                const replyPreview = document.createElement('div');
                replyPreview.className = 'reply-preview';

                const replySender = document.createElement('div');
                replySender.style.fontWeight = '600';
                replySender.style.fontSize = '12px';
                replySender.textContent =
                    msg.replyTo.senderName || 'Bạn';

                const replyText = document.createElement('div');
                replyText.style.whiteSpace = 'nowrap';
                replyText.style.overflow = 'hidden';
                replyText.style.textOverflow = 'ellipsis';
                replyText.textContent = msg.replyTo.text || '[Hình ảnh]';

                replyPreview.appendChild(replySender);
                replyPreview.appendChild(replyText);
                bubble.appendChild(replyPreview);
            }

>>>>>>> 778eeff (chuc nang reply rieng 1 tin nhan)
            // support image messages
            if (msg.image) {
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
>>>>>>> f76e29c (tag group trong gui tin nhan group)

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
                navigator.clipboard.writeText(msg.text);
                menu.style.display = 'none';
            });
            menu.querySelector('.recall-msg').addEventListener('click', () => {
                // Thu hồi: xóa tin nhắn và thông báo "Tin nhắn đã thu hồi"
                msg.text = 'Tin nhắn đã thu hồi';
                renderMessages(messages);
            });
            menu.querySelector('.delete-msg').addEventListener('click', () => {
                const index = messages.indexOf(msg);
                if (index > -1) messages.splice(index, 1);
                renderMessages(messages);
            });

<<<<<<< HEAD
=======
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

<<<<<<< HEAD
=======
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

>>>>>>> 778eeff (chuc nang reply rieng 1 tin nhan)
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

>>>>>>> 6b836a9 (them ghim tin nhan)
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
        row.innerHTML = `<label style="display:flex; gap:8px; align-items:center"><input type="checkbox" id="${id}" value="${u}"> <span>${u}</span></label>`;
        list.appendChild(row);
    });

    // wire select-all checkbox
    const selectAll = document.getElementById('selectAllGroupUsers');
    if (selectAll) {
        selectAll.checked = false;
        selectAll.addEventListener('change', () => {
            const checkboxes = list.querySelectorAll('input[type=checkbox]');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
        });
    }

    modal.style.display = 'flex';

    const cancel = document.getElementById('cancelCreateGroup');
    const confirm = document.getElementById('confirmCreateGroup');

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

<<<<<<< HEAD
// Click ra ngoài thì đóng popup (giống Messenger)
=======
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
>>>>>>> f76e29c (tag group trong gui tin nhan group)
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
<<<<<<< HEAD
=======

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
>>>>>>> 6b836a9 (them ghim tin nhan)

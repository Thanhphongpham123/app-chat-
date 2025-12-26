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

// Initialize
function init() {
    // Tạo sẵn các tài khoản mặc định nếu chưa có
    initializeDefaultAccounts();
    
    const currentUser = getCurrentUser();
    if (currentUser) {
        allChats = loadUserChats(currentUser);
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
const CHATS_KEY_PREFIX = 'appChat_chats_';

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
    return { ok: true };
}

function loginAccount(user, pass) {
    const users = loadUsers();
    const u = users.find(x => x.user === user && x.pass === hashPw(pass));
    if (!u) return { ok: false, error: 'Sai tài khoản hoặc mật khẩu' };
    localStorage.setItem(AUTH_CURRENT_KEY, user);
    
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
    
    localStorage.removeItem(AUTH_CURRENT_KEY);
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


// Render conversations list
function renderConversations(chats) {
    conversationsList.innerHTML = '';
    
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = `conversation ${currentChat?.id === chat.id ? 'active' : ''}`;
        div.innerHTML = `
            <img src="${chat.avatar}" alt="" class="conversation-avatar">
            <div class="conversation-info">
                <div class="conversation-header">
                    <span class="conversation-name">${chat.name}</span>
                    <span class="conversation-time">${chat.timestamp}</span>
                </div>
                <div class="conversation-message ${chat.unread > 0 ? 'unread' : ''}">
                    ${chat.lastMessage}
                </div>
            </div>
            ${chat.online ? '<div class="online-badge"></div>' : ''}
        `;
        
        div.addEventListener('click', () => openChat(chat));
        conversationsList.appendChild(div);
    });
}

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
    
    // Render messages
    renderMessages(chat.messages);
    renderConversations(allChats);
    
    messageInput.focus();

    typingStatus.style.display = 'none';
    clearTimeout(typingTimer);

    // info button always visible; panel will show group-specific controls
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) infoBtn.style.display = 'inline-flex';
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
    input.value = (currentChat && currentChat.avatar) || '';
    preview.src = (currentChat && currentChat.avatar) || '';
    if (fileInput) fileInput.value = '';
    if (membersList) {
        membersList.innerHTML = '';
        if (isGroup) {
            (currentChat.members || []).forEach(m => {
                const d = document.createElement('div');
                d.textContent = m;
                membersList.appendChild(d);
            });
        } else {
            membersList.textContent = 'Thông tin chỉ khả dụng cho cuộc trò chuyện nhóm.';
        }
    }
    panel.style.display = 'block';

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
        if (idx === 0 || messages[idx - 1].sender !== msg.sender) {
            groups.push([msg]);
        } else {
            groups[groups.length - 1].push(msg);
        }
    });
    
    groups.forEach(group => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message-group ${group[0].sender === 'you' ? 'sent' : 'received'}`;
        
        group.forEach(msg => {
            const bubbleWrapper = document.createElement('div');
            bubbleWrapper.className = 'message-bubble-wrapper';
            bubbleWrapper.style.position = 'relative';

            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.textContent = msg.text;

            // icon mneu 3 chấm
            const icon = document.createElement('div');
            icon.className = 'message-actions-icon';
            icon.textContent = '⋯';
            bubbleWrapper.appendChild(icon);

            // menu
            const menu = document.createElement('div');
            menu.className = 'message-actions-menu';
            menu.innerHTML = `
                <div class="copy-msg">Copy</div>
                <div class="recall-msg">Thu hồi</div>
                <div class="delete-msg">Xóa</div>
            `;
            bubbleWrapper.appendChild(menu);

            // click icon hiện menu
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });

            // click ra ngoài đóng menu
            document.addEventListener('click', () => {
                menu.style.display = 'none';
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

            bubbleWrapper.addEventListener('mouseenter', () => {
                icon.style.display = 'block'; // hiện icon
                if (icon.hideTimeout) clearTimeout(icon.hideTimeout);
                icon.hideTimeout = setTimeout(() => {
                    icon.style.display = 'none'; // 2 giây sau ẩn
                }, 800);
            });

            bubbleWrapper.appendChild(bubble);
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

    chat.messages.push(msg);
    chat.lastMessage = msg.text;
    chat.timestamp = 'Bây giờ';

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

let typingTimer;
const typingStatus = document.getElementById('typingStatus');


function handleTyping(data) {
    if (!currentChat || data.from !== currentChat.name) return;

    typingStatus.style.display = 'inline';

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        typingStatus.style.display = 'none';
    }, 1500);
}

function updateUserStatus(username, online) {
    const chat = allChats.find(c => c.name === username);
    if (!chat) return;

    chat.online = online;

    if (currentChat && currentChat.name === username) {
        chatStatus.textContent = online ? 'Đang hoạt động' : 'Không hoạt động';
        chatStatus.className = `status ${online ? 'online' : ''}`;
    }

    renderConversations(allChats);
}


// Send message
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChat) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const msg = {
        id: Date.now(),
        sender: 'you',
        text: text,
        time: time,
        status: 'sending' // trạng thái mới
    };
    
    currentChat.messages.push(msg);

    currentChat.lastMessage = text;
    currentChat.timestamp = 'Bây giờ';

    renderMessages(currentChat.messages);
    renderConversations(allChats);

    messageInput.value = '';

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
        renderMessages(currentChat.messages);
        
        // Lưu lại sau khi nhận reply
        const currentUser = getCurrentUser();
        if (currentUser) {
            saveUserChats(currentUser, allChats);
        }
    }, 800);
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

    const newChat = {
        id: Date.now(),
        name: groupName || `Nhóm: ${uniqueMembers.filter(m => m !== currentUser).join(', ')}`,
        avatar: 'https://i.pravatar.cc/150?img=20',
        lastMessage: 'Nhóm mới',
        timestamp: 'Mới',
        online: false,
        unread: 0,
        isGroup: true,
        members: uniqueMembers,
        messages: []
    };

    // add to top of chats and save
    allChats.unshift(newChat);
    saveUserChats(currentUser, allChats);
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

    messageInput.addEventListener('input', () => {
        if (!currentChat) return;

        window.api.sendRaw({
            action: 'onchat',
            data: { event: 'TYPING', data: { to: currentChat.name } }
        });
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

// Click ra ngoài thì đóng popup (giống Messenger)
    document.addEventListener('click', () => {
        emojiPopup.style.display = 'none';
    });

}

// Start
init();

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

// Mock data
const mockData = [
    {
        id: 1,
        name: 'Nguyễn Văn A',
        avatar: 'https://i.pravatar.cc/150?img=1',
        lastMessage: 'Bạn khỏe không?',
        timestamp: '2 phút trước',
        online: true,
        unread: 2,
        messages: [
            { id: 1, sender: 'them', text: 'Chào bạn!', time: '10:00' },
            { id: 2, sender: 'you', text: 'Chào! Bạn khỏe không?', time: '10:05' },
            { id: 3, sender: 'them', text: 'Khỏe, bạn thì sao?', time: '10:06' },
            { id: 4, sender: 'you', text: 'Mình cũng tốt', time: '10:07' },
            { id: 5, sender: 'them', text: 'Bạn khỏe không?', time: '10:10' }
        ]
    },
    {
        id: 2,
        name: 'Trần Thị B',
        avatar: 'https://i.pravatar.cc/150?img=2',
        lastMessage: 'OK, hẹn gặp!',
        timestamp: '15 phút trước',
        online: false,
        unread: 0,
        messages: [
            { id: 1, sender: 'them', text: 'Bạn có rảnh không?', time: '09:30' },
            { id: 2, sender: 'you', text: 'Có chút rảnh, sao?', time: '09:35' },
            { id: 3, sender: 'them', text: 'OK, hẹn gặp!', time: '09:40' }
        ]
    },
    {
        id: 3,
        name: 'Lê Văn C',
        avatar: 'https://i.pravatar.cc/150?img=3',
        lastMessage: 'Talk to you later',
        timestamp: '1 giờ trước',
        online: true,
        unread: 0,
        messages: [
            { id: 1, sender: 'them', text: 'Bạn làm gì vậy?', time: '08:00' },
            { id: 2, sender: 'you', text: 'Đang làm việc', time: '08:05' },
            { id: 3, sender: 'them', text: 'Talk to you later', time: '08:10' }
        ]
    },
    {
        id: 4,
        name: 'Phạm Thị D',
        avatar: 'https://i.pravatar.cc/150?img=4',
        lastMessage: 'Cảm ơn bạn!',
        timestamp: '3 giờ trước',
        online: false,
        unread: 0,
        messages: [
            { id: 1, sender: 'you', text: 'Bạn giúp mình được không?', time: '07:00' },
            { id: 2, sender: 'them', text: 'Được, giúp cái gì?', time: '07:15' },
            { id: 3, sender: 'you', text: 'Cảm ơn bạn!', time: '07:20' }
        ]
    },
    {
        id: 5,
        name: 'Đỗ Văn E',
        avatar: 'https://i.pravatar.cc/150?img=5',
        lastMessage: 'Hẹn ngày mai',
        timestamp: 'Hôm qua',
        online: true,
        unread: 0,
        messages: [
            { id: 1, sender: 'them', text: 'Bạn có thể gặp mình không?', time: '06:00' },
            { id: 2, sender: 'you', text: 'Tối nay được không?', time: '06:05' },
            { id: 3, sender: 'them', text: 'Hẹn ngày mai', time: '06:10' }
        ]
    }
];

let currentChat = null;
let allChats = JSON.parse(JSON.stringify(mockData));

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
    renderConversations(allChats);
    attachEvents();
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
        
        let html = '';
        group.forEach(msg => {
            html += `<div class="message-bubble">${escapeHtml(msg.text)}</div>`;
        });
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = group[group.length - 1].time;
        
        msgDiv.innerHTML = html;
        msgDiv.appendChild(timeDiv);
        
        messagesContainer.appendChild(msgDiv);
    });
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        time: time
    };
    
    currentChat.messages.push(msg);
    currentChat.lastMessage = text;
    currentChat.timestamp = 'Bây giờ';
    
    renderMessages(currentChat.messages);
    renderConversations(allChats);
    messageInput.value = '';
    
    // Auto reply
    setTimeout(() => {
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
    }, 800);
}

// Search
function searchChats(query) {
    const filtered = allChats.filter(chat => 
        chat.name.toLowerCase().includes(query.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(query.toLowerCase())
    );
    renderConversations(filtered);
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
    
    searchInput.addEventListener('input', (e) => {
        searchChats(e.target.value);
    });
}

// Start
init();

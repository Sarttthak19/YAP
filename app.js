// 1. Initialize Firebase 
// REPLACE THIS BLOCK WITH YOUR OWN CONFIG FROM THE FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyD-yGeApyjyiwzhpVSIDJWT7Z6CjW8-ECk",
  authDomain: "yapit-ad60e.firebaseapp.com",
  projectId: "yapit-ad60e",
  storageBucket: "yapit-ad60e.firebasestorage.app",
  messagingSenderId: "828057622069",
  appId: "1:828057622069:web:b0e3b2d78ffcfc52d7c37c",
  measurementId: "G-2F35NMS5VW"
};


firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username');
const roomCodeInput = document.getElementById('room-code');
const displayRoom = document.getElementById('display-room');
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');

let currentUsername = "";
let currentRoom = "";
let roomRef = null;

// Premium Avatar Colors
const avatarGradients = [
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
];

function getAvatarColor(username) {
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
    return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

// Security: Prevent HTML injection
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

// Theme Toggle
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    themeBtn.innerText = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
});

// Emoji Picker Setup
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

emojiBtn.addEventListener('click', () => emojiPicker.classList.toggle('active'));
document.querySelectorAll('.emoji').forEach(emojiEl => {
    emojiEl.addEventListener('click', (e) => {
        messageInput.value += e.target.innerText;
        emojiPicker.classList.remove('active'); 
        messageInput.focus(); 
    });
});
document.addEventListener('click', (e) => {
    if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
        emojiPicker.classList.remove('active');
    }
});

// Init Chat & Listeners
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initChat(room) {
    currentUsername = usernameInput.value.trim() || "Anonymous";
    currentRoom = room;
    
    setupScreen.classList.remove('active');
    chatScreen.classList.add('active');
    displayRoom.innerText = currentRoom;

    roomRef = db.ref(`yap-rooms/${currentRoom}/messages`);

    roomRef.push({
        type: 'system', text: `${currentUsername} slid into the room.`, timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    // --- NEW: Listen for Both New Messages AND Changes (Reactions) ---
    roomRef.on('child_added', (snapshot) => {
        displayMessage(snapshot.key, snapshot.val());
    });

    roomRef.on('child_changed', (snapshot) => {
        displayMessage(snapshot.key, snapshot.val()); // Re-renders the specific message block
    });
}

document.getElementById('create-btn').addEventListener('click', () => initChat(generateRoomCode()));
document.getElementById('join-btn').addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (code) initChat(code); else alert("Please enter a valid room code.");
});

document.getElementById('send-btn').addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

function sendMessage() {
    const text = messageInput.value.trim();
    if (text && roomRef) {
        roomRef.push({
            type: 'chat', user: currentUsername, text: text, timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        messageInput.value = ''; 
    }
}

// Global Reaction Function (Triggered by the inline HTML buttons)
window.addReaction = function(messageId, emoji) {
    if (!roomRef) return;
    // Firebase keys cannot contain certain symbols, so we clean the username for the database path
    const safeUser = currentUsername.replace(/[.#$\[\]]/g, ""); 
    db.ref(`yap-rooms/${currentRoom}/messages/${messageId}/reactions/${safeUser}`).set(emoji);
};

// --- UPDATED DISPLAY FUNCTION ---
function displayMessage(messageId, data) {
    // Check if the message already exists in the DOM
    let msgWrapper = document.getElementById(`msg-${messageId}`);
    let isNew = false;

    if (!msgWrapper) {
        isNew = true;
        msgWrapper = document.createElement('div');
        msgWrapper.id = `msg-${messageId}`;
    }

    const timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    if (data.type === 'system') {
        msgWrapper.innerHTML = `<div class="system-msg">${escapeHTML(data.text)}</div>`;
    } else {
        const isSelf = data.user === currentUsername;
        msgWrapper.className = `msg-wrapper ${isSelf ? 'self' : ''}`;
        
        const initial = data.user.charAt(0).toUpperCase();
        const avatarBg = getAvatarColor(data.user);
        const avatarHTML = `<div class="avatar" style="background: ${avatarBg};">${initial}</div>`;

        // Calculate Reaction Counts
        let reactionsHTML = '';
        if (data.reactions) {
            const counts = {};
            for (let user in data.reactions) {
                let emoji = data.reactions[user];
                counts[emoji] = (counts[emoji] || 0) + 1;
            }
            for (let emoji in counts) {
                reactionsHTML += `<span class="reaction-pill">${emoji} ${counts[emoji]}</span>`;
            }
        }

        // The hidden quick-reaction menu that shows on hover
        const reactionMenuHTML = `
            <div class="reaction-menu">
                <span class="reaction-option" onclick="addReaction('${messageId}', '❤️')">❤️</span>
                <span class="reaction-option" onclick="addReaction('${messageId}', '😂')">😂</span>
                <span class="reaction-option" onclick="addReaction('${messageId}', '😮')">😮</span>
                <span class="reaction-option" onclick="addReaction('${messageId}', '😢')">😢</span>
                <span class="reaction-option" onclick="addReaction('${messageId}', '🔥')">🔥</span>
            </div>
        `;

        msgWrapper.innerHTML = `
            ${!isSelf ? avatarHTML : ''}
            <div class="message ${isSelf ? 'msg-self' : 'msg-other'}">
                ${reactionMenuHTML}
                <span class="sender">${isSelf ? 'You' : escapeHTML(data.user)} <span class="timestamp">${timeString}</span></span>
                ${escapeHTML(data.text)}
                ${reactionsHTML ? `<div class="reactions-display">${reactionsHTML}</div>` : ''}
            </div>
            ${isSelf ? avatarHTML : ''}
        `;
    }
    
    if (isNew) {
        chatBox.appendChild(msgWrapper);
        chatBox.scrollTop = chatBox.scrollHeight; 
    }
}

// Invite & Leave
document.getElementById('invite-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(`Hey! Join my Yap chat. Room Code: ${currentRoom}`).then(() => {
        const btn = document.getElementById('invite-btn');
        const originalText = btn.innerText;
        btn.innerText = "✅ Copied!";
        setTimeout(() => { btn.innerText = originalText; }, 2000);
    });
});

document.getElementById('leave-btn').addEventListener('click', () => {
    if (roomRef) {
        roomRef.push({ type: 'system', text: `${currentUsername} bounced.`, timestamp: firebase.database.ServerValue.TIMESTAMP });
        roomRef.off(); 
    }
    chatScreen.classList.remove('active'); setupScreen.classList.add('active');
    chatBox.innerHTML = ''; currentRoom = ""; roomCodeInput.value = '';
});
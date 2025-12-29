# app-chat-

This chat demo supports client-side accounts without SQL. Accounts are stored in the browser's `localStorage` for quick testing.

How to use:
- Open `index.html` in a browser.
- Create an account via the "Đăng ký" tab.
- Log in via the "Đăng nhập" tab.

Member management (Groups):
- Create a group via the "Tạo nhóm" button or from existing chats.
- Click the "i" (info) button in the chat header to open the info panel.
- In the "Thành viên" section: add a member by typing a registered username and clicking "Thêm".
- Remove a member using the "Xóa" button next to their name. You cannot remove yourself, and groups must keep at least 2 members.

Notes:
- This is only for demo/testing. Passwords are stored in a basic encoded form and are not secure.
- To integrate with a server, replace the auth flows in `script.js` with real API calls.
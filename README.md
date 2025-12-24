# app-chat-

This chat demo supports client-side accounts without SQL. Accounts are stored in the browser's `localStorage` for quick testing.

How to use:
- Open `index.html` in a browser.
- Create an account via the "Đăng ký" tab.
- Log in via the "Đăng nhập" tab.

Notes:
- This is only for demo/testing. Passwords are stored in a basic encoded form and are not secure.
- To integrate with a server, replace the auth flows in `script.js` with real API calls.
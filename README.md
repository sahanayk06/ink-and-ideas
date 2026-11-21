# ✍️ Ink & Ideas – A Full-Stack Blogging Platform

**Share your thoughts. Express your creativity. Connect through stories.**

Ink & Ideas is a full-stack blogging application where users can create, publish, explore, and interact with stories. It provides a platform for sharing ideas, expressing creativity, and connecting with other writers through comments, reactions, and user profiles.

## 🌟 Project Overview

Ink & Ideas is designed to provide users with an interactive blogging experience. Users can create personal accounts, publish blog posts, interact with other users' content, manage their profiles, and save their favourite stories.

The application uses React for the frontend, Node.js and Express.js for backend services, and MongoDB for database management.

## 🚀 Key Features

- **User Authentication:** Secure registration and login using JWT authentication.
- **Create Blog Posts:** Write and publish personal stories and articles.
- **Edit and Delete Posts:** Manage your own published content.
- **Comments:** Interact with posts through comments.
- **Likes and Dislikes:** Express reactions to published content.
- **User Profiles:** View and manage personal profile information.
- **Profile Picture Upload:** Upload and maintain profile pictures.
- **Bookmarks:** Save interesting posts for later.
- **Notifications:** Stay informed about interactions.
- **Stories and Categories:** Explore and organize different types of content.

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| Vite | Frontend development and build tool |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB | Database |
| Mongoose | Database modelling |
| JavaScript | Application programming |
| CSS | User interface styling |
| JWT | User authentication |
| bcryptjs | Password hashing |
| Multer | File uploads |

## 🏗️ System Architecture

The application follows a client-server architecture.

1. The user interacts with the React frontend.
2. The frontend sends HTTP requests to the Express backend.
3. The backend processes requests and performs authentication and validation.
4. Mongoose communicates with MongoDB to store and retrieve information.
5. The backend sends responses to the frontend.
6. React updates the user interface based on the response.

## 📂 Project Structure

```text
ink-and-ideas/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── App.css
│   └── package.json
│
├── server/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── .gitignore
└── README.md
```

## ⚙️ Installation and Setup

### Prerequisites

- Node.js and npm
- MongoDB database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/sahanayk06/ink-and-ideas.git
cd ink-and-ideas
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the server directory and configure your MongoDB connection and authentication secret.

Never upload your `.env` file or database credentials to GitHub.

### 4. Start the backend

Run the start command defined in `server/package.json`.

### 5. Install frontend dependencies

Open another Terminal window:

```bash
cd ink-and-ideas/client
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## 🔐 Security

- JWT-based authentication.
- Password hashing using bcryptjs.
- Protected user operations.
- Environment variables for sensitive configuration.

## 🎯 Project Objective

The main objective of Ink & Ideas is to develop a user-friendly blogging platform that encourages creativity, knowledge sharing, and interaction among users while demonstrating full-stack web development skills.

## 🔮 Future Enhancements

- Deploy the application for public access.
- Improve search and content discovery.
- Add advanced analytics for blog authors.
- Improve responsive design and accessibility.
- Introduce additional content moderation features.

## 👩‍💻 Developed By

**Sahana Y K**

Full-Stack Web Development Project

**GitHub Repository:**  
https://github.com/sahanayk06/ink-and-ideas

---

*Ink & Ideas – Every thought deserves a story.*
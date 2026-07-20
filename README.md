# ✅ Task Manager API with AI

A secure task-management REST API built with **Express, TypeScript, MongoDB, and AI agents**.

Create and organize tasks through regular API endpoints—or describe what you need in natural language and let the AI agent create, find, update, or summarize your tasks. Because sometimes writing a prompt is easier than filling out another form.

---

## 🌐 Live API

- **API:** [task-manager-api-with-ai.onrender.com](https://task-manager-api-with-ai.onrender.com)
- **Swagger UI:** [Interactive API documentation](https://task-manager-api-with-ai.onrender.com/docs)
- **OpenAPI JSON:** [View specification](https://task-manager-api-with-ai.onrender.com/docs/openapi.json)

> The free Render instance may need a short moment to wake up after being inactive.

---

## 📖 Project Overview

Task Manager API provides authenticated users with a private workspace for managing tasks, priorities, deadlines, completion status, and attachments. It also includes a task-focused AI agent that understands natural-language requests while keeping every operation limited to the signed-in user's own data.

---

## ✨ Features

### 🤖 AI Task Assistant

- Create tasks from natural-language instructions
- Find tasks by ID, title, or description
- Update titles, descriptions, statuses, priorities, deadlines, and attachments
- List and summarize tasks by status, priority, text, or due date
- Understand relative dates such as “tomorrow” or “in two hours”
- Reply in the same language as the user
- Reject unrelated prompts through a task-only guardrail
- Run with **Ollama**, **Anthropic**, or **OpenRouter**

Example prompts:

```text
Create a high-priority task to finish the API docs tomorrow.
Mark my API documentation task as done.
Show my overdue high-priority tasks.
Summarize my unfinished tasks.
```

### 📋 Task Management

- Full task CRUD with user-level data ownership
- Statuses: `todo`, `in-progress`, and `done`
- Priorities: `low`, `medium`, and `high`
- Due dates and automatic completion timestamps
- Search, status/priority filters, and due-date ranges
- Pagination and sorting
- Statistics for status, priority, and overdue tasks

### 🔐 Authentication & Security

- Register, login, logout, current-user, and token-refresh endpoints
- Short-lived JWT access tokens
- Rotating refresh tokens stored in HTTP-only cookies
- Password hashing with bcrypt
- Role-based authorization for admin routes
- Zod request validation and centralized error handling
- User isolation: users can access only their own tasks

### 📎 Attachments & Documentation

- Optional task attachments stored on Cloudinary
- Supports JPG, PNG, WEBP, PDF, and TXT files up to 5 MB
- Replace or remove an existing attachment
- Interactive Swagger UI and OpenAPI 3.1 specification

---

## 🛣️ API Endpoints

All task and AI routes require `Authorization: Bearer <access-token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account and receive tokens |
| `POST` | `/auth/login` | Sign in and receive tokens |
| `POST` | `/auth/refresh` | Rotate the refresh token and get a new access token |
| `POST` | `/auth/logout` | Clear the refresh-token cookie |
| `GET` | `/auth/me` | Get the current user |
| `POST` | `/tasks` | Create a task, optionally with an attachment |
| `GET` | `/tasks` | List, filter, search, sort, and paginate owned tasks |
| `GET` | `/tasks/summary` | Get task statistics |
| `GET` | `/tasks/:id` | Get one owned task |
| `PATCH` | `/tasks/:id` | Update a task or replace its attachment |
| `DELETE` | `/tasks/:id` | Delete a task |
| `DELETE` | `/tasks/:id/attachment` | Remove a task attachment |
| `GET` | `/tasks/admin/all` | List every user's tasks (admin only) |
| `POST` | `/ai/tasks/chat` | Manage tasks through the AI assistant |

Useful task queries:

```text
GET /tasks?status=todo&priority=high
GET /tasks?search=typescript
GET /tasks?dueBefore=2026-08-01T00:00:00.000Z&sortBy=dueDate&order=asc
GET /tasks?page=2&limit=5
```

Supported sort fields are `createdAt`, `updatedAt`, `dueDate`, `title`, and `status`.

---

## 🛠️ Technologies Used

- Node.js and Express 5
- TypeScript
- MongoDB and Mongoose
- OpenAI Agents SDK
- Ollama, Anthropic, or OpenRouter
- Zod
- JWT and bcrypt
- Multer and Cloudinary
- Swagger / OpenAPI

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22.6+ (Node.js 24 recommended)
- MongoDB locally or a MongoDB Atlas connection
- One supported AI provider
- A Cloudinary account only if attachment uploads are needed

### Installation

```bash
git clone https://github.com/hashemi1997ali/task-manager-api-with-ai.git
cd task-manager-api-with-ai
npm install
```

Copy `.env.example` to `.env`, then configure the required values:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/task-manager-api

ACCESS_JWT_SECRET=replace_with_a_long_random_access_secret
REFRESH_JWT_SECRET=replace_with_a_long_random_refresh_secret

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:8b
```

For a hosted AI provider, set `AI_PROVIDER` to `anthropic` or `openrouter` and provide the matching API key and model:

```env
ANTHROPIC_API_KEY=your_key
ANTHROPIC_MODEL=your_model

OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=your_model
```

Cloudinary is optional. Without its three credentials, the API still works but attachment uploads return `503`.

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Run the Project

```bash
npm run dev
```

The API runs at `http://localhost:3000` and Swagger UI is available at `http://localhost:3000/docs`.

For a production build:

```bash
npm run build
npm start
```

---

## 🔑 Quick Usage

Register or log in, copy `data.accessToken` from the response, then send it with protected requests:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Create a task with JSON:

```json
{
  "title": "Finish API documentation",
  "description": "Review the Swagger examples",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-08-01T12:00:00+02:00"
}
```

Or ask the AI assistant:

```json
{
  "prompt": "Create a high-priority task to review the Swagger docs tomorrow"
}
```

To upload a file, use `multipart/form-data`; the file field is named `attachment`. The AI endpoint accepts the prompt in a `prompt` field and uses attachments only while creating or updating a task.

---

## 👑 Admin Access

New accounts receive the `user` role. For development or practice, add the `admin` role directly in MongoDB:

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $addToSet: { roles: "admin" } }
)
```

---

## 📌 Notes

This is a backend API, so Swagger UI is the easiest way to explore and test it in a browser. AI responses depend on the selected provider and model, while all database operations remain scoped to the authenticated user.

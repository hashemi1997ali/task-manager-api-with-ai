# Task Manager API

A complete REST API using Express 5, TypeScript, MongoDB/Mongoose, Zod, JWT, bcrypt, cookies, Multer and optional Cloudinary uploads.

## Features

- Register, login, logout, refresh token and current-user endpoints
- Access token in the JSON response
- Refresh token in an HTTP-only cookie
- User-owned tasks
- Task CRUD
- Status, priority, date and text filters
- Pagination and sorting
- Task statistics summary
- Optional task attachments through Cloudinary
- Admin endpoint for viewing every task
- Zod validation and centralized error handling

## Run locally

```bash
cp .env.example .env
npm install
npm run dev
```

MongoDB must be running locally, or set `MONGO_URI` to a MongoDB Atlas connection string.

Cloudinary is optional. The API works without it, but uploading an attachment returns a 503 response until Cloudinary variables are configured.

## Authentication

After register or login, copy the returned `accessToken` and use:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The refresh token is automatically stored in the `refreshToken` HTTP-only cookie.

## Routes

### Auth

| Method | Route | Protected | Description |
|---|---|---:|---|
| POST | `/auth/register` | No | Create an account |
| POST | `/auth/login` | No | Log in |
| POST | `/auth/refresh` | Cookie | Get a new access token |
| POST | `/auth/logout` | No | Clear refresh cookie |
| GET | `/auth/me` | Yes | Get current user |

### Tasks

| Method | Route | Protected | Description |
|---|---|---:|---|
| POST | `/tasks` | Yes | Create a task |
| GET | `/tasks` | Yes | Get own tasks |
| GET | `/tasks/summary` | Yes | Get own task statistics |
| GET | `/tasks/:id` | Yes | Get one owned task |
| PATCH | `/tasks/:id` | Yes | Update one owned task |
| DELETE | `/tasks/:id` | Yes | Delete one owned task |
| DELETE | `/tasks/:id/attachment` | Yes | Remove task attachment |
| GET | `/tasks/admin/all` | Admin | Get every user's tasks |

## Query examples

```text
GET /tasks?status=todo&priority=high
GET /tasks?search=typescript
GET /tasks?dueBefore=2026-08-01&sortBy=dueDate&order=asc
GET /tasks?page=2&limit=5
```

Supported values:

- `status`: `todo`, `in-progress`, `done`
- `priority`: `low`, `medium`, `high`
- `sortBy`: `createdAt`, `updatedAt`, `dueDate`, `title`, `status`
- `order`: `asc`, `desc`

## JSON examples

Register:

```json
{
  "firstName": "Ali",
  "lastName": "Hashemi",
  "email": "ali@example.com",
  "password": "Password123"
}
```

Create a task:

```json
{
  "title": "Finish Task Manager API",
  "description": "Complete controllers and test the endpoints",
  "status": "todo",
  "priority": "high",
  "dueDate": "2026-08-01T12:00:00.000Z"
}
```

For an attachment, send `multipart/form-data` with the file field named `attachment` and the other task fields as text fields.

## Making an admin

Roles default to `user`. For practice, update a user directly in MongoDB:

```js
db.users.updateOne(
  { email: "ali@example.com" },
  { $addToSet: { roles: "admin" } }
)
```

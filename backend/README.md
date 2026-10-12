# 📦 StockMaster AI — Backend Service

[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Sequelize](https://img.shields.io/badge/Sequelize-ORM-52B0E7.svg)](https://sequelize.org/)
[![DeepSeek](https://img.shields.io/badge/DeepSeek-Function%20Calling-4D6BFE.svg)](https://deepseek.com/)
[![License](https://img.shields.io/badge/License-ISC-brightgreen.svg)](LICENSE)

**StockMaster AI** is a production-ready RESTful backend API designed to power mobile inventory management applications. Built on a clean **Model-View-Controller (MVC)** architecture with Node.js, Express 5, and PostgreSQL (via Sequelize ORM), StockMaster AI integrates an intelligent **AI Agent** using **DeepSeek Function Calling** (`deepseek-chat`) to perform controlled, read-only analytics, stock monitoring, and inventory recommendations over real PostgreSQL data—**without RAG, Vector DBs, or arbitrary SQL execution**.

---

## 🌟 Key Features

* **Authentication & Session Security**:
  * Complete JWT authentication with 15-minute access tokens and 7-day refresh tokens.
  * Refresh token rotation and instant revocation table in PostgreSQL.
  * Salted password hashing with `bcryptjs`.
  * Role-Based Access Control (**RBAC**) across `admin`, `manager`, and `employee`.
* **Inventory Management (CRUD)**:
  * Full management of **Categories**, **Suppliers**, **Products**, and **Stock Movements**.
  * Parameterized filtering (by category, supplier, low-stock threshold, search query).
  * Whitelisted sorting and defensive pagination metadata.
* **ACID Transactions**:
  * Stock modifications (`IN`, `OUT`, `ADJUSTMENT`) wrapped in isolated **Sequelize Transactions**.
  * Strict validation preventing negative inventory with automatic rollbacks.
* **Intelligent AI Agent (Function Calling)**:
  * Native tool use via DeepSeek Function Calling (e.g. `getProductStock`, `getLowStockProducts`, `searchProducts`).
  * Backend parameter validation (Zod) and role authorization before tool execution.
  * Server-Sent Events (**SSE**) streaming for responsive, token-by-token mobile chat experience.
* **Security & Guardrails**:
  * Heuristic prompt injection and jailbreak protection via `aiGuard.middleware.js`.
  * Output sanitization masking passwords, tokens, and database credentials.
  * Multi-tiered rate limiting (General API, Authentication, AI endpoints).
  * Helmet security headers and CORS protection.
* **Observability & Auditability**:
  * Centralized Winston logger with automatic request streaming and secret redaction.
  * Dedicated AI Audit Logger (`logs/ai-audit.log`) tracking user prompts, tools requested, tools executed, latency, and outcomes.
* **Documentation & DevOps**:
  * Interactive **Swagger UI** exposed at `/api/docs`.
  * Ready-to-import **Postman Collection** with automated token propagation scripts.
  * Complete **UML Diagrams** (Class and Use Case diagrams in Mermaid).
  * Containerized **Docker** & **Docker Compose** configuration with automated migrations and seeders.
  * 100% automated test coverage with Jest and Supertest.

---

## 🏗️ Architecture

### High-Level REST API Flow

```text
React Native Mobile App
        ↓
    REST API
        ↓
     Routes
        ↓
   Middlewares (Auth, RBAC, Validation, Rate Limit)
        ↓
   Controllers
        ↓
   Sequelize Models
        ↓
   PostgreSQL
```

### AI Agent Function Calling Architecture

```text
React Native Mobile App
        ↓
POST /api/ai/chat
        ↓
ai.routes.js
        ↓
auth middleware (JWT Verification & RBAC)
        ↓
aiGuard middleware (Prompt Injection Heuristics)
        ↓
aiLimiter middleware (Rate Limiting)
        ↓
ai.controller.js
        ↓
ai/agent.js
        ↓
DeepSeek API (deepseek-chat with Tools)
        ↓
Tool Calling Request (e.g., getLowStockProducts)
        ↓
ai/tools.js (Zod Validation & Permission Check)
        ↓
ai/toolExecutor.js
        ↓
Sequelize Models & Parameterized Queries
        ↓
PostgreSQL Database
        ↓
Structured Tool Results
        ↓
ai/agent.js (Assistant Final Generation)
        ↓
SSE Streaming Chunks or Standard JSON
        ↓
React Native Mobile App
```

---

## 📁 Project Directory Structure

```text
stockmaster-ai-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Sequelize connection & CLI configurations
│   │   └── env.js               # Environment variables loading & defaults
│   ├── models/
│   │   ├── index.js             # Model associations setup
│   │   ├── User.js              # User model with role enum & bcrypt hooks
│   │   ├── RefreshToken.js      # Refresh token management & revocation
│   │   ├── Category.js          # Product categories
│   │   ├── Supplier.js          # Inventory suppliers
│   │   ├── Product.js           # Inventory items with SKU and minStock
│   │   ├── StockMovement.js     # IN/OUT/ADJUSTMENT movements
│   │   ├── Conversation.js      # AI conversation sessions
│   │   └── Message.js           # Messages with roles (user, assistant, tool)
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── category.controller.js
│   │   ├── supplier.controller.js
│   │   ├── product.controller.js
│   │   ├── stockMovement.controller.js
│   │   └── ai.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── category.routes.js
│   │   ├── supplier.routes.js
│   │   ├── product.routes.js
│   │   ├── stockMovement.routes.js
│   │   └── ai.routes.js
│   ├── ai/
│   │   ├── agent.js             # AI Agent orchestration & DeepSeek streaming
│   │   ├── tools.js             # DeepSeek function definitions & Zod schemas
│   │   ├── toolExecutor.js      # Secure Sequelize execution bridge
│   │   ├── systemPrompt.js      # Grounding & safety instructions
│   │   └── guardrails.js        # Prompt injection detection & output sanitizing
│   ├── middlewares/
│   │   ├── auth.middleware.js   # JWT authentication & role-based authorize()
│   │   ├── validate.middleware.js # Zod schema request validation
│   │   ├── aiGuard.middleware.js# Prompt injection filter
│   │   ├── rateLimit.middleware.js # Multi-tiered rate limiters
│   │   └── errorHandler.middleware.js # Global error handler
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── category.validator.js
│   │   ├── supplier.validator.js
│   │   ├── product.validator.js
│   │   ├── stockMovement.validator.js
│   │   └── ai.validator.js
│   ├── utils/
│   │   ├── jwt.js               # Sign & verify tokens
│   │   ├── password.js          # Bcrypt hashing & verification
│   │   └── logger.js            # Winston & AI audit loggers
│   ├── app.js                   # Express application assembly
│   └── server.js                # Server bootstrap & graceful shutdown
│
├── database/
│   ├── migrations/              # Versioned database migrations
│   └── seeders/                 # Initial mock data (users, products, movements)
│
├── docs/
│   ├── swagger.yaml             # OpenAPI 3.0 specification
│   ├── postman/
│   │   └── StockMaster-AI.postman_collection.json # Ready-to-use collection
│   └── uml/
│       ├── class-diagram.md     # Class Diagram (Mermaid)
│       └── use-case-diagram.md  # Use Case Diagram (Mermaid)
│
├── tests/
│   ├── setup.js                 # SQLite in-memory test fixtures
│   ├── unit/                    # Unit tests (JWT, Password, Guardrails, Tools)
│   └── integration/             # Integration tests (Auth, Products, Stock, AI)
│
├── .env.example
├── .gitignore
├── .sequelizerc
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites

* Node.js v18+ (tested on Node v20 and v24)
* PostgreSQL 14+ or Docker

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd StockMaster-AI
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your settings:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP port | `3000` |
| `DB_HOST` | PostgreSQL Host | `localhost` |
| `DB_PORT` | PostgreSQL Port | `5432` |
| `DB_NAME` | Database Name | `stockmaster` |
| `DB_USER` | Database User | `postgres` |
| `DB_PASSWORD` | Database Password | `postgres` |
| `DB_DIALECT` | ORM Dialect (`postgres` or `sqlite` for testing) | `postgres` |
| `JWT_ACCESS_SECRET` | Secret key for signing Access Tokens | Required |
| `JWT_REFRESH_SECRET` | Secret key for signing Refresh Tokens | Required |
| `JWT_ACCESS_EXPIRES_IN`| Lifespan of Access Token | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| Lifespan of Refresh Token | `7d` |
| `DEEPSEEK_API_KEY` | DeepSeek API key for AI Agent (`deepseek-chat`) | Optional (Offline fallback provided) |
| `DEEPSEEK_BASE_URL` | DeepSeek API Base URL (defaults to `https://api.deepseek.com`) | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | DeepSeek Model identifier | `deepseek-chat` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` |

---

## 🗄️ Database Migrations & Seeders

StockMaster AI enforces **versioned migrations** for all schema modifications.

### Run Migrations

```bash
npm run db:migrate
```

### Undo Last Migration

```bash
npm run db:migrate:undo
```

### Seed Initial Data

Populates users (Admin, Manager, Employee), categories, suppliers, initial products, and stock history:

```bash
npm run db:seed
```

### Undo Seeders

```bash
npm run db:seed:undo
```

### Default Seed Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@stockmaster.com` | `Admin123!` |
| **Manager** | `manager@stockmaster.com` | `Manager123!` |
| **Employee** | `employee@stockmaster.com` | `Employee123!` |

---

## 🐳 Running with Docker Compose

To launch the backend along with an isolated PostgreSQL database:

```bash
docker compose up --build -d
```

This starts:
* `stockmaster-postgres`: PostgreSQL 16 on port `5432` with persistent volume `pgdata`.
* `stockmaster-backend`: Node.js Express server on port `3000` with automatic migration & seeding execution.

To view logs:

```bash
docker compose logs -f
```

To stop containers:

```bash
docker compose down
```

---

## 📖 API Documentation & Swagger

* **Swagger UI Documentation**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
* **Raw OpenAPI Spec**: [docs/swagger.yaml](file:///c:/Users/user/Desktop/StockMaster-AI/docs/swagger.yaml)

### Postman Collection

Import the included collection:
`docs/postman/StockMaster-AI.postman_collection.json`

The collection includes:
* Automated pre-configured environment variables (`baseUrl`, `accessToken`, `refreshToken`).
* Automatic test scripts on `Login` and `Refresh` that store active tokens into collection variables.
* Ready-to-test scenarios for all CRUD operations, error handling, and AI queries.

---

## 🤖 AI Agent & Function Calling

The AI Agent acts as an intelligent assistant for warehouse operators:

### Available Controlled Tools

| Tool Name | Parameters | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `getProductStock` | `productId`, `reference` | All roles | Returns stock quantity, minimum threshold, and status (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`). |
| `getProductInfo` | `productId`, `reference`, `name` | All roles | Comprehensive product details including price, category, and supplier. |
| `getLowStockProducts` | `limit` | All roles | Retrieves all products where `quantity <= minStock`. |
| `recommendReorder` | `productId`, `categoryId`, `supplierId`, `targetMultiplier`, `limit` | All roles | Generates actionable replenishment recommendations with suggested quantities, priority (CRITICAL/HIGH/MEDIUM), cost estimates, and supplier info. |
| `getStockMovements` | `productId`, `type`, `limit` | All roles | Returns recent historical movements with timestamps and users. |
| `getSupplierInfo` | `supplierId`, `name` | All roles | Contact information and catalog of products provided by a supplier. |
| `getProductsByCategory`| `categoryId`, `categoryName`, `limit` | All roles | Catalog list under a specific category. |
| `searchProducts` | `query`, `limit` | All roles | Fast keyword search across product name, reference, and description. |

### Server-Sent Events (SSE) Streaming

For progressive token streaming in the mobile client:

```http
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer <accessToken>
Accept: text/event-stream

{
  "message": "Which items are currently low on stock?",
  "stream": true
}
```

The response streams progressive events:

```text
data: {"chunk": "Based "}

data: {"chunk": "on "}

data: {"chunk": "current stock levels..."}

data: {"conversationId": 1, "toolsExecuted": ["getLowStockProducts"], "done": true}

data: [DONE]
```

---

## 🔒 Security & Guardrails

* **Prompt Injection Defense**: Every user prompt is evaluated by `aiGuard.middleware.js` to block jailbreaks, system prompt extraction, credential leaks, and raw SQL queries.
* **Secret Leak Redaction**: All Winston logs and AI responses pass through `sanitizeOutput` and `sanitizeSensitiveInfo` formatters.
* **Strict SQL Injection Immunity**: All database queries are executed via Sequelize parameterized queries with whitelisted sorting fields.
* **ACID Transactions**: Stock movements and product inventory updates are committed or rolled back atomically.

---

## 🧪 Running Tests

The test suite runs both unit tests and integration tests with **zero setup** using SQLite in-memory dialect:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage Highlights

* **Auth**: Registration, duplicate rejection, login, wrong password, token refresh, logout, protected route verification.
* **Products**: Creation, retrieval, update, role-based deletion (admin only), pagination, filtering (`categoryId`, `supplierId`, `minStock`, `search`), sorting (`price desc`), validation failures.
* **Stock Transactions**: Stock IN additions, Stock OUT subtractions, insufficient stock rejection, and transaction rollback verification.
* **AI Agent**: Unauthorized chat rejection, schema validation, prompt injection blocking, tool execution, and audit log generation.

---

## 📜 License

This project is licensed under the ISC License.

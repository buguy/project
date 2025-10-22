# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Quick Start
- `start.bat` - Windows batch file to start both backend and frontend servers simultaneously

### Backend Development
- `npm run dev` - Start backend server with nodemon (auto-restart on changes)
- `npm start` - Start backend server in production mode
- `npm run client` - Start frontend React server from root directory
- `npm run build` - Build React frontend from root directory
- `node sample-data.js` - Add sample bug records to the database
- `node import-data.js` - Import data from data.json file

### Frontend Development
- `cd client && npm start` - Start React development server (port 3000)
- `cd client && npm run build` - Build React app for production
- `cd client && npm test` - Run React tests

### Installation
- `npm install` - Install backend dependencies
- `npm run client-install` - Install frontend dependencies from root directory
- `cd client && npm install` - Install frontend dependencies directly

## Architecture Overview

This is a full-stack bug tracking application with the following structure:

### Backend (Express.js + MongoDB)
- **server.js**: Monolithic Express server containing all API routes, middleware, and business logic
- **Models** (`/models/`):
  - `User.js` - Mongoose schema for authentication
  - `Bug.js` - Comprehensive bug record schema with validation
  - `OperationLog.js` - Audit logging for all operations
- **Database**: MongoDB primary with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing, 24-hour token expiration
- **Features**:
  - Operation logging with automatic cleanup (10MB limit)
  - Google Sheets integration for data import
  - Advanced date parsing for multiple formats
  - CORS configuration for cross-origin requests

### Frontend (React 19 + React Router)
- **client/src/App.js**: Main app with authentication state and protected routing
- **Core Components** (`/components/`):
  - Authentication: `Login.js`, `Signup.js` with form validation
  - Main Interface: `BugList.js` - table with filtering, sorting, pagination
  - Forms: `BugModal.js` - create/edit modal with comprehensive field validation
  - Navigation: `Navbar.js` with user session management
  - Logs: `LogsPage.js` - operation audit trail viewing
- **UI Components** (`/components/ui/`):
  - Reusable: `Button.js`, `Input.js`, `Loading.js`
  - Advanced: `FilterModal.js`, `MultiSelect.js`, `SearchInput.js`
- **Custom Hooks** (`/hooks/`):
  - `useApi.js` - HTTP client with authentication
  - `useBugs.js` - Bug data management and operations
  - `useForm.js` - Form state and validation
  - `useAI.js` - AI feature integration

### Key Architectural Patterns
- **Monolithic Backend**: All routes and logic in single server.js file
- **Component Composition**: Reusable UI components with consistent styling
- **Custom Hooks**: Business logic abstraction and state management
- **Protected Routes**: Authentication-based navigation with token persistence
- **Proxy Setup**: Frontend proxies API requests to backend (client proxy: http://localhost:5000)

### Database Schema
**users** collection:
- username (unique), password (bcrypt hashed), timestamps

**bugs** collection:
- Required: status, tcid, tester, date, stage, product_customer_likelihood, test_case_name, title
- Optional: pims, chinese, system_information, description, link, notes, meetings
- Validation on required fields with custom error messages
- Timestamps for created/updated tracking

**operationlogs** collection:
- Comprehensive audit trail: user, operation, target, details, IP, user agent
- Automatic cleanup when collection exceeds 10MB

### Development Setup
1. Backend runs on port 5001 (default, configurable via PORT env var)
2. Frontend runs on port 3000 with proxy to http://localhost:5001
3. MongoDB connection required via MONGODB_URI in .env
4. Required environment variables: JWT_SECRET, PORT, NODE_ENV, MONGODB_URI
5. Optional: Google Sheets integration variables (GOOGLE_PRIVATE_KEY_ID, etc.)
6. Sample data available in data.json for testing

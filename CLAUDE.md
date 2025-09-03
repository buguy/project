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
- **server.js**: Main Express server with all API routes
- **Database**: MongoDB with two collections:
  - `users` collection for authentication (username, hashed password)
  - `bugs` collection for bug records with comprehensive fields (status, TCID, PIMS, tester, etc.)
- **Authentication**: JWT-based auth with bcrypt password hashing
- **API Endpoints**:
  - `/api/signup`, `/api/login` - Authentication
  - `/api/bugs` - CRUD operations for bug records (all require authentication)

### Frontend (React)
- **client/src/App.js**: Main React app with routing and authentication state
- **Components**:
  - `Login.js`, `Signup.js` - Authentication forms
  - `BugList.js` - Main bug management interface with table display
  - `BugModal.js` - Form for creating/editing bug records
  - `Navbar.js` - Navigation with logout functionality
- **Routing**: React Router with protected routes requiring authentication
- **State Management**: Local state with localStorage for token persistence

### Key Features
- JWT token-based authentication with 24-hour expiration
- Complete CRUD operations for bug records
- Responsive table interface for bug display
- Modal forms for bug creation/editing
- All bug record fields from specification including Chinese text support

### Development Setup
1. Backend runs on port 5000 (configurable via PORT env var)
2. Frontend runs on port 3000 with proxy to backend at http://localhost:3001
3. MongoDB connection required (local or cloud instance) - primary database
4. Environment variables in `.env`: JWT_SECRET, PORT, NODE_ENV, MONGODB_URI (see .env.example)
5. SQLite database.sqlite file also present for alternative data storage
6. Sample data available in data.json for testing

### Database Configuration
The application supports dual database setup:
- **Primary**: MongoDB with Mongoose ODM (configured via MONGODB_URI in .env)
- **Alternative**: SQLite file-based database (database.sqlite)
- Models defined in `/models/` directory with Mongoose schemas

### Database Schema
Bug records (MongoDB collections / SQLite tables):
- **users**: username (unique), password (hashed), timestamps
- **bugs**: status, tcid, pims, tester, date, stage, product_customer_likelihood, test_case_name, chinese, title, system_information, description, plus timestamps

Key field requirements:
- Required: status, tcid, tester, date, stage, product_customer_likelihood, test_case_name, title
- Optional: pims, chinese, system_information, description
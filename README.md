# Bug Record System

A full-stack web application for managing bug records with user authentication.

## Features

- **Authentication System**: User signup, login, and logout
- **Bug Management**: Create, read, update, and delete bug records
- **Table Format**: Display bugs in a structured table with all required fields
- **Responsive Design**: Works on desktop and mobile devices
- **Sample Data**: Includes example bug record matching your specification

## Technology Stack

- **Backend**: Node.js, Express.js, SQLite3, JWT Authentication
- **Frontend**: React, React Router, Axios
- **Database**: SQLite (file-based, no setup required)

## Installation & Setup

1. **Install Backend Dependencies**
   ```bash
   npm install
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Start the Backend Server**
   ```bash
   npm run dev
   ```
   The backend will run on http://localhost:5000

4. **Start the Frontend (in a new terminal)**
   ```bash
   cd client
   npm start
   ```
   The frontend will run on http://localhost:3000

5. **Add Sample Data (Optional)**
   ```bash
   node sample-data.js
   ```

## Usage

1. **Sign Up**: Create a new account with username and password
2. **Login**: Access the system with your credentials
3. **View Bugs**: See all bug records in a table format
4. **Add Bug**: Click "Add New Bug" to create a new record
5. **Edit Bug**: Click "Edit" on any row to modify the record
6. **Delete Bug**: Click "Delete" on any row to remove the record
7. **Logout**: Use the logout button in the navigation

## Bug Record Fields

The system includes all the fields from your specification:

- **Status**: Pass/Fail
- **TCID**: Test Case ID
- **PIMS**: PIMS reference
- **Tester**: Name of the tester
- **Date**: Test date
- **Stage**: Testing stage
- **Product/Customer/Likelihood**: Risk assessment
- **Test Case Name**: Name of the test case
- **Chinese**: Chinese description (optional)
- **Title**: Brief title of the issue
- **System Information**: Hardware/software details
- **Description**: Detailed test steps and observations

## API Endpoints

### Authentication
- `POST /api/signup` - Create new user
- `POST /api/login` - User login

### Bug Management
- `GET /api/bugs` - Get all bugs (requires authentication)
- `POST /api/bugs` - Create new bug (requires authentication)
- `PUT /api/bugs/:id` - Update bug (requires authentication)
- `DELETE /api/bugs/:id` - Delete bug (requires authentication)

## Environment Variables

Create a `.env` file in the root directory:

```
JWT_SECRET=your_jwt_secret_key_here_change_in_production
PORT=5000
NODE_ENV=development
```

## Database

The system uses SQLite with two tables:
- `users`: For authentication
- `bugs`: For bug records

The database file (`database.sqlite`) will be created automatically when you start the server.

## Security Features

- Password hashing with bcryptjs
- JWT token-based authentication
- CORS enabled for cross-origin requests
- Input validation and error handling

## Development

- Backend uses nodemon for auto-restart during development
- Frontend uses React's development server with hot reload
- SQLite database for easy development setup
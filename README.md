# Library Management System - Frontend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Tech Stack

- **React** with **TypeScript** for type-safe development
- **TailwindCSS** for styling
- **React Router** for navigation
- **Axios** for API calls

## Features

- **Dashboard**: Overview statistics and quick access
- **Books Management**: CRUD operations for books with search functionality
- **Users Management**: CRUD operations for users with search functionality
- **Loans Management**: Create loans, return books, and track borrowing history

## API Configuration

The frontend is configured to connect to the backend at `http://localhost:3001`. 
Update the `API_BASE_URL` in `src/services/api.ts` if your backend runs on a different port.

## TypeScript

All components and services are written in TypeScript with proper type definitions. 
Type definitions are located in `src/types/index.ts`.


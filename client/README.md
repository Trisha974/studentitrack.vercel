# Student iTrack - React Application

This is the React version of the Student iTrack Smart Academic Monitoring System.

## Project Structure

```
client/
├── public/
│   └── assets/
│       ├── icons/
│       ├── images/
│       └── logos/
│
└── src/
    ├── components/
    │   ├── Navbar/
    │   │   ├── Navbar.jsx
    │   │   └── Navbar.css
    │   └── ThemeToggle/
    │       ├── ThemeToggle.jsx
    │       └── ThemeToggle.css
    │
    ├── pages/
    │   ├── Login/
    │   │   ├── Login.jsx
    │   │   └── Login.css
    │   ├── Student/
    │   │   ├── Student.jsx
    │   │   └── Student.css
    │   └── Prof/
    │       ├── Prof.jsx
    │       └── Prof.css
    │
    ├── hooks/
    │   └── useTheme.js
    │
    ├── App.jsx
    ├── App.css
    └── main.jsx
```

## Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## Building for Production

To build the application for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

## Features

- **Login/Registration**: User authentication with Professor and Student accounts
- **Student Dashboard**: View academic progress, subjects, grades, and attendance
- **Professor Dashboard**: Manage subjects, attendance, grades, and students
- **Theme Toggle**: Dark/Light mode support
- **Responsive Design**: Works on desktop and mobile devices

## Notes

- The layout and styling from the original project have been preserved
- All functionality has been converted to React components
- Routing is handled by React Router
- State management uses React hooks (useState, useEffect)
- LocalStorage is used for data persistence (same as original)


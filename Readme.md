## Readme.md

# Technician & Sales Attendance Dashboard (Mobile App)

This mobile application is designed to record and manage attendance, activity logs, and service visits for technician and sales team members.
It provides a streamlined workflow for field staff to submit forms, upload documentation, and capture location data.
The frontend is built with React Native (Expo), and the backend runs on Node.js with Express and MariaDB.

---

## Features

- Record attendance for technicians and sales personnel
- Submit detailed visit reports (Customer Visit, Non-Faskes Visit, Technician Activity, Technician Service)
- Capture and upload supporting images (before/after service photos, BA documents, etc.)
- Collect accurate geolocation coordinates
- View previously created tasks through a dashboard
- Authentication using token-based login
- Fast API calls with automatic caching for region/hospital lists

---

## Project Structure

```
root/
│
├── backend/       # Node.js + Express server (REST API)
└── frontend/      # React Native (Expo) mobile application
```

---

## Backend Setup

### 1. Navigate to the backend directory

```
cd backend
```

### 2. Install dependencies

Run this only the first time you clone/download the project:

```
npm install
```

### 3. Start the backend server

```
node server.js
```

The backend will run at:

```
http://localhost:3000
```

Make sure your `.env` file is configured correctly for database connection:

```
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
PORT=3000
```

---

## Frontend Setup

### 1. Navigate to the frontend directory

```
cd frontend
```

### 2. Install dependencies

Run only once after initial cloning:

```
npm install
```

### 3. Start the Expo development server

```
npx expo start -c
```

This opens Expo Dev Tools and allows running the app on:

- iOS Simulator
- Android Emulator
- Physical Devices (via Expo Go)

---

## Environment Variables

Create a `.env` file in the frontend directory:

```
API_URL=http://your-server-ip:3000
```

Replace `your-server-ip` with a reachable backend address.

---

## Technologies Used

### Frontend

- React Native
- Expo
- Axios
- AsyncStorage
- FormData handling
- React Navigation
- Date-fns

### Backend

- Node.js
- Express
- MariaDB
- JWT authentication
- Multer for file uploads

---

## Developer Notes

- Run `npm install` only during the first setup or when dependencies change.
- Use `npx expo start -c` to clear the cache if the app UI does not refresh properly.
- Ensure the backend and frontend share the same network if testing on physical devices.

---

## License

This project is intended for internal company use only for PT Tarafis Anugrah Medika.

Just let me know!

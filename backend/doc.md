# Backend API Documentation

## 📌 Overview
Backend ini menyediakan REST API untuk kebutuhan aplikasi **mobile (React Native / Android / iOS)** dan **web**.  
Autentikasi menggunakan **JWT (JSON Web Token)**.

---

## 🚀 Base URL

Saat development (local):
``` bash
http://localhost:3000
```

Semua endpoint API berada di bawah prefix:
``` bash
/api 
```

---

## 🔐 Authentication

### Login User

Digunakan untuk autentikasi user dan mendapatkan **JWT token** yang akan dipakai untuk mengakses endpoint lain.

---

### Endpoint
``` bash
POST /api/users/login
```

---

### Headers
``` yaml
Content-Type: application/json
```

---

### Request Body
```json
{
  "email": "aden@techno.co.id",
  "password": "NPdXQPRcY9JHbD6Q"
}
```

| Field    | Type   | Required | Description          |
| -------- | ------ | -------- | -------------------- |
| email    | string | ✅        | Email user terdaftar |
| password | string | ✅        | Password user        |

---
## Contoh Request (cURL)
### Windows (PowerShell)
``` powershell
curl.exe -X POST http://localhost:3000/api/users/login `
  -H "Content-Type: application/json" `
  -d '{ "email": "aden@techno.co.id", "password": "NPdXQPRcY9JHbD6Q" }'
```
### Linux / Mac / Git Bash
``` bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aden@techno.co.id",
    "password": "NPdXQPRcY9JHbD6Q"
  }'
```

---
### Response Sukses (200 OK)
``` json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "name": "Aden",
    "position": "Developer",
    "email": "aden@techno.co.id"
  }
}

```
| Field | Description                 |
| ----- | --------------------------- |
| token | JWT token untuk autentikasi |
| user  | Informasi dasar user        |

---

### Response Gagal
Email atau Password Salah (401)
``` json
{
  "message": "Invalid email or password"
}

```

---
### Terkena Rate Limit (429)
Jika login gagal lebih dari 10 kali dalam 15 menit:
``` json
{
  "message": "Too many login attempts. Please try again later."
}
```

---


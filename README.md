#  LocalChefBazaar – Backend

This repository contains the **backend server** for **LocalChefBazaar**, a modern online marketplace connecting local home chefs with customers seeking fresh, homemade meals.  
The backend is built with **Node.js**, **Express**, **MongoDB**, and other essential packages to provide secure, scalable, and reliable APIs for the frontend application.

---

## 🌐 Live Server
🔗 **Server URL :** https://local-chef-bazaar-server-two.vercel.app


---

## 🎯 Project Purpose
The backend server handles:
- User authentication and role-based access control (User, Chef, Admin)
- Meal CRUD operations (Create, Read, Update, Delete)
- Order management and status tracking
- Reviews and favorites management
- Payment processing via Stripe
- Admin-specific functions such as managing users and role requests
- Secure API endpoints using JWT authentication

---

## 🛠️ Technologies & Packages Used

### Core
- Node.js
- Express.js
- MongoDB (official Node driver)
- dotenv (environment variable management)
- cors (Cross-Origin Resource Sharing)
- cookie-parser

### Authentication & Security
- JSON Web Token (JWT) for secure access
- Role-based API protection

### Payments
- Stripe API integration for handling payments

---

## 🔐 Environment Variables
All sensitive keys are secured via `.env` file:


# SW-DEV-Project-1-Hotel-Booking
A full-stack hotel booking and reservation web application built with 

**Tech Stack:** 
- Frontend: React (Vite), Redux Toolkit
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)

**Author:</br>**
- Noppawat Loryingyongphaisal </br>
- Phitsinee Kloenthanom

📌 Computer Engineering Student in Chulalongkorn University

**Security notes (backend)**
- Needs MongoDB as a replica set (e.g. Atlas) — booking creation/update uses a transaction to prevent overbooking.
- Hotels have `totalRooms`; overlapping bookings beyond it are rejected (409). A booking is 1–3 nights.
- Auth: bcrypt, 15-min access token + rotating refresh token in HttpOnly/SameSite=Strict cookies (`POST /api/v1/auth/refresh`).
- Booking create/update: max 5 attempts/min per user (429 + `Retry-After`). Set `TRUST_PROXY` to the number of proxy hops when deployed behind one.

# Infinity Taekwondo Administration Portal

**Forged for Excellence.**

The **Infinity Admin Portal** is the central digital dojang for managing the operations of Infinity Taekwondo. Built with precision and discipline, this system empowers instructors and administrators to focus on what matters most: training the next generation of martial artists.

> *"Discipline in the mind, strength in the body, efficiency in the code."*

---

## 🥋 Core Capabilities

This portal provides a robust suite of tools designed specifically for martial arts school management:

*   **Student Dojo (Management):** Comprehensive profiles including belt rank history, biometrics (height/weight tracking), and e-signed documentation.
*   **Event Forge:** A powerful system to create, manage, and track tournaments, gradings, and seminars.
*   **Honor Roll (Achievements):** specialized tracking for medals, awards, and competition results, grouped by events and student progress.
*   **The Ledger (Payments):** Precise tracking of tuition and fees with month-by-month filtering and status indicators.
*   **Attendance:** Rapid, discipline-focused attendance tracking to monitor student dedication.

---

## 🛠️ Technology Stack

We value modern, reliable, and high-performance tools:

*   **Frontend:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS (Infinity Blue Theme), Framer Motion (Cinematic Interactions)
*   **State Management:** TanStack Query (offline-first data synchronization)
*   **Backend:** Google Apps Script (Serverless, seamlessly integrated with Google Workspace)
*   **Database:** Google Sheets (The scrolls of record)

---

## 🚀 Deployment & Operation

### 1. The Source
This repository serves as the frontend source code. It connects to a Google Apps Script backend via secure API calls.

### 2. Environment Setup
To run this portal locally, you must authenticate with the Dojang's digital keys:

1.  Clone this repository.
2.  Create a `.env.local` file.
3.  Add your backend connection string:
    ```bash
    VITE_API_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
    ```
4.  Install dependencies:
    ```bash
    npm install
    ```
5.  Run the development server:
    ```bash
    npm run dev
    ```

### 3. Production
The system is optimized for deployment on Vercel as a Progressive Web App (PWA), ensuring access from any device, anywhere—even with poor connectivity.

---

© 2026 Infinity Taekwondo. All Rights Reserved.

# FinAlly Student — AI-Powered Smart Expense & Savings Management System

> B.Tech Final Year Capstone Project · Student Edition

---

## Project Overview

FinAlly Student is a full-stack AI-powered personal finance management system built exclusively for students. It automates budget creation using a **savings-first algorithm**, classifies expenses through a **3-layer engine**, and delivers personalized mentor-style insights via the **Behavioral Bot** — which adapts its tone and advice based on the student's **gender** and **age group**.

---

## Features

| Feature | Description |
|---|---|
| Savings-First Budget | 10% savings locked before anything else (Student profile) |
| Behavioral Bot | AI mentor — tone adapts by gender (M/F/Other) and age (Teen 15-17 / Mid 18-22 / Senior 23-30) |
| 3-Layer Classifier | Keyword → Amount Heuristic → User-taught merchant learning |
| Financial Safety | Emergency fund enforced before investments unlock |
| Health Score | Savings(35%) + Adherence(25%) + Goals(20%) + Emergency(10%) + Behavior(10%) |
| What-If Simulator | Model income drop, new expense, job loss, new goal — read-only |
| Subscription Tracker | Auto-detect recurring charges, flag possibly-cancelled ones |
| Predictive Engine | Daily forecast: days-to-breach and projected overspend per category |
| Emotional Guard | Detects 3+ purchases in 90 mins, gently interrupts before saving |
| Gamification | 4 streak types, 10 badges tied to real financial behavior |
| Behavioral Analysis | Day-of-week spikes, merchant habits, impulse clusters, category creep |
| OCR Scanner | **[NEW]** Scan screenshots of payments (GPay, PhonePe) for auto-expense entry |
| Adaptive Categorizer | Self-learning engine that prompts users to map unknown merchants |

---

## Tech Stack

### Backend
- Java 17 + Spring Boot 3.2
- Spring Security + JWT (JJWT 0.12)
- Spring Data JPA + Hibernate
- MySQL 8.x
- Spring Scheduler (daily bot & predictive engine)
- Maven

### Frontend
- Vanilla HTML5 / CSS3 / JavaScript ES6+
- Chart.js 4.4 (donut + bar charts)
- Google Fonts: Syne + DM Sans

---

## Project Structure

```
student-finance-app/
├── frontend/
│   ├── pages/               # 14 HTML pages
│   ├── css/                 # 4 CSS files
│   │   ├── global.css       # Variables, reset, shared components
│   │   ├── auth.css         # Login + registration
│   │   ├── dashboard.css    # Dashboard layout
│   │   └── pages.css        # All other pages
│   └── js/
│       ├── utils/           # api.js, storage.js, toast.js, helpers.js
│       └── modules/         # 14 JS modules (one per page)
│
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/studentfinance/
│       ├── FinAllyApplication.java
│       ├── model/           # 11 JPA entities
│       ├── repository/      # All JPA repositories
│       ├── dto/             # Request + Response DTOs
│       ├── service/         # Business logic services
│       │   ├── AuthService.java
│       │   ├── BudgetService.java
│       │   ├── ExpenseService.java
│       │   ├── BehavioralBotService.java  ← gender+age personalization
│       │   └── Services.java  (Health, Alert, Goal, Sub, Gami)
│       ├── controller/      # All REST controllers
│       ├── security/        # JwtUtil, JwtAuthFilter, UserDetailsServiceImpl
│       └── config/          # SecurityConfig, GlobalExceptionHandler
│
└── database/
    └── schema.sql           # All 13 tables + seed data
```

---

## Setup Instructions

### Prerequisites

Make sure the following are installed:

| Tool | Version | Download |
|---|---|---|
| Java JDK | 17+ | https://adoptium.net |
| Maven | 3.9+ | https://maven.apache.org |
| MySQL | 8.x | https://dev.mysql.com/downloads |
| MySQL Workbench | Any | https://dev.mysql.com/downloads/workbench |
| VS Code | Any | https://code.visualstudio.com |
| IntelliJ IDEA | Community | https://www.jetbrains.com/idea |
| Live Server (VS Code ext) | Any | VS Code Marketplace |

---

### Database Setup

**Step 1:** Open MySQL Workbench and connect to your local MySQL server.

**Step 2:** Run the schema file:
```sql
-- In MySQL Workbench: File → Open SQL Script → select database/schema.sql
-- Then click the lightning bolt (Execute) button
```

Or via command line:
```bash
mysql -u root -p < database/schema.sql
```

This creates:
- Database: `finally_student`
- All 13 tables (users, budgets, expenses, goals, alerts, etc.)
- Pre-loaded expense categories and classification keywords
- Demo user account (see Demo Account section below)

---

### Backend Setup

**Step 1:** Open `backend/` folder in IntelliJ IDEA.

**Step 2:** Update `src/main/resources/application.properties`:
```properties
# Change these to match your MySQL setup:
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD

# IMPORTANT: Replace JWT secret with a strong random string in production
app.jwt.secret=finally_super_secret_key_replace_me_with_256bit_random_string
```

**Step 3:** Build and run:
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend starts on: **http://localhost:8080**

To verify it's running:
```bash
curl http://localhost:8080/api/auth/me
# Should return 401 Unauthorized (expected — not logged in yet)
```

---

### Frontend Setup

The frontend is pure HTML/CSS/JS — no build step needed.

**Option A — VS Code Live Server (Recommended):**

1. Open the `frontend/` folder in VS Code
2. Right-click `pages/login.html`
3. Select **"Open with Live Server"**
4. Browser opens at `http://127.0.0.1:5500/pages/login.html`

**Option B — Any static file server:**
```bash
cd frontend
npx serve .
# Opens at http://localhost:3000
```

**IMPORTANT:** Make sure the backend is running on port 8080 before using the frontend. The `js/utils/api.js` file points to `http://localhost:8080/api`.

---

## Running the Application

**Full startup sequence:**

```bash
# Terminal 1 — Start MySQL (if not already running)
# Windows: Start MySQL service from Services panel
# Mac: brew services start mysql
# Linux: sudo systemctl start mysql

# Terminal 2 — Start backend
cd backend
mvn spring-boot:run

# Terminal 3 — Serve frontend (or use VS Code Live Server)
cd frontend
npx serve .
```

Then open: **http://localhost:3000/pages/login.html** (or Live Server URL)

---

## API Reference

All endpoints require `Authorization: Bearer <JWT>` header except auth endpoints.

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register (includes gender, age, income, yearly goal) |
| POST | /api/auth/login | Login → returns JWT token |
| GET | /api/auth/me | Current user details |

### Budget & Income
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/income | Add/update income source |
| POST | /api/budget/generate | Auto-generate monthly budget |
| GET | /api/budget/current | Current month budget summary |
| POST | /api/budget/yearly-goal | Set yearly savings target |
| GET | /api/budget/yearly-progress | Yearly goal progress + recovery tips |

### Expenses
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/expenses | Add expense (auto-classify + duplicate check) |
| GET | /api/expenses | List all expenses |
| PUT | /api/expenses/{id}/category | Override category (trains merchant learner) |
| DELETE | /api/expenses/{id} | Delete expense |

### Goals & Safety
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/safety/status | Emergency fund status |
| GET | /api/goals | List all goals |
| POST | /api/goals | Create savings goal |
| PUT | /api/goals/{id}/deposit | Add money to goal |

### Alerts & Score
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/alerts | All alerts (sorted by date) |
| PUT | /api/alerts/{id}/read | Mark alert as read |
| GET | /api/score/current | 5-component Health Score |
| GET | /api/investments/suggestions | Investment suggestions (locked until EF complete) |

### Intelligence Modules
| Method | Endpoint | Description |
|---|---|---|
| GET | /api/subscriptions | Detected recurring payments |
| PUT | /api/subscriptions/{id}/status | Update subscription status |
| POST | /api/simulator/whatif | Run what-if scenario |
| GET | /api/behavioral/patterns | Detected spending patterns |
| GET | /api/behavioral/bot-messages | Bot message history |
| GET | /api/predictive/forecast | Month-end spending forecast |
| GET | /api/gamification/status | Streaks + earned badges |

---

## Behavioral Bot — Gender & Age Personalization

The Behavioral Bot is the core intelligence of FinAlly. It delivers different messages based on two user attributes captured at registration:

### Age Groups

| Age Range | Group | Bot Style |
|---|---|---|
| 15–17 | Teen | Fun, emoji-heavy, gamification-focused, very encouraging |
| 18–22 | Mid | Practical, goal-oriented, balanced |
| 23–30 | Senior | Analytical, investment-aware, career-focused |

### Gender Personas

| Gender | Communication Style |
|---|---|
| Female | Encouraging, empathetic, celebratory of small wins, emoji-rich |
| Male | Direct, action-oriented, challenge-framing |
| Other | Neutral, practical, supportive |

### Example Messages (same financial situation)

**Teen Female (17F, score just hit 80):**
> "You're absolutely crushing it, Priya! 🌟 Score at 80 — you're in the top tier! Keep that savings streak alive 💪✨"

**Mid Male (21M, score just hit 80):**
> "Great work, Arjun! Health Score at 80. Consistent logging and on-track savings — keep it going."

**Senior Female (25F, predictive breach):**
> "Riya, the predictor spotted a potential budget breach coming. ✨ A quick review of your wants spending can prevent it."

**Teen Male (16M, default motivational):**
> "Yo Rohan! Log your expenses daily — it takes 30 seconds and keeps your score high 🎯"

### Priority Ranking (Bot always shows highest urgency first)
1. Score < 45 (critical)
2. Predictive budget breach
3. Subscription leak detected
4. Danger alert (100% category spend)
5. Emergency fund near completion (≥80%)
6. Investment unlock notification
7. Emotional spending pattern
8. High score positive reinforcement
9. Default motivational (personalized by gender + age)

---

## Demo Account

A demo account is pre-seeded in the database:

```
Email:    demo@student.finally
Password: Demo@1234
```

Click "Try Demo Account" on the login page to use it directly.

---

## Security Notes

1. **Passwords:** BCrypt hashed with strength 12. Never stored in plain text. Cannot be retrieved — only reset.

2. **JWT:** Expires after 24 hours. Every API request validates the token server-side. One user cannot access another's data.

3. **What we never ask for:** Bank account numbers, card numbers, UPI PINs, net banking passwords, or OTPs. All transactions are manual.

4. **Behavioral data:** Gender, age, spending patterns, and emotional spend flags are stored only for the individual user's benefit. Never shared or aggregated.

5. **Before deploying to production:**
   - Replace `app.jwt.secret` with a cryptographically random 256-bit key
   - Set `spring.jpa.hibernate.ddl-auto=validate` (already set)
   - Use HTTPS
   - Store DB credentials in environment variables, not in properties file

---

## Team

| Role | Responsible For |
|---|---|
| Backend Developer | Spring Boot, MySQL, JWT, all service modules |
| Frontend Developer | HTML/CSS/JS pages, Chart.js integration |
| Database Designer | Schema design, stored procedures, indexing |
| AI/Logic Developer | Behavioral Bot, classification engine, predictive module |

---

## References

1. Spring Boot — https://spring.io/projects/spring-boot
2. Spring Security — https://spring.io/projects/spring-security
3. Chart.js — https://www.chartjs.org/docs/
4. MySQL 8.x — https://dev.mysql.com/doc/
5. JJWT — https://github.com/jwtk/jjwt
6. SEBI Investor Education — https://www.sebi.gov.in/investor
7. RBI Financial Literacy — https://www.rbi.org.in
8. Google Fonts — https://fonts.google.com

---

*FinAlly Student · Academic Year 2024–2025 · B.Tech Capstone Project*

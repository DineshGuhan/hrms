# Business Requirements Document (BRD)

**Project:** HRMS (Human Resource Management System)
**Version:** 1.0 (Draft)
**Purpose:** Learning project to build a full-stack, secure HR system
**Tech stack:** React (frontend), Node.js (backend), PostgreSQL (database)

---

## 1. Introduction

### 1.1 Purpose
This document defines the business and functional requirements for an HRMS that lets an organization manage employee records, leave, attendance, payroll, performance, and documents from one secure application.

### 1.2 Scope

**In scope**
- Authentication and authorization (JWT with refresh tokens, OAuth login, role-based access)
- Employee and department management
- Leave management with approval workflow
- Attendance tracking
- Payroll and payslips (view and generate, no real bank transfer)
- Performance reviews
- Document and policy management
- Notifications and audit logging
- Reusable frontend component library
- Unit, component, and API tests

**Out of scope**
- Real payment processing or bank integration
- Recruitment and applicant tracking
- Mobile native apps
- Multi-tenant SaaS billing
- Production deployment and compliance certification (for example, GDPR or SOC 2 audits)

### 1.3 Project Goals
1. Build a secure API with token-based authentication and OAuth.
2. Build a reusable React component system.
3. Follow a clear, feature-based folder structure.
4. Provide at least 10 navigable frontend pages.
5. Maintain automated unit and integration tests.

---

## 2. Stakeholders and Users

| Role | Description | Key Needs |
|---|---|---|
| Admin | System owner | Manage roles, view audit logs, manage system settings |
| HR | HR staff | Manage employees, departments, payroll, documents |
| Manager | Team lead | Approve leave, review team performance and attendance |
| Employee | Any staff member | View own profile, payslips, leave, attendance, and documents |
| Developer (learner) | Builder of the system | Clear structure, testable code, reusable components |

---

## 3. Access Control Model

| Capability | Admin | HR | Manager | Employee |
|---|:-:|:-:|:-:|:-:|
| Manage roles and users | ✔ | | | |
| View audit logs | ✔ | | | |
| Create/edit employees | ✔ | ✔ | | |
| View all employees | ✔ | ✔ | Direct reports only | Self only |
| View salary data | ✔ | ✔ | | Self only |
| Manage departments | ✔ | ✔ | | |
| Apply for leave | ✔ | ✔ | ✔ | ✔ |
| Approve leave | | ✔ | Direct reports | |
| Record attendance | | | | ✔ (self) |
| Generate payroll | ✔ | ✔ | | |
| View payslips | ✔ | ✔ | | Self only |
| Create performance reviews | | ✔ | ✔ (direct reports) | |
| Manage documents and policies | ✔ | ✔ | | View only |

---

## 4. Functional Requirements

### 4.1 Authentication and Authorization (FR-AUTH)

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Users sign in with email and password | Must |
| FR-AUTH-02 | Passwords are hashed with bcrypt or argon2 | Must |
| FR-AUTH-03 | Login issues a short-lived access token (about 15 min) and a refresh token | Must |
| FR-AUTH-04 | Refresh tokens are stored in httpOnly, secure cookies and rotated on each use | Must |
| FR-AUTH-05 | Logout revokes the refresh token | Must |
| FR-AUTH-06 | Users can sign in with Google Workspace (OAuth 2.0 / OIDC) | Must |
| FR-AUTH-07 | Forgot-password sends a time-limited, single-use reset link | Must |
| FR-AUTH-08 | New accounts require email verification | Must |
| FR-AUTH-09 | New employees join through an invitation link | Should |
| FR-AUTH-10 | Account locks or throttles after repeated failed logins | Must |
| FR-AUTH-11 | Every protected endpoint checks role and ownership | Must |

### 4.2 Employee Management (FR-EMP)

| ID | Requirement | Priority |
|---|---|---|
| FR-EMP-01 | HR can create, edit, and deactivate employee records | Must |
| FR-EMP-02 | Employee record includes personal details, job title, department, manager, join date, and status | Must |
| FR-EMP-03 | Employee directory is searchable and filterable by department and status | Must |
| FR-EMP-04 | Salary and bank details are visible only to HR, admin, and the employee | Must |
| FR-EMP-05 | Bank details and national ID are encrypted at rest | Must |
| FR-EMP-06 | Employees can update limited personal fields (contact, address) | Should |
| FR-EMP-07 | Employee onboarding can be started by sending an invitation | Should |

### 4.3 Departments (FR-DEP)

| ID | Requirement | Priority |
|---|---|---|
| FR-DEP-01 | HR can create, edit, and archive departments | Must |
| FR-DEP-02 | Each department has a head, and employees belong to one department | Must |
| FR-DEP-03 | Departments can be nested (parent and child) | Could |

### 4.4 Leave Management (FR-LEV)

| ID | Requirement | Priority |
|---|---|---|
| FR-LEV-01 | HR configures leave types (annual, sick, unpaid) with yearly quotas | Must |
| FR-LEV-02 | Employees submit leave requests with dates, type, and reason | Must |
| FR-LEV-03 | System prevents overlapping requests and requests beyond the balance | Must |
| FR-LEV-04 | Manager approves or rejects requests from direct reports, with a comment | Must |
| FR-LEV-05 | HR can override any leave decision | Should |
| FR-LEV-06 | Balances update automatically on approval or cancellation | Must |
| FR-LEV-07 | Employees can cancel pending requests | Must |

### 4.5 Attendance (FR-ATT)

| ID | Requirement | Priority |
|---|---|---|
| FR-ATT-01 | Employees check in and check out with timestamps | Must |
| FR-ATT-02 | System calculates daily and monthly worked hours | Must |
| FR-ATT-03 | Monthly calendar view shows present, absent, leave, and holidays | Must |
| FR-ATT-04 | Managers view team attendance | Must |
| FR-ATT-05 | HR can correct attendance records, and every correction is audited | Should |

### 4.6 Payroll (FR-PAY)

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-01 | HR runs monthly payroll for active employees | Must |
| FR-PAY-02 | Payroll calculates gross, deductions, tax (simplified rule), and net pay | Must |
| FR-PAY-03 | Payroll considers unpaid leave and attendance | Should |
| FR-PAY-04 | Payslips are generated as a detail page and downloadable PDF | Must |
| FR-PAY-05 | Employees see only their own payslips | Must |
| FR-PAY-06 | Payroll runs can be locked and cannot be edited after locking | Should |

### 4.7 Performance Reviews (FR-PER)

| ID | Requirement | Priority |
|---|---|---|
| FR-PER-01 | HR starts a review cycle (for example, quarterly) | Must |
| FR-PER-02 | Managers create reviews for direct reports with ratings and comments | Must |
| FR-PER-03 | Employees can view and acknowledge their reviews | Must |
| FR-PER-04 | Reviews are visible only to the employee, their manager, and HR | Must |

### 4.8 Documents and Policies (FR-DOC)

| ID | Requirement | Priority |
|---|---|---|
| FR-DOC-01 | HR uploads documents and policies (PDF, DOCX) with size and type limits | Must |
| FR-DOC-02 | Documents can target all employees, a department, or a single employee | Must |
| FR-DOC-03 | Employees can download documents addressed to them | Must |
| FR-DOC-04 | Policy acknowledgement is tracked | Should |

### 4.9 Notifications and Audit (FR-NOT, FR-AUD)

| ID | Requirement | Priority |
|---|---|---|
| FR-NOT-01 | In-app notifications for leave decisions, new documents, and review requests | Must |
| FR-NOT-02 | Users can mark notifications as read | Must |
| FR-AUD-01 | Log who did what, to which record, and when, for all writes and sensitive reads | Must |
| FR-AUD-02 | Admin can view and filter the audit log | Must |
| FR-AUD-03 | Audit logs cannot be edited or deleted through the application | Must |

### 4.10 Dashboard (FR-DSH)

| ID | Requirement | Priority |
|---|---|---|
| FR-DSH-01 | Dashboard content depends on role | Must |
| FR-DSH-02 | Employee dashboard shows leave balance, today's attendance, and pending items | Must |
| FR-DSH-03 | Manager dashboard shows pending approvals and team attendance | Must |
| FR-DSH-04 | HR and admin dashboards show headcount, leave trends, and payroll status | Should |

---

## 5. Frontend Pages

Total: 24 pages (23 plus 404). Each page is a routed view built from the shared component library.

| # | Page | Access |
|---|---|---|
| 1 | Landing | Public |
| 2 | Login | Public |
| 3 | Forgot password | Public |
| 4 | Reset password | Public (token link) |
| 5 | Verify email | Public (token link) |
| 6 | OAuth callback | Public |
| 7 | Accept invitation | Public (token link) |
| 8 | Dashboard | All roles (content varies) |
| 9 | Employee directory | HR, admin, manager |
| 10 | Create/edit employee | HR, admin |
| 11 | Employee profile | Self, HR, admin, manager (team) |
| 12 | Departments | HR, admin |
| 13 | Leave requests | All roles (own requests) |
| 14 | Apply for leave | All roles |
| 15 | Leave approvals | Manager, HR |
| 16 | Attendance | All roles (own), manager (team) |
| 17 | Payroll | HR, admin |
| 18 | Payslip detail | Self, HR, admin |
| 19 | Performance reviews | Employee (own), manager, HR |
| 20 | Documents and policies | All roles (scoped) |
| 21 | Notifications | All roles |
| 22 | Profile and settings | All roles |
| 23 | Admin: roles and audit log | Admin |
| 24 | 404 | Public |

---

## 6. Non-Functional Requirements

### 6.1 Security (NFR-SEC)
- Use HTTPS in all environments outside local development.
- Helmet headers, a CORS allowlist, and rate limiting on auth routes.
- Validate all input with a schema library (Zod or Joi).
- Use parameterized queries only (no string-built SQL).
- Protect against XSS (escape output, no unsafe HTML rendering) and CSRF (SameSite cookies, CSRF token for state-changing requests).
- Encrypt sensitive fields at rest. Keep secrets in environment variables, never in source code.
- Enforce least privilege at every endpoint.

### 6.2 Performance (NFR-PERF)
- Directory and list endpoints return paginated results (default 20 per page).
- API responses for typical reads complete in under 300 ms with the seed dataset.
- Frontend pages load code-split (lazy routes).

### 6.3 Usability (NFR-USE)
- Responsive layout for desktop and tablet.
- Consistent components: Button, Input, Select, Modal, Table, Card, Badge, Toast, and Form.
- Clear error and empty states on every page.

### 6.4 Maintainability (NFR-MNT)
- Feature-based folder structure:
  - `backend/src/modules/{auth, employees, departments, leave, attendance, payroll, performance, documents, audit}` plus `config`, `middleware`, `db`, `utils`
  - `frontend/src/{features, components/ui, pages, hooks, services, routes}`
- Consistent code style enforced by ESLint and Prettier.
- Environment-based configuration (development, test, production).
- Database changes made through versioned migrations.

### 6.5 Testing (NFR-TST)
- Unit tests for services, utilities, and business rules (Jest or Vitest). Target 70% or higher coverage on backend services.
- Component tests with React Testing Library.
- API integration tests with Supertest against a test database.
- At least one end-to-end test for login and leave approval (optional, Playwright or Cypress).

---

## 7. Technical Architecture (summary)

- **Frontend:** React, React Router, a state library (TanStack Query for server state), and a form library with schema validation.
- **Backend:** Node.js with Express (or Fastify), layered as routes, controllers, services, and repositories.
- **Database:** PostgreSQL with migrations.
- **Auth:** JWT access tokens, refresh tokens in httpOnly cookies, Google OAuth via Passport or a similar library.
- **Email:** A test SMTP service (for example, Mailtrap or Ethereal) for verification and reset emails.

### 7.1 Core Data Entities

`users`, `roles`, `user_roles`, `departments`, `employees`, `leave_types`, `leave_balances`, `leave_requests`, `attendance_records`, `payroll_runs`, `payslips`, `performance_cycles`, `performance_reviews`, `documents`, `document_recipients`, `notifications`, `audit_logs`, `refresh_tokens`, `invitations`

---

## 8. Assumptions and Constraints

**Assumptions**
- One company, one time zone, one currency.
- Tax calculation uses a simplified flat rule, not a real tax table.
- Google Workspace is the only OAuth provider.
- Seed data is provided for testing.

**Constraints**
- Built as a learning project by one developer.
- No paid third-party services required.

---

## 9. Milestones

| Phase | Deliverables | Exit Criteria |
|---|---|---|
| 1. Foundation | Repo structure, DB schema, migrations, backend skeleton | Migrations run, health endpoint responds |
| 2. Auth | Register/invite, login, JWT and refresh, roles, OAuth | Auth tests pass, token rotation verified |
| 3. Core HR | Employees, departments, directory | CRUD and ownership tests pass |
| 4. Leave | Leave types, requests, approvals, balances | Balance rules tested |
| 5. Frontend shell | Routing, layout, component library | 24 routes render, component tests pass |
| 6. Feature pages | Employee, leave, dashboard pages | Pages connected to the API |
| 7. Attendance, payroll, performance | Modules and pages | Payroll calculations tested |
| 8. Documents, notifications, audit | Modules and pages | Audit entries verified for writes |
| 9. Hardening | Security review, coverage, cleanup | Checklist in section 6.1 complete |

---

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope too large for a learning project | Delays | Build by phase; keep payroll and performance simple |
| Security mistakes in auth | High | Use proven libraries; follow the checklist; test token expiry and revocation |
| Field-level access bugs | High | Centralize access rules in one policy module with tests |
| OAuth setup complexity | Medium | Build email/password login first; add Google last |
| Payroll rule errors | Medium | Keep rules simple and cover them with unit tests |

---

## 11. Glossary

- **BRD:** Business Requirements Document
- **JWT:** JSON Web Token, a signed token that carries user identity
- **OAuth 2.0 / OIDC:** Standards for delegated login with a third-party provider
- **RBAC:** Role-Based Access Control
- **Ownership check:** A rule that a user can access only records they own or are responsible for
- **Refresh token rotation:** Issuing a new refresh token each time one is used, and invalidating the old one

---

## 12. Approval

| Name | Role | Signature | Date |
|---|---|---|---|
| | Developer / Learner | | |

---

Next step: once you review this, tell me what to change. Then we can move to step 1 of the build order, the PostgreSQL schema and backend skeleton. I can also save this BRD as a note in your notes if you'd like.
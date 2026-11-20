# Medimall Patient Feedback Messenger

A high-performance internal web application designed for Medimall staff to effortlessly follow up with clinic patients via WhatsApp and invite them to leave Google Reviews.

Built in accordance with the **Medimall Patient Feedback Messenger SRS (v0.1)** and **UI/UX Engineering Standards (WCAG 2.2 AA compliant)**.

---

## Key Features & SRS Compliance

1. **FR-1 Staff Authentication**:
   - Single shared staff password gating the entire application (`STAFF_PASSWORD`).
   - Server-verified session with signed `httpOnly`, `sameSite: 'lax'` session cookie (HMAC-SHA256).
   - Seamless logout mechanism.

2. **FR-2 Excel Batch Upload**:
   - Accepts `.xlsx` spreadsheets with required headers: `Name`, `Phone`, `Branch`, `Visit Time`.
   - Comprehensive two-phase upload: instant preview before committing.
   - Automatically detects, flags, and skips rows with missing name, invalid phone, unknown branch, or unreadable visit time with itemized reasons.
   - Built-in sample template generator and download button.

3. **FR-3 Add Patient**:
   - Quick "+" modal at top right with instant validation.
   - Fields: Name, Phone (auto-normalized), Branch (dropdown of active branches), Visit Time (defaults to current time).
   - Real-time table updates.

4. **FR-4 Patient Table**:
   - Columns: `Name`, `Phone`, `Branch`, `Visit Time`, `Status`, `WhatsApp`.
   - Chronological sorting with newest patient visits first.
   - Real-time search filter matching patient name or phone number.
   - Built-in pagination with configurable page size (10, 25, 50, 100), page navigation, and responsive mobile-first table layout.
   - Skeletons, loading indicators, and informative empty states.

5. **FR-5 WhatsApp Action**:
   - One-click button generating pre-filled WhatsApp click-to-chat links: `https://wa.me/<number>?text=<url-encoded message>`.
   - Pre-fills patient name, branch name, and direct Google review link.
   - Immediately records `sent_at` timestamp and language in the database.
   - Turns button grey and disabled with a "Message Sent" badge per FR-5 specifications.

6. **FR-6 Phone Normalization**:
   - Strips spaces, dashes, brackets, `+`, and leading `0`.
   - 10-digit number automatically prefixed with `91` (`919876543210`).
   - 12-digit number starting with `91` kept intact.
   - Any other format flagged as invalid.

7. **FR-7 Language Toggle**:
   - Seamless switch between **English** (default) and **Malayalam (മലയാളം)**.
   - Choice persists per browser across sessions using `localStorage`.

8. **FR-8 Branch Management**:
   - Add, edit, and remove clinic branches with their corresponding Google Business Review URLs.
   - Pre-seeded with Kunnamangalam and Malappuram Google review links.

9. **FR-9 Message Templates & Live Preview**:
   - Editable message templates for English and Malayalam.
   - Supported placeholders: `{name}`, `{branch}`, `{review_link}`.
   - Interactive live WhatsApp preview replicating the native chat bubble in real-time.

10. **FR-10 Excel Export**:
    - One-click export downloading the current filtered patient table as `.xlsx` with SheetJS.
    - Includes Patient Name, Phone Number, Branch, Visit Time, Status, Sent Timestamp, and Language.

---

## Technology Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS with custom Medimall Medical tokens, 8-point spacing system, WCAG 2.2 AA compliant contrast
- **Icons**: Lucide Icons
- **Spreadsheets**: SheetJS (`xlsx`)
- **Database**: Supabase (PostgreSQL with Row Level Security) + Resilient local fallback store
- **Security**: Web Crypto HMAC-SHA256 signed session cookies

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Variables

Create `.env.local` or edit existing configuration:

```env
# Shared Staff Password (FR-1)
STAFF_PASSWORD=replace-with-a-strong-staff-password

# Session Security Secret (minimum 32 characters)
SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters-long

# Supabase PostgreSQL Configuration (Optional: runs in resilient local store if left blank)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Default Language
NEXT_PUBLIC_DEFAULT_LANG=en
```

### 3. Running Development Server

```bash
npm run dev
```

If the project is inside a synced folder and Next.js cannot clean its `.next` directory, use a separate build directory:

```powershell
$env:NEXT_DIST_DIR = '.next-local'
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Set `STAFF_PASSWORD` and `SESSION_SECRET` in `.env.local` before logging in. Copy `.env.example` as a starting point and replace both placeholder values with private values.

### 4. Running Automated Tests

Run the full verification suite testing FR-1 through FR-10:

```bash
npm test
```

### 5. Production Build

```bash
npm run build
npm run start
```

---

## Supabase PostgreSQL Setup

To connect to Supabase:
1. Open your Supabase project SQL Editor.
2. Run the SQL script found in [`supabase/schema.sql`](supabase/schema.sql).
3. Copy your Project URL and Service Role Key from Project Settings > API.
4. Paste them into `.env.local` under `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Sample Data for Testing

A test spreadsheet is located at [`sample-data/Medimall_Sample_Patients.xlsx`](sample-data/Medimall_Sample_Patients.xlsx). It contains both valid records and intentional invalid test cases to demonstrate row validation and skipping.

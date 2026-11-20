# Medimall Patient Feedback Messenger: SRS

Version 0.1 · 18 Nov 2026 · Prepared for Salman

## 1\. Purpose and scope

A small internal web app for Medimall staff. After a patient visits a branch, staff open the app, find the patient in a table, and click one button that opens WhatsApp with a ready message thanking the patient and asking for a Google review for that branch.

The app does not send messages automatically. It opens a pre-filled WhatsApp chat (click-to-chat link) in the staff member's logged-in WhatsApp Web or app, and the staff member presses Send.

## 2\. Users

* **Staff (single role):** log in with one shared password. They upload patient lists, add patients, send messages, edit settings and export data.

## 3\. Tech stack

* Next.js (App Router) + TypeScript, hosted on Vercel
* Supabase (PostgreSQL) for storage, accessed only from server routes
* SheetJS (xlsx) for reading and writing Excel files

## 4\. Functional requirements

**FR-1 Login.** A single shared staff password gates the whole app. The password is checked on the server and a signed, httpOnly session cookie is issued. Logout is available.

**FR-2 Excel upload.** Staff upload an .xlsx file with exactly these headers: Name, Phone, Branch, Visit Time. The app shows a preview before importing. Rows with a missing name, an invalid phone, an unknown branch or an unreadable visit time are flagged and skipped, and a summary of imported and skipped rows is shown. Duplicates are not skipped automatically.

**FR-3 Add patient.** A "+" button at the top right opens a form with Name, Phone, Branch (dropdown of configured branches) and Visit Time (defaults to now). Saving adds the patient to the table immediately.

**FR-4 Patient table.** Columns: Name, Phone, Branch, Visit Time, Status, WhatsApp. Newest visits appear first. A search box filters by name or phone.

**FR-5 WhatsApp button.** Each row has a button that opens a WhatsApp click-to-chat link in a new tab, with the message pre-filled using the selected language, the patient's name, the branch and that branch's review link. Clicking marks the patient as Sent (with date and time) and the button turns grey and disabled.

**FR-6 Phone normalisation.** Spaces, dashes, brackets, "+" and a leading 0 are stripped. A 10-digit number gets 91 prefixed. A 12-digit number starting with 91 is kept as is. Anything else is flagged as invalid.

**FR-7 Language switch.** A toggle above the table switches the message language between English (default) and Malayalam. The choice applies to all rows and is remembered per browser.

**FR-8 Settings: branches.** Staff can add, edit and remove branches, each with a name and a Google review link.

**FR-9 Settings: message templates.** One editable template per language. Supported placeholders: {name}, {branch}, {review\_link}. A live preview shows the rendered message.

**FR-10 Export.** An Export button downloads the current table (respecting the search filter) as .xlsx, including the Sent status and sent time.

## 5\. Data model

* **branches:** id, name, review\_link, created\_at
* **patients:** id, name, phone (normalised), branch\_id, visit\_time, sent\_at (nullable), sent\_language (nullable), created\_at
* **templates:** language (en or ml), body, updated\_at

Supabase tables have row-level security enabled with no public policies. Only the server uses the service-role key.

## 6\. Message templates (defaults)

**English:**

Hello {name}, thank you for visiting Medimall {branch}. Your feedback means a lot to us. Could you please take a minute to share your experience on Google? {review\_link}(https://search.google.com/local/writereview?placeid=YOUR\_PLACE\_ID)

**Malayalam (draft, to be reviewed by a native speaker):**

നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി. താങ്കളുടെ അഭിപ്രായം ഞങ്ങൾക്ക് വളരെ വിലപ്പെട്ടതാണ്. ദയവായി ഒരു ഗൂഗിൾ റിവ്യൂ നൽകാമോ? {review\_link}(https://search.google.com/local/writereview?placeid=YOUR\_PLACE\_ID)

The link format is https://wa.me/<number>?text=<url-encoded message>.
Review Link PlaceIDS:
Kunnamangalam

ChIJWy50EdNdpjsR4vFgODmfdh8

Malappuram

ChIJ7VJ-NwBLpjsRptYYI9zGaHo



## 7\. Non-functional requirements

* Works on desktop Chrome and Edge (primary) and on mobile browsers.
* The table stays usable with a few thousand patients (paginate or virtualise).
* The shared password and Supabase keys live in environment variables, never in client code.
* Patient phone numbers are personal data, so the app is not public and has no indexing.

## 8\. Out of scope for v1

* Automatic sending or the WhatsApp Business API
* Edit and delete patient, filters by branch, date or status, duplicate skipping
* Individual staff accounts and audit logs
* Column mapping for differently named Excel headers

## 9\. Open items

* **Review links:** the two links shared are Google search result pages for Medimall and Medimall Malappuram. For best results, use each branch's direct Google review link (the "Ask for reviews" link from Google Business Profile).
* **Branch names:** exact names to match against the Excel Branch column.
* **Malayalam wording:** to be confirmed by a native speaker.
* **Visit Time format:** confirm whether the Excel cells are real date-time values or text, and in what format.
* **Resend:** should staff be able to reset a patient back to unsent?


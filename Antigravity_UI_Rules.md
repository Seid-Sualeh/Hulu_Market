# Hulu Market --- Antigravity UI-Only Change Protection Rules

**Purpose:** This document is a mandatory project-wide instruction for
every Antigravity task that redesigns or improves the user interface of
Hulu Market.

**Highest-priority rule: UI ONLY. Preserve 100% of existing application
logic and functionality.**

Antigravity must read this document completely before inspecting,
planning, editing, or generating code for any UI redesign task. These
rules apply together with the specific page-design prompt and reference
image supplied by the project owner.

------------------------------------------------------------------------

## 1. Non-negotiable scope

A UI redesign means changing only how the existing application looks and
how its existing interface is arranged.

Allowed work, when needed: - Visual styling: colors, typography,
spacing, borders, shadows, radii, and visual hierarchy. - Responsive
layout and accessibility improvements. - Reorganizing existing visual
elements without changing their meaning or behavior. - Improving
existing buttons, forms, cards, tables, tabs, modals, navigation, and
empty/loading/error-state presentation. - Reusing or extracting
presentation-only components when behavior remains identical. - Adding
purely presentational icons or decorative assets that do not change
functionality.

Not allowed unless the project owner explicitly authorizes it in a
separate task: - New features, workflows, business rules, or user
capabilities. - Changes to backend behavior, APIs, database structures,
migrations, queries, or stored data. - Changes to authentication,
authorization, permissions, roles, or session handling. - Changes to
validation rules, calculations, pricing, wallet balances, deposits,
withdrawals, escrow, refunds, payouts, or financial state transitions. -
Changes to listing creation, moderation, ownership, purchasing,
delivery, downloads, disputes, notifications, or chat lifecycle. -
Changes to routing destinations, URL structure, navigation meaning, or
access restrictions. - Replacing real data with mock, sample, static, or
hardcoded data. - Removing, disabling, renaming, or silently changing
any existing control or interaction. - Refactoring unrelated code,
upgrading dependencies, changing frameworks, or modifying global
architecture.

If a requested visual design appears to require a functional change, do
not implement that functional change. Keep the existing behavior and
report the visual limitation or ask for explicit authorization.

## 2. Mandatory pre-change inspection

Before editing any file:

1.  Read this document and the current page-specific request.
2.  Inspect the target page and all components it uses.
3.  Trace the existing data sources, props, state, event handlers,
    hooks, form submission, validation, API calls, and navigation.
4.  Identify shared components and styles that may affect other pages.
5.  Record the existing controls and what each one currently does.
6.  Identify the files that are genuinely necessary for a
    presentation-only change.
7.  Establish a baseline by running the available relevant checks before
    editing, where the environment permits.

Do not guess how a component works. Read its implementation and follow
the actual data and event flow.

If the existing implementation is unclear, incomplete, or broken, do not
rewrite it as part of a visual task. Report the issue and request
direction.

## 3. Protected application layers

Treat the following as protected by default:

-   Backend source code, API routes, middleware, services, and
    controllers.
-   Database schemas, migrations, indexes, triggers, and seed data.
-   Authentication, authorization, permission checks, and role
    enforcement.
-   Business logic, domain services, financial calculations, and
    transaction handling.
-   API contracts, request payloads, response shapes, and error
    semantics.
-   Storage adapters, private files, upload/download security, and
    access control.
-   Existing tests and test fixtures.

Prefer editing page-level styles, presentation components, and narrowly
scoped frontend layout code.

Do not edit protected files merely because they are nearby or
convenient. If a protected-file change seems unavoidable, STOP and
request explicit permission before editing it.

## 4. Preserve every existing interaction

Every existing control must continue to work exactly as it did before
the redesign.

Preserve: - Button actions and click handlers. - Form fields, names,
values, controlled state, validation, and submit behavior. - Search,
filtering, sorting, pagination, and tabs. - File selection, upload
progress, previews, and download behavior. - Modal open/close behavior
and confirmation steps. - Navigation links and route destinations. -
Loading, success, error, disabled, and empty states. - Keyboard
behavior, focus handling, and accessibility semantics.

Do not use decorative controls that look functional but do nothing. Do
not replace real handlers with placeholders. Do not change an existing
action merely to match a reference image.

If a visual element is absent from the current application, do not
invent its underlying functionality. A visual-only addition is allowed
only if it does not imply a new capability or mislead the user.

## 5. Hulu Market business rules that must never be weakened

The following project rules are especially sensitive. Preserve the
actual implementation and do not alter them during UI work:

### Marketplace and listings

-   Preserve existing listing categories, seller ownership, listing
    status, moderation, search, filters, and marketplace behavior.
-   Preserve the distinction between single-sale social-media listings
    and reusable digital-product listings.
-   Digital-product listings must remain reusable according to the
    existing business rules; do not visually or functionally imply that
    a completed digital purchase transfers the listing to the buyer.
-   Do not change listing prices, seller data, platform metrics, or
    inventory state.

### Escrow and wallet

-   Never change wallet calculations, locked balances, deposits,
    withdrawals, fees, refunds, payouts, or escrow state transitions.
-   Never make a UI action directly imply that funds have been released
    unless the existing backend state confirms it.
-   Do not add client-side-only financial status changes.

### Three-way escrow chat

-   Preserve buyer, seller, and admin participant permissions and
    order-specific chat isolation.
-   Preserve message history and existing attachment security.
-   A trade conversation remains open until both buyer and seller have
    confirmed completion.
-   Only an authorized admin may close the chat after both confirmations
    have been recorded and validated by the backend.
-   A closed conversation remains read-only for buyer and seller, with
    history preserved.
-   Closing a chat does not itself release or refund escrow funds.

### Notifications and disputes

-   Preserve notification privacy, recipient ownership, unread counts,
    read status, and existing navigation.
-   Preserve dispute eligibility, participant authorization, evidence
    privacy, internal-admin-note confidentiality, and dispute history.
-   A dispute must not automatically close the chat or independently
    release/refund escrow funds.

These are preservation constraints, not permission to reimplement or
modify the underlying features.

## 6. Reference-image rules

When a screenshot or generated design is supplied:

-   Treat it as a visual reference, not as a replacement application or
    source of business data.
-   Match its visual direction where practical: layout, hierarchy,
    colors, spacing, card style, typography, and responsive composition.
-   Use actual Hulu Market data and existing application state.
-   Do not copy fictional names, prices, counts, statuses, messages, or
    transaction details from the reference image into the application.
-   Do not add image-only controls or flows that do not exist in the
    current application.
-   Preserve the current brand identity and project conventions unless
    the owner explicitly requests a brand change.

If the reference image conflicts with current functionality, the
existing functionality wins.

## 7. Safe implementation method

-   Make the smallest possible set of changes.
-   Prefer scoped CSS/classes and existing styling tools.
-   Reuse existing components and dependencies.
-   Avoid broad global CSS changes.
-   Avoid changing shared components unless their impact on every
    consumer has been checked.
-   Do not change component props, API contracts, data models, or state
    semantics just to simplify styling.
-   Keep responsive changes presentation-only.
-   Do not delete code because it appears unused without proving that it
    is not used elsewhere.
-   Do not run destructive commands, reset databases, clear storage, or
    alter production data.
-   Do not expose secrets, tokens, private URLs, storage keys, or
    personal information in screenshots or logs.

If you discover a pre-existing defect, document it separately. Do not
silently fix it under the UI-only scope.

## 8. Required verification after changes

Run the relevant checks available in the repository and report the exact
results:

1.  Frontend lint/type-check/build, as supported by the project.
2.  Relevant existing tests.
3.  Browser/runtime console inspection where available.
4.  Desktop, tablet, and mobile layout checks.
5.  Navigation and interaction checks for every affected control.
6.  Form validation and submission checks without creating unintended
    real transactions.
7.  Regression checks for shared components and adjacent pages.
8.  Confirmation that protected backend and database files were not
    changed.

Compare the result with the baseline. Do not claim a test passed unless
it was actually run and its result was observed.

A successful build alone does not prove that functionality was
preserved.

## 9. File-change and scope audit

Before finishing:

-   Review the complete changed-file list and diff.
-   Confirm that every change is necessary for the requested UI
    redesign.
-   Revert accidental or unrelated changes.
-   Confirm no backend, database, API contract, financial,
    authorization, or business-rule changes were made.
-   Confirm no hardcoded or fabricated data was introduced.
-   Confirm that existing controls and workflows remain present.
-   If any protected file was changed, stop and clearly disclose it; do
    not describe the task as UI-only.

Do not conceal, minimize, or automatically justify scope violations.

## 10. Stop conditions

STOP without making the questionable change and report the issue if:

-   A visual request requires changing business logic or backend
    behavior.
-   A required component's behavior cannot be understood.
-   The existing page depends on a shared component whose modification
    could break other pages.
-   The design requires new data or an API that does not already exist.
-   You discover a security, authorization, privacy, or
    financial-integrity concern.
-   You cannot preserve an existing interaction with confidence.
-   The requested design conflicts with these protection rules.

Ask the project owner for explicit authorization before expanding the
scope.

## 11. Mandatory final report

At the end of every UI task, provide:

1.  **Scope:** The exact page and UI areas redesigned.
2.  **Files changed:** Every modified file and why it was needed.
3.  **Protected files:** Explicitly state whether backend, database,
    API, authentication, authorization, and business-logic files were
    untouched.
4.  **Functionality preservation:** List the existing interactions
    checked.
5.  **Verification:** Exact commands, test names/counts,
    build/type-check results, and any checks not run.
6.  **Responsive review:** Desktop, tablet, and mobile results.
7.  **Known limitations:** Any unresolved issue or behavior not
    verified.
8.  **Scope confirmation:** State whether all changes remained
    presentation-only.

Never claim "zero logic changes" unless the diff and affected code paths
have been reviewed to support that statement.

------------------------------------------------------------------------

## 12. Mandatory instruction to Antigravity

Before every Hulu Market UI redesign, read and obey this file in full.

**The page-specific prompt defines what visual improvement is requested.
This document defines the safety boundaries. Both must be followed.**

**Priority order:** 1. Preserve security, data integrity, authorization,
financial integrity, and existing business rules. 2. Preserve all
existing functionality and API contracts. 3. Follow the requested page
scope. 4. Match the supplied visual reference as closely as possible.

**Final rule: If you cannot make the requested design change without
risking existing logic or functionality, do not make that change. Stop,
explain the conflict, and ask for permission.**

**UI ONLY. NO LOGIC CHANGES. NO FUNCTIONALITY CHANGES. NO UNAUTHORIZED
SCOPE EXPANSION.**

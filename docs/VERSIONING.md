# Versioning and release workflow

The current project version is **1.3.78**, recorded in the root `VERSION` file.

Every completed user-requested change must advance the patch/minor version as
appropriate, update the shared version sources, and record the release in this
document before it is considered complete.

## Release history

- **1.3.19**: Responsive mobile card layout for admin resource lists, including
  drivers, trips, buses, routes, and other shared admin tables.
- **1.3.20**: Reversed seat numbering within each row so numbering starts from
  the right side, consistently across the admin web panel and driver app.
- **1.3.21**: Added a responsive super-admin list showing the admin count,
  usernames, roles, and stored password previews.
- **1.3.22**: Added a legacy singular `/auth/admin` alias and restarted
  release services so the super-admin card list works with older web bundles.
- **1.3.23**: Reconciled the configured bootstrap super-admin hash and
  password preview when the existing database record is out of sync.
- **1.3.24**: Added super-admin controls to generate replacement passwords
  for legacy admins and delete non-super-admin accounts.
- **1.3.25**: Replaced automatic admin password generation with a secure
  manual password input and update flow.
- **1.3.26**: Updated the admin driver editor so password changes use a
  manual input and refreshed password previews remain visible in the list.
- **1.3.27**: Moved mobile resource editing forms directly beneath the
  selected card instead of rendering them below the entire list.
- **1.3.28**: Fixed the admin tracking-health list and connected driver
  heartbeat data, including GPS, connectivity, tracking, battery, and device
  metadata.
- **1.3.29**: Added a step-by-step on-screen permission flow for location,
  notifications, and background operation in the driver app and web version.
- **1.3.30**: Displayed the logged-in driver's name and phone at the top of
  tracking-health records instead of leading with the device identifier.
- **1.3.31**: Removed the custom permission checklist prompt and stopped
  treating battery optimization as a blocking permission; live location,
  notifications, and GPS results are now checked directly after requests.
- **1.3.32**: Treated unsupported browser notifications as optional instead of
  falsely reporting a missing permission.
- **1.3.33**: Removed the unreliable battery-optimization warning from the
  blocking readiness checks and immediately clear stale GPS warnings after
  successful permission and GPS checks.
- **1.3.34**: Removed the separate location-permission status row from the
  driver readiness panel while retaining the required system permission check.
- **1.3.35**: Fixed passenger-confirmation requests in the driver app to use
  the shared Bearer-token authentication helper.
- **1.3.36**: Fixed the driver's current-trip lookup to include assigned trips
  before `activeDriverId` is set.
- **1.3.37**: Removed the blocking permission/readiness screen from the driver
  trip flow and restored persistent driver login across screen refreshes.
- **1.3.38**: Simplified the admin login header by hiding internal navigation
  links and styling the account-login action as a left-side UI button.
- **1.3.39**: Made the admin login header compact and fixed the login page to
  the viewport without mobile scrolling.
- **1.3.40**: Tightened the mobile login header button and locked the login
  screen to the viewport so it cannot scroll.
- **1.3.41**: Locked document-level overflow on the admin login route to remove
  the remaining mobile scroll offset.
- **1.3.42**: Restored the login-page version label and positioned it slightly
  above the bottom edge on mobile.
- **1.3.43**: Replaced the project-wide Inter font stack with the B Yekan
  font stack across the admin web panel and driver app.
- **1.3.44**: Added locally bundled Vazirmatn Arabic font weights and applied
  Vazirmatn across the web panel and driver app.
- **1.3.45**: Removed the redundant admin navigation links from the top bar;
  panel sections remain available in the page content below.
- **1.3.46**: Fixed the driver trip-list authentication header and surfaced
  the API response when trip loading fails.
- **1.3.47**: Added the logged-in driver's profile section to the driver
  navigation bar with name, surname, photo, and a shared person placeholder.
- **1.3.48**: Moved the driver profile into a full-width clickable section
  below the navigation bar with photo, name, and phone number.
- **1.3.49**: Reduced mobile driver navigation font size and spacing so all
  navigation buttons remain aligned in one row.
- **1.3.50**: Added driver self-service profile photo upload/removal and
  password change controls without exposing the new password in the driver app.
- **1.3.51**: Aligned the driver profile back button with the profile title
  and moved it to the left side of the header row.
- **1.3.52**: Added a dedicated password-change flow requiring the current
  password, a new password, and confirmation before updating the driver account.
- **1.3.53**: Validated stored driver sessions against the API before opening
  the main application, clearing invalid sessions and showing the login form.
- **1.3.54**: Improved driver photo upload validation and enabled conditional
  scrolling only when app content exceeds the available viewport.
- **1.3.55**: Locked the driver app document viewport and isolated scrolling to
  the main content area so fixed app sections never shift.
- **1.3.56**: Added real-time driver profile photo upload percentage and
  progress-bar feedback.
- **1.3.57**: Made the driver photo picker touch-friendly on mobile by using
  a native file input over the upload control.
- **1.3.58**: Added a driver profile logout button that clears the local
  session and returns the app to the login screen.
- **1.3.59**: Added a show/hide password eye control to the driver login form.
- **1.3.60**: Fixed the password visibility control position so the eye
  remains centered and only its visibility state changes.
- **1.3.61**: Reloaded the driver profile from the authenticated API after
  login so profile photos persist across logout and login cycles.
- **1.3.62**: Removed driver-app controls for uploading and deleting profile
  photos; profile photos remain managed through support/admin workflows.
- **1.3.63**: Normalized Iranian driver phone numbers so login accepts
  numbers with or without the leading zero while driver and support views
  consistently display the `09...` format.
- **1.3.64**: Added driver profile avatars and real-time photo upload progress
  to the admin/support driver cards and desktop table rows.
- **1.3.65**: Corrected support/admin driver photo URLs to target the API
  host serving `/uploads` instead of the web application host.
- **1.3.66**: Added password visibility control to admin login and reduced
  completed passenger tracking links to the completion confirmation only.
- **1.3.67**: Locked the completed tracking confirmation to the viewport and
  prevented unconfirmed assigned trips from appearing as the current trip.
- **1.3.68**: Disabled document and touch overscroll while displaying the
  completed tracking confirmation.
- **1.3.69**: Kept unconfirmed driver trips in the new-trips flow and added
  a red count badge for trips waiting for driver confirmation.
- **1.3.70**: Made the driver-app title refresh the page when tapped.
- **1.3.71**: Fixed responsive new-trip cards so route, status, schedule,
  and confirmation controls stay separated without overlapping.
- **1.3.72**: Localized pending driver status and blocked unconfirmed trips
  from appearing in the driver's current-trip screen.
- **1.3.73**: Removed trips from the new-trip list immediately after the
  current driver confirms them.
- **1.3.74**: Removed the duplicate new-trip status badge and localized the
  remaining pending status as waiting for driver confirmation.
- **1.3.75**: Added driver trip history backed by a completed/cancelled trips
  API endpoint.
- **1.3.76**: Included completed trips linked through driver confirmations,
  ensuring every confirming driver receives the history card.
- **1.3.77**: Added a refresh control to reload the driver's trip history
  without leaving the history screen.
- **1.3.78**: Expanded the bilingual project guide, documented repeatable
  dependency setup, and added project screenshots.

## Branches

- `main`: tested, public-ready versions only.
- `develop`: integration branch for the next version.
- `feature/<name>`: one focused change based on `develop`.

Changes must be tested on their feature branch before merging into `develop`.
After the integrated checks pass, `develop` is merged into `main` and tagged.

## Version numbers

Use semantic versioning:

- `1.0.1`: bug fixes that preserve the existing behavior and API.
- `1.1.0`: backward-compatible features or UI behavior additions.
- `2.0.0`: breaking API, data, or deployment changes.

When releasing a version, update `VERSION`, every workspace `package.json`, and
the UI/Android version constants, run the required checks, commit the release,
and create an annotated Git tag:

```powershell
git checkout develop
git checkout -b feature/my-change
# implement and test
git checkout develop
git merge --no-ff feature/my-change
# update VERSION and package versions
git checkout main
git merge --no-ff develop
git tag -a v1.1.0 -m "Release v1.1.0"
```

## Required checks before a public release

```powershell
pnpm typecheck
pnpm build
pnpm test
pnpm format:check
```

Do not commit `.env` files, dependency folders, build caches, or generated APK
files. Keep production secrets outside Git.

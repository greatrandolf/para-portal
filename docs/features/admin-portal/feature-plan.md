# Feature plan: Para Portal (JeepTrack Coop Transit admin portal)

## Request
Implement the Para Portal web app from the two Stitch screens in project `15546976224181965559`:

| Stitch screen | Title | Route |
|---|---|---|
| `1aefc412e98b48cb973823a0815b14b4` | Admin Route Management & Waypoint Editor (Route 17B) | `/routes` |
| `fb791c5609244aa28b09b6698a1acece` | Driver Registration & Cooperative Approvals | `/drivers` |

Follow `docs/project-structure.md`. The app is `para-portal/` (Expo Router, SDK 58, web-first, still renders on native).

## Architecture
The portal has one role, the cooperative admin/dispatcher, so it uses an `(admin)` route group instead of `(commuters)` / `(drivers)`.

```
para-portal/
├── packages/
│   ├── ui/src/               # theme/, AppText, Icon, Badge, Button, Card, Avatar,
│   │                         # ProgressBar, SegmentedControl, Slider, Toast
│   └── responsive/src/       # useBreakpoint()
├── src/
│   ├── app/
│   │   ├── _layout.tsx       # fonts, root Stack
│   │   └── (admin)/
│   │       ├── _layout.tsx   # PortalShell around <Slot />
│   │       ├── index.tsx     # redirect -> /routes
│   │       ├── routes.tsx    # RouteEditorScreen
│   │       ├── drivers.tsx   # DriverRegistrationScreen
│   │       ├── fleet.tsx, payouts.tsx, schedules.tsx   # ComingSoonScreen
│   ├── navigations/PortalShell/   # sidebar + top bar
│   ├── screens/admin/RouteEditor/, screens/admin/DriverRegistration/
│   ├── screens/shared/ComingSoon/
│   ├── constants/ (theme re-export, navigation items)
│   ├── services/ (routeService, driverService + mock data)
│   ├── types/ (route.ts, driver.ts)
│   └── utils/ (format.ts)
```

Design tokens come from the Stitch Tailwind config (Material 3 palette, `#ff5e00` primary container, Inter + Plus Jakarta Sans). Icons use `@expo/vector-icons` MaterialIcons (kebab-case of the Material Symbols names). The base map is drawn with `react-native-svg` (no hot-linked Stitch image).

## Tasks
1. Theme + `packages/ui` components (one folder each: `index.ts`, `styles.ts`, `Component.tsx`) and `packages/responsive`.
2. `PortalShell`: sidebar (brand, coop selector, nav with active state and badge, GPS sync card) and top bar (active units, live telemetry, notifications, admin profile). Narrow widths: sidebar becomes a horizontal nav strip.
3. Route Editor screen: route header, quick actions, publish CTA + toast, SVG corridor map with 8 pins, selected-stop popover, map type toggle, zoom, legend, KPI cards, inspector with radius slider, waypoint list, simulation runner, certification card.
4. Driver Registration screen: compliance banner with countdown, 4 KPI tiles, tabs/search/route filter, queue list, dossier (profile, wallet, vehicle, documents, audit trail), approve / re-upload / reject actions with toasts.
5. Placeholder screens for the three nav items not designed yet.

## Acceptance criteria
- AC1. `/` redirects to `/routes`; the sidebar navigates to all five sections and highlights the active one.
- AC2. Route Editor shows Route 17B header, 8 waypoints in the map and the inspector list, the three KPI cards, and the LTFRB certification card, matching the Stitch screen.
- AC3. Selecting a waypoint (list or map pin) highlights it in both places and updates the stop popover.
- AC4. The geofence radius slider ranges 20–50 m and updates the "N meters" readout and the selected stop's fence text.
- AC5. "Publish to Fleet" shows a success toast; "Reverse Corridor" reverses the waypoint order; "+ Add Waypoint" inserts a new stop before the destination terminal.
- AC6. "Simulate Unit GMD-1782 run" moves the unit marker through every stop, shows RUNNING, then PASSED (0 ERRORS).
- AC7. Map type toggle (Vector / Satellite / Terrain) changes the base map palette; zoom +/- and recenter work.
- AC8. Driver Registration shows the compliance banner with a live countdown, 4 KPI tiles, the three tabs with counts, and the queue for the active tab.
- AC9. Search filters the queue by name, ID, or plate; the route filter filters by corridor; an empty result shows an empty state.
- AC10. Selecting a queue card shows that driver's dossier (profile, wallet, vehicle, documents, audit trail).
- AC11. Approve shows a loading state, then "Approved & Dispatched" and a toast; Request Re-upload shows a toast; Reject asks for a reason inline and shows a toast on confirm.
- AC12. Layout works at desktop (≥1280), tablet (768), and phone (375) widths without horizontal page scroll.
- AC13. No hex/rgba literals outside `packages/ui/src/theme`; `packages/` does not import from `src/`.
- AC14. `npx tsc --noEmit` and `npx expo lint` pass.

## Risks
- `react-native-svg` on web: supported by Expo; verified in the browser preview.
- Data is mock data in `src/services/mock/`; no backend exists yet.

## Revision 2: real map with road-snapped routes (2026-11-10)
User request: replace the schematic map with a real map where routes are created on real coordinates along roads.

- Web uses `CorridorMap.web.tsx`: Leaflet (`react-leaflet`) with OpenStreetMap / Esri World Imagery / OpenTopoMap tiles for Vector / Satellite / Terrain. Native keeps the SVG schematic (`CorridorMap.tsx`).
- Road geometry comes from OSRM (`src/services/routingService.ts`, `src/hooks/useRoadRoute.ts`). Default server is the public OSRM demo (development only); set `EXPO_PUBLIC_OSRM_URL` for production.
- Stops carry approximate real WGS84 coordinates for Cebu City (`src/services/mock/routeData.ts`).

Added acceptance criteria:
- AC15. The web map shows real tiles and the corridor follows roads (OSRM), with distance and duration in the status chip; if OSRM fails, straight dashed segments and an error chip are shown.
- AC16. "+ Add Waypoint" enters placing mode; a map click snaps the point to the nearest road, names it after the road, and inserts it where it adds the least detour.
- AC17. Dragging a stop moves it, snaps it to the nearest road, and re-routes.
- AC18. Intermediate stops can be removed from the stop card; terminals cannot.
- AC19. The geofence circle uses the slider radius in real metres.

## Revision 3: two directions (2026-11-10)
User request: separate "going to Sto. Niño" and "going back to IT Park" stop lists, with a slightly different return route.

- `TransitRoute.directions.outbound` ("Going to Sto. Niño": IT Park → Carbon via Lahug, Escario, Colon; adds the Basilica del Santo Niño stop) and `directions.inbound` ("Going back to IT Park": Carbon → IT Park via Osmeña Blvd and Gorordo Ave).
- AC20. The inspector has a direction toggle under the geofence radius; the list, map, stop count, and simulation follow the selected direction.
- AC21. The other direction is drawn faint and dashed on the map and listed in the legend.
- AC22. "Reverse to Return Trip" rebuilds the return trip as a mirror of the outbound stops and opens it for editing; edits to one direction do not change the other.

## Revision 4: right-side lanes and curbside geofences (2026-11-10)
User request: shift the "Going to Sto. Niño" route and its geofence a little to the right so the return route has its own space.

- Right-hand traffic: each direction's line is drawn 5 px to the right of travel (`offsetPath` in `src/utils/geo.ts`), so on shared roads the two directions sit side by side instead of overlapping. The offset is in screen pixels, so it holds at every zoom level.
- The selected stop's geofence is centred 8 m to the right of the road centre (curbside), shown as "right curb" on the stop card.
- AC23. On a road both directions use, the outbound line and the faint return line are both visible, each on its own right-hand side.
- AC24. The geofence circle sits on the right-hand curb for the direction being edited.

## Revision 5: route data from para-backend (2026-11-10)
User request: Cloud Functions in `para-backend` to fetch, add, edit, and soft delete routes and waypoints, deployment docs, and a query package in the portal that the Route Editor uses.

- Backend: `para-backend/functions/src/routes/` has 9 callables in `asia-southeast1`: `routesList/Get/Create/Update/Delete/Reverse` and `waypointsCreate/Update/Delete`. Data lives in `routes/{id}` and `routes/{id}/waypoints/{id}`. Deletes are soft (`deletedAt`, `deletedBy`). Writes run in transactions that keep stop `order` and traffic `segments` consistent. Writes need the `admin` claim and reads need a signed-in user; the emulator allows anonymous calls. The docs are `para-backend/docs/deployment.md` and `para-backend/docs/api.md`.
- Portal: `packages/tanstack/query` (alias `@packages/tanstack/query/*`) has a fetch-based callable client, `QueryProvider`, route types, query keys, and hooks (`useRoutes`, `useRoute`, and the create/update/delete/reverse mutations). Waypoint mutations are optimistic. `EXPO_PUBLIC_FUNCTIONS_URL` selects the backend; the default is the local emulator.
- The Route Editor loads Route 17B from the backend. Placing, moving, and removing stops, and Reverse to Return Trip, are saved through the mutations. The local mock route data was removed (the seed now lives in `para-backend/functions/src/seed/route17b.json`).

- AC25. The Route Editor loads Route 17B from the backend and shows a loading state, an error state with Try again, and an empty state.
- AC26. Adding, moving, and removing a stop, and Reverse to Return Trip, persist after a reload. A removed stop stays in Firestore with `deletedAt` set.
- AC27. The backend rejects invalid input, removing a terminal, and duplicate route codes, with clear error messages shown as toasts.

## Revision 6: admin sign-in (2026-11-10)
User request: add sign-in so the portal works against deployed functions.

- Firebase Auth (Email/Password) in `src/services/firebase.ts`. The app uses the Auth emulator when `EXPO_PUBLIC_FIREBASE_API_KEY` is unset. `src/hooks/useAuth.tsx` provides `AuthProvider` and `useAuth` (status, `isAdmin` from the `admin` claim, sign in/out, password reset, `refreshClaims`).
- `src/app/(auth)/login.tsx` uses `screens/shared/Login`. The root `Stack.Protected` guards show `(admin)` only to admins; everyone else gets the login route.
- `QueryProvider` gets `getIdToken`, so every backend call carries the user's ID token. Signing out clears the query cache.
- The top bar shows the signed-in user and a sign-out button.
- Backend: `npm run seed` creates an admin and a non-admin test account in the Auth emulator (`functions/src/seed/emulatorUsers.json`). A signed-in non-admin is refused writes even on the emulator.

- AC28. Signed out, any portal URL shows the sign-in screen; after an admin signs in, the portal opens on `/routes`.
- AC29. Wrong credentials show a clear inline error; "Forgot password?" sends a reset email (or asks for the email first).
- AC30. A signed-in user without the `admin` claim sees "No admin access" with Check again and Sign out; backend writes with their token return PERMISSION_DENIED.
- AC31. Sign out returns to the sign-in screen and clears cached route data.

## Revision 7: create a new route corridor (2026-11-11)
User request: in the portal, add a new route and its waypoint corridor, including the "Going to" trip and the reverse "Going back to" trip, using the para-backend route API.

- Route switcher: the ⌄ button on the route card opens a list of the cooperative's routes (`useRoutes`) and a "+ New route" action. The selected route is kept in the URL (`/routes?route=<id>`), so a reload keeps it.
- New Route form (modal) collects:
  - route code, origin and destination terminal names;
  - route name, "Going to …" and "Going back to …" labels, and via text, auto-filled from the terminals and editable;
  - fare, per-km rate, headway, speed cap and zone, franchise ID, and status (default Paused).

  It calls `routesCreate` (`useCreateRoute`), and backend errors (such as a duplicate code) show inline.
- Building the corridor: after creation the editor opens the new route on "Going to" with placing mode on.
  1. The first map click places the origin terminal and the second places the destination terminal, named after the form's terminals.
  2. Later clicks insert stops between them (cheapest insertion).
  3. When the outbound trip has 2 or more stops and the return trip is empty, the inspector offers "Build return trip", which uses `routesReverse`. The return trip can then be edited separately, as before.
- Routes with 0 or 1 stops render safely:
  - the map falls back to Cebu City bounds;
  - there is no OSRM request until 2 stops;
  - the status chip shows guidance;
  - a route without traffic segments is drawn as one "optimal" line.
- The direction tabs use the route's own labels instead of hard-coded Sto. Niño / IT Park text.

- AC32. The route switcher lists active routes, marks the current one, and switching loads that route; the selection survives a reload.
- AC33. The New Route form validates required fields, shows backend errors inline, and creates the route with both direction labels.
- AC34. On a new route, the first two map clicks place the origin and destination terminals, and later clicks add stops between them; every change persists after a reload.
- AC35. "Build return trip" creates the reverse trip from the outbound stops; both trips show in the direction toggle with their own labels and stop counts.
- AC36. An empty or one-stop route renders without errors on web and native.

## Revision 8: route list and stop editing (2026-11-11)
User requests:
- edit and delete routes;
- remove an end stop, so a trip can end at Sto. Niño instead of Carbon;
- edit any stop, including the start;
- a list of routes (17B, 17C, 17D, …) where tapping a row opens its map editor, and new routes go straight to adding waypoints.

- Edit route (pencil on the route card) uses `routesUpdate`. Delete route (in the edit dialog, confirmed) uses `routesDelete` (soft delete).
- `waypointsDelete` can remove the first or last stop while a trip keeps 2 or more stops; the neighbour becomes the terminal.
- The Edit stop form (from the stop card) edits name, role, map label, type, dwell, pax waiting, and coordinates through `waypointsUpdate`. Only changed fields are sent.
- `/routes` is now a **Routes list**:
  - It shows every active route with its code, name, status, headway, franchise, and both trips with their stop counts.
  - It has search and a "New route" button.
  - Tapping a row opens `/routes/<routeId>`, the map editor.
- `routesList` returns each direction's label, via, and active stop count.
- After "New route", the editor for the new route opens in placing mode, and its first two clicks are named after the form's terminals (passed as URL params).
- The editor's ⌄ route switcher is replaced by "All routes" (back to the list). Deleting a route returns to the list.

- AC37. `/routes` lists all active routes with both trips' labels and stop counts; search filters by code or name; an empty list offers "New route".
- AC38. Tapping a row opens that route's map editor at `/routes/<id>`; "All routes" returns to the list; a reload keeps the open route.
- AC39. Creating a route from the list opens its editor ready to place the origin terminal.
- AC40. An end stop can be removed while 2 or more stops remain, and any stop can be edited from its card.

## Revision 9: Fleet & Asset Management (2026-11-11)
User request: a new screen from the Stitch design "Fleet & Asset Management" (project 15546976224181965559, screen 2471a388…).

- New route `/fleet-assets` (`src/app/(admin)/fleet-assets.tsx`; `/assets` is reserved by the Metro dev server) and sidebar item "Fleet & Asset Management". The screen lives in `src/screens/admin/FleetAssets/`.
- Data is mock data for now (`src/services/mock/fleetData.ts` through `src/services/fleetService.ts`), with the same pattern as Driver Registration. A backend for vehicles and drivers is a follow-up.
- Layout:
  - Header with Register Vehicle, Add Driver Account, Assign Driver to Unit, and Export.
  - Four stat cards (registered vehicles, certified drivers, active pairings, standby drivers) computed from the data.
  - Three tabs: Vehicle Inventory, Driver Accounts, Roster & Assignments.
- Vehicle Inventory:
  - Search by code or plate; filters by type, route, and status; 6 per page with Prev and Next.
  - Row actions: maintenance toggle, reassign, Deploy for standby units, and view for inactive units.
- Driver Accounts: search by name or ID, a status filter, and Assign for available drivers.
- Roster & Assignments:
  - A form to pick a unit, a driver, a route, and a start date. Confirm & Deploy pairs them, releases any previous pairing of either one, and adds a history row.
  - An assignment history table.
- Register Vehicle and Add Driver Account dialogs validate required fields and unique codes, then add the record.
- On phone widths, table rows stack as cards; there is no horizontal page scroll.

- AC41. `/fleet-assets` opens from the sidebar and shows the header, the four stat cards, and the three tabs, with counts that match the data.
- AC42. The vehicle search and the type, route, and status filters narrow the table; pagination shows 6 per page with correct "Showing x of y".
- AC43. Register Vehicle rejects empty fields and duplicate codes or plates, and adds a valid unit to the inventory and the counts.
- AC44. Assigning a driver to a unit updates the vehicle row, the driver row, the history, and the Active Pairings count; the previous pairing of that unit or driver is ended.
- AC45. Add Driver Account rejects empty fields and duplicate license numbers, and adds an "Available" driver.
- AC46. The layout works at 375px wide (rows stack, no horizontal scroll) and at desktop widths (table columns).

## Revision 10: fleet backend (2026-11-11)
User request: replace the Fleet & Asset Management mock data with a real backend.

- para-backend adds the `vehicles`, `drivers`, `assignments`, and `counters/drivers` collections, and these callables:
  - `fleetList`
  - `vehiclesCreate`, `vehiclesUpdate`, `vehiclesSetStatus`, `vehiclesDelete` (soft)
  - `driversCreate`, `driversUpdate`, `driversDelete` (soft)
  - `assignmentsCreate`, `assignmentsEnd`
- All of them, reads included, require the admin claim, because driver records hold phone and license numbers. The Firestore read rules match.
- The pairing logic runs in one transaction:
  - assigning ends any ongoing assignment of the unit or the driver and frees the previous partners;
  - maintenance keeps the driver on shop-duty standby;
  - standby or inactive status frees the driver.
- Units reference real routes (`routeId`), and the portal shows route names from `routesList`.
- `@packages/tanstack/query/fleet` has `useFleet` and mutation hooks. Every mutation refetches the fleet; the maintenance toggle is optimistic.
- The mock `fleetData.ts` is removed. `npm run seed` loads `src/seed/fleet.json`; units whose route code has no route get none.

- AC47. The screen loads units, drivers, and assignments from `fleetList`, with loading and error states. A non-admin user is refused.
- AC48. Register Vehicle and Add Driver save through the API; server errors (such as a duplicate) show in the dialog. The driver number is assigned by the server.
- AC49. Confirm & Deploy calls `assignmentsCreate`. Unit, driver, history, and counts update after a refetch; units in the shop and drivers on leave are refused.
- AC50. "End" on an ongoing assignment frees both sides. The maintenance toggle updates at once and rolls back on error.

## Revision 11: roles and email invites (2026-11-11)
User request:
- three roles: super admin, admin, and fleet;
- a super admin invites people by email with a role;
- the invitee opens the email and fills in their details;
- then they sign in.

- **Roles and permissions:** the role lives in the `role` custom claim and the `users/{uid}` document. The functions check permissions, not role names.

  | Permission | super_admin | admin | fleet |
  |---|---|---|---|
  | `users:manage` (invite, change role, disable) | ✅ | ❌ | ❌ |
  | `routes:write` | ✅ | ✅ | ❌ |
  | `fleet:read`, `fleet:write` | ✅ | ✅ | ✅ |

  - Route reads still need only a signed-in user.
  - The old `admin: true` claim counts as super_admin during migration.
  - A signed-in user with no role sees a "No access" page.
- **Invites:**
  - `invitesCreate` (super admin) stores `invites/{id}` with a SHA-256 hash of a random 256-bit token, the role, and a 7-day expiry.
  - It queues an email in `mail/{id}` (Firebase Trigger Email extension format) and returns the link.
  - `invitesResend` issues a new token; `invitesRevoke` cancels an invite.
  - The public `invitesLookup` and `invitesAccept` take the token. Accepting creates the Auth user with their own password, sets the role claim, creates `users/{uid}`, and marks the invite accepted.
- **Team management:** `usersList`, `usersSetRole`, and `usersSetStatus` (disable or enable). You can't change your own role or status, or remove the last active super admin. Role and status changes revoke the user's sessions.
- **Portal:**
  - A new `/team` screen (Team & Access, super admin only) lists members and invites. It has an Invite dialog that shows a copyable link, plus role, disable, resend, and revoke actions.
  - The public `/accept-invite?token=…` page shows the invited email and role, and collects full name, mobile number, and password. When it succeeds, it opens `/login` with the email filled in.
  - The sidebar shows only what the role may use; direct URLs to other pages show "No access".
- **Local development** uses the Auth emulator (`EXPO_PUBLIC_USE_AUTH_EMULATOR=1`), because invites create accounts where the functions run. The seed creates one account per role.
- **Production email** needs the Trigger Email extension with SMTP settings. Until then, the super admin copies the link from the Invite dialog.

- AC51. A super admin can invite an email with a role; duplicates (an existing member or a pending invite) are refused. Admin and fleet users cannot invite.
- AC52. The invite link opens the form. Expired, revoked, or used links show a clear message. Weak passwords and mismatched confirmations are refused.
- AC53. After accepting, the user can sign in with the new password and sees only what the role allows (fleet: no Route editor or Team; admin: no Team).
- AC54. A super admin can change a role or disable a member (the effect is immediate, because sessions are revoked), but cannot demote or disable themself or the last super admin.

## Revision 12: one fleet per fleet account (2026-11-11)

Request: clear all fleet data. Each fleet account then owns its own vehicles, drivers, and assignments, and other fleet accounts never see them.

- **Ownership:** every `vehicles`, `drivers`, and `assignments` document gets `ownerUid`, the uid of the fleet account it belongs to.
- **New permission `fleet:all`** (super_admin and admin) lets the holder see and manage every fleet account's records. Without it (the fleet role), every function is scoped to the caller's uid.
  - **Reads:** a fleet user gets only their own records. An admin gets all records, or one owner with `ownerUid`.
  - **Creates:** a fleet user always creates for themself. An admin must pass `ownerUid`, the uid of an active member with the fleet role.
  - **Updates, deletes, and assignments:** a record of another owner reads as "not found". A driver and a unit can be paired only if they have the same owner.
- **Uniqueness:** a unit code is unique within an owner. Plates and license numbers stay unique across all fleets, because they are real-world IDs.
- **`fleetList`** also returns `owners` (the fleet accounts) for users with `fleet:all`, so the portal can show a picker.
- **Security rules:** fleet users can read only documents whose `ownerUid` is their uid.
- **Data:** the existing local fleet data is deleted. The seed no longer creates fleet data, since there is no owner for it.
- **Portal:** Fleet & Asset Management shows a "Fleet account" picker for admins (All accounts, or one account). Adding records needs one account to be picked. Fleet users see only their own fleet, with no picker.

- AC55. After the reset, Fleet & Asset Management is empty for every account.
- AC56. Records created by fleet account A are never returned to fleet account B, and B's update, delete, status, or assign calls on A's records fail with "not found".
- AC57. Admins and super admins see every fleet account's records, can filter to one account, and can add records only after picking a fleet account.
- AC58. A driver of one fleet account cannot be assigned to a unit of another.

# Food Delivery · Shared

Code used by more than one Food Delivery repo. Nothing here is a website or a server: each app
downloads a fixed version of it when it is installed or built.

| Folder     | What it is                                                                    | Used by                       |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `src/`     | Plain rules: roles, order statuses, money, phone and PIN codes, menu rules    | API, Customer, Vendor, Rider  |
| `app-kit/` | Phone app pieces: API client, login store, theme, buttons, account screen    | Customer, Vendor, Rider       |

Imports in the apps:

```ts
import { OrderStatus } from '@fd/shared';
import { colors } from '@fd/shared/app-kit/theme';
```

## How the apps get it

Each app lists it in `package.json` with a version tag:

```json
"@fd/shared": "github:yogibabatech/foodmangoShared#v1.0.0"
```

## Changing shared code

1. Edit here, then `npm run typecheck` and `npm test`.
2. Commit, push, and tag a new version:
   ```bash
   git tag v1.1.0
   git push origin main --tags
   ```
3. In each app that needs the change, run
   ```bash
   npm install "@fd/shared@github:yogibabatech/foodmangoShared#v1.1.0"
   ```
   then test, commit and push. Apps you do not update keep working on their old version.

Apps (customer, vendor, rider) must pass their API address once at startup with
`setApiUrl(process.env.EXPO_PUBLIC_API_URL)` (see their `src/lib/apiUrl.ts`): Expo fills in
`EXPO_PUBLIC_` values only in the app's own files, not in this package.

No secrets ever go in this repo: it is public.

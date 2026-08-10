# Harvest Quantity Integrity (Checker↔Panen Reconciliation) + BJR Weight Estimation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent fruit loss between harvest and dispatch, and surface estimated tonnage (janjang × BJR) across the harvest flow — the two highest-ROI production-integrity features before the mobile MVP release.

**Architecture:** Two additions. (A) **Checker↔Panen reconciliation**: when a BKM Checker is submitted, if it links to a BKM Panen, the backend rejects submission when the checker's janjang count for that TPH deviates from the panen's by more than the existing `DISCREPANCY_TOLERANCE_PCT` (2%). The mobile shows the same comparison pre-submit as a warning. (B) **BJR weight estimation**: BJR (Berat Janjang Rata-rata, default 15 kg/janjang) is stored in `organization.settings` (JSON, no migration), exposed via a tiny guarded `GET /orgConfig`, fetched once by a React Query hook on mobile, and used to show estimated tonnage in `BKMPanenFormStep4`, `BKMCheckerFormStep3`, and `timbangan.tsx`.

**Tech Stack:** Backend: Express + Prisma + TypeScript (yarn). Mobile: Expo SDK 54, React 19, TanStack Query v5, Zustand (npm). No test framework exists in either package — verification is via `tsc` build + curl smoke tests per the project's existing manual-testing-playbook convention.

**Verification note:** Neither package has a test runner configured (per project AGENTS.md). All tasks therefore verify via `yarn build` (backend `tsc`) / `npx tsc --noEmit` (mobile) plus the curl commands shown. Do not attempt to add a test framework in this plan — out of scope for the MVP.

---

## File Structure

**Backend (`sawitin/sawitin-backend/`):**
- Create: `src/controllers/orgConfigController.ts` — returns `{ bjr }` from org settings (default 15)
- Create: `src/routes/orgConfigRoute.ts` — `GET /orgConfig`
- Modify: `src/routes/index.ts` — mount `orgConfigRoute`
- Modify: `src/controllers/bkmCheckerController.ts` — add panen reconciliation check on submit

**Mobile (`saweed-rnative/sawitin/`):**
- Create: `services/org-config.service.ts` — typed `getOrgConfig()` API call
- Create: `hooks/useOrgConfig.ts` — React Query hook, caches `{ bjr }`
- Modify: `services/index.ts` — export `orgConfigApi`
- Modify: `components/mandor/BKMPanenFormStep4.tsx` — show estimated tonnage
- Modify: `components/mandor/BKMCheckerFormStep3.tsx` — show estimated tonnage + pre-submit panen comparison warning
- Modify: `app/(krani)/timbangan.tsx` — show estimate vs. actual netto

---

## Task 1: Backend — `orgConfig` endpoint (BJR source of truth)

**Files:**
- Create: `../sawitin/sawitin-backend/src/controllers/orgConfigController.ts`
- Create: `../sawitin/sawitin-backend/src/routes/orgConfigRoute.ts`
- Modify: `../sawitin/sawitin-backend/src/routes/index.ts`

- [ ] **Step 1: Create the org config controller**

`src/controllers/orgConfigController.ts`:

```ts
import { NextFunction, Request, Response } from "express";
import prisma from "../config/prisma";
import { getRequestOrgId } from "../utils/auth";

const DEFAULT_BJR = 15;

interface HarvestConfig {
  bjr: number;
}

export async function getOrgConfig(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orgId = getRequestOrgId(req);
    if (!orgId) {
      res.status(403).json({ error: "User or Organization not found" });
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    const settings = (org?.settings ?? {}) as { bjr?: number };
    const config: HarvestConfig = {
      bjr: typeof settings.bjr === "number" && settings.bjr > 0 ? settings.bjr : DEFAULT_BJR,
    };

    res.status(200).json(config);
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 2: Create the route**

`src/routes/orgConfigRoute.ts`:

```ts
import { Router } from "express";
import { getOrgConfig } from "../controllers/orgConfigController";

const router = Router();

/**
 * @swagger
 * /orgConfig:
 *   get:
 *     summary: Get organization harvest config (BJR)
 *     tags: [OrgConfig]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Harvest config for the authenticated org
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bjr:
 *                   type: number
 *                   description: Berat Janjang Rata-rata (kg per janjang)
 *                   example: 15
 */
router.get("/", getOrgConfig);

export default router;
```

- [ ] **Step 3: Mount the route in the router index**

In `src/routes/index.ts`, add the import near the other route imports (after line 28):

```ts
import orgConfigRoute from "./orgConfigRoute";
```

And register it — use the same `permissionGuard` pattern as the other protected routes (insert after the `kraniTimbangRoute` line, line 55). This route carries no `checkPermission` call, so any authenticated org member may read it:

```ts
router.use("/orgConfig", permissionGuard, orgConfigRoute);
```

- [ ] **Step 4: Verify the backend compiles**

Run (from `sawitin/sawitin-backend/`):

```bash
yarn build
```

Expected: `tsc` exits 0, no type errors.

- [ ] **Step 5: Smoke test the endpoint**

With server + worker running (`yarn dev:server`), and a valid token (login as `asisten1` / `password123` from the manual-testing-playbook):

```bash
curl -s http://localhost:3000/orgConfig -H "Authorization: Bearer <TOKEN>"
```

Expected: `{"bjr":15}` (no org settings yet) or `{"bjr":<configured>}`.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/orgConfigController.ts src/routes/orgConfigRoute.ts src/routes/index.ts
git commit -m "feat(backend): add orgConfig endpoint exposing BJR harvest config"
```

---

## Task 2: Backend — Checker↔Panen reconciliation on submit

**Files:**
- Modify: `../sawitin/sawitin-backend/src/controllers/bkmCheckerController.ts`

**Context:** The mobile submits a checker in three steps (`useSubmitBkmChecker`): `create(header)` → `addDetail(...)` per truck → `update(id, { status: "SUBMITTED" })`. The offline sync processor does the same. So by the time `status: "SUBMITTED"` is set, the checker's details exist. The reconciliation check therefore belongs in `updateBkmChecker` at the status transition. The linked panen is compared **per-TPH**: only panen details whose `tph_id` matches the checker's `tph_id` count toward the expected quantity (a panen can span multiple TPHs).

**Logic:**
1. Only enforce when `status === "SUBMITTED"` and `existingChecker.bkm_panen_id` is set.
2. Sum the checker's own detail `jumlah_janjang` (already in `existingChecker.details`).
3. Sum linked panen details with `tph_id === existingChecker.tph_id`.
4. `discrepancyPct = panenTotal > 0 ? (|checkerTotal − panenTotal| / panenTotal) × 100 : 100`.
5. If `discrepancyPct > config.discrepancyTolerancePct` → `400` with an actionable message.

- [ ] **Step 1: Add the reconciliation check in `updateBkmChecker`**

Insert this block immediately after the status-transition guard (after line 454, before the `prisma.bkm_checker.update` call):

```ts
    if (status === "SUBMITTED" && existingChecker.bkm_panen_id) {
      const checkerTotalJanjang = existingChecker.details.reduce(
        (sum, d) => sum + d.jumlah_janjang,
        0
      );

      const panenDetails = await prisma.bkm_panen_detail.findMany({
        where: { bkm_panen_id: existingChecker.bkm_panen_id },
      });
      const panenTotalJanjang = panenDetails
        .filter((pd) => pd.tph_id === existingChecker.tph_id)
        .reduce((sum, pd) => sum + pd.jumlah_janjang, 0);

      const discrepancyPct =
        panenTotalJanjang > 0
          ? (Math.abs(checkerTotalJanjang - panenTotalJanjang) / panenTotalJanjang) * 100
          : 100;

      if (discrepancyPct > config.discrepancyTolerancePct) {
        res.status(400).json({
          error:
            `Jumlah janjang tidak sesuai BKM Panen (selisih ${discrepancyPct.toFixed(1)}%). ` +
            `Checker: ${checkerTotalJanjang}, Panen: ${panenTotalJanjang}.`,
        });
        return;
      }
    }
```

- [ ] **Step 2: Add the `config` import**

At the top of `src/controllers/bkmCheckerController.ts`, add:

```ts
import { config } from "../config/config";
```

(Place it with the other imports. If `config` is already imported, skip this step.)

- [ ] **Step 3: Verify the backend compiles**

Run (from `sawitin/sawitin-backend/`):

```bash
yarn build
```

Expected: `tsc` exits 0.

- [ ] **Step 4: Smoke test both branches**

With server running and token for `mandor1` / `password123`:

1. **Within tolerance** — create a checker linked to an approved panen where the checker's janjang total for that TPH equals the panen's; submit it:

```bash
# Approve a panen, create checker with bkm_panen_id + matching janjang, then:
curl -s -X PUT http://localhost:3000/bkmChecker/<checkerId> \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"SUBMITTED"}'
```

Expected: `200` with `status: "SUBMITTED"`.

2. **Over tolerance** — create a checker linked to the same panen but with janjang total differing by >2%; submit it:

```bash
curl -s -X PUT http://localhost:3000/bkmChecker/<mismatchedCheckerId> \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"SUBMITTED"}'
```

Expected: `400` with error `"Jumlah janjang tidak sesuai BKM Panen (selisih X.X%)..."` and status unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/bkmCheckerController.ts
git commit -m "feat(backend): reject checker submission when janjang deviates from linked panen beyond tolerance"
```

---

## Task 3: Mobile — org config service + hook

**Files:**
- Create: `../saweed-rnative/sawitin/services/org-config.service.ts`
- Create: `../saweed-rnative/sawitin/hooks/useOrgConfig.ts`
- Modify: `../saweed-rnative/sawitin/services/index.ts`

- [ ] **Step 1: Create the API service**

`services/org-config.service.ts`:

```ts
import { apiClient } from './api';

export interface OrgConfig {
  bjr: number;
}

export const orgConfigApi = {
  get: async (): Promise<OrgConfig> => {
    const response = await apiClient.get<OrgConfig>('/orgConfig');
    return response.data;
  },
};
```

- [ ] **Step 2: Create the React Query hook**

`hooks/useOrgConfig.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { orgConfigApi } from '@/services/org-config.service';

export const orgConfigKeys = {
  all: ['orgConfig'] as const,
};

export function useOrgConfig() {
  return useQuery({
    queryKey: orgConfigKeys.all,
    queryFn: orgConfigApi.get,
    staleTime: 60 * 60 * 1000, // BJR changes rarely; cache for an hour
  });
}
```

- [ ] **Step 3: Export the API from the services barrel**

In `services/index.ts`, add:

```ts
export * from './org-config.service';
```

- [ ] **Step 4: Verify mobile typechecks**

Run (from `saweed-rnative/sawitin/`):

```bash
npx tsc --noEmit
```

Expected: exits 0 (project uses `strict: false`, so only real errors surface).

- [ ] **Step 5: Commit**

```bash
git add services/org-config.service.ts hooks/useOrgConfig.ts services/index.ts
git commit -m "feat(mobile): add orgConfig service and useOrgConfig hook for BJR"
```

---

## Task 4: Mobile — BJR estimated tonnage in BKM Panen review (Step 4)

**Files:**
- Modify: `../saweed-rnative/sawitin/components/mandor/BKMPanenFormStep4.tsx`

**Context:** `totalJanjang` is already computed at line 53–63. Add an estimated-tonnage row in the production summary card using `useOrgConfig`. Estimated tonnage = `totalJanjang × bjr / 1000` (tons).

- [ ] **Step 1: Import the hook**

At the top of `BKMPanenFormStep4.tsx`, add:

```ts
import { useOrgConfig } from '@/hooks/useOrgConfig';
```

- [ ] **Step 2: Fetch BJR in the component**

Inside `BKMPanenFormStep4`, after the existing `useQuery` calls (around line 37), add:

```ts
const { data: orgConfig } = useOrgConfig();
const bjr = orgConfig?.bjr ?? 15;
```

- [ ] **Step 3: Compute estimated tonnage**

After `totalBrondol` (line 65–68), add:

```ts
const estimatedTons = (totalJanjang * bjr) / 1000;
```

- [ ] **Step 4: Render the estimate in the production summary grid**

In the `<View style={styles.grid}>` block (lines 186–203), add a `MetricCard` after the `Brondolan` one:

```tsx
          <MetricCard
            label="Estimasi Tonase"
            value={`${estimatedTons.toFixed(2)} t`}
          />
```

- [ ] **Step 5: Verify mobile typechecks**

Run (from `saweed-rnative/sawitin/`):

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add components/mandor/BKMPanenFormStep4.tsx
git commit -m "feat(mobile): show BJR estimated tonnage in BKM Panen review"
```

---

## Task 5: Mobile — BJR estimate + pre-submit panen comparison in Checker Step 3

**Files:**
- Modify: `../saweed-rnative/sawitin/components/mandor/BKMCheckerFormStep3.tsx`

**Context:** The checker already carries `header.bkm_panen_id` and its own `details` with `jumlah_janjang`. Before submit, if a panen is linked, fetch it and compare per-TPH, showing a warning and blocking submit when the deviation exceeds 2%. Also show the estimated tonnage. `totalJanjang` is already computed at line 36.

- [ ] **Step 1: Add imports**

At the top of `BKMCheckerFormStep3.tsx`, add:

```ts
import { useOrgConfig } from '@/hooks/useOrgConfig';
import { useQuery } from '@tanstack/react-query';
import { bkmPanenApi } from '@/services/bkm-panen.service';
```

(`useQuery` may already be imported — it is, at line 30.)

- [ ] **Step 2: Fetch BJR and the linked panen**

Inside `BKMCheckerFormStep3`, after the existing queries (line 30–31), add:

```ts
const { data: orgConfig } = useOrgConfig();
const bjr = orgConfig?.bjr ?? 15;

const { data: linkedPanen } = useQuery({
  queryKey: ['bkmPanen', 'byId', header.bkm_panen_id],
  queryFn: () => bkmPanenApi.getById(header.bkm_panen_id!),
  enabled: !!header.bkm_panen_id,
});
```

- [ ] **Step 3: Compute per-TPH panen total, mismatch, and estimated tonnage**

After `totalBrondol` (line 37), add:

```ts
const panenJanjangForTph =
  linkedPanen?.details
    ?.filter((pd) => pd.tph_id === header.tph_id)
    .reduce((sum, pd) => sum + pd.jumlah_janjang, 0) ?? 0;

const discrepancyPct =
  panenJanjangForTph > 0
    ? (Math.abs(totalJanjang - panenJanjangForTph) / panenJanjangForTph) * 100
    : 0;

const mismatchExceedsTolerance = panenJanjangForTph > 0 && discrepancyPct > 2;
const estimatedTons = (totalJanjang * bjr) / 1000;
```

- [ ] **Step 4: Render a warning banner when mismatch exceeds tolerance**

Insert this right after the `<View style={styles.grid}>` production summary block (after line 119), guarded on `header.bkm_panen_id`:

```tsx
        {header.bkm_panen_id && panenJanjangForTph > 0 && (
          <View
            style={[
              styles.warningCard,
              mismatchExceedsTolerance && styles.warningCardBad,
            ]}
          >
            <Text style={styles.warningText}>
              {mismatchExceedsTolerance
                ? `⚠️ Jumlah janjang tidak sesuai BKM Panen (selisih ${discrepancyPct.toFixed(1)}%). Checker: ${totalJanjang}, Panen: ${panenJanjangForTph}. Submit akan ditolak.`
                : `✓ Sesuai BKM Panen (selisih ${discrepancyPct.toFixed(1)}%)`}
            </Text>
            <Text style={styles.warningEstimate}>
              Estimasi Tonase: {estimatedTons.toFixed(2)} t ({bjr} kg/janjang)
            </Text>
          </View>
        )}
```

- [ ] **Step 5: Block submit when mismatch exceeds tolerance**

In `handleSubmit` (line 39), immediately after the `if (!confirmed) return;` guard, add:

```ts
    if (mismatchExceedsTolerance) {
      Alert.alert(
        'Tidak Sesuai BKM Panen',
        `Selisih ${discrepancyPct.toFixed(1)}% dari BKM Panen. Periksa kembali jumlah janjang sebelum submit.`
      );
      return;
    }
```

And disable the submit button — change the `submitButton` disabled expression (line 159) from:

```tsx
        <TouchableOpacity
          style={[styles.submitButton, (!confirmed || submitMutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!confirmed || submitMutation.isPending}
```

to:

```tsx
        <TouchableOpacity
          style={[styles.submitButton, (!confirmed || mismatchExceedsTolerance || submitMutation.isPending) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!confirmed || mismatchExceedsTolerance || submitMutation.isPending}
```

- [ ] **Step 6: Add the warning card styles**

In the `styles` object at the bottom of the file, add:

```ts
  warningCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  warningCardBad: {
    backgroundColor: '#FFF3E0',
    borderColor: '#E65100',
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.textPrimary,
  },
  warningEstimate: {
    fontSize: 12,
    color: BrandColors.textSecondary,
    marginTop: 4,
  },
```

- [ ] **Step 7: Verify mobile typechecks**

Run (from `saweed-rnative/sawitin/`):

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add components/mandor/BKMCheckerFormStep3.tsx
git commit -m "feat(mobile): add panen comparison warning and BJR estimate to checker review"
```

---

## Task 6: Mobile — BJR estimate in weighbridge (timbangan)

**Files:**
- Modify: `../saweed-rnative/sawitin/app/(krani)/timbangan.tsx`

**Context:** The krani sees the actual netto. Show the estimated weight derived from the checker's janjang × BJR next to it so the krani immediately spots a large variance (e.g., an under-filled or over-filled truck). `totalJanjang` is computed at line 93.

- [ ] **Step 1: Add the hook import**

At the top of `timbangan.tsx`, add:

```ts
import { useOrgConfig } from '@/hooks/useOrgConfig';
```

- [ ] **Step 2: Fetch BJR and compute estimate**

Inside `TimbanganScreen`, after `createMutation` (line 27), add:

```ts
const { data: orgConfig } = useOrgConfig();
const bjr = orgConfig?.bjr ?? 15;
```

After `totalBrondol` (line 94), add:

```ts
const estimatedKg = (totalJanjang * bjr);
```

- [ ] **Step 3: Render the estimate near the netto display**

In the `nettoContainer` block (lines 229–234), after the `Berat Bersih (Netto)` value, add:

```tsx
            {totalJanjang > 0 && (
              <Text style={styles.estimateText}>
                Estimasi dari janjang: {estimatedKg.toLocaleString('id-ID')} kg ({totalJanjang} jjg × {bjr} kg)
              </Text>
            )}
```

- [ ] **Step 4: Add the estimate style**

In the `styles` object, add:

```ts
  estimateText: {
    fontSize: 13,
    color: '#558B2F',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
```

- [ ] **Step 5: Verify mobile typechecks**

Run (from `saweed-rnative/sawitin/`):

```bash
npx tsc --noEmit
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add "app/(krani)/timbangan.tsx"
git commit -m "feat(mobile): show BJR estimated weight beside actual netto at weighbridge"
```

---

## Task 7: End-to-end verification (manual, per manual-testing-playbook)

**Files:**
- No code changes.

- [ ] **Step 1: Run backend + worker**

From `sawitin/sawitin-backend/`:

```bash
yarn dev:server
yarn dev:worker   # in a second terminal
```

- [ ] **Step 2: Run mobile**

From `saweed-rnative/sawitin/`:

```bash
npm run ios   # or npm run android
```

- [ ] **Step 3: Exercise the happy path**

Log in as `mandor1`. Create a BKM Panen (e.g. Blok A1, 56 janjang at TPH 01). Confirm the **Estimasi Tonase** on Step 4 shows `(56 × bjr)/1000` (e.g. 0.84 t at bjr=15). Approve the panen as `asisten1`. Create a BKM Checker linked to that panen with matching janjang for TPH 01. On Step 3 verify the **green "Sesuai BKM Panen"** banner and estimated tonnage. Submit — expect success.

- [ ] **Step 4: Exercise the mismatch path**

As `asisten1`, approve a second panen. As `mandor1`, create a checker linked to it but enter a janjang total >2% higher. On Step 3 verify the **orange warning banner**, the disabled submit button, and (if forced) the alert. As the source of truth, repeat the same mismatch directly via `PUT /bkmChecker/<id> {"status":"SUBMITTED"}` and confirm the backend returns `400`.

- [ ] **Step 5: Exercise the weighbridge**

As `krani1`, scan the QR of a successfully submitted checker. Verify the netto card shows **"Estimasi dari janjang: X kg"** next to the actual netto, and that entering gross/tare produces the expected netto.

---

## Self-Review

**Spec coverage:**
- Checker↔Panen reconciliation → Task 2 (backend authority) + Task 5 (mobile pre-warning). ✅
- BJR weight estimation → Tasks 1 (source of truth), 3 (hook), 4 (panen), 5 (checker), 6 (weighbridge). ✅
- MVP-only scope: no schema migration (BJR in `organization.settings` JSON), no test-framework setup, no new roles/permissions. ✅

**Placeholder scan:** All steps contain exact code, exact paths, exact commands, and expected outputs. No TBD/TODO. ✅

**Type consistency:** `OrgConfig { bjr }`, `orgConfigApi.get()`, `useOrgConfig()`, `bjr` variable naming consistent across Tasks 3–6. Backend returns `{ bjr: number }` — matches. `discrepancyPct`, `panenJanjangForTph`, `mismatchExceedsTolerance` defined in Task 5 Step 3 and used in Steps 4–5 — consistent. ✅

**Known limitation (intentional for MVP):** the mismatch check compares janjang **counts** (not weight) because TPH weighing is not yet implemented; weight-based reconciliation arrives with a future kartu-panen/TPH-weighing task. Fraksi maturity grading is likewise deferred.

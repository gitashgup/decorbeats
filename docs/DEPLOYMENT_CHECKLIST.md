# Decorbeats — Deployment & Verification Checklist

Follow this checklist before pushing changes to `main` or initiating production deployments.

---

## 1. Environment Requirements
- **Node.js**: v24.x LTS (Recommended: `/opt/homebrew/opt/node@24/bin/node`)
- **Package Manager**: npm 11.x
- Ensure PATH is configured:
  ```bash
  export PATH=/opt/homebrew/opt/node@24/bin:$PATH
  ```

---

## 2. Pre-Commit & Build Verification
1. **Clean Installation**:
   ```bash
   npm ci
   ```
2. **Execute Automated Test Suite**:
   ```bash
   node --test tests/*.test.js
   ```
   *Expected Output*: All tests pass (20/20).
3. **Run Production Build**:
   ```bash
   npm run build
   ```
   *Expected Output*: Vite build completes with code 0 and bundles `dist/`.

---

## 3. Deployment Flow (GitHub Continuous Deployment)
1. **Branch Hygiene**:
   - Always branch from updated `main`:
     ```bash
     git checkout main
     git pull origin main
     git checkout -b feature/my-feature
     ```
2. **Review Changes**:
   - Inspect changes with `git diff` before staging.
   - Verify no sensitive credentials or `.env` files are staged.
3. **Commit & Push**:
   ```bash
   git add <modified-files>
   git commit -m "Descriptive commit message"
   git push origin feature/my-feature
   ```
4. **Merge to Main**:
   - Merging into `main` automatically triggers production deployment on Vercel.

---

## 4. Vercel Verification
- **Scope**: `ashwaryas-projects-79f8dddd`
- **Project**: `decorbeats`
- **Check deployment status via CLI**:
  ```bash
  npx -y vercel ls --scope ashwaryas-projects-79f8dddd --project decorbeats
  ```

---

## 5. Post-Deployment Smoke Tests
After deployment completes, verify live production at `https://www.decorbeats.com`:

| Step | Verification Action | Expected Result |
|---|---|---|
| 1 | Visit `https://www.decorbeats.com/` | Customer storefront loads without administrative overlays. |
| 2 | Visit `https://www.decorbeats.com/admin` | Capture Studio review dashboard opens (or login if unauthenticated). |
| 3 | Visit `https://www.decorbeats.com/admin/capture` | Capture Studio photography interface loads. |
| 4 | Visit `https://www.decorbeats.com/admin?view=pricing` | Compact pricing table for Megha loads. |
| 5 | Visit `https://www.decorbeats.com/admin?legacy=1` | Older sales and inquiries tools load. |
| 6 | From storefront, click footer "Admin Login →" | Direct navigation to `/admin` without getting trapped in old admin. |
| 7 | Share `https://www.decorbeats.com/` in WhatsApp / social linter | Branded 1200 × 630 card displays with official title and description. |

# Branch Protection Setup

One-time manual step to lock the CI gates into the PR flow. Takes ~2 minutes in the GitHub UI.

**Without this, CI gates fail on bad code but the push still lands on `main`.** With this, failing gates *block* the merge.

## Steps

1. Open https://github.com/tatenda-source/livestockl/settings/branches in a browser.
2. Under **Branch protection rules**, click **Add rule** (or edit the existing `main` rule if present).
3. **Branch name pattern:** `main`
4. Enable these options:

### Required status checks

- ☑ **Require status checks to pass before merging**
- ☑ **Require branches to be up to date before merging**

Then in the search box, add each of these (they'll only appear in the list after they've run at least once, which they all have as of commit `5e2e0fb`+):

  - `Schema Guard`
  - `Frontend Build`
  - `Edge Functions Check`
  - `Deploy Edge Functions`
  - `Deploy Frontend`
  - `Post-Deploy QA`

### Required reviews

- ☑ **Require a pull request before merging**
- **Required approving reviews:** 1 (or 2 if you have co-maintainers)
- ☑ **Dismiss stale pull request approvals when new commits are pushed**

### Hygiene

- ☑ **Require linear history** — no merge commits; rebase or squash only
- ☑ **Require conversation resolution before merging**
- ☑ **Do not allow bypassing the above settings** — prevents admin override
- ☐ **Require signed commits** — nice but optional, requires GPG setup on all machines

### Force pushes

- ☐ **Allow force pushes** — leave UNCHECKED
- ☐ **Allow deletions** — leave UNCHECKED

5. Click **Create** (or **Save changes**).

## Verify it works

Open a throwaway PR with a deliberately destructive schema change (remove a CHECK constraint) and push. The PR should:
- Show all 6 status checks running
- Have the merge button **disabled** with "Required status checks must pass" until `Schema Guard` fails (which it will, blocking the merge)

## Emergency override

If a gate has a false positive and you need to force through, the escape hatches are:

1. **`[force-schema]` commit tag** — documented in `CONTRIBUTING.md`; applies only to Schema Guard, not to security/chaos/integrity gates
2. **Admin bypass** — if you unchecked "Do not allow bypassing" above, repo admins can merge over a failing check. Leave this unchecked by default; flip on only for documented incidents
3. **Revert after the fact** — `git revert` + re-apply with the fix; preserves audit trail

## What this changes in practice

| Action | Before | After |
|---|---|---|
| Push to main with failing Schema Guard | ❌ CI fails; code still on main | ❌ PR required; merge blocked until fixed |
| Force-push to main | Possible | ❌ Blocked |
| Merge without review | Possible | ❌ Blocked |
| Merge with stale branch | Possible | ❌ Must rebase first |
| Admin override | — | Blocked unless "allow bypass" is checked |

## Known caveat

The status checks need to have **run at least once** before GitHub offers them in the required-checks dropdown. All six have run successfully on commits `24346820503` and `24384209811` — they should be in the list.

If any don't appear: trigger a push to kick CI (any small commit), wait for it to complete, then reload the branch-protection page.

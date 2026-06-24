---
description: Open a PR with tests and checks green. Use before shipping feature work.
---

# Ship PR

1. Run `make check` and `make security-scan`
2. Ensure changes match the approved plan or issue scope
3. Write a clear commit message (conventional commits)
4. Push branch and open PR with:
   - Summary of what changed and why
   - Test plan checklist
   - Link to related issue (`Closes #N` if applicable)
5. Do **not** run pr-lifecycle apply from the IDE — CI handles closure/warn actions

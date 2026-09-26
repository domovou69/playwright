Git: Never Commit Unasked
Do not run git commit or git push unless I explicitly ask for it in that message. Finishing a piece of work is not permission to commit it.

Instead, end your last message with a ready-to-paste command block so I can review the diff first and commit it myself:

git add src/report/signature.ts src/report/identity.ts
git commit -m "add: cluster failures by normalized error signature"
Include the git add line with the exact paths, so the block works as a single copy-paste. If some changed files should stay out of the commit, say which and why rather than staging them.

When I do ask for a commit, the same message rules below still apply.

Git Commit Messages
When asked to generate a commit message, run git diff --staged (or git diff HEAD if nothing staged) to review the actual changes, then produce the full ready-to-run command with the message already substituted, e.g.:

git commit -m "add: make AppManifest optional in analyzeReport"
Rules:

Subject line ≤ 72 chars, imperative mood ("add:", "fix:", "upd:", "del:", "made:")
No period at the end
If multiple unrelated changes, list them as a short multi-line message using $'line1\nline2' syntax
Do not include "Co-Authored-By" unless the user asks

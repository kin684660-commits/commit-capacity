# APPROVALS

Do not store secrets here.

| ID | When | Scope | Source | Not covered |
| --- | --- | --- | --- | --- |
| A-LOCAL-001 | 2026-09-17 | Create and modify files under `commit/`. Install JS dependencies. Run local tests, lint, typecheck, build, local provider processes. Git commits only if the user later asks. | User: send handbook then “仔细阅读完 进行开发这个项目” | Servers, DNS, public git, ASP register/list, testnet/mainnet txs, faucet, x402 spend, video upload, contest form submit |
| A-BATCH-B | 2026-09-17 | X Layer **testnet 1952** deploy of tCOM + CommitmentRegistry; test-only wallets; HTTPS staging on Tokyo **without** touching `alpha.jibai.site` / `game.jibai.site` / port 3001; prepare and (when URL exists) register/list Commit ASP quote endpoint; User-side quote proof. Public host confirmed: **commit.jibai.site** (new site only). | User: “批准了 开始做吧” then “确认用commit.jibai.site” | Mainnet 196. Public git. Video upload. Contest form submit. |

Batch C (public repo, video, submit) is **not** approved.

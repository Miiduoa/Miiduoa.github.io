# miiduoa.github.io

顧晉瑋的個人作品集網站。

- Live: https://miiduoa.github.io
- GitHub: https://github.com/Miiduoa
- Focus: Information Management / Product Analytics / Decision Support / Data Reliability / Systems

## Engineering case studies

| Case | Focus |
| --- | --- |
| [Campus One](https://miiduoa.github.io/case-studies/campus-one/) | 跨端角色權限、服務降級與測試紀錄 |
| [Contractscope](https://miiduoa.github.io/case-studies/contractscope/) | API 相容方向、涵蓋警告、CLI 結束碼 |
| [Relaylab](https://miiduoa.github.io/case-studies/relaylab/) | ACK 遺失、租約競態、冪等副作用與可重播時間軸 |

案例頁連到實際的核心程式、測試、設計取捨與已知限制；互動工具仍由各自的 repository 維護。

## Decision workbenches

| Workbench | What it makes visible |
|---|---|
| [Carry](https://miiduoa.github.io/tools/carry/) | Financing vs. cash purchase, debt-adjusted terminal wealth, return sensitivity |
| [Capacity](https://miiduoa.github.io/tools/capacity/) | Erlang C staffing, waiting-time target, surge sensitivity |

Core models are standalone ES modules. Run `node --test tools/*/core.test.mjs` to verify.

## Interactive engineering labs

| Lab | What it makes visible |
|---|---|
| [Tracepath](https://miiduoa.github.io/labs/tracepath/) | trace structure、exclusive time、boundary validation |
| [Flagrail](https://miiduoa.github.io/labs/flagrail/) | targeting rules、stable rollout、kill switch |
| [LineageGuard](https://miiduoa.github.io/labs/lineageguard/) | schema diff、column lineage、blast radius |
| [TxnScope](https://miiduoa.github.io/labs/txnscope/) | lost update、snapshot version、optimistic conflict、retry |
| [SessionSentry](https://miiduoa.github.io/labs/sessionsentry/) | session rotation、expiry、revocation、CSRF |
| [Eventlane](https://miiduoa.github.io/labs/eventlane/) | at-least-once delivery、idempotency、retry、DLQ |
| [Syncbench](https://miiduoa.github.io/labs/syncbench/) | offline replicas、logical clock、deterministic merge |
| [Rampwatch](https://miiduoa.github.io/labs/rampwatch/) | canary guardrails、Wilson interval、advance / hold / rollback |
| [Recovergrid](https://miiduoa.github.io/labs/recovergrid/) | recovery-point eligibility、RPO / RTO tradeoffs、region outage |

每個 lab 都把核心邏輯與 UI 分開，並以 Node built-in test 驗證關鍵行為。GitHub Actions 會自動執行 `labs/*/core.test.mjs`。

此 repo 只保留作品集網站與互動 lab；大型專案的技術細節、執行方式與限制放在各自 repository。

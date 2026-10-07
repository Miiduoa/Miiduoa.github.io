# miiduoa.github.io

顧晉瑋的個人作品集網站。

- Live: https://miiduoa.github.io
- GitHub: https://github.com/Miiduoa
- Focus: Information Management / Product Analytics / Decision Support / Data Reliability / Systems

## Interactive engineering labs

| Lab | What it makes visible |
|---|---|
| [TxnScope](https://miiduoa.github.io/labs/txnscope/) | lost update、snapshot version、optimistic conflict、retry |
| [SessionSentry](https://miiduoa.github.io/labs/sessionsentry/) | session rotation、expiry、revocation、CSRF |
| [Eventlane](https://miiduoa.github.io/labs/eventlane/) | at-least-once delivery、idempotency、retry、DLQ |
| [Syncbench](https://miiduoa.github.io/labs/syncbench/) | offline replicas、logical clock、deterministic merge |
| [Rampwatch](https://miiduoa.github.io/labs/rampwatch/) | canary guardrails、Wilson interval、advance / hold / rollback |

每個 lab 都把核心邏輯與 UI 分開，並以 Node built-in test 驗證關鍵行為。GitHub Actions 會自動執行 `labs/*/core.test.mjs`。

此 repo 只保留作品集網站與互動 lab；大型專案的技術細節、執行方式與限制放在各自 repository。

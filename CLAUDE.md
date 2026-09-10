# 專案慣例

技術棧、目錄結構與正典文件索引見 `.claude/skills/project-overview`。
各領域的細節慣例散在 `.claude/skills/` 底下（`vue-component-conventions`、
`pinia-store-conventions`、`tailwind-design-system`、`deploy-ops` …）。

這份只放「寫任何 code 都適用」的規則。

## 註解：只寫「改這一行的人必須知道，否則會弄壞」的事

註解的讀者是**正在改這一行的人**，不是想理解整件事的人。後者該去讀文件。

**該寫在程式裡（1–3 行）**

- 會被「順手簡化」掉的約束。例：`?? []` 不可換成預設參數 `(items = [])`，
  因為後者只對 `undefined` 生效；`sed` 不加錨點是刻意的，`current_slot` 靠它。
- 為什麼用了不直觀的寫法，而直觀的那個是錯的。
- 跨檔案的隱含耦合（動 A 要一起動 B）。

**不該寫在程式裡**

- 事件經過、當初怎麼壞的、四個後果 → `.claude/skills/deploy-ops/SKILL.md` 之類的 runbook
- 當時的推理、前後量測、評估過但沒採用的做法 → commit message
- 操作步驟、驗證方法 → runbook 或 `README.md`
- 已經修好的問題的完整敘事 → 留一句指路就好（「見 SKILL.md 雷區 0」）

**判準**：這段話刪掉之後，有人會不小心把 code 改壞嗎？會 → 留；不會 → 搬走。

**分工表**

| 放哪 | 放什麼 |
|---|---|
| 程式註解 | 改這行需要的約束（短） |
| commit message | 當時的推理、量測、跳過什麼 |
| `.claude/skills/*/SKILL.md` | 線上實際情況、操作、踩過的雷 |
| `deploy/README.md` 等 | 從零裝起來的步驟 |

**校準用的實測基準**（2026-09-10）：既有檔案的註解占比是 **17–36%**
（`order.js` 17%、`auth.js` 23%、`orderService.js` 36%）。超過就該檢查是不是
在程式裡講故事。註解占比在 30 行以下的小檔案會失真，看絕對行數。

## 跑 `/simplify` 時一併檢查

`/simplify` 預設的四個角度（reuse / simplification / efficiency / altitude）
不含註解與文件的分工。跑它的時候要**額外**檢查：

- 有沒有在程式裡寫已經記在 runbook 或 commit message 的敘事
- 同一段內容是不是同時存在程式註解、commit、SKILL.md、README 四個地方
- 經過多輪 review 的檔案是不是每輪都疊了一層註解卻沒人拿掉上一層

反例（真的發生過）：交代 `/simplify` 的 agent「長註解是既定風格，不要當
verbosity 報」，結果把自己的產出從唯一會抓到這件事的審查者手上豁免掉了。

## 驗證

改完跑 `npm run lint`（帶 `--max-warnings 0`）、`npm test`、`npm run build`。

**動到測試本身就要重驗突變測試** —— 換了抓手或 mock 機制之後，測試可能仍然
全綠卻已經抓不到東西。做法是把對應的 bug 種回去，確認它會紅，再還原。

部署相關的改動見 `.claude/skills/deploy-ops`：那類失效幾乎都是靜默的，
CI 綠燈不構成證據。

# Sandbox UI

Runs on **http://localhost:4201**.

## Custom AI endpoints — sample instructions

Page: **http://localhost:4201/custom-endpoints/new**

Paste any line below into the **Instructions** box. The preview updates ~1s after
you stop typing (or hit **Run preview**). Plain-language instructions are turned
into a query spec against the seeded **MRP demo dataset** — no SQL, no code.

> First time on a fresh org? The dataset is auto-seeded when the page loads. If a
> preview comes back empty, use **Reset demo data** on the list page to
> (re)generate this org's fixtures.

### Seeded data you can query

| What | Examples in the fixtures |
|------|--------------------------|
| Items | SKUs `RM-001…` (purchased) and `FG-001…` (manufactured); descriptions like *Hex bolt M6x20*, *DC motor 12V*, *Control board (PCBA)* |
| Item types | `purchased`, `manufactured` |
| Lead times (days) | purchased 2–21, manufactured 7–35 |
| Suppliers | `ACME`, `GLOBEX`, `INITECH`, `UMBRELLA`, `STARK` |
| Work orders | `WO-…`; status `planned`, `released`, `in_progress`, `completed`, `closed` |
| Purchase orders | `PO-…`; status `open`, `partially_received`, `received`, `closed` |
| Inventory | sites `MAIN`, `WEST`, `EAST`; quantity on hand / allocated |
| Transactions | type `receipt`, `issue`, `adjustment` |
| Forecasts | 6 weekly buckets (`W+0…W+5`) per manufactured item |

### Copy-paste prompts

**Items**
- List purchased items with lead time over 5 days, showing sku, description and lead time.
- Show all manufactured items sorted by lead time, longest first.
- List the 10 items with the shortest lead time, showing sku and description.
- Find items whose description contains "motor".

**Inventory**
- Show inventory balances at the MAIN site with quantity on hand under 50.
- List items where allocated quantity is greater than zero, showing item, site and quantities.
- Show the top 20 inventory balances by quantity on hand, highest first.

**Purchase orders**
- List open purchase orders sorted by due date, soonest first.
- Show purchase orders that are not yet received, with po number, quantity and status.
- List purchase order lines with quantity over 100.

**Work orders**
- Show work orders that are released or in progress, sorted by due date.
- List work orders where completed quantity is less than released quantity.
- Show the 5 work orders due soonest.

**Suppliers**
- List all suppliers with their code, name and default lead time.
- Show suppliers with a default lead time of 10 days or more.

**Transactions & forecasts**
- List inventory issue transactions, most recent first.
- Show receipt transactions with quantity over 50.
- List demand forecasts with forecast quantity above 100, sorted highest first.

### Not a data read (other spec kinds)

The generator can also produce non-query endpoints:
- **Static response** — *Return a fixed JSON health check that says status ok.*
- **JSON echo** — *Echo the request body back to the caller.*

### After previewing

Leave the slug blank (auto-generated) or set your own, click **Create**, then on the
endpoint page use **Generate** (new revision), **Try it** (invoke a revision), and
**Submit for production** (staff approval → M2M).

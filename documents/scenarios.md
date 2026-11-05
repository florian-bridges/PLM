# User Scenarios

**US-1 — Requirements engineer**
Writes an item's requirements, derives each lower one from its parent, cites the item its value comes from, marks an unknown value TBD, and checks that every requirement is allocated to a lower item.

**US-2 — Design engineer**
Breaks the product into nested subsystems, attaches design artifacts to an item, and links each design to the requirements it satisfies.

**US-5 — Verification engineer**
Defines test cases that verify requirements by a stated method, records test runs with their system under test, test environment, results and logs, and sees coverage per method.

**US-8 — Analyst**
Records an analysis or trade study with its script, run command, result and report as artifacts, and publishes a derived value as a parameter other items reference instead of copying it.

**US-9 — Reviewer**
Records one review of a scope at a commit with findings on its items, and lists open findings by severity, item or owner.

**US-10 — Item owner after a change**
Lists the impact of a change, reviews each suspect link against what changed, and confirms only the links that still hold; an editorial field change leaves a link current.

**US-11 — Project lead**
Assigns each item's owner and status, and prepares a gate or milestone with queries for validity, suspects, verification coverage, allocation and open findings.

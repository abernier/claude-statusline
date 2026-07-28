# prototypes

Throwaway pages kept as primary sources. Each one is the artifact that settled a
design decision, frozen at the state it was settled in.

They live here rather than in `docs/` because `docs/` is the GitHub Pages root.
Anything under it is published. Nothing in this folder is.

## Running one

Serve the repo root, not this folder. Each page pulls its font and its rendered
loops from `../docs/assets/`.

```sh
python3 -m http.server 8000
```

Then open the page and pick a variant with `?variant=`.

## What is here

| File | Decision | Issue |
| --- | --- | --- |
| `race-identity.html` | Make the spend-against-clock race the identity of the page, README and previews | [#11](https://github.com/alp82/claude-statusline/issues/11) |

### race-identity.html

Four rounds, on branch `prototype/race-identity`, one commit each. This file is
round 4.

```
?variant=0   the page as it shipped before the decision — the baseline
?variant=A   the approved annotation: lane names, edge marks, the gap reading
?variant=E   the effort switch called out with a divider and a line of text
?variant=F   the effort runs labelling themselves — the one that won
?variant=G   the effort named once, at the end of the row
```

Add `&t=0.30` to pin the loop to one frame. `0.30` is mid-burn at high effort,
`0.62` is after the drop to low. The arrow keys and the floating bar switch
variants too.

Earlier rounds are on the branch:

- `189b795` three replacement identities. All did too much.
- `4b53e24` small deltas on the real page, with variant `0` as the shipping page.
- `530dbce` three ways to show the effort switch.
- `d850a83` the effort row at three volumes. This file.

## Rules

- Never link a prototype from the site or the README.
- Never import from one. They are written under prototype constraints: no tests,
  no error handling, no abstractions.
- Do not update one when the real page changes. A prototype is a record of what
  was decided, not a copy of what shipped.

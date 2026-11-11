# Diagrams

Rendered images (`.png` for slides, `.svg` for zooming) sit next to their sources.

| Diagram | Source | Slide |
|---|---|---|
| Use case | `use-case.dot` (Graphviz) | Step 0 |
| Class: data model | `class-model.mmd` (Mermaid) | Step 13 |
| Class: REST API resources | `class-api.mmd` (Mermaid) | Step 13 |
| Sequence: log in | `seq-login.mmd` | Step 14 |
| Sequence: create booking | `seq-create-booking.mmd` | Step 14 |
| Sequence: pay + confirmation email | `seq-pay.mmd` | Step 14 / extra credit |
| Sequence: AI support chatbot (SSE) | `seq-chat.mmd` | Extra credit |

## Editing

- **Mermaid (`.mmd`)**: open the file in VS Code with the *Mermaid Chart* extension to preview and export,
  or paste it into https://mermaid.live. In class diagrams, write notes in `[brackets]`, not `(parentheses)`:
  Mermaid treats any member containing `(` as a method.
- **Graphviz (`.dot`)**: `dot -Tpng -Gdpi=150 use-case.dot -o use-case.png`

Keep the diagrams in sync with `models/`, `routes/` and `controllers/` when those change.

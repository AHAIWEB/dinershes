<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep public editions in Lovable Cloud with RLS-controlled anonymous reads; local mock editions are editor starting templates only, so unpublished work never appears to readers.
- Keep editorial access in the separate `user_roles` table and authorize server functions with the signed-in user's role; never grant the first signup admin rights automatically.
- Keep AI and URL fetching in server-only handlers; this protects provider credentials and rejects unsafe source URLs.
- Publish only by an editor's manual action after approval; automatic scheduling was removed to protect editorial review.
- Serve the user-supplied logo through an asset pointer and keep its cropped version in the masthead; this preserves source artwork and keeps the repository lightweight.
- Edition-wide page design lives in `editions.design` and reaches blocks via CSS variables from `designVars`; keeps all four pages uniform without per-block edits.
- Keep RSS/Atom parsing in a raw-XML utility and test feed parsing and article selection independently; Python feed-sync runs outside the app with a signed-in editorial user and RLS, never an admin key.

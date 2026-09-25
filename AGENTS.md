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
- Schedule publication in PostgreSQL for complete four-page editions only; the time transition must not depend on an editor keeping a browser open.

# মুদ্রণ ফাইল, RSS নিউজরুম ও ডায়নামিক ড্যাশবোর্ড

## যা তৈরি হবে

1. **মুদ্রণ পৃষ্ঠা (`/print/$editionId`)** — প্রকাশিত সংস্করণের প্রতিটি পাতা ১৩×২০.৫ ইঞ্চি মাপে; প্রতি পাতায় "PDF ডাউনলোড" ও "PNG (৩০০ DPI) ডাউনলোড" বাটন, সঙ্গে পুরো সংস্করণ একসাথে PDF।
2. **ডাউনলোড কেন্দ্র (`/downloads`)** — সব প্রকাশিত সংস্করণের তালিকা, প্রতিটি পাতার PDF/PNG ফাইল ডাউনলোড।
3. **RSS নিউজরুম** — আপনার দেওয়া সব ফিড বিভাগ অনুযায়ী (জাতীয়, আন্তর্জাতিক, বিভাগীয়—ঢাকা, বরিশাল, চট্টগ্রাম, সিলেট, রাজশাহী, রংপুর, খুলনা, ময়মনসিংহ, ভারত) সংরক্ষিত থাকবে। সম্পাদক ফিড বাছাই → সাম্প্রতিক খবর তালিকা → এক ক্লিকে AI খসড়া → অনুমোদন → পাতায় স্বয়ংক্রিয় বিন্যাস। অকার্যকর ফিড চিহ্নিত হবে।
4. **পাতার নিচের অর্ধেক ভরাট** — অটো-লেআউট উন্নত: প্রধান খবর (৪ কলাম), নিচে ৩+৩ কলামের দুই খবর, ২ কলামের তিনটি সারি, ৬ কলাম প্রস্থের বিজ্ঞাপন ব্যান্ড, ডান পাশে ২ কলামের রেল — সব প্রস্থ নির্দিষ্ট ছয়-কলাম মাপে (২ / ৪.২১৩ / ৬.৪১ / ৮.৬০৭ / ১০.৮০৩ / ১৩ ইঞ্চি)। নমুনা সংস্করণ RSS খবর দিয়ে পূর্ণ করা হবে।
5. **ডায়নামিক অ্যাডমিন/এডিটর ড্যাশবোর্ড (`/admin` নতুন "ড্যাশবোর্ড" ট্যাব)**
   - সংস্করণ: খসড়া/রিভিউ/অনুমোদিত/প্রকাশিত গণনা ও তালিকা, খুলুন/অনুমোদন/প্রকাশ।
   - খবর: AI খসড়া ও অনুমোদিত খবর, ফিল্টার, মুছুন।
   - বিজ্ঞাপন: বিজ্ঞাপন যোগ/সম্পাদনা (শিরোনাম, ছবি, মাপ কলামে), পাতায় বসানো।
   - ব্যবহারকারী ও রোল (শুধু অ্যাডমিন): ইমেইল দিয়ে সম্পাদক/ডিজাইনার যোগ, রোল বদল, সরানো।
6. **ফ্লো যাচাই** — সম্পাদক অ্যাকাউন্টে লগইন করে save draft → review → approve → publish পরীক্ষা করে ফলাফল জানানো হবে।

## Technical details

- New tables: `rss_feeds` (url, name, region, active, last_status), `ads` (title, image_url, body, column_span, active) with GRANTs + RLS (editorial manage; ads public read only when placed via page_blocks).
- `newsroom.server.ts`: `fetchFeed(url)` parses RSS/Atom with linkedom, reuses existing SSRF guard; server fn `listFeedItems`, `importFeedItem` (scrape → source_items).
- Users: server fn with `requireSupabaseAuth`, verifies admin via `user_roles`, then `supabaseAdmin.auth.admin` for invite/lookup.
- Print files: client-side `html-to-image` (PNG at 3900×6150 px = 300 DPI) + `jspdf` (13×20.5 in page). No server rendering.
- `autoLayoutColumns` rewritten to fill 6 columns top-to-bottom with height budget.
- Manual publishing rule unchanged (no scheduled auto-publish).

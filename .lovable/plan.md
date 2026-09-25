# ৬-কলাম বাংলা ই-পেপার, AI নিউজরুম ও আর্কাইভ

## লক্ষ্য
বর্তমান ৪ পৃষ্ঠার prototype-কে ১৩ × ২০.৫ ইঞ্চির professional broadsheet canvas-এ রূপান্তর করা। প্রতিটি পৃষ্ঠা ৬-কলাম grid ব্যবহার করবে, সম্পাদক URL বা নিজস্ব তথ্য থেকে AI-assisted সংবাদ বানাতে পারবেন, অনুমোদনের পর সেটি পাতায় বসাবেন, এবং প্রকাশিত সংস্করণ আর্কাইভ ও branded share card হিসেবে পাওয়া যাবে।

## যা তৈরি হবে

### ১. সঠিক পৃষ্ঠা ও ৬-কলাম grid
- Print canvas: **১৩ ইঞ্চি × ২০.৫ ইঞ্চি** (৩৩ × ৫২ সেমি), screen preview-তে একই অনুপাত।
- ৬টি base column; gutter ও page margin এমনভাবে নির্ধারিত হবে যেন block span-গুলো এই মাপ অনুসরণ করে:
  - ১ কলাম: ২.০০০″
  - ২ কলাম: ৪.২১৩″
  - ৩ কলাম: ৬.৪১০″
  - ৪ কলাম: ৮.৬০৭″
  - ৫ কলাম: ১০.৮০৩″
  - ৬ কলাম: ১৩.০০০″
- প্রতিটি content block-এর জন্য ১–৬ column span নির্বাচন, drag-and-drop placement, এবং canvas-এ column guide।
- ১০০% four-color presentation: সংবাদ, ছবি, বিজ্ঞাপন ও accent-এর full-color output; browser print/PDF-এ exact colors রাখার print settings।
- বর্তমান চারটি page template নতুন grid-এ পুনর্বিন্যাস এবং thumbnail ratio ঠিক করা।

### ২. নিউজরুম ইনপুট ও URL সংগ্রহ
- Admin-এ নতুন **নিউজরুম** workspace: উৎস URL, কাঁচা লেখা, গুরুত্বপূর্ণ তথ্য এবং নির্দেশনা দেওয়ার form।
- দুটি URL mode: অনুমোদিত সংবাদসাইটকে অগ্রাধিকার, পাশাপাশি অন্য public URL চেষ্টা করা।
- Server-side fetch থেকে title, article text, lead image, source URL/domain ও fetched time সংগ্রহ।
- robots/access restriction, paywall বা unreadable page হলে পরিষ্কার বাংলা error; কোনো restricted content bypass করা হবে না।
- URL থেকে পাওয়া উপাদান editable source draft হিসেবে থাকবে; মূল উৎস সব সময় দৃশ্যমান থাকবে।

### ৩. Lovable AI সংবাদ সহকারী
- তিনটি mode রাখা হবে:
  1. **সম্পূর্ণ সংবাদ প্যাক** — শিরোনাম, উপশিরোনাম, সংক্ষিপ্ত প্রতিবেদন, গুরুত্বপূর্ণ তথ্য, caption ও source note।
  2. **শিরোনাম ও সারাংশ** — দ্রুত compact output।
  3. **নিজে নির্বাচন** — সম্পাদক প্রয়োজনীয় output field বেছে নেবেন।
- AI-কে কেবল সম্পাদক-দেওয়া তথ্য ও fetched source ব্যবহার করতে বলা হবে; অজানা তথ্য বানাতে নিষেধ এবং সন্দেহজনক তথ্য আলাদা সতর্কতায় দেখানো হবে।
- AI result editable থাকবে এবং original source-এর পাশে comparison view থাকবে।
- Workflow: **AI খসড়া → সম্পাদক অনুমোদন → page designer-এ যোগ**। অনুমোদন ছাড়া public issue-তে যাবে না।
- AI request loading, failure, credits/rate-limit এবং retry-safe states বাংলায় দেখানো হবে।

### ৪. স্থায়ী সংরক্ষণ ও প্রকাশনা
- Lovable Cloud-এ source items, articles, editions, pages, blocks এবং share-card metadata সংরক্ষণ।
- Draft/review/approved/scheduled/published lifecycle; public pages শুধু published সংস্করণ পড়বে।
- ডেমো সংস্করণ seed করা থাকবে, যাতে প্রথম load-এই usable content দেখা যায়।
- newsroom roles আলাদা role table-এ: admin, editor, designer; protected editing ও public read policies।
- এই ধাপে editor sign-in screen এবং role-based admin protectionও থাকবে, যাতে newsroom data public edit করা না যায়।

### ৫. সামাজিক মাধ্যমের share card
- প্রকাশিত article ও edition থেকে branded card composer।
- তিনটি preset: **Facebook 1200×630**, **Instagram 1080×1080**, **Story 1080×1920**।
- headline, section, date, masthead, ছবি এবং source attribution preview; layout-safe text fitting।
- প্রতিটি preset PNG download; Web Share API পাওয়া গেলে native share, না হলে download/copy link।

### ৬. প্রকাশিত ই-পেপার আর্কাইভ
- নতুন public **আর্কাইভ** পৃষ্ঠা।
- বাংলা date picker/month filter, section filter এবং keyword search।
- ফলাফলে issue cover, প্রকাশের তারিখ, edition number, section list ও “সংস্করণ পড়ুন” action।
- নির্দিষ্ট প্রকাশিত issue খোলার স্থায়ী URL; current issue ও archive links top navigation-এ।

## যাচাই
- ১৩ × ২০.৫ ইঞ্চি print preview এবং ৬-column/span মাপ desktop ও mobile preview-তে যাচাই।
- URL fetch: একটি readable public article এবং একটি blocked/invalid URL state পরীক্ষা।
- AI-এর তিনটি mode-এ live request পরীক্ষা; generated draft approve করে designer-এ বসানো।
- Draft public-এ না দেখা এবং published edition archive-এ দেখা নিশ্চিত করা।
- তিনটি share-card size download করে image dimensions ও Bengali text fit যাচাই।
- সব content route-এর বাংলা metadata, build health, browser console এবং print page breaks পরীক্ষা।

## প্রযুক্তিগত নোট
- AI: server-side Lovable AI Gateway, model `openai/gpt-6-astra`, Responses streaming protocol; key browser-এ যাবে না।
- URL parser: server-side fetch + HTML article extraction; private/local network URLs blocked থাকবে।
- Page model: fixed six-track grid ও block `columnSpan`; print CSS physical inches ব্যবহার করবে।
- Share card: browser canvas থেকে deterministic PNG export, server dependency ছাড়া।
- Database access: public published reads; authenticated role-based editorial writes; row-level access controls।

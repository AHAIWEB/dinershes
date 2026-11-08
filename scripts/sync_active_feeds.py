#!/usr/bin/env python3
"""Save new stories from active feeds into দিনের শেষ খবর.

Set EPAPER_APP_URL, EPAPER_SUPABASE_URL, EPAPER_PUBLISHABLE_KEY,
EPAPER_EDITOR_EMAIL and EPAPER_EDITOR_PASSWORD before running.
For a scheduled task, store the email and password in your operating system's
secret environment settings; never put them in this file or a shared repository.
The app checks the account's editorial role and saves stories only; it does not publish editions.
This script uses only Python's standard library.
"""

import getpass
import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    app_url = os.environ.get("EPAPER_APP_URL", "").strip().rstrip("/")
    supabase_url = os.environ.get("EPAPER_SUPABASE_URL", "").strip().rstrip("/")
    publishable_key = os.environ.get("EPAPER_PUBLISHABLE_KEY", "").strip()
    email = os.environ.get("EPAPER_EDITOR_EMAIL", "").strip()
    password = os.environ.get("EPAPER_EDITOR_PASSWORD", "")
    if not app_url:
        app_url = input("প্রকাশিত সাইটের ঠিকানা: ").strip().rstrip("/")
    if not supabase_url:
        supabase_url = input("Lovable Cloud-এর সাইন-ইন ঠিকানা: ").strip().rstrip("/")
    if not publishable_key:
        publishable_key = input("অ্যাপের প্রকাশযোগ্য সংযোগ চাবি: ").strip()
    if not email:
        email = input("সম্পাদকের ইমেইল: ").strip()
    if not password:
        password = getpass.getpass("সম্পাদকের পাসওয়ার্ড: ")

    try:
        per_feed = int(os.environ.get("EPAPER_MAX_ITEMS_PER_FEED", "6"))
    except ValueError:
        print("EPAPER_MAX_ITEMS_PER_FEED ১ থেকে ১০-এর সংখ্যা হতে হবে।", file=sys.stderr)
        return 2
    if not 1 <= per_feed <= 10:
        print("EPAPER_MAX_ITEMS_PER_FEED ১ থেকে ১০-এর সংখ্যা হতে হবে।", file=sys.stderr)
        return 2
    if not app_url.startswith("https://") or not supabase_url.startswith("https://") or not publishable_key:
        print("সাইট ও Lovable Cloud-এর HTTPS ঠিকানা এবং প্রকাশযোগ্য সংযোগ চাবি দিন।", file=sys.stderr)
        return 2

    sign_in = urllib.request.Request(
        f"{supabase_url}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode("utf-8"),
        headers={"Content-Type": "application/json", "apikey": publishable_key, "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(sign_in, timeout=30) as response:
            session = json.loads(response.read(64_000).decode("utf-8"))
        access_token = session.get("access_token")
        if not access_token:
            print("সম্পাদকীয় সাইন-ইন হয়নি।", file=sys.stderr)
            return 1
        request = urllib.request.Request(
            f"{app_url}/api/public/feed-sync",
            data=b"",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=180) as response:
            result = json.loads(response.read(64_000).decode("utf-8"))
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read(8_000).decode("utf-8"))
            detail = payload.get("error", "অনুরোধটি সম্পন্ন হয়নি।")
        except (ValueError, UnicodeDecodeError):
            detail = "অনুরোধটি সম্পন্ন হয়নি।"
        print(f"সমস্যা: {detail}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        print(f"সাইটে পৌঁছানো যায়নি: {error}", file=sys.stderr)
        return 1

    print(f"সক্রিয় ফিড দেখা হয়েছে: {result.get('feedsChecked', 0)}টি")
    print(f"নতুন খবর সংরক্ষিত হয়েছে: {result.get('storiesSaved', 0)}টি")
    print(f"যে ফিড পড়া যায়নি: {result.get('feedErrors', 0)}টি")
    print("খবরগুলো সংরক্ষিত হয়েছে; কোনো সংস্করণ প্রকাশ করা হয়নি।")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
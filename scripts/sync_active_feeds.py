#!/usr/bin/env python3
"""Save new stories from active feeds into দিনের শেষ খবর.

Set EPAPER_CLOUD_URL, EPAPER_PUBLISHABLE_KEY, EPAPER_EDITOR_EMAIL and
EPAPER_EDITOR_PASSWORD before running, or enter them when prompted. Use your
operating system's protected secret settings if scheduling this script; never
put a password or access token in this file. It saves stories only and never
publishes editions. Requires only Python's standard library.
"""

import getpass
import html
import ipaddress
import json
import os
import socket
import sys
import urllib.parse
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file, code, message, headers, new_url):
        return None


class FeedHtmlText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.images = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag.lower() == "img" and values.get("src"):
            self.images.append(values["src"])
        if tag.lower() in ("p", "br", "div", "li"):
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)

    def text(self):
        return " ".join(" ".join(self.parts).split())[:1000]


def validate_public_url(value):
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("শুধু নিরাপদ HTTP/HTTPS সংবাদ ফিড অনুমোদিত।")
    if parsed.port and parsed.port not in (80, 443):
        raise ValueError("ফিডের পোর্ট অনুমোদিত নয়।")
    try:
        addresses = {result[4][0] for result in socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80))}
    except OSError as error:
        raise ValueError("ফিডের ঠিকানা খুঁজে পাওয়া যায়নি।") from error
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("ব্যক্তিগত বা স্থানীয় ঠিকানার ফিড পড়া যাবে না।")
    return parsed


def bounded_fetch(url, max_bytes=2_000_000, redirects=3):
    opener = urllib.request.build_opener(NoRedirect())
    current = url
    for _ in range(redirects + 1):
        validate_public_url(current)
        request = urllib.request.Request(
            current,
            headers={"User-Agent": "DinerSheshKhobor-Feed-Sync/1.0", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"},
        )
        try:
            response = opener.open(request, timeout=15)
        except urllib.error.HTTPError as error:
            if error.code not in (301, 302, 303, 307, 308):
                raise
            location = error.headers.get("Location")
            if not location:
                raise ValueError("ফিডের পুনর্নির্দেশ ঠিকানা নেই।")
            current = urllib.parse.urljoin(current, location)
            continue
        with response:
            payload = response.read(max_bytes + 1)
            if len(payload) > max_bytes:
                raise ValueError("ফিডটি অনুমোদিত আকারের চেয়ে বড়।")
            return payload, current
    raise ValueError("ফিডে অনেকগুলো পুনর্নির্দেশ রয়েছে।")


def local_name(tag):
    return tag.rsplit("}", 1)[-1].split(":")[-1].lower()


def feed_stories(feed_url, limit):
    payload, final_url = bounded_fetch(feed_url)
    root = ET.fromstring(payload)
    entries = [node for node in root.iter() if local_name(node.tag) in ("item", "entry")][:limit]
    stories = []
    for entry in entries:
        title = ""
        summary = ""
        link = ""
        image = ""
        for child in entry.iter():
            name = local_name(child.tag)
            value = "".join(child.itertext()).strip()
            if name == "title" and not title:
                title = value
            elif name in ("description", "summary", "encoded") and not summary:
                parser = FeedHtmlText()
                parser.feed(value)
                summary = parser.text()
                if parser.images:
                    image = urllib.parse.urljoin(final_url, parser.images[0])
            elif name == "link" and not link:
                link = child.attrib.get("href", "").strip() or value
            elif name in ("enclosure", "content") and not image:
                image = child.attrib.get("url", "").strip()
        link = urllib.parse.urljoin(final_url, html.unescape(link))
        if not title or not link.startswith(("http://", "https://")):
            continue
        if image and not image.startswith(("http://", "https://")):
            image = ""
        stories.append({"title": html.unescape(title)[:300], "link": link, "summary": summary[:1000], "image_url": image or None})
    return stories


def api_request(base_url, path, api_key, token, method="GET", payload=None, extra_headers=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"apikey": api_key, "Authorization": f"Bearer {token}", "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if extra_headers:
        headers.update(extra_headers)
    request = urllib.request.Request(f"{base_url}{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(2_000_000)
        return json.loads(raw.decode("utf-8")) if raw else None


def main() -> int:
    supabase_url = os.environ.get("EPAPER_CLOUD_URL", "").strip().rstrip("/")
    publishable_key = os.environ.get("EPAPER_PUBLISHABLE_KEY", "").strip()
    email = os.environ.get("EPAPER_EDITOR_EMAIL", "").strip()
    password = os.environ.get("EPAPER_EDITOR_PASSWORD", "")
    if not supabase_url:
        supabase_url = input("Lovable Cloud-এর ঠিকানা: ").strip().rstrip("/")
    if not publishable_key:
        publishable_key = getpass.getpass("অ্যাপের প্রকাশযোগ্য সংযোগ চাবি: ").strip()
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
    if not supabase_url.startswith("https://") or not publishable_key.startswith("sb_publishable_"):
        print("Lovable Cloud-এর HTTPS ঠিকানা ও প্রকাশযোগ্য সংযোগ চাবি দিন।", file=sys.stderr)
        return 2

    try:
        auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
        sign_in = urllib.request.Request(
            auth_url,
            data=json.dumps({"email": email, "password": password}).encode("utf-8"),
            headers={"Content-Type": "application/json", "apikey": publishable_key, "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(sign_in, timeout=30) as response:
            session = json.loads(response.read(64_000).decode("utf-8"))
        access_token = session.get("access_token")
        user = session.get("user") or {}
        user_id = user.get("id")
        if not access_token or not user_id:
            print("সম্পাদকীয় সাইন-ইন হয়নি।", file=sys.stderr)
            return 1
        base = f"{supabase_url}/rest/v1"
        feeds = api_request(
            base,
            "/rss_feeds?select=id,url,region&active=eq.true&kind=eq.feed&order=id.asc&limit=100",
            publishable_key,
            access_token,
        ) or []
        saved = 0
        failed = 0
        for feed in feeds:
            try:
                stories = feed_stories(feed["url"], per_feed)
                rows = [
                    {**story, "category": feed.get("region", "জাতীয়")[:40], "feed_id": feed["id"], "created_by": user_id}
                    for story in stories
                ]
                if rows:
                    inserted = api_request(
                        base,
                        "/saved_stories?on_conflict=link",
                        publishable_key,
                        access_token,
                        method="POST",
                        payload=rows,
                        extra_headers={"Prefer": "resolution=ignore-duplicates,return=representation"},
                    ) or []
                    saved += len(inserted)
                api_request(
                    base,
                    f"/rss_feeds?id=eq.{urllib.parse.quote(feed['id'])}",
                    publishable_key,
                    access_token,
                    method="PATCH",
                    payload={"last_status": "ok", "last_checked_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},
                    extra_headers={"Prefer": "return=minimal"},
                )
            except (KeyError, ValueError, OSError, ET.ParseError, urllib.error.URLError):
                failed += 1
                try:
                    api_request(
                        base,
                        f"/rss_feeds?id=eq.{urllib.parse.quote(feed['id'])}",
                        publishable_key,
                        access_token,
                        method="PATCH",
                        payload={"last_status": "error", "last_checked_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},
                        extra_headers={"Prefer": "return=minimal"},
                    )
                except (OSError, urllib.error.URLError):
                    pass
        result = {"feedsChecked": len(feeds), "storiesSaved": saved, "feedErrors": failed}
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read(8_000).decode("utf-8"))
            detail = payload.get("error", "অনুরোধটি সম্পন্ন হয়নি।")
        except (ValueError, UnicodeDecodeError):
            detail = "অনুরোধটি সম্পন্ন হয়নি।"
        print(f"সমস্যা: {detail}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as error:
        print("Lovable Cloud-এ পৌঁছানো যায়নি বা সম্পাদকীয় অনুমতি মেলেনি।", file=sys.stderr)
        return 1

    print(f"সক্রিয় ফিড দেখা হয়েছে: {result.get('feedsChecked', 0)}টি")
    print(f"নতুন খবর সংরক্ষিত হয়েছে: {result.get('storiesSaved', 0)}টি")
    print(f"যে ফিড পড়া যায়নি: {result.get('feedErrors', 0)}টি")
    print("খবরগুলো সংরক্ষিত হয়েছে; কোনো সংস্করণ প্রকাশ করা হয়নি।")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
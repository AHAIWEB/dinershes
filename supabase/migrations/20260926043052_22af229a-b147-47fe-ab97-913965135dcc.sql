CREATE TABLE public.rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT 'জাতীয়',
  active boolean NOT NULL DEFAULT true,
  last_status text NOT NULL DEFAULT 'unchecked',
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rss_feeds TO authenticated;
GRANT ALL ON public.rss_feeds TO service_role;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editorial view feeds" ON public.rss_feeds FOR SELECT TO authenticated USING (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial add feeds" ON public.rss_feeds FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial update feeds" ON public.rss_feeds FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial delete feeds" ON public.rss_feeds FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));
CREATE TRIGGER rss_feeds_updated_at BEFORE UPDATE ON public.rss_feeds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  image_url text,
  column_span integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Editorial view ads" ON public.ads FOR SELECT TO authenticated USING (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial add ads" ON public.ads FOR INSERT TO authenticated WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial update ads" ON public.ads FOR UPDATE TO authenticated USING (private.is_editorial(auth.uid())) WITH CHECK (private.is_editorial(auth.uid()));
CREATE POLICY "Editorial delete ads" ON public.ads FOR DELETE TO authenticated USING (private.is_editorial(auth.uid()));
CREATE TRIGGER ads_updated_at BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.rss_feeds (url, name, region) VALUES
('https://www.channelionline.com/feed/','চ্যানেল আই','জাতীয়'),
('https://maasranga.tv/feed/','মাছরাঙা','জাতীয়'),
('https://mytvbd.tv/feed','মাইটিভি','জাতীয়'),
('https://www.ntvbd.com/rss.xml','এনটিভি','জাতীয়'),
('https://www.somoynews.tv/rss.xml','সময় নিউজ','জাতীয়'),
('https://bangladeshdiplomat.com/feed/','বাংলাদেশ ডিপ্লোম্যাট','জাতীয়'),
('https://thedhakapost.com/rss.xml','ঢাকা পোস্ট','জাতীয়'),
('https://www.aajkaal.in/rss.xml','আজকাল','আন্তর্জাতিক'),
('https://kolkata24x7.in/feed/','কলকাতা ২৪x৭','আন্তর্জাতিক'),
('https://www.sangbadpratidin.in/feed/','সংবাদ প্রতিদিন','আন্তর্জাতিক'),
('http://zeenews.india.com/bengali/rssfeed/nation.xml','জি ২৪ ঘণ্টা · দেশ','আন্তর্জাতিক'),
('http://zeenews.india.com/bengali/rssfeed/world.xml','জি ২৪ ঘণ্টা · বিশ্ব','আন্তর্জাতিক'),
('http://zeenews.india.com/bengali/rssfeed/sports.xml','জি ২৪ ঘণ্টা · খেলা','আন্তর্জাতিক'),
('http://zeenews.india.com/bengali/rssfeed/entertainment.xml','জি ২৪ ঘণ্টা · বিনোদন','আন্তর্জাতিক'),
('https://eisamay.com/stories.rss','এই সময়','ভারত'),
('https://www.dailydhakasangbad.com/feed','ঢাকা সংবাদ','ঢাকা'),
('https://www.amarbangladesh24.com/feed/','আমার বাংলাদেশ ২৪','ঢাকা'),
('https://munshigonj24.com/feed/','মুন্সীগঞ্জ ২৪','ঢাকা'),
('https://www.newsnarayanganj24.com/feed','নিউজ নারায়ণগঞ্জ','ঢাকা'),
('https://www.ajkernarayanganj.com/feed/','আজকের নারায়ণগঞ্জ','ঢাকা'),
('https://livenarayanganj.com/feed/','লাইভ নারায়ণগঞ্জ','ঢাকা'),
('https://rudrabarta.net/feed','রুদ্রবার্তা','ঢাকা'),
('https://amarbikrampur.com/feed/','আমার বিক্রমপুর','ঢাকা'),
('https://ajkerparibartan.com/feed/','আজকের পরিবর্তন','বরিশাল'),
('https://barisalprotidin.com/feed','বরিশাল প্রতিদিন','বরিশাল'),
('https://barisalsangbad.com/feed/','বরিশাল সংবাদ','বরিশাল'),
('https://www.amaderbarisal.com/feed','আমাদের বরিশাল','বরিশাল'),
('https://barishalpostnews.com/feed/','বরিশাল পোস্ট','বরিশাল'),
('https://barisaltoday.com/feed/','বরিশাল টুডে','বরিশাল'),
('https://manobkal.com/feed/','মানবকাল','বরিশাল'),
('https://patuakhalibarta.com/feed/','পটুয়াখালী বার্তা','বরিশাল'),
('https://bholanews.com/feed','ভোলা নিউজ','বরিশাল'),
('https://purbodesh.com/feed/','পূর্বদেশ','চট্টগ্রাম'),
('https://suprobhat.com/feed/','সুপ্রভাত','চট্টগ্রাম'),
('https://dainikazadi.net/feed/','দৈনিক আজাদী','চট্টগ্রাম'),
('https://dainikpurbokone.net/feed/','পূর্বকোণ','চট্টগ্রাম'),
('https://www.parbattanews.com/feed/','পার্বত্য নিউজ','চট্টগ্রাম'),
('https://ctgtimes.com/feed','চট্টগ্রাম টাইমস','চট্টগ্রাম'),
('https://teknaftoday.com/feed/','টেকনাফ টুডে','চট্টগ্রাম'),
('https://dailysylhetmirror.com/feed','সিলেট মিরর','সিলেট'),
('https://www.shyamalsylhet.net/feed','শ্যামল সিলেট','সিলেট'),
('https://dailyjalalabad.com/feed','জালালাবাদ','সিলেট'),
('https://sylhetreport.com/feed','সিলেট রিপোর্ট','সিলেট'),
('https://www.habiganjnews24.com/feed/','হবিগঞ্জ নিউজ','সিলেট'),
('https://sonalisangbad.com/feed/','সোনালী সংবাদ','রাজশাহী'),
('https://www.dailysunshine.com.bd/feed','সানশাইন','রাজশাহী'),
('https://bograsangbad.com/feed','বগুড়া সংবাদ','রাজশাহী'),
('https://dailysonardesh.com/feed','সোনার দেশ','রাজশাহী'),
('https://karatoa.com/feed','করতোয়া','রাজশাহী'),
('https://rangpur.news/feed','রংপুর নিউজ','রংপুর'),
('https://www.dainikrangpur.com/feed','দৈনিক রংপুর','রংপুর'),
('https://thakurgaonsangbad.com/feed/','ঠাকুরগাঁও সংবাদ','রংপুর'),
('https://dinajpurbarta24.com/feed','দিনাজপুর বার্তা','রংপুর'),
('https://www.mathabhanga.com/feed','মাথাভাঙ্গা','খুলনা'),
('https://prothombhor.net/feed','প্রথম ভোর','খুলনা'),
('https://samajerkatha.com/feed/','সমাজের কথা','খুলনা'),
('https://www.sundarbontimes.com/feed/','সুন্দরবন টাইমস','খুলনা'),
('https://patradoot.net/feed','পত্রদূত','খুলনা'),
('https://www.maguranews.com/feed','মাগুরা নিউজ','খুলনা'),
('https://bagerhat24.com/feed','বাগেরহাট ২৪','খুলনা'),
('https://www.pratidinermymensingh.com/feed/','প্রতিদিনের ময়মনসিংহ','ময়মনসিংহ'),
('https://mymensinghpratidin.com/feed/','ময়মনসিংহ প্রতিদিন','ময়মনসিংহ'),
('https://ajkerjamalpur.com/feed/','আজকের জামালপুর','ময়মনসিংহ'),
('https://dailysabuj.com/feed','দৈনিক সবুজ','ময়মনসিংহ')
ON CONFLICT (url) DO NOTHING;
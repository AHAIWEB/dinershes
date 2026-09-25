import scan1 from "@/assets/page-scan-1.jpg";
import scan2 from "@/assets/page-scan-2.jpg";

export type BlockType = "headline" | "article" | "image" | "ad" | "quote" | "divider";

export type Block = {
  id: string;
  type: BlockType;
  section: string;
  label: string;
  body?: string;
  credit?: string;
  imageSrc?: string;
  imageWidth?: number;
  imageHeight?: number;
  fit?: "cover" | "contain" | "fill";
  radius?: number;
  align?: "left" | "center" | "right";
  fontScale?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  padding?: { top: number; right: number; bottom: number; left: number };
  invert?: boolean;
  columnSpan?: number;
};

export type Page = {
  id: string;
  no: number;
  title: string;
  section: string;
  columns: Block[][];
};

export type Edition = {
  id: string;
  number: string;
  dateBn: string;
  hijri: string;
  status: "draft" | "review" | "scheduled" | "published";
  pages: Page[];
};

export const SECTIONS = ["প্রচ্ছদ", "দেশ", "নগর", "বিশ্ব", "খেলা", "সংস্কৃতি", "মতামত", "বিজ্ঞাপন"];

const m = { top: 0, right: 0, bottom: 14, left: 0 };
const p = { top: 0, right: 0, bottom: 0, left: 0 };

const base = (b: Partial<Block> & { id: string; type: BlockType; label: string }): Block => ({
  section: "প্রচ্ছদ",
  align: "left",
  fontScale: 1,
  radius: 2,
  fit: "cover",
  margin: m,
  padding: p,
  ...b,
});

const threeColumnEdition: Edition = {
  id: "ed-10",
  number: "১০",
  dateBn: "রবিবার, ১০ সেপ্টেম্বর ২০২৪",
  hijri: "ঢাকা · ১৪৪৬ হিজরি",
  status: "draft",
  pages: [
    {
      id: "p1",
      no: 1,
      title: "প্রচ্ছদ",
      section: "প্রচ্ছদ",
      columns: [
        [
          base({
            id: "b1",
            type: "image",
            label: "আজকের প্রচ্ছদ",
            credit: "ছবি · দিনের শেষ খবর ডেস্ক",
            imageSrc: scan1,
            imageWidth: 320,
            imageHeight: 420,
          }),
          base({
            id: "b2",
            type: "headline",
            label: "নতুন দিনের শহর, মানুষের গল্প",
            body: "পরিবর্তনের ভেতরেও শহর খুঁজে নেয় তার নিজস্ব ছন্দ। আমাদের বিশেষ প্রতিবেদনে থাকছে নাগরিক জীবনের নানা রঙ।",
            fontScale: 1.15,
          }),
          base({
            id: "b3",
            type: "article",
            section: "নগর",
            label: "যে পথে বদলে যাচ্ছে প্রতিদিন",
            credit: "নিজস্ব প্রতিবেদক",
            body: "নদীর পাড় থেকে ব্যস্ত বাজার—শহরের প্রতিটি মোড়ে জমছে নতুন গল্প। স্থানীয় মানুষের অভিজ্ঞতা, আশা ও প্রত্যাশার কথা তুলে ধরেছেন আমাদের প্রতিবেদক।",
          }),
          base({
            id: "b4",
            type: "quote",
            section: "মতামত",
            label: "‘খবরের ভেতরেই মানুষের কণ্ঠ থাকে’",
            credit: "— সম্পাদকীয় ডেস্ক",
          }),
        ],
        [
          base({
            id: "b5",
            type: "headline",
            section: "দেশ",
            label: "শহরের নকশায় নতুন অধ্যায়",
            body: "পরিকল্পনা ও বাস্তবতার মাঝখানে দাঁড়িয়ে বদলে যাচ্ছে নগরজীবনের রূপরেখা।",
          }),
          base({
            id: "b6",
            type: "article",
            section: "দেশ",
            label: "বাসযোগ্যতার প্রশ্নে নতুন উদ্যোগ",
            credit: "কর্মসূচি প্রতিবেদন",
            body: "সড়ক, আলো, পানি ও গণপরিবহন—নগরবাসীর দৈনন্দিন চাহিদা দিয়ে শুরু হয়েছে নতুন আলোচনা।",
          }),
          base({
            id: "b7",
            type: "image",
            label: "স্মৃতির পাতা",
            credit: "আর্কাইভ",
            imageSrc: scan2,
            imageWidth: 320,
            imageHeight: 240,
          }),
        ],
        [
          base({
            id: "b8",
            type: "headline",
            section: "বিশ্ব",
            label: "দূরের খবর, কাছের প্রভাব",
            body: "বিশ্বের নানা প্রান্তের পরিবর্তন কীভাবে ছুঁয়ে যায় আমাদের জীবন—আজকের বিশ্লেষণে তারই খোঁজ।",
          }),
          base({
            id: "b9",
            type: "article",
            section: "সংস্কৃতি",
            label: "আলোচনায় নতুন সমীকরণ",
            credit: "সাংস্কৃতিক ডেস্ক",
            body: "কূটনীতি, অর্থনীতি ও মানুষের চলাচল—তিন স্তরে বদলে যাচ্ছে সাপ্তাহিক সিদ্ধান্তগুলো।",
          }),
          base({
            id: "b10",
            type: "ad",
            section: "বিজ্ঞাপন",
            label: "আপনার ব্র্যান্ডের গল্প এখানে",
            body: "প্রিমিয়াম স্পট · ৩০০ × ১৫০ px",
            invert: true,
          }),
        ],
      ],
    },
    {
      id: "p2",
      no: 2,
      title: "দেশ",
      section: "দেশ",
      columns: [
        [
          base({
            id: "c1",
            type: "headline",
            section: "দেশ",
            label: "গ্রাম থেকে শহর, বদলের হিসাব",
            body: "কৃষি, শিক্ষা আর স্বাস্থ্যসেবার নতুন হিসাব মিলছে মাঠপর্যায়ের প্রতিবেদনে।",
          }),
          base({
            id: "c2",
            type: "article",
            section: "দেশ",
            label: "সড়কে ফিরেছে ব্যস্ততা",
            body: "দীর্ঘ ছুটির পর কর্মদিবসে ফিরেছে চিরচেনা ভিড়। যাত্রী ও চালকদের অভিজ্ঞতা এক নজরে।",
          }),
        ],
        [
          base({
            id: "c3",
            type: "image",
            section: "দেশ",
            label: "মাঠের ছবি",
            imageSrc: scan2,
            imageWidth: 320,
            imageHeight: 380,
          }),
          base({
            id: "c4",
            type: "article",
            section: "দেশ",
            label: "স্থানীয় বাজারে স্বস্তির আশা",
            body: "সরবরাহ বাড়লে দাম কমবে—ব্যবসায়ীদের ভাষ্যে এমন আশাই শোনা গেল।",
          }),
        ],
        [
          base({
            id: "c5",
            type: "article",
            section: "খেলা",
            label: "মাঠে ফিরছে স্থানীয় ক্রীড়া",
            body: "তরুণদের অংশগ্রহণে নতুন করে প্রাণ পাচ্ছে পাড়ার মাঠ, গ্যালারি আর খেলার আড্ডা।",
          }),
          base({ id: "c6", type: "divider", label: "বিভাজক" }),
          base({
            id: "c7",
            type: "ad",
            section: "বিজ্ঞাপন",
            label: "ক্লাসিফায়েড বিজ্ঞাপন",
            body: "কলাম স্পট · ৩০০ × ১২০ px",
          }),
        ],
      ],
    },
    {
      id: "p3",
      no: 3,
      title: "নগর",
      section: "নগর",
      columns: [
        [
          base({
            id: "d1",
            type: "headline",
            section: "নগর",
            label: "একটি শহর, অনেক স্মৃতি",
            body: "হবির অ্যালবামে ফিরে দেখা পুরোনো পাড়া, চেনা রাস্তা আর হারিয়ে যাওয়া বিকেল।",
          }),
          base({
            id: "d2",
            type: "image",
            section: "নগর",
            label: "পুরোনো পাড়া",
            imageSrc: scan1,
            imageWidth: 320,
            imageHeight: 300,
          }),
        ],
        [
          base({
            id: "d3",
            type: "article",
            section: "নগর",
            label: "পানির লাইনে দীর্ঘ অপেক্ষা",
            body: "সরবরাহ সংকটে দিন কাটছে কয়েকটি এলাকার বাসিন্দাদের। কর্তৃপক্ষ বলছে সমাধান শিগগিরই।",
          }),
          base({
            id: "d4",
            type: "quote",
            section: "মতামত",
            label: "‘শহর গড়ে ওঠে মানুষের অভ্যাসে’",
            credit: "— নগর পরিকল্পনাবিদ",
          }),
        ],
        [
          base({
            id: "d5",
            type: "article",
            section: "সংস্কৃতি",
            label: "সন্ধ্যার মঞ্চে নতুন সুর",
            body: "তরুণ শিল্পীদের পরিবেশনায় জমে উঠেছে পাড়ার সাংস্কৃতিক আয়োজন।",
          }),
          base({
            id: "d6",
            type: "ad",
            section: "বিজ্ঞাপন",
            label: "স্থানীয় ক্যাফের উদ্বোধন",
            body: "ব্যানার স্পট · ৩০০ × ১০০ px",
          }),
        ],
      ],
    },
    {
      id: "p4",
      no: 4,
      title: "মতামত",
      section: "মতামত",
      columns: [
        [
          base({
            id: "e1",
            type: "headline",
            section: "মতামত",
            label: "দিনের শেষ খবর, দিনের সবটুকু হিসাব",
            body: "সারাদিনের গুরুত্বপূর্ণ খবর এক সংকলনে—পাঠকের জন্য সন্ধ্যার পাঠ।",
          }),
          base({
            id: "e2",
            type: "article",
            section: "মতামত",
            label: "সম্পাদকীয়: তথ্যের দায়",
            body: "খবর শুধু ঘটনা নয়, দায়িত্বও। পাঠকের আস্থা রক্ষাই আমাদের প্রথম শর্ত।",
          }),
        ],
        [
          base({
            id: "e3",
            type: "article",
            section: "মতামত",
            label: "পাঠকের চিঠি",
            body: "শহরের যানজট, শিক্ষা ও স্বাস্থ্যসেবা নিয়ে পাঠকেরা লিখেছেন তাঁদের অভিজ্ঞতার কথা।",
          }),
          base({
            id: "e4",
            type: "image",
            section: "মতামত",
            label: "আর্কাইভ পাতা",
            imageSrc: scan2,
            imageWidth: 320,
            imageHeight: 320,
          }),
        ],
        [
          base({
            id: "e5",
            type: "quote",
            section: "মতামত",
            label: "‘সন্ধ্যায় এক পাতায় সারাদিন’",
            credit: "— বার্তা সম্পাদক",
          }),
          base({
            id: "e6",
            type: "ad",
            section: "বিজ্ঞাপন",
            label: "সৌজন্যে · আপনার প্রতিষ্ঠান",
            body: "ফুল কলাম স্পট",
            invert: true,
          }),
        ],
      ],
    },
  ],
};

export const initialEdition: Edition = {
  ...threeColumnEdition,
  pages: threeColumnEdition.pages.map((page) => ({
    ...page,
    columns: page.columns.flatMap((column) => [column.map((block) => ({ ...block, columnSpan: 2 })), []]),
  })),
};

export const COLUMN_WIDTHS = [2, 4.213, 6.410, 8.607, 10.803, 13];

export const blockPalette: { type: BlockType; name: string; hint: string }[] = [
  { type: "headline", name: "শিরোনাম", hint: "বড় খবর" },
  { type: "article", name: "প্রতিবেদন", hint: "সংবাদ" },
  { type: "image", name: "ছবি", hint: "আলোকচিত্র" },
  { type: "ad", name: "বিজ্ঞাপন", hint: "প্রচার" },
  { type: "quote", name: "উদ্ধৃতি", hint: "বক্তব্য" },
  { type: "divider", name: "বিভাজক", hint: "রুল" },
];

export const newBlock = (type: BlockType): Block =>
  base({
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    type,
    columnSpan: 1,
    label:
      type === "headline"
        ? "নতুন শিরোনাম"
        : type === "article"
          ? "নতুন প্রতিবেদন"
          : type === "image"
            ? "নতুন ছবি"
            : type === "ad"
              ? "বিজ্ঞাপন স্পট"
              : type === "quote"
                ? "‘নতুন উদ্ধৃতি’"
                : "বিভাজক",
    body: type === "article" ? "এখানে প্রতিবেদনের সারসংক্ষেপ লিখুন।" : "",
    imageSrc: type === "image" ? scan1 : "",

    imageWidth: 320,
    imageHeight: 240,
  });

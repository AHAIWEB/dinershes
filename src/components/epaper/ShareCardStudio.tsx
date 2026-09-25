import { useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";

const PRESETS = {
  facebook: { label: "Facebook", width: 1200, height: 630 },
  instagram: { label: "Instagram", width: 1080, height: 1080 },
  story: { label: "Story", width: 1080, height: 1920 },
} as const;

type Preset = keyof typeof PRESETS;

export function ShareCardStudio({ headline, section, date, image }: { headline: string; section: string; date: string; image?: string }) {
  const [preset, setPreset] = useState<Preset>("facebook");
  const previewRef = useRef<HTMLDivElement>(null);
  const selected = PRESETS[preset];

  const drawCard = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = selected.width; canvas.height = selected.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#f8f5ed"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#b4232f"; ctx.fillRect(0, 0, canvas.width, Math.max(22, canvas.height * 0.025));
    if (image) {
      const img = new Image(); img.crossOrigin = "anonymous"; img.src = image;
      await img.decode().catch(() => undefined);
      if (img.naturalWidth) {
        const imageHeight = canvas.height * (preset === "story" ? 0.42 : 0.48);
        ctx.drawImage(img, 0, canvas.height - imageHeight, canvas.width, imageHeight);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, canvas.height - imageHeight, canvas.width, imageHeight);
      }
    }
    const margin = canvas.width * 0.07;
    ctx.fillStyle = "#b4232f"; ctx.font = `700 ${Math.round(canvas.width * 0.06)}px serif`; ctx.fillText("দিনের শেষ খবর", margin, canvas.height * 0.13);
    ctx.fillStyle = "#1c1b18"; ctx.font = `700 ${Math.round(canvas.width * (preset === "story" ? 0.075 : 0.055))}px serif`;
    const words = headline.split(" "); const lines: string[] = []; let line = "";
    for (const word of words) { const test = `${line} ${word}`.trim(); if (ctx.measureText(test).width > canvas.width - margin * 2 && line) { lines.push(line); line = word; } else line = test; }
    if (line) lines.push(line);
    lines.slice(0, preset === "story" ? 5 : 3).forEach((item, index) => ctx.fillText(item, margin, canvas.height * 0.25 + index * canvas.width * 0.075));
    ctx.font = `600 ${Math.round(canvas.width * 0.025)}px sans-serif`; ctx.fillStyle = "#b4232f"; ctx.fillText(section, margin, canvas.height * 0.18);
    ctx.fillStyle = "#4f4b44"; ctx.fillText(date, margin, canvas.height - margin * 0.65);
    return canvas;
  };

  const download = async () => {
    const canvas = await drawCard(); if (!canvas) return;
    const link = document.createElement("a"); link.download = `diner-shesh-khobor-${preset}.png`; link.href = canvas.toDataURL("image/png"); link.click();
  };
  const share = async () => {
    const canvas = await drawCard(); if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const file = new File([blob], `diner-shesh-khobor-${preset}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) await navigator.share({ title: headline, files: [file] });
    else await download();
  };

  return <section className="border-t border-newsprint-rule py-8">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="font-sans text-xs text-newsprint-accent">সোশ্যাল মিডিয়া</p><h2 className="font-serif-bn text-2xl font-bold">ব্র্যান্ডেড শেয়ার কার্ড</h2></div>
      <div className="flex gap-1 border border-newsprint-rule bg-newsprint-paper p-1">{Object.entries(PRESETS).map(([key, value]) => <button key={key} onClick={() => setPreset(key as Preset)} className={`px-3 py-1.5 text-xs ${preset === key ? "bg-newsprint-ink text-newsprint-paper" : "text-newsprint-muted"}`}>{value.label}</button>)}</div>
    </div>
    <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div ref={previewRef} className={`share-card-preview relative overflow-hidden bg-newsprint-paper shadow-paper ${preset === "facebook" ? "aspect-[1200/630]" : preset === "instagram" ? "aspect-square" : "mx-auto aspect-[9/16] max-h-[640px]"}`}>
        {image && <img src={image} alt="" className="absolute inset-x-0 bottom-0 h-[48%] w-full object-cover" />}
        <div className="absolute inset-x-0 top-0 h-2 bg-newsprint-accent" /><div className="relative z-10 p-[7%]"><p className="font-display-bn text-[clamp(1.4rem,4vw,3rem)] text-newsprint-accent">দিনের শেষ খবর</p><p className="mt-5 font-sans text-xs font-semibold text-newsprint-accent">{section}</p><h3 className="mt-2 max-w-[90%] font-serif-bn text-[clamp(1.7rem,5vw,4.2rem)] font-bold leading-tight">{headline}</h3><p className="mt-4 font-serif-bn text-sm text-newsprint-muted">{date}</p></div>
      </div>
      <div className="flex flex-col justify-end gap-2"><p className="font-serif-bn text-sm text-newsprint-muted">{selected.width} × {selected.height} px</p><button onClick={download} className="flex items-center justify-center gap-2 bg-newsprint-ink px-4 py-3 font-serif-bn text-sm text-newsprint-paper"><Download size={16}/> PNG ডাউনলোড</button><button onClick={share} className="flex items-center justify-center gap-2 border border-newsprint-ink px-4 py-3 font-serif-bn text-sm"><Share2 size={16}/> শেয়ার করুন</button></div>
    </div>
  </section>;
}
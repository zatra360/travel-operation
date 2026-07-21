'use client';

import { useEffect, useState, useRef } from 'react';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimezones } from '@/lib/use-ref-data';

const FLAG: Record<string, string> = { AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', TR: '🇹🇷', BD: '🇧🇩', IN: '🇮🇳', MY: '🇲🇾', SG: '🇸🇬', TH: '🇹🇭', SA: '🇸🇦', EG: '🇪🇬', JP: '🇯🇵', AU: '🇦🇺', FR: '🇫🇷', DE: '🇩🇪', NL: '🇳🇱', CA: '🇨🇦', BR: '🇧🇷', ZA: '🇿🇦', PK: '🇵🇰', PH: '🇵🇭', ID: '🇮🇩', CN: '🇨🇳', KR: '🇰🇷', HK: '🇭🇰', NZ: '🇳🇿', LK: '🇱🇰', NP: '🇳🇵', OM: '🇴🇲', QA: '🇶🇦', BH: '🇧🇭', RU: '🇷🇺' };

function flagEmoji(code: string) {
  if (!code || code.length !== 2) return '🌍';
  try {
    const a = 0x1F1E6 + code.charCodeAt(0) - 65;
    const b = 0x1F1E6 + code.charCodeAt(1) - 65;
    if (a < 0x1F1E6 || a > 0x1F1FF || b < 0x1F1E6 || b > 0x1F1FF) return FLAG[code] || '🌍';
    return String.fromCodePoint(a, b);
  } catch { return FLAG[code] || '🌍'; }
}
const TZ_COUNTRY: Record<string, string> = { 'Asia/Dubai': 'AE', 'Europe/London': 'GB', 'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'Europe/Istanbul': 'TR', 'Asia/Dhaka': 'BD', 'Asia/Kolkata': 'IN', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Riyadh': 'SA', 'Africa/Cairo': 'EG', 'Asia/Tokyo': 'JP', 'Australia/Sydney': 'AU', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Amsterdam': 'NL', 'America/Toronto': 'CA', 'America/Sao_Paulo': 'BR', 'Africa/Johannesburg': 'ZA', 'Asia/Karachi': 'PK', 'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID', 'Asia/Shanghai': 'CN', 'Asia/Seoul': 'KR', 'Asia/Hong_Kong': 'HK', 'Pacific/Auckland': 'NZ', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP', 'Asia/Muscat': 'OM', 'Asia/Qatar': 'QA', 'Asia/Bahrain': 'BH', 'Europe/Moscow': 'RU' };
function getFlagFromTz(tz: string) { return flagEmoji(TZ_COUNTRY[tz] || ''); }

const DEFAULT_ZONES = ['Asia/Dubai', 'Europe/London', 'America/New_York'];
function getStored(): string[] { try { const v = localStorage.getItem('wc-zones'); return v ? JSON.parse(v) : DEFAULT_ZONES; } catch { return DEFAULT_ZONES; } }

export function WorldClock() {
  const { options: tzOptions } = useTimezones();
  const [times, setTimes] = useState<{ code: string; city: string; time: string; ampm: string; flag: string; date: string }[]>([]);
  const [selected, setSelected] = useState<string[]>(getStored);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const zones = tzOptions.filter(z => selected.includes(z.hint || ''));

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!tzOptions.length) return;
    const tick = () => {
      const now = new Date();
      const local = { code: '', city: 'Local', time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }), ampm: '', flag: '🏠', date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) };
      const world = zones.map(z => {
        const tz = z.hint || '';
        try {
          const t = now.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
          const [h, m, a] = t.split(/[: ]/);
          return { code: tz, city: tz.split('/').pop() || '', flag: getFlagFromTz(tz), time: `${h}:${m}`, ampm: a || '', date: now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' }) };
        } catch { return { code: tz, city: '', flag: '🌍', time: '--:--', ampm: '', date: '' }; }
      });
      setTimes([local, ...world]);
    };
    tick();
    const i = setInterval(tick, 15000);
    return () => clearInterval(i);
  }, [tzOptions, selected.join(',')]);

  const toggle = (code: string) => {
    const n = selected.includes(code) ? selected.filter(s => s !== code) : [...selected, code].slice(0, 4);
    setSelected(n); localStorage.setItem('wc-zones', JSON.stringify(n));
  };

  return (
    <div className="relative flex items-center justify-center gap-5 py-2 bg-gradient-to-r from-muted/20 via-background to-muted/20 border-b border-border/50 overflow-visible" ref={ref}>
      {times.map(t => (
        <div key={t.code || 'local'} className={cn('flex items-center gap-2.5 px-4 py-2 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200', !t.code && 'bg-primary/5 border-primary/20 shadow-primary/5')}>
          <div className="flex flex-col items-center gap-0.5"><span className="text-xl leading-none">{t.flag}</span><span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{(t.code || '').split('/').pop()?.slice(0, 3) || '---'}</span></div>
          <div className="flex flex-col items-center"><div className="flex items-baseline gap-0.5"><span className={cn('text-lg font-bold font-mono tabular-nums tracking-tight', !t.code ? 'text-primary' : 'text-foreground')}>{t.time}</span><span className="text-[10px] font-medium text-muted-foreground">{t.ampm}</span></div><span className="text-[9px] text-muted-foreground/70 leading-none mt-0.5">{t.date}</span></div>
        </div>
      ))}
      <button onClick={() => setOpen(!open)} className="flex items-center justify-center h-8 w-8 rounded-full bg-muted/50 hover:bg-muted border border-border/30 transition-all ml-1 text-muted-foreground hover:text-foreground"><Settings className="h-3.5 w-3.5" /></button>
      {open && (
        <div className="absolute top-full right-4 mt-1 w-72 rounded-xl border bg-card shadow-xl z-[60] p-1">
          <div className="px-3 py-2.5 border-b"><p className="text-xs font-semibold">Select Time Zones</p><p className="text-[10px] text-muted-foreground">Choose up to 4</p></div>
          <div className="max-h-56 overflow-y-auto p-1">
            {tzOptions.map(z => {
              const code = z.hint || '';
              const s = selected.includes(code);
              return (
                <button key={z.value} onClick={() => toggle(code)} className={cn('flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-xs hover:bg-accent transition-colors', s && 'bg-primary/5')}>
                  <span className="text-base">{getFlagFromTz(code)}</span>
                  <span className="font-medium flex-1 text-left">{code.split('/').pop()?.slice(0, 3).toUpperCase()}</span>
                  <span className="text-[10px] text-muted-foreground/60 font-mono">{code}</span>
                  {s && <span className="text-primary text-[10px] font-bold">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

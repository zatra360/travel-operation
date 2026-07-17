'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Plane, Search, Code, FileText, Users, Calendar, MapPin, Ticket, Phone, Mail } from 'lucide-react';
import { useAirports, useAirlines } from '@/lib/use-ref-data';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function parseGdsCommand(cmd: string) {
  const result: { type: string; fields: Record<string, string> } = { type: 'unknown', fields: {} };
  const anMatch = cmd.match(/^AN(\d{1,2}[A-Z]{3}\d{1,2}[A-Z]{3})(?:[\/-](\d{1,2}[A-Z]{3}))?/i);
  if (anMatch) {
    result.type = 'Availability';
    result.fields.origin = anMatch[1].slice(2, 5).toUpperCase();
    result.fields.destination = anMatch[1].slice(7, 10).toUpperCase();
    result.fields.depDate = anMatch[1].slice(0, 2);
    if (anMatch[2]) { result.fields.retDate = anMatch[2].slice(0, 2); result.fields.retDest = anMatch[2].slice(7, 10).toUpperCase(); }
    return result;
  }
  const ssrMatch = cmd.match(/^SSR\s+(\w+)\s+(\w+\d+)\s+(.+)/i);
  if (ssrMatch) { result.type = 'SSR'; result.fields.code = ssrMatch[1]; result.fields.flight = ssrMatch[2]; result.fields.details = ssrMatch[3]; return result; }
  const nmMatch = cmd.match(/^NM1\s+(.+)/i);
  if (nmMatch) { result.type = 'Name'; result.fields.name = nmMatch[1]; return result; }
  return result;
}

function parsePnr(raw: string) {
  const pnr: any = { locator: '', passengers: [], segments: [], contact: {}, ticketing: {}, ssr: [], fare: {} };
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.match(/^\d{1,2}\.\d/)) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) pnr.passengers.push(parts.slice(1).join(' ').replace(/\.\d+$/, ''));
      continue;
    }
    if (line.match(/^\d+\s+[A-Z]{2}\d+/)) {
      const m = line.match(/^(\d+)\s+([A-Z]{2}\d+)\s+(\w)\s+(\d{1,2}[A-Z]{3})\s+(\d{1,2}[A-Z]{3})\s+.*?(\d{4})\s+(\d{4})/);
      if (m) pnr.segments.push({ day: m[1], flight: m[2], class: m[3], from: m[4].slice(2, 5) + m[4].slice(0, 2), to: m[5].slice(2, 5) + m[5].slice(0, 2), dep: m[6], arr: m[7] });
      continue;
    }
    if (line.match(/^\d{1,2}\.\s*(?:AP|CTCE?|CTCM)/)) {
      const val = line.replace(/^\d+\.\s*\w+\s*/, '').trim();
      if (val.includes('@')) pnr.contact.email = val; else pnr.contact.phone = val;
      continue;
    }
    if (line.match(/^\d{1,2}\.\s*TK/)) {
      pnr.ticketing.raw = line.replace(/^\d+\.\s*/, '').trim();
      const okMatch = line.match(/TKOK/i);
      pnr.ticketing.status = okMatch ? 'OK' : 'Requested';
      continue;
    }
    if (line.match(/^\d{1,2}\.\s*SSR/)) {
      pnr.ssr.push(line.replace(/^\d+\.\s*/, '').trim());
      continue;
    }
    const rlocMatch = line.match(/^\*?\s*([A-Z0-9]{6})\s*$/);
    if (rlocMatch) pnr.locator = rlocMatch[1];
  }
  return pnr;
}

const SAMPLE_CMDS = [
  { label: 'Availability', cmd: 'AN15JULDXBJED/20JULJEDDXB' },
  { label: 'SSR Meal', cmd: 'SSR VGML EK501/H 15JUL' },
  { label: 'Name Element', cmd: 'NM1 SMITH/JOHN MR' },
];

const SAMPLE_PNR = `ABC123
 1.SMITH/JOHN MR
 2.DOE/JANE MRS
 1  EK501 Y 15JUL DXBJED HK1  0230  0530
 2  EK502 Y 25JUL JEDDXB HK1  1100  1800
 3.AP  JSMITH@EMAIL.COM
 4.AP  +971501234567
 5.TKOK 15JUL
 6.SSR VGML EK501 15JUL
 7.SSR WCHR EK502`;

export default function GdsToolsPage() {
  const [command, setCommand] = useState('');
  const [parsed, setParsed] = useState<any>(null);
  const [pnrRaw, setPnrRaw] = useState('');
  const [pnrData, setPnrData] = useState<any>(null);
  const { options: airportOptions } = useAirports();
  const { options: airlineOptions } = useAirlines();

  const handleParse = () => { setParsed(parseGdsCommand(command.trim())); };
  const handlePnrParse = () => { setPnrData(parsePnr(pnrRaw)); };
  const loadSampleCmd = (cmd: string) => { setCommand(cmd); setParsed(parseGdsCommand(cmd)); };
  const loadSamplePnr = () => { setPnrRaw(SAMPLE_PNR); setPnrData(parsePnr(SAMPLE_PNR)); };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="GDS Tools" subtitle="Parse GDS commands, convert PNR data, and search flights — Beta" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Code className="h-4 w-4 text-muted-foreground" />Command Parser</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea value={command} onChange={e => setCommand(e.target.value)} placeholder="AN15JULDXBJED or SSR VGML EK501..." className="font-mono text-sm min-h-[60px]" rows={2} />
              <Button onClick={handleParse} size="icon" className="h-auto shrink-0"><Search className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_CMDS.map(s => <button key={s.label} onClick={() => loadSampleCmd(s.cmd)} className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded px-2 py-1 transition-colors">{s.label}</button>)}
            </div>
            {parsed && parsed.type !== 'unknown' && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <Badge variant="success" className="text-[10px]">{parsed.type}</Badge>
                <div className="grid grid-cols-2 gap-2">{Object.entries(parsed.fields).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span className="text-muted-foreground capitalize">{k}</span><span className="font-medium font-mono">{v as string}</span></div>)}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4 text-muted-foreground" />Flight Search</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">From</Label><Combobox options={airportOptions} value="" onChange={() => {}} placeholder="Origin" searchPlaceholder="Search..." /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">To</Label><Combobox options={airportOptions} value="" onChange={() => {}} placeholder="Destination" searchPlaceholder="Search..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Depart</Label><Input type="date" className="h-9" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Return</Label><Input type="date" className="h-9" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Adults</Label><Input type="number" defaultValue={1} min={1} className="h-9" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Children</Label><Input type="number" defaultValue={0} min={0} className="h-9" /></div>
              <div><Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Infants</Label><Input type="number" defaultValue={0} min={0} className="h-9" /></div>
            </div>
            <Button className="w-full" onClick={() => toast.info('Live flight search will be available once a GDS provider is connected.')}><Search className="h-4 w-4 mr-2" />Search</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />PNR Converter</CardTitle>
            <Button variant="outline" size="sm" onClick={loadSamplePnr}>Load Sample</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Raw PNR Output</Label>
              <Textarea value={pnrRaw} onChange={e => setPnrRaw(e.target.value)} placeholder="Paste GDS PNR output here..." className="font-mono text-xs min-h-[200px]" rows={10} />
              <Button onClick={handlePnrParse} className="mt-2 w-full" size="sm"><Search className="h-3 w-3 mr-1" />Parse PNR</Button>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Structured Data</Label>
              {pnrData ? (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-4 max-h-[300px] overflow-y-auto">
                  {pnrData.locator && <div className="flex items-center gap-2"><Badge variant="default" className="font-mono text-xs">{pnrData.locator}</Badge><span className="text-xs text-muted-foreground">PNR Locator</span></div>}

                  {pnrData.passengers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Users className="h-3 w-3" />Passengers</p>
                      {pnrData.passengers.map((p: string, i: number) => <p key={i} className="text-sm pl-1">{i + 1}. {p}</p>)}
                    </div>
                  )}

                  {pnrData.segments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Plane className="h-3 w-3" />Segments</p>
                      {pnrData.segments.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                          <span className="font-mono text-xs font-semibold text-primary">{s.flight}</span>
                          <span className="text-muted-foreground">{s.from} → {s.to}</span>
                          <span className="text-xs text-muted-foreground">{s.dep}-{s.arr}</span>
                          <Badge variant="secondary" className="text-[10px]">{s.class}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {pnrData.ticketing.raw && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Ticket className="h-3 w-3" />Ticketing</p>
                      <div className="flex items-center gap-2"><Badge variant={pnrData.ticketing.status === 'OK' ? 'success' : 'warning'} className="text-[10px]">{pnrData.ticketing.status}</Badge><span className="text-xs text-muted-foreground">{pnrData.ticketing.raw}</span></div>
                    </div>
                  )}

                  {(pnrData.contact.email || pnrData.contact.phone) && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1"><Mail className="h-3 w-3" />Contact</p>
                      {pnrData.contact.email && <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{pnrData.contact.email}</p>}
                      {pnrData.contact.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{pnrData.contact.phone}</p>}
                    </div>
                  )}

                  {pnrData.ssr.length > 0 && <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">SSR ({pnrData.ssr.length})</p>{pnrData.ssr.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">{s}</p>)}</div>}

                  {!pnrData.locator && !pnrData.passengers.length && !pnrData.segments.length && (
                    <p className="text-sm text-muted-foreground">No structured data found. Try loading the sample PNR.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  Paste a PNR in the left panel and click Parse
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">GDS Providers</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            {['Amadeus', 'Sabre', 'Galileo', 'Worldspan'].map(gds => (
              <div key={gds} className="rounded-lg border p-4"><div className="flex items-center justify-between mb-2"><h4 className="font-semibold text-sm">{gds}</h4><Badge variant="secondary" className="text-[10px]">Offline</Badge></div>              <p className="text-xs text-muted-foreground mb-3">Configure API credentials to enable live flight search.</p><Button variant="outline" size="sm" className="w-full" onClick={() => toast.info('GDS provider integration coming soon.')}>Connect</Button></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

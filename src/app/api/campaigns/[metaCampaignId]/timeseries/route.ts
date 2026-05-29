import { NextResponse } from "next/server";
import { Between } from "typeorm";

import { repositories } from "@/db/repositories";
import { num } from "@/lib/goal-types";

function dateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ metaCampaignId: string }> }
) {
  const { metaCampaignId } = await params;
  const { campaignMetricSnapshot: campRepo } = await repositories();
  const since = dateNDaysAgo(7);
  const prevSince = dateNDaysAgo(14);
  const prevUntil = dateNDaysAgo(8);
  const today = new Date().toISOString().slice(0, 10);

  const snaps = await campRepo.find({
    where: { metaCampaignId, day: Between(since, today) },
    order: { day: "ASC" }
  });

  const prevSnaps = await campRepo.find({
    where: { metaCampaignId, day: Between(prevSince, prevUntil) }
  });

  let prevSpend = 0;
  let prevConversions = 0;
  let prevRoasSum = 0;
  let prevRoasN = 0;
  for (const s of prevSnaps) {
    prevSpend += num(s.spend);
    prevConversions += num(s.conversions);
    const roas = num(s.roas);
    if (roas > 0) {
      prevRoasSum += roas;
      prevRoasN += 1;
    }
  }

  const series = snaps.map((s) => {
    const spend = num(s.spend);
    const conversions = num(s.conversions);
    return {
      day: s.day,
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : null,
      roas: num(s.roas)
    };
  });

  return NextResponse.json({
    ok: true,
    series,
    previous: {
      spend: prevSpend,
      conversions: prevConversions,
      cpa: prevConversions > 0 ? prevSpend / prevConversions : null,
      roas: prevRoasN ? prevRoasSum / prevRoasN : 0
    }
  });
}

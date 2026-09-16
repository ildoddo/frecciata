import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, requireAdmin } from "@/lib/guards";
import { createRule, type RuleInput } from "@/lib/rules";
import { localDay } from "@/lib/tz";
import { handleApi } from "@/lib/handle-api";

export async function GET(req: Request) {
  return handleApi(async () => {
    requireAdmin(await getSession());
    const rules = await db.recurringRule.findMany({
      orderBy: { startsOn: "asc" },
      include: { _count: { select: { slots: true } } },
    });
    return NextResponse.json({
      rules: rules.map((r) => ({
        id: r.id,
        label: r.label,
        daysOfWeek: r.daysOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        startsOn: localDay(r.startsOn),
        endsOn: localDay(r.endsOn),
        maxAthletes: r.maxAthletes,
        slots: r._count.slots,
      })),
    });
  });
}

export const ruleSchema: z.ZodType<RuleInput> = z.object({
  label: z.string().trim().max(80).nullable(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxAthletes: z.number().int().min(1).max(100),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    requireAdmin(await getSession());
    const input = ruleSchema.parse(await req.json());
    const rule = await createRule(input);
    return NextResponse.json({ id: rule.id }, { status: 201 });
  });
}

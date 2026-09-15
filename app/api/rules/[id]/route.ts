import { NextResponse } from "next/server";
import { getSession, requireAdmin } from "@/lib/guards";
import { updateRule, deleteRule } from "@/lib/rules";
import { ruleSchema } from "../route";
import { handleApi } from "@/lib/handle-api";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    requireAdmin(await getSession(req));
    const input = ruleSchema.parse(await req.json());
    await updateRule(id, input);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { id } = await params;
    requireAdmin(await getSession(req));
    const { slots } = await deleteRule(id);
    return NextResponse.json({ ok: true, slots });
  });
}

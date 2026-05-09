import { NextResponse } from "next/server";
import { getTalentBridgeAiBackend, getTalentBridgeAiModel } from "../../../../src/server/ai/config";
import { hasPostgresConfigured } from "../../../../src/server/db/postgres";

export async function GET() {
  return NextResponse.json({
    provider: getTalentBridgeAiBackend(),
    model: getTalentBridgeAiModel(),
    postgresConfigured: hasPostgresConfigured(),
  });
}

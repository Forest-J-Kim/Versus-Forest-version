import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, sport, date, attributes } = body;

    // Basic validation
    if (!mode || !sport) {
      return NextResponse.json(
        { error: "Missing required fields: mode, sport" },
        { status: 400 }
      );
    }

    // Create Match
    const match = await prisma.match.create({
      data: {
        type: mode,
        mode,
        sport,
        date: null,
        attributes: typeof attributes === 'string' ? attributes : JSON.stringify(attributes),
        status: "OPEN",
      },
    });

    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

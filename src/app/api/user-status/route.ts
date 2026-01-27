/**
 * API Route for User Status
 * 
 * Returnerer brukerens status (inkludert admin-status)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json(
        { error: "Ikke autentisert" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isAdmin: session.isAdmin || false,
        userId: session.userId,
        userName: session.userName,
      },
    });
  } catch (error) {
    console.error("Error in user status route:", error);
    return NextResponse.json(
      { error: "Kunne ikke hente brukerstatus" },
      { status: 500 }
    );
  }
}

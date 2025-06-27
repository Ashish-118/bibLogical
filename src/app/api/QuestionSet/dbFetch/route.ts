import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { level } = body;
        if (!level) {
            return NextResponse.json(
                { error: "Level is required" },
                { status: 400 }
            );
        }
        const questions = await prisma.quizBank.findMany({
            where: {
                level: level,
            },
            orderBy: {
                useCount: 'asc',
            },
            take: 10,
        });

        if (questions.length === 0) {
            return NextResponse.json(
                { error: "No questions found for the specified level" },
                { status: 404 }
            );
        }
        return NextResponse.json(
            { questions: questions, message: "successfully fetched questions from db" },
            { status: 200 }
        );

    } catch (error) {
        return NextResponse.json(
            { error: (error as Error)?.message || "" },
            { status: 500 })
    }
}

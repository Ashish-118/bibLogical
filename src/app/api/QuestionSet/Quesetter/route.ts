// /app/api/quizRoute.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis'

import { PrismaClient, QuizType } from "@prisma/client";
const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const signal = req.signal;
        const redis = Redis.fromEnv();
        const testSet = await redis.set("foo", "bar");
        const testGet = await redis.get("foo");
        console.log("Redis test set/get:", testSet, testGet);

        // Check if Redis is connected
        if (!redis) {
            return NextResponse.json({ error: "Redis connection failed" }, { status: 500 });
        }

        const { topic, count, lvl, gameId } = await req.json();
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
        // const controller = new AbortController();
        // const timeout = setTimeout(() => controller.abort(), 10000);
        console.log("Request received for topic:", topic, "count:", count, "level:", lvl);


        const current = await redis.get(gameId);
        console.log("Current game data from Redis:", typeof current);
        if (!current) {
            return NextResponse.json({ error: "Game not found in Redis" }, { status: 404 });
        }



        const fetchDB = fetch(`${BASE_URL}/api/QuestionSet/dbFetch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ level: lvl }),
            signal, // Use the controller's signal for timeout
        })
            .then((res) => res.json())
            .then((data) => ({ source: "db", questions: data.questions }));




        const fetchAI = fetch(`${BASE_URL}/api/ai/quizGen`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic: topic, count: count, level: lvl }),
            signal, // Use the controller's signal for timeout
        })
            .then((res) => res.json())
            .then((data) => ({ source: "ai", questions: data.questions }));
        // console.log("FETCH AI-->", fetchAI);



        const winner = await Promise.race([fetchDB, fetchAI]);


        console.log("winner", winner);
        const other = winner.source === "db" ? fetchAI : fetchDB;


        // const gameId = `quiz:${Date.now()}`; // Unique key per game session

        // Cache the winner in Redis
        // await redis.set(gameId, JSON.stringify({ questions: winner.questions }), { ex: 600 }); // 10 mins




        // Parse current game data and ensure it has a questions property
        const gameData = typeof current === "string" ? JSON.parse(current) : current as { [key: string]: any };

        (gameData as { questions: any[] }).questions = winner.questions;

        // Save back to Redis
        await redis.set(gameId, JSON.stringify(gameData));


        // await redis.set(gameId, JSON.stringify({ questions: winner.questions })); // no expiration for now

        const otherResult = await other;

        // clearTimeout(timeout);

        const existingDataStr = await redis.get(gameId);

        if (!existingDataStr) {
            return NextResponse.json({ error: "GameID not found in Redis  while storing otherResult questions" }, { status: 404 });
        }
        const existingData = typeof existingDataStr === "string" ? JSON.parse(existingDataStr) : (existingDataStr ?? {});

        const updatedQuestions = [
            ...(existingData.questions || []),
            ...(otherResult.questions || [])
        ];

        const updatedGameData = {
            ...existingData,
            questions: updatedQuestions,
        };

        await redis.set(gameId, JSON.stringify(updatedGameData));



        // await redis.set(gameId, JSON.stringify({ questions: otherResult.questions }));
        console.log("Other result:", otherResult);

        if (otherResult.source === "ai" || winner.source === "ai") {

            const Tosave = winner.source === "ai" ? winner : otherResult;
            if (!Array.isArray(Tosave.questions) || Tosave.questions.length === 0) {
                return NextResponse.json({ error: "No questions from ai to save ." }, { status: 400 });
            }

            // Prepare question data
            // interface Question {
            //     question: string;
            //     type: string;
            //     topic: QuizType;
            //     level: number;
            //     options: string[];
            //     answer: number;
            //     useCount: number;
            //     explanation: string;
            //     formatHints: string[];
            //     AiGenerated: boolean;
            // }

            const questionData = Tosave.questions.map((q: any) => ({
                AiGenerated: true,
                question: q.question,
                type: q.type as QuizType,
                topic: q.topic,
                level: q.level,
                options: Array.isArray(q.options) ? q.options : [],
                answer: q.answer,
                useCount: 1,
                explanation: q.explanation,
                formatHints: Array.isArray(q.formatHints) && q.formatHints.every((e: any) => typeof e === "string") ? q.formatHints : [],
            }));

            // Use transaction with createMany
            const result = await prisma.$transaction(async (tx) => {
                const created = await tx.quizBank.createMany({
                    data: questionData,
                    skipDuplicates: true,
                });

                return created;
            });

            if (!result || result.count !== otherResult.questions.length) {
                return NextResponse.json({
                    warning: "Some questions might not have been saved (possibly duplicates).",
                    savedCount: result.count,
                    expectedCount: otherResult.questions.length,
                }, { status: 207 }); // Multi-status
            }

        }
        if (otherResult.source === "db" || winner.source === "db") {

            const ToUpdate = winner.source === "db" ? winner : otherResult;
            if (!Array.isArray(ToUpdate.questions) || ToUpdate.questions.length === 0) {
                return NextResponse.json({ error: "No questions to update the questions of DB." }, { status: 400 });
            }

            const result = await prisma.$transaction(async (tx) => {
                const updates = await Promise.all(
                    ToUpdate.questions.map((q: any) =>
                        tx.quizBank.update({
                            where: { id: q.id },
                            data: {
                                useCount: { increment: 1 },
                            },
                        })
                    )
                );
                return { count: updates.length };
            });


            if (!result || result.count !== ToUpdate.questions.length) {
                return NextResponse.json({
                    warning: "Some questions might not have been updated (possibly duplicates).",
                    updatedCount: result.count,
                    expectedCount: ToUpdate.questions.length,
                }, { status: 207 }); // Multi-status
            }



        }

        return NextResponse.json({
            gameId,
            source: "DB + AI",
            questions: winner.questions,
            length: winner.questions.length,
            otherSource: otherResult.source,
            otherQuestions: otherResult.questions,
            otherLength: otherResult.questions.length,
            TotalQuestions: (winner.questions.length + otherResult.questions.length),
            message: "Quiz questions prepared from first successful route.",
        }, { status: 200 });
    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: "Request timed out while preparing questions in questionSetter Api" }, { status: 504 });
        }
        return NextResponse.json({ error: error.message || "Internal error while preparing question in question setter api" }, { status: 500 });
    }
}
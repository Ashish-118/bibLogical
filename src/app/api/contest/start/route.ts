import { NextRequest, NextResponse } from "next/server";
import { Redis } from '@upstash/redis'
import Rank from "@/lib/rankList";

interface user {
    userId: string;
    rank: string;
}

type RankKey = keyof typeof Rank;


export async function POST(req: NextRequest) {
    try {
        const body: user = await req.json();
        const gameId = `quiz:${Date.now()}`;
        if (!body || !body.userId || !body.rank) {
            return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
        }
        const { userId, rank } = body;
        const redis = Redis.fromEnv();
        const testSet = await redis.set("foo", "bar");
        const testGet = await redis.get("foo");
        console.log("Redis test set/get:", testSet, testGet);

        // Check if Redis is connected
        if (!redis) {
            return NextResponse.json({ error: "Redis connection failed" }, { status: 500 });
        }

        let rankNum = 0;
        if (rank in Rank) {
            rankNum = Rank[rank as RankKey];
        } else {
            return NextResponse.json({ error: "Invalid rank provided" }, { status: 400 });
        }

        const addUser_redis = await redis.zadd("waiting_users",
            { score: 1, member: "user_ashish" },
            { score: 2, member: "user_john" },
            { score: 3, member: "user_olivia" },
            { score: 4, member: "user_emma" },
            { score: 5, member: "user_noah" },
            { score: 6, member: "user_liam" },
            { score: 7, member: "user_mia" },
            { score: 8, member: "user_aarav" },
            { score: 9, member: "user_sofia" },
            { score: 10, member: "user_ryan" },
            { score: 2, member: "user_sara" },
            { score: 3, member: "user_mohit" },
            { score: 4, member: "user_isla" },
            { score: 6, member: "user_rohan" },
            { score: 7, member: "user_ivy" },
            { score: 8, member: "user_kabir" },
            { score: 10, member: "user_elena" },
            { score: 9, member: "user_aditya" },
            { score: 5, member: "user_nina" },
            { score: 1, member: "user_leo" },
            { score: rankNum, member: userId }
        );
        if (!addUser_redis) {
            return NextResponse.json({ error: "Failed to add user to waiting list" }, { status: 500 });
        }

        // await redis.zadd("waiting_users", {
        //     score: rankNum,
        //     member: userId,
        // });


        let match;

        let minRank = rankNum - 1;
        let maxRank = rankNum + 1;

        while (minRank >= 1 || maxRank <= 10) {
            let candidates;
            candidates = await redis.zrange("waiting_users", rankNum, rankNum, { byScore: true }) as string[];
            match = candidates.find((id) => id !== userId);

            if (!match) {

                candidates = await redis.zrange("waiting_users", minRank, maxRank, { byScore: true }) as string[];
                match = candidates.find((id) => id !== userId);
            }

            if (match) {
                await redis.zrem("waiting_users", userId, match);
                break;
            };


            if (minRank > 1) minRank--;
            if (maxRank < 10) maxRank++;
        }

        if (!match) {
            return NextResponse.json({ matchFound: false, message: "There is no players right now", gameId }, { status: 505 });
        }


        await redis.set(gameId, JSON.stringify({
            players: [userId, match],
            GameStats: {
                [userId]: {
                    xp: 0,
                    no_of_correct_answers: 0,
                },
                [match]: {
                    xp: 0,
                    no_of_correct_answers: 0,
                }
            },
            questions: [],
        }));
        //
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 1 min timeout
        // const prepareQuestions = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/QuestionSet/Quesetter`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({ topic: "general", count: 3, lvl: rankNum, gameId }),
        //     signal: controller.signal,
        // });

        // clearTimeout(timeout);

        let prepareQuestions;

        try {
            prepareQuestions = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/QuestionSet/Quesetter`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic: "any", count: 1, lvl: rankNum, gameId }),
                signal: controller.signal,
            });
        } catch (error: any) {
            clearTimeout(timeout);

            if (error.name === "AbortError") {
                return NextResponse.json({ message: "Timeout: Question generation took too long in start Api. " }, { status: 504 });
            }

            return NextResponse.json({ message: "Network error while preparing questions.", error: error.message }, { status: 500 });
        }

        clearTimeout(timeout);

        // Only reached if fetch succeeded
        // if (!prepareQuestions.ok) {
        //     const errorBody = await prepareQuestions.json();
        //     return NextResponse.json({ message: "Failed to prepare questions", error: errorBody.error }, { status: prepareQuestions.status });
        // }

        if (prepareQuestions.status !== 200) {
            const errorBody = await prepareQuestions.json();
            return NextResponse.json({ message: "Failed to prepare questions in startContest api", error: errorBody.error }, { status: prepareQuestions.status });
        }




        return NextResponse.json({
            message: "Contest started successfully",
            matchFound: true,
            opponent: match,
            gameId,
        });

    } catch (error) {
        return NextResponse.json({ error: "Internal server error in the start api of the contest" }, { status: 500 });
    }






}

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import type { Server as IOServer, Socket } from "socket.io";
import { Redis } from "@upstash/redis";
import { promises } from "node:dns";
import { PrismaClient } from "@prisma/client";

import { json } from "node:stream/consumers";

const prisma = new PrismaClient();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const redis = Redis.fromEnv();

interface Question {
    id: string;
    correctOption: number;
    responses?: Response[];
    [key: string]: any;
}

interface Response {
    userId: string;
    optionNum: number;
    timeTaken: number;
}

interface StartTimerOptions {
    io: IOServer;
    gameId: string;
    duration?: number;
    question: Question;
    socket: Socket;
}

const gameTimers = new Map<string, NodeJS.Timeout>();
const currentQuestionIndex = new Map<string, number>();

const startTimerForGame = ({
    io,
    gameId,
    duration = 30,
    question,
    socket,
}: StartTimerOptions): void => {
    let timeLeft = duration;

    const interval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(interval);
            io.to(gameId).emit("time-out");
            gameTimers.delete(gameId);
            return;
        }
        io.to(gameId).emit("timer", timeLeft);
        timeLeft--;
    }, 1000);

    gameTimers.set(gameId, interval);

    const handleAnswer = async ({
        userId,
        optionNum,
        gameId,
        time
    }: {

        userId: string;
        optionNum: number;
        gameId: string;
        time: number;

    }) => {
        const gameDataRaw = await redis.get(gameId);
        if (!gameDataRaw) {
            socket.emit("error-message", { error: "Game not found in Redis" });
            return;
        }

        const gameData = typeof gameDataRaw === "string"
            ? JSON.parse(gameDataRaw)
            : (gameDataRaw ?? {});

        const updatedQuestion = gameData.questions.find((q: any) => q.id === question.id);
        if (!updatedQuestion) {
            socket.emit("error-message", { error: "Question not found" });
            return;
        }

        updatedQuestion.responses = updatedQuestion.responses || [];

        if (updatedQuestion.responses.some((r: Response) => r.userId === userId)) {
            return; // already answered
        }
        let XP;
        if (optionNum === question.correctOption) {
            XP = time + 10;
        }
        else {
            XP = -time;
        }

        gameData.GameStats.userId.xp += XP;
        gameData.GameStats.userId.no_of_correct_answers += (optionNum === question.correctOption ? 1 : 0);

        updatedQuestion.responses.push({
            user: userId,
            selectedOption: optionNum,
            timeTaken: time,
            xp: XP
        });

        await redis.set(gameId, JSON.stringify(gameData));

        if (optionNum === question.correctOption) {
            clearInterval(interval);
            gameTimers.delete(gameId);
            io.to(gameId).emit("answered", { userId, gameId, optionNum, XP });
            return;
        }

        if (updatedQuestion.responses.length === gameData.players.length) {
            clearInterval(interval);
            gameTimers.delete(gameId);
            io.to(gameId).emit("room-message", {
                message: "All players have answered",
                answer: question.correctOption
            });
        }
    };

    socket.on("answered", handleAnswer);

    socket.once("next-question", () => {
        socket.removeListener("answered", handleAnswer); // prevent leak
    });
    socket.once("disconnect", () => {
        socket.removeListener("answered", handleAnswer); // prevent leak
    });
};


const saveLeaderboard = async (gameId: string, socket: Socket): Promise<any> => {
    const gameDataRaw = await redis.get(gameId);
    if (!gameDataRaw) {
        socket.emit("error-message", { error: "Game not found in Redis" });
        return;
    }

    const gameData = typeof gameDataRaw === "string"
        ? JSON.parse(gameDataRaw)
        : (gameDataRaw ?? {});

    const players = gameData.players;
    const players_save: { winner: string[]; looser: string[] } = {
        winner: [],
        looser: []
    }

    const gameStats: any = gameData.GameStats;
    if (gameStats[players[0]].no_of_correct_answers !== gameStats[players[1]].no_of_correct_answers) {
        if (gameStats[players[0]].no_of_correct_answers > gameStats[players[1]].no_of_correct_answers) {
            players_save.winner.push(players[0]);
            players_save.looser.push(players[1]);
        } else {
            players_save.winner.push(players[1]);
            players_save.looser.push(players[0]);
        }
    }
    else {
        if (gameStats[players[0]].xp > gameStats[players[1]].xp) {
            players_save.winner.push(players[0]);
            players_save.looser.push(players[1]);
        }
        else {
            players_save.winner.push(players[1]);
            players_save.looser.push(players[0]);
        }
    }

    const saveQuizSet: any = gameData.questions;
    const savedData = await prisma.contest.create({
        data: {
            GameId: gameId,
            quizSet: saveQuizSet,
            players: players_save
        }
    });
}

app.prepare().then(() => {
    const httpServer = createServer(handle);
    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("🟢 New client connected:", socket.id);

        socket.on("join-room", ({ userId, gameId }) => {
            socket.join(gameId);
            console.log(`❤️ User ${userId} joined room: ${gameId}`);
        });

        const gameQuestions = new Map<string, Question[]>();

        socket.on("ready-check", async ({ gameId }) => {
            const gameDataRaw = await redis.get(gameId);
            if (!gameDataRaw) {
                return socket.emit("error-message", { error: "Game not found" });

            }

            const gameData = typeof gameDataRaw === "string"
                ? JSON.parse(gameDataRaw)
                : (gameDataRaw ?? {});

            gameQuestions.set(gameId, gameData.questions);
            currentQuestionIndex.set(gameId, 0);
        });

        socket.on("next-question", ({ gameId }) => {
            const questions = gameQuestions.get(gameId);
            if (!questions) {
                return socket.emit("error-message", { error: "No questions available" });

            }

            const index = currentQuestionIndex.get(gameId) || 0;
            if (index >= questions.length) {
                io.to(gameId).emit("quiz-complete");
                saveLeaderboard(gameId, socket);
                return;
            }

            const question = questions[index];
            io.to(gameId).emit("question", question);

            startTimerForGame({
                io,
                gameId,
                question,
                socket,
                duration: 60
            });

            currentQuestionIndex.set(gameId, index + 1);
        });

        socket.on("disconnect", () => {
            console.log("🔴 A user disconnected");
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });
    });

    httpServer.listen(port, () => {
        console.log(`🚀 Server running on http://${hostname}:${port}`);
    });
});


















// import { createServer } from "node:http"
// import next from "next"
// import { Server } from "socket.io"
// import type { Server as IOServer, Socket } from "socket.io";
// import { Redis } from '@upstash/redis'
// import { NextRequest, NextResponse } from "next/server";

// const dev = process.env.NODE_ENV !== "production"
// const hostname = process.env.HOSTNAME || "localhost"
// const port = parseInt(process.env.PORT || "3000", 10)

// const app = next({ dev, hostname, port })
// const handle = app.getRequestHandler()

// const redis = Redis.fromEnv();
// const testSet = await redis.set("foo", "bar");
// const testGet = await redis.get("foo");
// console.log("Redis test set/get:", testSet, testGet);

// interface StartTimerForGameOptions {
//     io: IOServer;
//     gameId: string;
//     duration?: number;
//     socket?: Socket;
//     correctOption?: number;
//     questionId?: string;
// }
// interface Question {
//     id: string;
//     responses?: Response[];
//     [key: string]: any;
// }

// interface Response {
//     userId: string;
//     optionNum: number;
//     timeTaken: number;
// }

// const startTimerForGame = ({
//     io,
//     gameId,
//     duration = 30,
//     socket,
//     correctOption,
//     questionId
// }: StartTimerForGameOptions): void => {
//     let timeLeft: number = duration;

//     const interval: NodeJS.Timeout = setInterval(() => {

//         if (timeLeft <= 0) {
//             clearInterval(interval);
//             io.to(gameId).emit("time-out");
//             return;
//         }
//         io.to(gameId).emit("timer", timeLeft);
//         timeLeft--;

//     }, 1000);

//     socket?.on("answered", async ({ userId, gameId, optionNum }) => {
//         console.log(`User ${userId} answered option ${optionNum} in game ${gameId}`);



//         //TODO. here save it to the redis
//         if (!redis) {
//             return NextResponse.json({ error: "Redis connection failed in socket server" }, { status: 500 });
//         }

//         const gameDataRaw = await redis.get(gameId);
//         if (!gameDataRaw) return NextResponse.json({ error: "Game not found in Redis" }, { status: 404 });

//         const gameData = typeof gameDataRaw === "string" ? JSON.parse(gameDataRaw) : (gameDataRaw ?? {});

//         const question = gameData.questions.find((q: any) => q.id === questionId);
//         if (!question) return NextResponse.json({ error: "Question not found in game data" }, { status: 404 });

//         question.responses = question.responses || [];

//         question.responses.push({
//             userId,
//             optionNum,
//             timeTaken: 60 - timeLeft
//         });

//         await redis.set(gameId, JSON.stringify(gameData));

//         if (optionNum === correctOption) {
//             clearInterval(interval);
//             io.to(gameId).emit("answered", { userId, gameId, optionNum });
//             return;
//         }

//         if (question.responses.length === gameData.players.length) {
//             io.to(gameId).emit("room-message", { message: "All players have answered", answer: correctOption });
//             clearInterval(interval);
//             return;
//         }


//     })

// };




// app.prepare().then(() => {

//     const httpServer = createServer(handle)
//     const io = new Server(httpServer)

//     io.on("connection", (socket) => {
//         console.log("🟢 New client connected:", socket.id)

//         socket.on("join-room", ({ userId, gameId }) => {
//             socket.join(gameId)
//             console.log(`❤️ Client socket id ${socket.id} and userId ${userId} joined room: ${gameId}`)

//         })

//         /// send questionss
//         let i = 0;


//         let questionSet: Question[] = [];
//         socket.on("ready-check", async ({ gameId }) => {
//             if (!redis) {
//                 return NextResponse.json({ error: "Redis connection failed in socket server" }, { status: 500 });
//             }

//             const gameDataRaw = await redis.get(gameId);
//             if (!gameDataRaw) return NextResponse.json({ error: "Game not found in Redis" }, { status: 404 });

//             const gameData = typeof gameDataRaw === "string" ? JSON.parse(gameDataRaw) : (gameDataRaw ?? {});
//             questionSet = gameData.questions;
//         })

//         socket.on("next-question", ({ gameId }) => {

//             // io.to(gameId).emit("send-question", ({ gameId, question }) => {
//             io.to(gameId).emit("question", questionSet[i]);
//             startTimerForGame({
//                 io,
//                 gameId,
//                 duration: 60,
//                 socket,
//                 correctOption: 1,
//                 questionId: questionSet[i].id

//             });
//             i++;
//             // });
//         })



//         socket.on("disconnect", () => {
//             console.log("🔴 A user disconnected");
//         });

//         socket.on("error", (err) => {
//             console.error("Socket error:", err);
//         });

//     })

//     httpServer.listen(port, () => {
//         console.log(`🚀 Server is running on http://${hostname}:${port}`)
//     })
// })

import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from "@huggingface/inference";

export async function POST(req: NextRequest) {
    try {
        const { Questions } = await req.json();
        const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!);
        if (!Questions || !Array.isArray(Questions) || Questions.length === 0) {
            return NextResponse.json(
                { error: "Invalid or empty questions array" },
                { status: 400 }
            );
        }
        console.log("received questions for verification:", Questions);
        const prompt = `
You are an expert theologian AI model with comprehensive knowledge of the entire Bible—Old and New Testaments—and sound Christian doctrine. Your task is to verify and correct a set of AI-generated Bible quiz questions.

Instructions:
1. Ensure that each question, answer, options, explanation, and formatHints are theologically correct and biblically accurate based on the whole Bible.
2. Evaluate:
   - Whether the question is **valid and clearly phrased**.
   - Whether the correct answer is truly correct **based on Scripture**.
   - Whether the incorrect options are **clearly and biblically incorrect**.
   - Whether the explanation is **accurate, complete**, and supported by correct Bible references.
   - Whether formatHints (like true/false hints) are accurate and logically follow Scripture.
   - Fix any incorrect information for full accuracy.
3. Keep structure intact: "question", "type", "topic", "level", "options", "answer", "explanation", "formatHints".
4.**MOST IMPORTANT**:: Output only pure JSON — no explanations, no markdown, no text around it. <- This is crucial for parsing.
Here is the JSON to verify:

${JSON.stringify(Questions)}
`;

        const chatCompletion = await client.chatCompletion({
            provider: "novita",
            model: "deepseek-ai/DeepSeek-V3",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const rawContent = chatCompletion?.choices?.[0]?.message?.content || "";

        // Try to extract the JSON block
        const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/) || rawContent.match(/({[\s\S]*})/);
        if (!match) {
            throw new Error("No valid JSON found in model output");
        }

        const jsonString = match[1].trim();
        const verifiedQuestions = JSON.parse(jsonString);

        return NextResponse.json({
            message: "Done with the questions verification",
            verifiedQuestions,
        });

    } catch (err: any) {
        console.error('Error verifying quizzes:', err);
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

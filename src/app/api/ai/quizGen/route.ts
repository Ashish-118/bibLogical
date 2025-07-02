import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from "@huggingface/inference";

export async function POST(req: NextRequest) {
    try {
        const { topic, count, level } = await req.json(); // default: 3 questions

        const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!);
        const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
        const results = [];

        let i = 0;
        while (results.length < count) {
            const prompt = `
            You are a Bible quiz question generator for a multiplayer Bible learning game.
            
            Your goal is to create ONE factually accurate, non-repetitive quiz question in JSON format, taking into account the **entire context of the Bible**, not just individual verses or isolated passages. Use cross-referencing from other books when relevant (e.g., Daniel with Revelation, Isaiah with the Gospels, etc.).
            
            Requirements:
            - Topic: "${topic}" 
            - Difficulty: ${level} out of 10
            - Question Type: Choose from one of the following randomly:  "true_false", "mcq"
            - The question must align with the **overall biblical narrative** and **theological accuracy**, considering dependencies across books.
            - Ensure the question is **not repetitive** with previous questions.
    
            
            Respond ONLY in valid JSON format like this:
            
            {
              "question": "",                   // The main question text
              "type": "",                       // "mcq", "true_false", "fill_blank"
              "topic": "",                      // Bible topic (e.g., "Parables", "Revelation", "Paul's Letters")
              "level": ${level},                // Difficulty 1-10
              "options": ["", "", "", ""],      // Only for MCQ; otherwise []
              "answer": "",                     // Correct answer Index like 0,1,2.... 
              "explanation": "",                // Short reference or cross-book reasoning
              "formatHints": {}                 // Optional.
            }
            
            Special Rules:
            - answer should be a number of type INT representing the index of the correct option in the options array.
            - Do **not** base your answer only on a single verse or isolated context.
            - For "order_sequence", use \`formatHints: { "correctOrder": ["Step 1", "Step 2", ...] }\`
            - For "fill_blank", provide the sentence with one key word blanked out and optionally mark its index in formatHints.
            - For "quote_guess", include the verse or quote and ask **who said it** or **where it's from**.
            - Only return **valid JSON**, no comments, no markdown, no surrounding text.
            ***MOST IMPORTANT***:  just give me the json format provided above, do not add any additional text or explanation , just the json format 

            Make sure the quiz is **contextually sound across the entire Bible**, and avoids misleading conclusions from partial readings.
            `;

            const chatCompletion = await client.chatCompletion({
                provider: "nscale",
                model: "meta-llama/Llama-3.1-8B-Instruct",
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });

            const responseText = chatCompletion.choices[0]?.message?.content;
            if (!responseText) continue;

            // Try to extract clean JSON using regex
            const match = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/({[\s\S]*})/);
            if (!match) {
                console.warn(`No valid JSON found in response on iteration ${i++}`);
                continue;
            }

            const jsonString = match[1].trim();

            try {
                const parsed = JSON.parse(jsonString);
                results.push(parsed);
            } catch (e) {
                console.warn(`Failed to parse response on iteration ${i++}`, jsonString);
            }
        }

        if (results.length === 0) {
            return NextResponse.json({ error: "No valid quizzes generated." }, { status: 500 });
        }
        const Verification = await fetch(`${BASE_URL}/api/ai/quizVerify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ Questions: results }),
        });

        if (!Verification.ok) {
            const errorData = await Verification.json();
            throw new Error(errorData.error || 'Failed to verify quizzes');
        }
        const { verifiedQuestions } = await Verification.json();
        if (!verifiedQuestions || !Array.isArray(verifiedQuestions)) {
            return NextResponse.json({ error: "there is some error in Verified Questions" }, { status: 401 });
        }
        results.length = 0; // Clear the original results array
        results.push(...verifiedQuestions); // Add verified questions back
        if (results.length === 0) {
            return NextResponse.json({ error: "No valid quizzes after verification." }, { status: 500 });
        }

        return NextResponse.json({
            message: "quizGen api done along with the verification",
            questions: results,
            length: results.length,
        });
    } catch (err: any) {
        console.error('Error generating quizzes:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

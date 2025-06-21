import { NextRequest, NextResponse } from 'next/server';
import { InferenceClient } from "@huggingface/inference";

export async function POST(req: NextRequest) {
    try {
        const { Questions } = await req.json();

        const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY!);

        console.log('Received Questions:', Questions);


        const prompt = `
            "instruction": "You are an expert theologian AI model with comprehensive knowledge of the entire Bible—Old and New Testaments—and sound Christian doctrine. Your task is to verify and correct a set of AI-generated Bible quiz questions. You must:

       1. Ensure that **each question, answer, options, explanation, and formatHints** are theologically correct and biblically accurate, taking into account the **entire context of the Bible**, not isolated verses.
     2. Evaluate:
   - Whether the question is **valid and clearly phrased**.
   - Whether the correct answer is truly correct **based on Scripture**.
   - Whether the incorrect options are **clearly and biblically incorrect**.
   - Whether the explanation is **accurate, complete**, and supported by correct Bible references.
   - Whether formatHints (like true/false hints) are accurate and logically follow Scripture.
3. If anything is incorrect or misleading, **modify it for 100% biblical and theological accuracy**, using clear, truthful language.
4. **Do not change** the **structure** or **format** of the JSON. Keep the same fields: 'question', 'type', 'topic', 'level', 'options', 'answer', 'explanation', and 'formatHints'.
5. Return the validated and corrected JSON. Do not add extra commentary or notes outside the JSON.

Here is the JSON to verify:

${JSON.stringify(Questions)}
`






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






        const rawContent = chatCompletion?.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("No content returned from chatCompletion.");
        }
        const jsonString = rawContent.replace(/```json\n?/, '').replace(/\n?```$/, '');
        const verifiedQuestions = JSON.parse(jsonString);

        return NextResponse.json({
            message: "Done with the questions verification",
            verifiedQuestions
        });

    } catch (err: any) {
        console.error('Error generating quizzes:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

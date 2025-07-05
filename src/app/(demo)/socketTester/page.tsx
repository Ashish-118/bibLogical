// src/components/SocketTester.tsx
"use client";

import { useEffect, useState } from "react";
import socket from "../../../lib/socketClient";

export default function SocketTester() {
    const [messages, setMessages] = useState<string[]>([]);
    const [input, setInput] = useState("");

    useEffect(() => {

        socket.on("connect", () => {
            console.log("🟢 Connected to Socket.IO:", socket.id);
        });

        // Listen for messages from server
        socket.on("receive-message", (message, name) => {
            setMessages(prev => [...prev, `${name}: ${message}`]);
        });

        // Cleanup on unmount
        return () => {
            socket.off("receive-message");
            socket.disconnect();
        };
    }, []);

    const sendMessage = () => {
        if (!input.trim()) return;
        socket.emit("send-message", { message: input, name: "Ashish" });
        setMessages(prev => [...prev, `You: ${input}`]);
        setInput("");
    };

    return (
        <div className="p-4 border rounded-xl max-w-md mx-auto mt-10">
            <h2 className="text-xl font-semibold mb-4">🔌 Socket.IO Tester</h2>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-4 border p-2 bg-gray-100 rounded">
                {messages.length === 0 && <p>No messages yet.</p>}
                {messages.map((msg, idx) => (
                    <p key={idx} className="text-sm">{msg}</p>
                ))}
            </div>

            <input
                type="text"
                className="border rounded px-3 py-1 mr-2 w-2/3"
                placeholder="Enter message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
                className="bg-blue-600 text-white px-3 py-1 rounded"
                onClick={sendMessage}
            >
                Send
            </button>
        </div>
    );
}

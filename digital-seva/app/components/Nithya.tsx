// components/Nithya.tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { useUserSchemeData } from "../hooks/useUserSchemeData";
import { Message, Language, StateLanguages } from "../types/index";
import { stateLanguages } from "../config/languages";
import { useTranslation } from "@/app/lib/TranslationContext";
import { marked } from "marked";
import { Mic, MicOff } from "lucide-react";

export function Nithya() {
  const { userData, loading, error: userDataError } = useUserSchemeData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting when user data is loaded
  useEffect(() => {
    if (userData && !loading && messages.length === 0) {
      const location = userData.location || "default";
      const availableLanguages =
        (stateLanguages as StateLanguages)[location] || [];
      const languageOptions = availableLanguages
        .map(
          (lang: Language, index: number) =>
            `${index + 1}️⃣ ${lang.nativeName} (${lang.name})`
        )
        .join("\n");

      const greeting =
        `Hello ${userData.name}, my name is Nithya - Your Personalized Guide to Government Schemes, Anytime, Anywhere.\n\n` +
        `I can see you're from ${location}. Which language would you like to continue in?\n\n${languageOptions}`;

      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [userData, loading, messages.length]);

  const handleLanguageSelection = (input: string) => {
    const number = parseInt(input);
    const location = userData?.location || "default";
    const availableLanguages =
      (stateLanguages as StateLanguages)[location] || [];

    if (number > 0 && number <= availableLanguages.length) {
      const selected = availableLanguages[number - 1];
      setSelectedLanguage(selected);

      const menu =
        `Perfect! I'll continue in ${selected.name}.\n\nHow can I help you? You can ask about:\n` +
        `✔ Eligibility criteria for a scheme\n` +
        `✔ Required documents\n` +
        `✔ Application process\n` +
        `✔ Benefits of a scheme\n` +
        `✔ Tracking application status`;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: `Selected ${selected.name}` },
        { role: "assistant", content: menu },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please select a valid language option (1-3).",
        },
      ]);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setError(null);
    const newMessage: Message = { role: "user", content: userInput };
    setMessages((prev) => [...prev, newMessage]);
    setUserInput("");

    try {
      if (!selectedLanguage) {
        handleLanguageSelection(userInput);
        setIsProcessing(false);
        return;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, newMessage],
          language: selectedLanguage.code,
          userData,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const htmlContent = marked(data.response);

      // Ensure that the content is a string
      const assistantMessage: Message = {
        role: "assistant",
        content: htmlContent as string,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError("Sorry, I encountered an error. Please try again.");
      console.error("Chat error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startVoiceRecognition = () => {
    if (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript); 
        handleSendMessage(); 
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        alert(`Speech recognition error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert("Speech recognition is not supported in your browser.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userDataError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">
          Error loading user data. Please try refreshing the page.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 p-4 text-white">
        <h1 className="text-xl font-bold">{t("NithyaAIAssistant")}</h1>
        {selectedLanguage && (
          <div className="text-sm">
            {t("Language")}: {selectedLanguage.nativeName} (
            {selectedLanguage.name})
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-white"
                  : "bg-white shadow"
              }`}
            >
              <div
                className="whitespace-pre-wrap font-sans"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-2 text-center text-red-500 bg-red-100">{error}</div>
      )}

      {/* Input */}
      <div className="border-t p-4 bg-white">
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={isProcessing ? t("processing") : t("typeyourmessage")}
            disabled={isProcessing}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSendMessage}
            disabled={isProcessing || !userInput.trim()}
            className={`px-4 py-2 rounded-lg bg-primary text-white ${
              isProcessing || !userInput.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-primary-dark"
            }`}
          >
            {t("send")}
          </button>
          {/* Voice Input Button */}
          <button
            onClick={startVoiceRecognition}
            className={`p-3 rounded-full ${isListening ? "bg-red-500" : "bg-blue-500"} text-white hover:opacity-90 transition-opacity shadow-md`}
            title={isListening ? "Listening..." : "Start voice input"}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AiAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_QUESTIONS = [
  "Comment générer un rapport sur les contrats ?",
  "Aide-moi à comprendre les alertes.",
  "Comment ajouter un nouvel utilisateur ?",
  "Quelles sont les statistiques importantes ?",
];

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Bonjour 👋\nJe suis votre assistant IA pour CONTRACT MANAGER. Posez-moi vos questions sur la plateforme, les statistiques, ou demandez-moi de l'aide technique !",
  },
];

const AiAssistantSheet: React.FC<AiAssistantSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        "https://cqyuhztxmaawzzhdartp.functions.supabase.co/ai-assistant-chat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages.slice(1), userMsg] // Ignore greeting for OpenAI
              .map(({ role, content }) => ({ role, content })),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur lors de la requête à l'IA");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "❌ Erreur lors de la génération de la réponse. Merci de réessayer plus tard.",
        },
      ]);
      toast({
        title: "Erreur Assistant IA",
        description: err?.message ?? "Erreur via OpenAI.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full max-w-md p-0 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-l border-slate-700/50"
      >
        <SheetHeader className="border-b border-slate-700/50 p-6 bg-black/20 backdrop-blur-sm">
          <SheetTitle className="text-white">
            <span className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-600 to-red-600">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              Assistant IA
            </span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`whitespace-pre-line ${
                msg.role === "assistant"
                  ? "text-sm bg-black/30 border border-slate-700/50 rounded-lg px-4 py-3 self-start text-slate-200 backdrop-blur-sm"
                  : "text-right"
              }`}
            >
              {msg.role === "user" ? (
                <span className="inline-block bg-gradient-to-r from-orange-600 to-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
                  {msg.content}
                </span>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {loading && (
            <div className="text-sm bg-black/30 border border-slate-700/50 rounded-lg px-4 py-3 self-start text-slate-200 backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span>L'assistant réfléchit...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="px-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q, idx) => (
              <Button
                key={idx}
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 border border-slate-700/50 hover:bg-slate-700/30 hover:text-slate-200 bg-black/20"
                onClick={() => setInput(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
        
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t border-slate-700/50 px-6 py-4 bg-black/20 backdrop-blur-sm"
        >
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-slate-600 rounded-md text-sm bg-black/30 text-white placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-orange-500 outline-none backdrop-blur-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question…"
            autoFocus
            disabled={loading}
            aria-label="Zone de saisie pour l'Assistant IA"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AiAssistantSheet;

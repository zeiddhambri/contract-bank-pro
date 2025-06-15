
import React, { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AiAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_QUESTIONS = [
  "Comment générer un rapport sur les contrats ?",
  "Aide-moi à comprendre les alertes.",
  "Comment ajouter un nouvel utilisateur ?",
];

type Message = { role: "user" | "assistant"; content: string };

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Bonjour 👋\nJe suis votre assistant IA. Posez-moi vos questions sur la plateforme, les statistiques, ou demandez-moi de l’aide technique !",
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
      <SheetContent side="right" className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b p-6 bg-background">
          <SheetTitle>
            <span className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              Assistant IA
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-background flex flex-col">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 whitespace-pre-line ${
                msg.role === "assistant"
                  ? "text-sm bg-muted rounded-lg px-4 py-2 self-start"
                  : "text-right"
              }`}
            >
              {msg.role === "user" ? (
                <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                  {msg.content}
                </span>
              ) : (
                msg.content
              )}
            </div>
          ))}
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
                className="text-xs text-muted-foreground border border-muted hover:bg-muted/60"
                onClick={() => setInput(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 border-t px-6 py-4 bg-background"
        >
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded-md text-sm bg-background focus-visible:ring-2 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question…"
            autoFocus
            disabled={loading}
            aria-label="Zone de saisie pour l’Assistant IA"
          />
          <Button type="submit" disabled={!input.trim() || loading}>
            {loading ? "..." : "Envoyer"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AiAssistantSheet;

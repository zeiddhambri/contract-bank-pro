
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

interface AiAssistantSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE_QUESTIONS = [
  "Comment générer un rapport sur les contrats ?",
  "Aide-moi à comprendre les alertes.",
  "Comment ajouter un nouvel utilisateur ?",
];

const AiAssistantSheet: React.FC<AiAssistantSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([
    {
      role: "assistant",
      content:
        "Bonjour 👋\nJe suis votre assistant IA. Posez-moi vos questions sur la plateforme, les statistiques, ou demandez-moi de l’aide technique !",
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // scroll to bottom on open or when messages change
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "⏳ L’IA n’est pas encore connectée. (Cet assistant pourra bientôt répondre à vos questions ; demandez à Lovable d’activer l’API OpenAI ici !)",
      },
    ]);
    setInput("");
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
        {/* Chat area */}
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
                <span className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg">{msg.content}</span>
              ) : (
                msg.content
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Example questions */}
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
        {/* Input area */}
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
            aria-label="Zone de saisie pour l’Assistant IA"
          />
          <Button type="submit" disabled={!input.trim()}>
            Envoyer
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
};

export default AiAssistantSheet;

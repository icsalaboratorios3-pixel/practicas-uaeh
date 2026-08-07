import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";

const STORAGE_KEY = "chatbotHistory";
const SUPPORT_EMAIL = "ro475972@uaeh.edu.mx";
const DEFAULT_INTENTS = [];

const initialGuide = [
  "¿Cómo inicio sesión?",
  "¿Cómo valido una práctica?",
];

// --- Palabras vacías que no aportan significado para el matching ---
const STOPWORDS = new Set([
  "como", "donde", "dónde", "que", "qué", "cual", "cuál", "es", "el", "la",
  "los", "las", "un", "una", "de", "del", "mi", "mis", "tu", "tus", "su",
  "sus", "yo", "puedo", "puede", "para", "por", "en", "y", "o", "a", "al",
  "se", "con", "favor", "porfavor",
]);

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/[¿?¡!.,]/g, "") // quita signos de puntuación
    .trim();
}

function tokenizar(texto) {
  return normalizar(texto)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function formatTime(date) {
  return date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [intents, setIntents] = useState(DEFAULT_INTENTS);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const fuse = useMemo(() => {
    if (!intents.length) return null;
    return new Fuse(intents, {
      keys: [
        { name: "patterns", weight: 0.4 },
        { name: "keywords", weight: 0.6 },
      ],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
      useExtendedSearch: true,
    });
  }, [intents]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      } catch {
        setMessages([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const res = await fetch("/respues++ftas.json");
        const data = await res.json();
        if (Array.isArray(data.intents)) setIntents(data.intents);
        if (typeof data.support_email === "string") setSupportEmail(data.support_email);
      } catch (err) {
        console.warn("No se pudo cargar respuestas.json", err);
      } finally {
        setLoading(false);
      }
    };
    loadKnowledge();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  const addMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const replyTo = (query) => {
    if (!query) {
      return "Escribe tu duda para que te ayude. También puedes usar una frase corta como 'mi programación' o 'cambiar contraseña'.";
    }
    if (!fuse) {
      return `Lo siento, el chatbot aún no está listo. Escríbeme a ${supportEmail} para soporte directo.`;
    }

    const tokens = tokenizar(query);

    // Si no quedan tokens útiles (todo eran stopwords), usa la query completa
    const extendedQuery = tokens.length
      ? tokens.map((t) => `'${t}`).join(" | ") // "'token" = match exacto, "|" = OR
      : query;

    const search = fuse.search(extendedQuery);
    const best = search.length > 0 ? search[0] : null;

    if (best && best.score <= 0.45) {
      const responses = best.item.responses || [];
      return responses.length > 0
        ? responses[Math.floor(Math.random() * responses.length)]
        : `Encontré un tema similar, pero no tengo respuesta lista. Escríbeme a ${supportEmail}.`;
    }

    return `No encontré una respuesta segura para esa pregunta. Escríbeme a ${supportEmail} y con gusto te ayudo.`;
  };

  const handleSend = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const now = new Date();
    addMessage({ id: `u_${now.getTime()}`, type: "user", text: trimmed, time: formatTime(now) });

    const answer = replyTo(trimmed);
    addMessage({ id: `b_${now.getTime()}`, type: "bot", text: answer, time: formatTime(new Date()) });
    setInputValue("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSend(inputValue);
  };

  const handleQuickReply = (text) => {
    setInputValue(text);
    if (!isOpen) setIsOpen(true);
    setTimeout(() => handleSend(text), 50);
  };

  const greeting = "¡Hola! Soy Heron, tu asistente del sistema. Puedo ayudarte con dudas sobre cómo usar la aplicación, tus programaciones y el menú de navegación.";

  const showQuickReplies = inputValue.trim() === "" && !messages.some((m) => m.type === "user");
  const showGreeting = !messages.some((m) => m.type === "user");

  // Render del componente ChatBotHeron
  const ChatBotHeron = (
    <div className="chatbot-root">
      <button
        type="button"
        className="chatbot-toggle"
        aria-label={isOpen ? "Cerrar chat de Heron" : "Abrir chat de Heron"}
        onClick={() => setIsOpen((open) => !open)}
      >
        <img className="chatbot-icon" src="/images/garza.png" alt="Heron" />
      </button>

      {isOpen && (
        <div className="chatbot-panel" role="dialog" aria-modal="true" aria-label="Chat de ayuda">
          <div className="chatbot-header">
            <div>
              <div className="chatbot-title">Heron</div>
              <div className="chatbot-subtitle">¿En qué puedo ayudarte?</div>
            </div>
            <button type="button" className="chatbot-close" onClick={() => setIsOpen(false)} aria-label="Cerrar chat">✕</button>
          </div>

          <div className="chatbot-body">
            {showGreeting && (
              <div className="chatbot-message bot">
                <div className="chatbot-message-text">{greeting}</div>
                <div className="chatbot-message-time">{formatTime(new Date())}</div>
              </div>
            )}

            {showQuickReplies && (
              <div className="chatbot-quick-replies">
                {initialGuide.map((label) => (
                  <button key={label} type="button" className="chatbot-quick-reply" onClick={() => handleQuickReply(label)}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="chatbot-message-list">
              {messages.map((message) => (
                <div key={message.id} className={`chatbot-message ${message.type}`}>
                  <div className="chatbot-message-text">{message.text}</div>
                  <div className="chatbot-message-time">{message.time}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form className="chatbot-form" onSubmit={handleSubmit}>
            <input
              aria-label="Escribe tu pregunta"
              placeholder="Escribe aquí tu duda..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="chatbot-input"
            />
            <button type="submit" className="chatbot-send" disabled={loading}>Enviar</button>
          </form>

          <div className="chatbot-footer">
            <span>¿No encuentras respuesta?</span>
            <a href={`mailto:${supportEmail}`} className="chatbot-contact">Contacta soporte</a>
          </div>
        </div>
      )}
    </div>
  );

  // return para mostrar la sección de chatbot en el menú lateral
  return (
    <div>{null}</div>
  );
}

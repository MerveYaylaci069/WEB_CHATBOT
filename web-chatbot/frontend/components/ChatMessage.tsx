import { SeljukStarIcon } from "./SeljukPattern";

export type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  time: string;
};

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex w-full animate-fadeUp gap-2.5 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-onyx-600 text-gold">
          <SeljukStarIcon size={16} />
        </div>
      )}
      <div className={`flex max-w-[80%] flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-chat px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-gradient-to-br from-gold-bright to-gold text-onyx font-medium"
              : "rounded-tl-sm border border-silver-line bg-onyx-700 text-silver"
          }`}
        >
          {message.text}
        </div>
        <span className="mt-1 px-1 font-mono text-[10px] text-silver-text/70">
          {message.time}
        </span>
      </div>
    </div>
  );
}

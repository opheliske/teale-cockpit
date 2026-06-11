import { Fragment } from "react";

// Rend le texte d'un message : préserve les sauts de ligne et transforme les
// URLs http(s) en liens cliquables (ouverts dans un nouvel onglet).
const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const IS_URL = /^https?:\/\//;

export function ChatMessageText({
  text,
  linkClassName = "underline underline-offset-2",
}: {
  text: string;
  linkClassName?: string;
}) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {text.split(URL_SPLIT).map((part, i) =>
        IS_URL.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

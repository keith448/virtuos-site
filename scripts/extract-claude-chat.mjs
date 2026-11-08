#!/usr/bin/env node
// Extract one conversation from a Claude data export into readable Markdown.
//
// Usage:
//   node scripts/extract-claude-chat.mjs <conversations.json> [chat-uuid] [out.md]
//
// With no chat-uuid and exactly one conversation, it extracts that one.
// With several conversations and no uuid, it lists them and exits.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [input, chatId, outArg] = process.argv.slice(2);

if (!input) {
  console.error("usage: node scripts/extract-claude-chat.mjs <conversations.json> [chat-uuid] [out.md]");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(resolve(input), "utf8"));
const conversations = Array.isArray(raw) ? raw : [raw];

let chat;
if (chatId) {
  chat = conversations.find(
    (c) =>
      c.uuid === chatId ||
      c.uuid?.replace(/-/g, "") === chatId.replace(/-/g, "") ||
      c.uuid?.startsWith(chatId),
  );
  if (!chat) {
    console.error(`No conversation matching ${chatId}. Available:`);
    for (const c of conversations) console.error(`  ${c.uuid}  ${c.name ?? "(untitled)"}`);
    process.exit(1);
  }
} else if (conversations.length === 1) {
  chat = conversations[0];
} else {
  console.error(`${conversations.length} conversations in this export. Pass a uuid. Available:`);
  for (const c of conversations) console.error(`  ${c.uuid}  ${c.name ?? "(untitled)"}`);
  process.exit(1);
}

const blocksText = (msg) => {
  if (!Array.isArray(msg.content)) return "";
  return msg.content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n\n");
};

const attachmentNames = (msg) => {
  const names = [];
  for (const f of msg.files ?? []) if (f?.file_name) names.push(f.file_name);
  for (const a of msg.attachments ?? []) if (a?.file_name) names.push(a.file_name);
  return names;
};

const speaker = (msg) => {
  const s = (msg.sender ?? "").toLowerCase();
  if (s === "human") return "Human";
  if (s === "assistant") return "Claude";
  return msg.sender ?? "Unknown";
};

const date = chat.created_at ? new Date(chat.created_at).toISOString().slice(0, 10) : "";

const parts = [];
parts.push(`# ${chat.name ?? "Claude conversation"}`);
if (date) parts.push(`_Exported ${date} · ${chat.uuid}_`);
parts.push("");

let kept = 0;
for (const msg of chat.chat_messages ?? []) {
  const text = (msg.text && String(msg.text).trim()) || blocksText(msg);
  if (!text.trim()) continue;
  const files = attachmentNames(msg);
  parts.push(`## ${speaker(msg)}`);
  if (files.length) parts.push(`_[attachments: ${files.join(", ")}]_`);
  parts.push(text.trim());
  parts.push("");
  kept += 1;
}

const out = outArg ?? "docs/claude-chat.md";
writeFileSync(resolve(out), parts.join("\n"), "utf8");
console.log(`Wrote ${out}: ${kept} messages, ${parts.join("\n").split("\n").length} lines.`);

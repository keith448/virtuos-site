"""Model adapters. Standard library only, so the package installs cleanly."""

from __future__ import annotations

import json
import re
import os
import random
import urllib.error
import urllib.request

LETTERS = ("A", "B", "C")


def parse_letter(text: str) -> str | None:
    """Return the chosen A, B or C from a model response, or None."""
    text = (text or "").strip()
    match = re.match(r"^\s*\(?([ABC])\b", text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    match = re.search(r"(?:answer|option|choice)\s*(?:is|:)?\s*\(?([ABC])\b", text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    match = re.search(r"\b([ABC])\b", text)
    return match.group(1).upper() if match else None


class Provider:
    name = "provider"

    def complete(self, prompt: str) -> str:  # pragma: no cover - interface
        raise NotImplementedError


class EchoProvider(Provider):
    """Always answers the same letter. Use to check the plumbing."""

    name = "echo"

    def __init__(self, letter: str = "A"):
        self.letter = letter.upper()

    def complete(self, prompt: str) -> str:
        return self.letter


class RandomProvider(Provider):
    """A chance baseline, reproducible by seed."""

    name = "random"

    def __init__(self, seed: int = 0):
        self._rng = random.Random(seed)

    def complete(self, prompt: str) -> str:
        return self._rng.choice(LETTERS)


def _options(prompt: str) -> dict[str, str]:
    found = {}
    for line in prompt.splitlines():
        match = re.match(r"^([ABC])\. (.*)$", line)
        if match:
            found[match.group(1)] = match.group(2)
    return found


class LongestProvider(Provider):
    """Picks the longest option. Measures how much the length cue is worth."""

    name = "longest"

    def complete(self, prompt: str) -> str:
        options = _options(prompt)
        if not options:
            return "A"
        return max(options, key=lambda letter: len(options[letter]))


class ShortestProvider(Provider):
    """Picks the shortest option, as a counter-baseline."""

    name = "shortest"

    def complete(self, prompt: str) -> str:
        options = _options(prompt)
        if not options:
            return "A"
        return min(options, key=lambda letter: len(options[letter]))


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 60) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", "replace")[:500]
        raise RuntimeError(f"HTTP {exc.code} from {url}: {body}") from exc


class OpenAIProvider(Provider):
    name = "openai"

    def __init__(self, model: str, api_key: str | None = None, base_url: str | None = None):
        self.model = model
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        self.base_url = (base_url or os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")
        if not self.api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

    def complete(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0,
            "max_tokens": 8,
        }
        data = _post_json(
            f"{self.base_url}/chat/completions",
            payload,
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
        )
        return data["choices"][0]["message"]["content"]


class AnthropicProvider(Provider):
    name = "anthropic"

    def __init__(self, model: str, api_key: str | None = None):
        self.model = model
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        if not self.api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

    def complete(self, prompt: str) -> str:
        payload = {
            "model": self.model,
            "max_tokens": 8,
            "temperature": 0,
            "messages": [{"role": "user", "content": prompt}],
        }
        data = _post_json(
            "https://api.anthropic.com/v1/messages",
            payload,
            {
                "Content-Type": "application/json",
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        return data["content"][0]["text"]


class OllamaProvider(Provider):
    name = "ollama"

    def __init__(self, model: str, host: str | None = None):
        self.model = model
        self.host = (host or os.environ.get("OLLAMA_HOST") or "http://localhost:11434").rstrip("/")

    def complete(self, prompt: str) -> str:
        data = _post_json(
            f"{self.host}/api/chat",
            {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "options": {"temperature": 0},
            },
            {"Content-Type": "application/json"},
        )
        return data["message"]["content"]


def get_provider(
    name: str,
    *,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    host: str | None = None,
    seed: int = 0,
    letter: str = "A",
) -> Provider:
    name = name.lower()
    if name == "echo":
        return EchoProvider(letter)
    if name == "random":
        return RandomProvider(seed)
    if name == "longest":
        return LongestProvider()
    if name == "shortest":
        return ShortestProvider()
    if name == "openai":
        if not model:
            raise RuntimeError("--model is required for openai")
        return OpenAIProvider(model, api_key, base_url)
    if name == "anthropic":
        if not model:
            raise RuntimeError("--model is required for anthropic")
        return AnthropicProvider(model, api_key)
    if name == "ollama":
        if not model:
            raise RuntimeError("--model is required for ollama")
        return OllamaProvider(model, host)
    raise RuntimeError(f"unknown provider {name!r}; use echo, random, longest, shortest, openai, anthropic or ollama")

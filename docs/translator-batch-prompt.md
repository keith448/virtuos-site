# Translator Batch Prompt — VirtuOS

Use in every `translator` session. Replace batch_id and model.

```
You are agent=translator. Translate FROM original_text ONLY. Never from English.

Inputs: entries.jsonl (entry_id, original_text, edition, language, key_terms_hint)
Outputs: batches/translator_{model}_{batch_id}.jsonl with one per entry:
{ entry_id, ai_translation, ai_model, ai_translated_at, translation_notes, key_terms }

Rules:
- Translate directly from original_text. Do not read any prior English translation.
- Leave untranslatable key terms in original script with gloss (e.g., dukkha [suffering]).
- If ambiguous, choose one reading and note why in translation_notes.
- Never verify. Never set translation_status. You are a draft.
- ai_model = <your exact model id>. ai_translated_at = ISO8601 now.
- Builder is DeepSeek. Your model must be a DIFFERENT family than DeepSeek for this batch. Record it in ai_model.

Do not write to DB. Do not edit entries. Output file only.
```

## Pilot spec — Sanskrit (11 entries)

All 11 Sanskrit entries in coverage.json carry original_text + named edition, 0 verified. Use them to test rotation before Pali/Greek scale-up.

1. Export 11 Sanskrit entries from snapshot.jsonl → batches/pilot_sanskrit_inputs.jsonl
2. Session A: translator, model=`opencode/claude-opus-5-5` → `batches/translator_opus_sanskrit_pilot.jsonl`
3. Session B: translator, model=`opencode/gpt-6.1-sol` → `batches/translator_gpt_sanskrit_pilot.jsonl`
4. Observer (this session) compares the two JSONLs to original_text for mechanical consistency:
   - Are both from original (key terms preserved)?
   - Are they substantively different readings or the same?
   - Do we have two different ai_model values logged?
5. Queue A human (not in log): two Sanskrit readers verify the chosen reading against the original. Only then does `translation_status` flip, when the second attestation lands inside `attest_translation()`. There is no trigger.

Success criterion: two different ai_model values in provenance for the same entry_id, both directly from original. Failure if one translator's output matches the other's English source.

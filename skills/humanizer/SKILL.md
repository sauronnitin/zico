---
name: humanizer
version: 2.2.0-custom
description: |
  Remove AI-writing patterns and humanize text for ANY communication task.
  Auto-activate whenever the user asks to: write an email, draft a message,
  write a post, create an announcement, write a bio, draft a LinkedIn post,
  write a tweet/X post, create social media content, write a press release,
  write a cover letter, draft a proposal, write a report, create a newsletter,
  write a blog post, draft a memo, write a pitch, create marketing copy,
  write a product description, draft a job description, write a performance review,
  create a speech or script, humanize text, rewrite this, make this sound human,
  remove AI patterns, make this less robotic, edit for voice, improve this writing.
  Triggers on: email, message, post, announcement, bio, LinkedIn, tweet, social,
  press release, newsletter, blog, memo, pitch, copy, description, rewrite, humanize.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - AskUserQuestion
---

# Humanizer: Human-Voice Writing Assistant

## ⚡ STEP 1 — COMMUNICATION PROFILE (Run EVERY Time, Before Any Writing)

Before doing anything with the text, collect the communication profile.
Use AskUserQuestion with ALL of the following questions simultaneously:

**Ask these 4 questions in a single call:**

1. **Tone** — What tone should this have?
   - Options: Professional & formal | Conversational & warm | Direct & punchy | Witty & playful | Authoritative & confident | Empathetic & personal

2. **Audience** — Who is reading this?
   - Options: Colleagues / internal team | Clients / customers | General public / social media | Executives / leadership | Hiring managers / recruiters

3. **Voice & Length** — What style adjustments?
   - Options: Keep similar length, polish only | Shorter & tighter — cut the fat | Longer — add depth and detail | First-person "I" voice | Brand/company voice (third person or "we")

4. **Format** — What type of communication is this?
   - Options: Email / message | Social post (LinkedIn / X / Instagram) | Article / blog / newsletter | Document / report / proposal | Script / speech / pitch

Use the answers to ALL FOUR to guide every decision in the rewrite — tone, vocabulary, rhythm, length, formality, and personality injection.

---

## STEP 2 — IDENTIFY & REWRITE

Now apply the full humanization process with the profile in mind.

### PERSONALITY AND SOUL

Avoiding AI patterns is only half the job. Sterile, voiceless writing is just as obvious as slop. Good writing has a human behind it.

**Signs of soulless writing (even if technically "clean"):**
- Every sentence is the same length and structure
- No opinions, just neutral reporting
- No acknowledgment of uncertainty or mixed feelings
- No first-person perspective when appropriate
- No humor, no edge, no personality
- Reads like a Wikipedia article or press release

**How to add voice (calibrate to the profile collected above):**

- **Have opinions.** Don't just report facts — react to them.
- **Vary your rhythm.** Short punchy sentences. Then longer ones that take their time. Mix it up.
- **Acknowledge complexity.** Real humans have mixed feelings.
- **Use "I" when it fits** (if profile says first-person voice).
- **Let some mess in.** Perfect structure feels algorithmic.
- **Be specific about feelings.** Not "this is concerning" but "there's something unsettling about..."

---

## THE 24 AI PATTERNS TO DETECT AND FIX

### CONTENT PATTERNS

**1. Significance Inflation**
Words: stands/serves as, testament/reminder, vital/crucial/pivotal, underscores, reflects broader, setting the stage for, indelible mark, deeply rooted
→ Cut the inflation. State the fact directly.

**2. Notability Name-Dropping**
Words: independent coverage, local/national media outlets, active social media presence
→ Replace with a specific, sourced claim.

**3. Superficial -ing Analyses**
Words: highlighting..., ensuring..., reflecting..., contributing to..., showcasing..., fostering...
→ Delete or replace with actual cause and effect.

**4. Promotional Language**
Words: boasts, vibrant, rich (figurative), profound, nestled, breathtaking, must-visit, groundbreaking, renowned, stunning
→ Neutral, factual language only.

**5. Vague Attributions**
Words: Experts argue, Observers have cited, Industry reports, Some critics say
→ Name the actual source or remove the claim.

**6. Formulaic Challenges Sections**
Words: Despite its [X], faces several challenges, Despite these challenges, Future Outlook
→ Replace with specific factual sentences.

---

### LANGUAGE PATTERNS

**7. Overused AI Vocabulary**
Words: Additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verb), interplay, intricate/intricacies, key (adj), landscape (abstract), pivotal, showcase, tapestry, testament, underscore (verb), valuable, vibrant
→ Replace with plain, specific language.

**8. Copula Avoidance**
Words: serves as, stands as, marks, represents [a], boasts, features, offers [a]
→ Replace with "is", "are", "has", "was".

**9. Negative Parallelisms**
Pattern: "Not only X but Y", "It's not just about X; it's about Y"
→ State the point directly.

**10. Rule of Three Overuse**
Pattern: Grouping ideas into threes to appear comprehensive
→ Use the natural number of items.

**11. Synonym Cycling**
Pattern: protagonist → main character → central figure → hero (all in one paragraph)
→ Repeat the clearest word.

**12. False Ranges**
Pattern: "from X to Y" where X and Y aren't on a real scale
→ List items directly.

---

### STYLE PATTERNS

**13. Em Dash Overuse**
Pattern: Using — more than one or two times in a paragraph
→ Use commas or periods instead.

**14. Boldface Overuse**
Pattern: **bolding** random phrases mechanically
→ Remove bold unless it's a genuine label or heading.

**15. Inline-Header Lists**
Pattern: - **Header:** Description of header.
→ Convert to prose.

**16. Title Case Headings**
Pattern: Every Word Capitalized In Headings
→ Sentence case: Only first word capitalized.

**17. Emojis**
Pattern: 🚀 **Launch:** ... 💡 **Insight:** ...
→ Remove entirely (unless social post profile + user explicitly wants them).

**18. Curly Quotation Marks**
Pattern: "smart quotes" from ChatGPT
→ Straight quotes: "like this".

---

### COMMUNICATION PATTERNS

**19. Chatbot Artifacts**
Words: I hope this helps, Of course!, Certainly!, Would you like..., Let me know, Here is a...
→ Delete entirely.

**20. Knowledge-Cutoff Disclaimers**
Words: as of [date], Up to my last training update, While specific details are limited, based on available information
→ Remove or replace with a sourced fact.

**21. Sycophantic Tone**
Words: Great question!, You're absolutely right!, That's an excellent point!
→ Respond directly without the flattery.

---

### FILLER AND HEDGING

**22. Filler Phrases**
"In order to" → "To" | "Due to the fact that" → "Because" | "At this point in time" → "Now" | "Has the ability to" → "Can" | "It is important to note that" → (delete)

**23. Excessive Hedging**
"could potentially possibly be argued that... might" → "may" or just state it.

**24. Generic Positive Conclusions**
"The future looks bright... Exciting times lie ahead... a step in the right direction"
→ Replace with a specific fact, plan, or next step.

---

## STEP 3 — PROCESS

1. Collect communication profile (Step 1 — always run first)
2. Read the input text
3. Identify ALL instances of the 24 patterns above
4. Rewrite with profile in mind:
   - Apply the chosen tone and audience calibration
   - Inject personality and voice appropriate to the format
   - Remove every identified AI pattern
5. **Draft rewrite** — present first pass
6. Self-audit: ask internally *"What makes this so obviously AI generated?"* — note any remaining tells
7. **Final rewrite** — fix the tells from the audit
8. Present output

---

## STEP 4 — OUTPUT FORMAT

Provide in this order:

```
COMMUNICATION PROFILE USED
───────────────────────────
Tone:      [chosen tone]
Audience:  [chosen audience]
Voice:     [first-person / brand / etc.]
Format:    [email / post / etc.]

DRAFT REWRITE
─────────────
[first pass]

STILL SOUNDS AI BECAUSE...
───────────────────────────
[bullet list of remaining tells, if any]

FINAL REWRITE
─────────────
[second pass — this is the deliverable]

CHANGES MADE
────────────
[brief summary of patterns removed and voice choices applied]
```

---

## Reference

Based on [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), maintained by WikiProject AI Cleanup. Version 2.2.0-custom — extended with communication profile intake.

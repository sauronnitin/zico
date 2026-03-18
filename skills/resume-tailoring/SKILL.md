---
name: resume-tailoring
description: >
  Auto-activate for ANY resume-related request: reviewing, editing, tailoring, rewriting,
  auditing, optimizing, gap-analysing, or generating a resume for a job application.
  Triggers on keywords: resume, CV, job application, tailor my resume, review my resume,
  cover letter paired with resume, JD match, ATS optimization.
  Source: https://github.com/varunr89/resume-tailoring-skill (MIT License)
---

# Resume Tailoring Skill

## Core Principle
Truth-preserving optimization — maximize JD fit while maintaining factual integrity. Never fabricate experience. Intelligently reframe and emphasize relevant aspects. Mission: A person's ability to get a job should be based on their experiences and capabilities, not on their resume writing skills.

---

## Auto-Trigger Conditions (claude.ai)
Activate this skill automatically when the user:
- Shares a resume and asks for review, feedback, edits, or improvements
- Pastes a job description and asks to tailor/optimize their resume
- Asks "does my resume match this JD?"
- Requests ATS optimization
- Asks for help writing bullet points, summaries, or experience sections
- Mentions gap analysis between their background and a role
- Asks for cover letter help alongside a resume

---

## Phase 0 — Intake & Library Initialization

### Single Job Flow
1. Ask for: resume (paste or upload), job description (paste or URL)
2. If no resume provided → conduct Experience Discovery interview (Phase 2) first
3. Parse resume into structured sections: Summary, Experience, Skills, Education, Projects

### Multi-Job Flow (3–5 JDs detected)
Triggered when user pastes multiple JDs or lists multiple roles.
1. Collect all JDs upfront
2. Run library initialization ONCE
3. Run unified Gap Analysis across all JDs
4. Run shared Experience Discovery (single interview covering all gaps)
5. Generate per-job resumes sequentially

### Resume Library (Claude Code environment)
Expected location: `~/resumes/`
```
~/resumes/
├── master/          ← base resumes (PDF/DOCX/MD)
├── tailored/        ← generated output per application
│   └── {Name}_{Company}_{Role}/
│       ├── resume.md
│       ├── resume.docx
│       ├── resume.pdf
│       └── interview_prep_report.md
```
For fresh library (no existing resumes): proceed directly to Experience Discovery.

---

## Phase 1 — Company & Role Research

Research the following before writing a single word:
- Company culture, values, mission language
- Role-specific success signals (what does "great" look like in this job?)
- Team context (if detectable from JD)
- Industry terminology and keywords to prioritize
- ATS keyword density requirements

Output a brief **Research Summary** (5–8 bullets) before proceeding.

---

## Phase 2 — Experience Discovery (Branching Interview)

Run when gaps exist between resume and JD, or when starting fresh.

### Interview Structure
Ask branching questions to surface undocumented experiences:
- "Have you ever done X, even informally or in a side project?"
- "Did you lead/contribute to any [gap area] work at [company]?"
- "Any volunteer, freelance, or open source work related to [skill]?"
- "What did you actually build/ship/lead in [role]? Walk me through it."

Tag each discovered experience with:
- Relevance to current JD (High / Medium / Low)
- Confidence score for inclusion (%)
- Reframing opportunity (if title/scope mismatch exists)

### Gap Handling
For every identified gap, produce one of:
1. **Filled** — surfaced experience covers it
2. **Reframed** — existing experience reframed to address it
3. **Acknowledged** — gap flagged transparently in output report; cover letter recommendations provided

---

## Phase 3 — Resume Assembly

### Content Selection Rules
- Prioritize bullets with measurable outcomes (numbers, %, $, scale)
- Use JD language and terminology where truthful
- Confidence-score every bullet (surface score only if <70%)
- Apply title reframing only with explicit rationale shown to user
- Never fabricate: no invented metrics, roles, companies, or tools

### ATS Optimization
- Mirror exact keyword phrasing from JD where applicable
- Avoid graphics, tables, headers-in-text-boxes (ATS-hostile formats)
- Use standard section titles: Experience, Skills, Education, Summary

### Format Rules
- Default: 1 page (2 pages only if 10+ years experience and JD is senior)
- Summary: 2–3 lines, role-specific, written in first person omitting "I"
- Bullets: Action verb → Task → Outcome (XYZ formula preferred)
- Skills section: grouped by category, keyword-dense

---

## Phase 4 — Output Generation

### Formats (claude.ai)
1. **Markdown** — always generated first, shown inline
2. **DOCX** — use `docx` skill (Calibri 11pt body, 12pt headers, 0.75" margins, proper bullet numbering — NOT unicode bullets)
3. **PDF** — use `pdf` skill to convert from DOCX
4. **Interview Prep Report** — optional, generated on request

### Interview Prep Report Contents
- Top 5 likely interview questions based on JD + resume
- Suggested STAR answers for each, seeded from discovered experiences
- Gap acknowledgment talking points
- Questions to ask the interviewer

### Output Summary Block (always append)
```
RESUME OUTPUT SUMMARY
─────────────────────
JD Coverage:        X% (Y direct matches, Z reframes)
Gaps Identified:    N (details in report)
New Experiences:    N surfaced during discovery
Formats Generated:  MD / DOCX / PDF
Library Updated:    Yes / No
```

---

## Phase 5 — Library Update (Claude Code only)

After approval:
1. Move all output files to `~/resumes/tailored/{Name}_{Company}_{Role}/`
2. Log metadata:
```json
{
  "resume_id": "{Name}_{Company}_{Role}",
  "generated": "{timestamp}",
  "jd_coverage": "{percentage}",
  "newly_discovered": [...],
  "reframings": [...]
}
```
3. Update experience database with new bullets for future reuse

---

## Behaviour Notes

**Starting Fresh (no resume library)**
Do NOT ask the user to provide a full resume first. Instead:
1. Confirm you're starting fresh
2. Ask for the target JD
3. Conduct a full Experience Discovery interview
4. Build the master resume from scratch, then tailor it

**Gaps in Domain Knowledge**
Never hide gaps. Flag them clearly. Provide cover letter phrasing to address them honestly.

**Reframing Titles**
Only suggest title reframing with explicit "Original → Reframed → Why" shown to user. User must approve before it goes into the resume.

**Multi-Format Output in claude.ai**
Always generate Markdown inline first. Then offer DOCX/PDF via sub-skills. If sub-skills unavailable in current session, note it and provide the MD as the deliverable.

**Claude Code vs claude.ai**
In claude.ai: filesystem operations (library save/update) are skipped. All output is provided inline or as downloadable files via present_files. Discovery and generation phases run identically.

---

## Sub-Skills Required
- `docx` skill → for .docx generation
- `pdf` skill → for .pdf conversion

---

## Example Invocations

**Single job:**
> "Here's my resume and this JD — tailor it for me."
> "Review my resume and tell me what to fix."
> "Does my resume match this senior UX designer role?"

**Multi-job:**
> "I want to apply to these 3 roles — here are the JDs. Help me tailor my resume for each."

**Fresh start:**
> "I don't have a resume yet. Help me build one for this job."

**Gap scenario:**
> "I have a 2-year employment gap — help me frame it on my resume."

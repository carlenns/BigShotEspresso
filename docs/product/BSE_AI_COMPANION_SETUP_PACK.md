# BigShotEspresso AI Companion Setup Pack

> **Purpose:** Product requirement and user-facing concept for helping new BSE users install or upload the right onboarding context into their chosen AI assistant.  
> **Status:** Product/onboarding documentation only. This is not an implementation authorization for in-app AI, paid AI calls, or intelligence engines.  
> **Authority:** Subordinate to the Project Constitution, Roadmap, ADRs, and approved implementation gates.

## Core idea

BSE should help users set up an optional AI companion as soon as they create their account, without making AI mandatory.

The user should be able to choose their AI assistant, copy a bootstrap prompt, and download or upload the appropriate BSE onboarding files. The AI companion then helps them understand what to record, how to log their first useful shot, and how to improve their setup over time.

BSE remains the system of record. The AI companion is a coach and setup assistant, not the database, not the validator, and not the owner of calculations.

## Product principle

The first-run experience should be:

> Log first. Improve setup as you go.

The app should not require a complete equipment profile before the user can log coffee. It should ask only enough to make the first log useful.

## Works Best With prompt

BSE should include a friendly “Works Best With” prompt during onboarding and in help/settings:

- Works best with a coffee scale.
- Works best when the user sets up their core equipment over time.
- Works best with an AI chat companion for onboarding, explanation, and workflow coaching.
- Free AI plans can help, but they often have provider-controlled limits such as file upload restrictions, context limits, message caps, and weaker project/context support.
- Paid AI plans usually provide the smoothest onboarding experience because they can handle longer setup conversations and more BSE context.

This prompt must not make AI feel mandatory. It should be framed as:

> BSE works on its own, but it becomes easier to learn when paired with a scale and an AI chat assistant that understands the BSE setup files.

## First-run AI setup flow

After account creation, BSE should offer:

1. **Use AI-guided setup**
   - Recommended, but optional.
   - Explains that the user can use ChatGPT, Claude, Gemini, or another assistant.

2. **Choose AI assistant**
   - ChatGPT
   - Claude
   - Gemini
   - Other / manual copy

3. **Choose context size**
   - Free / limited AI plan: provide one compact file and one short prompt.
   - Paid / project-capable AI plan: provide the fuller onboarding manual and project instructions.

4. **Use mobile-friendly action buttons**
   - Primary button: **Copy AI setup prompt**
   - Secondary button: **Download compact AI file**
   - Secondary button: **Download full AI pack**
   - Optional platform buttons: **Open ChatGPT**, **Open Claude**, **Open Gemini**
   - The flow must work cleanly on a phone as well as on a computer.
   - Do not rely on the user finding downloaded files through the iOS Files app.

5. **Copy bootstrap prompt**
   - The prompt should tell the AI how to help create the user’s BSE project, upload/install the BSE files, and begin onboarding.
   - Copy-to-clipboard must be available because many users will perform setup from mobile.

6. **Download, share, or upload BSE files**
   - Free-tier file: `BSE_AI_UPLOAD_BRIEF_FREE_TIER.md`
   - Paid-tier file: `BSE_AI_UPLOAD_MANUAL_PAID_TIER.md`
   - Optional project instructions/context files when available.
   - On mobile, BSE should prioritize share-sheet behavior where available so the user can send the file into their AI app, Notes, email, or cloud storage without hunting through Files.
   - Plain download should remain available but secondary.

7. **Show full text fallback**
   - Provide a “View full setup text” fallback so users can manually select/copy if download or share behavior is confusing.

8. **Return to BSE**
   - The user logs structured data in BSE.
   - The AI may help prepare entries, but BSE stores and validates them.

## Beginner versus power-user routing

The AI companion should not assume the user is a beginner or expert. It should ask a routing question early:

> Do you want BSE to walk you through your first few shots, or do you already have a logging workflow you want to set up?

Supported paths:

### Easy Start

For new users, dialing-in users, or users who just want to begin:

- Ask whether they have a scale.
- Ask whether they time their shots.
- Ask whether they weigh dose.
- Ask whether they weigh yield.
- Ask whether they know grinder setting and grind time.
- Let them skip equipment details.
- Encourage rating and tasting notes after the coffee cools.
- Explain that better data improves future analysis, but incomplete records are allowed.

### Power Setup

For experienced users, baristas, roasters, or power users:

- Offer full setup immediately.
- Capture machine, grinder(s), basket, scale, tamper, puck screen, and default dose.
- Capture whether they use hopper dosing, single dosing, dose cups, frozen/vacuum portions, or other workflows.
- Capture active bean and bag setup.
- Capture shot metrics they want visible by default.
- Preserve their existing terminology where possible, without inventing unsupported selectors.

### Defer Setup

For users who are busy or uncertain:

- Allow “I don’t know yet.”
- Allow “Add this later.”
- Keep shot logging usable.
- Surface gentle setup-completion prompts only when useful.

## Minimum first-shot questions

The AI companion should be able to start with only:

- Do you have a coffee scale?
- Can you measure yield?
- Can you time the shot?
- Do you know the dose?
- Do you know the grinder setting?
- Do you want to enter the coffee/bag now, or log it as unknown and fix it later?

The app should adapt the log form based on these answers.

## Bootstrap prompt requirements

The bootstrap prompt should contain enough information for the user’s chosen AI to help create/install the BSE project context.

It should tell the AI:

- BSE is a practical scientific espresso logging system.
- BSE stores the durable structured record.
- The AI should help the user create a project/custom assistant/Gem/Claude Project where possible.
- The AI should instruct the user to upload the supplied BSE files.
- The AI should ask whether the user wants Easy Start, Power Setup, or Defer Setup.
- The AI must not invent equipment specs, selector values, formulas, thresholds, relationships, or shot data.
- If the user does not know something, the AI should mark it unknown or optional.
- The AI may prepare a proposed shot record, but the user must confirm it before entry into BSE.

## Example bootstrap prompt

```text
You are helping me set up BigShotEspresso as my espresso logging and learning system.

BigShotEspresso is the system of record. It stores my structured coffee data, validates entries, and performs approved calculations. You are my optional AI companion for setup, coaching, explanation, and preparing proposed entries.

Help me create a BSE project, custom assistant, Gem, or equivalent workspace in this AI tool if the platform supports it. Tell me where to put project instructions and which BSE files to upload. If this AI tool has limited file or context support, use the compact free-tier BSE brief. If it supports larger projects or file uploads, use the fuller paid-tier BSE onboarding manual.

First ask whether I want:
1. Easy Start — walk me through my first useful shot with minimal setup.
2. Power Setup — help me configure machine, grinder, basket, scale, active bag, dose method, and logging preferences now.
3. Defer Setup — let me log coffee now and add details later.

Do not invent equipment specifications, selector values, formulas, thresholds, relationships, roast dates, grinder settings, shot data, or tasting conclusions. If I do not know something, mark it unknown or optional.

Ask whether I have a scale, whether I can measure yield, whether I time shots, whether I weigh dose, and whether I know my grinder setting. Use those answers to help me decide what to log.

When preparing a shot entry, clearly separate observed facts, user statements, calculations, assumptions, and unknowns. Ask me to confirm before I enter anything into BSE.
```

## Required user-facing files

At minimum, BSE should provide:

- A large, obvious **Copy AI setup prompt** button.
- A compact free-tier AI file with a mobile-friendly copy/share path.
- A fuller paid-tier AI onboarding manual with a mobile-friendly copy/share path.
- A “View full setup text” fallback.
- Short platform-specific instructions for ChatGPT, Claude, Gemini, and manual copy/paste.

The mobile experience is mandatory. A user should be able to set up their AI companion from a phone without needing a desktop file browser.

## Platform-specific setup guidance

### ChatGPT

- Create a Project if available.
- Put the BSE project instructions into the project instructions field.
- Upload the recommended BSE onboarding file(s).
- Start with the bootstrap prompt.

### Claude

- Create a Project if available.
- Add BSE instructions to project instructions.
- Upload the compact or full onboarding file depending on plan limits.
- Ask Claude to begin with Easy Start, Power Setup, or Defer Setup.

### Gemini

- Use a Gem or equivalent custom instruction/project feature if available.
- Upload or paste the BSE compact brief where file support is limited.
- Use the bootstrap prompt to begin setup.

### Other AI tools

- Paste the bootstrap prompt.
- Upload or paste the compact free-tier brief.
- Keep BSE as the system of record.

## Boundaries

This setup pack does not authorize:

- In-app paid AI inference.
- Predictive intelligence engines.
- DCI, OSI, HMI, BLI, MSI, or GSP implementation.
- Direct database writes by external AI.
- Unreviewed AI-generated shot records.
- AI invention of missing values.

## Launch implication

Before public launch, BSE should include an “AI Companion Setup” area in onboarding or help:

- Button: **Copy AI setup prompt**.
- Button: **Copy/share free-tier file**.
- Button: **Copy/share full onboarding file**.
- Secondary link: **Download .md file**.
- Fallback: **View full setup text**.
- Optional buttons: **Open ChatGPT**, **Open Claude**, **Open Gemini**.
- “Works Best With” explanation for scale + properly configured equipment + AI chat companion.
- Explain that paid AI plans usually provide the best experience, while free plans may have provider-controlled limits.
- Explain that AI is optional and BSE remains fully usable as the structured record keeper.

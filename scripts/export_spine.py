from pathlib import Path
import json
import re

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(
    "/Users/charlesrobinson/Documents/Claude/Projects/Women NFP/EC_Map_Item_Bank_v1.0/ECMap_v1.1_Guided_Interview_64_Spine.xlsx"
)
OUT = ROOT / "src" / "spine.ts"


THEME_BY_KERNEL = {
    "Activation": ["dimensional-framing", "narrative-intake"],
    "Sustained attention": ["dimensional-framing", "menopause-cognition"],
    "Working memory": ["dimensional-framing", "menopause-cognition"],
    "Prioritization": ["dimensional-framing"],
    "Time estimation": ["dimensional-framing"],
    "Task switching": ["dimensional-framing"],
    "Emotion under cognitive load": ["dimensional-framing", "menopause-specificity"],
    "Recovery after cognitive overload": ["menopause-specificity", "sleep-recovery"],
    "Sleep restoration": ["menopause-specificity", "sleep-recovery"],
    "Hormonal variability": ["menopause-specificity", "menopause-cognition"],
    "Energy stability": ["menopause-specificity"],
    "Stress physiology": ["dimensional-framing", "safety-referral"],
    "Glucose, appetite, and caffeine rhythm": ["menopause-specificity"],
    "Somatic burden": ["menopause-specificity"],
    "Medication, substance, and supplement effects": ["safety-referral"],
    "Recovery physiology": ["menopause-specificity", "sleep-recovery"],
}

PROMPT_OVERRIDES = {
    "C1-Disc": {
        "prompt": "Getting started is hard on ordinary rested days too, not only during poor sleep, illness, high stress, or unusually heavy demand.",
        "enterprisePrompt": "Getting started is hard on ordinary rested days too, not only during poor sleep, illness, high stress, or unusually heavy demand.",
        "privatePrompt": "Getting started is hard on ordinary rested days too, not only during poor sleep, illness, high stress, or unusually heavy demand.",
        "routing": "Both"
    },
    "C3-Sig": {
        "prompt": "In the middle of speaking or doing a task, I lose the exact word, number, instruction, or next step I was holding.",
        "enterprisePrompt": "In the middle of speaking or doing a task, I lose the exact word, number, instruction, or next step I was holding."
    },
    "C3-Cost": {
        "prompt": "This past month, losing information from mind led to concrete mistakes, repeated work, missed details, or avoidable follow-up.",
        "enterprisePrompt": "This past month, losing information from mind led to concrete mistakes, repeated work, missed details, or avoidable follow-up."
    },
    "C3-Disc": {
        "prompt": "Memory gaps show up even on rested, ordinary-demand days, not only when sleep, illness, stress, or overload would explain them.",
        "enterprisePrompt": "Memory gaps show up even on rested, ordinary-demand days, not only when sleep, illness, stress, or overload would explain them."
    },
    "C3-Mod": {
        "prompt": "A capture system only helps if I use it immediately; if I wait, details often disappear before I can record them.",
        "enterprisePrompt": "A capture system only helps if I use it immediately; if I wait, details often disappear before I can record them."
    },
    "C6-Cost": {
        "prompt": "This past month, interruptions made me lose work state enough that I missed steps, duplicated work, or left tasks unfinished.",
        "enterprisePrompt": "This past month, interruptions made me lose work state enough that I missed steps, duplicated work, or left tasks unfinished."
    },
    "C6-Disc": {
        "prompt": "Even planned switches between familiar tasks leave a restart cost before I can think clearly again.",
        "enterprisePrompt": "Even planned switches between familiar tasks leave a restart cost before I can think clearly again."
    },
    "C6-Mod": {
        "prompt": "Batching similar tasks or using a short transition ritual reduces restart cost more reliably than simply trying harder.",
        "enterprisePrompt": "Batching similar tasks or using a short transition ritual reduces restart cost more reliably than simply trying harder."
    },
    "C7-Disc": {
        "prompt": "The reaction is tied to mental demand itself; it can happen even when the situation is not emotionally important.",
        "enterprisePrompt": "The reaction is tied to mental demand itself; it can happen even when the situation is not emotionally important.",
        "privatePrompt": "The reaction is tied to mental demand itself; it can happen even when the situation is not emotionally important.",
        "routing": "Both"
    },
    "C7-Mod": {
        "prompt": "Reducing input in the moment - pausing the conversation, lowering noise, or writing the next step - helps the reaction settle.",
        "enterprisePrompt": "Reducing input in the moment - pausing the conversation, lowering noise, or writing the next step - helps the reaction settle."
    },
    "C8-Sig": {
        "prompt": "After a mentally demanding day that used to be manageable, I now need substantially more recovery before clear thinking returns.",
        "enterprisePrompt": "After a mentally demanding day that used to be manageable, I now need substantially more recovery before clear thinking returns."
    },
    "C8-Cost": {
        "prompt": "This month, recovery after cognitive demand took long enough that the next day's work, home, or relationship responsibilities suffered.",
        "enterprisePrompt": "This month, recovery after cognitive demand took long enough that the next day's work, home, or relationship responsibilities suffered."
    },
    "C8-Disc": {
        "prompt": "The recovery lag is happening after normal demands for my life, not only after unusually intense weeks.",
        "enterprisePrompt": "The recovery lag is happening after normal demands for my life, not only after unusually intense weeks."
    },
    "C8-Mod": {
        "prompt": "Planned recovery before and after demanding periods changes how long the depletion lasts.",
        "enterprisePrompt": "Planned recovery before and after demanding periods changes how long the depletion lasts."
    },
    "H1-Cost": {
        "prompt": "Within a day or two of fragmented or unrestorative sleep, my focus, mood, or judgment changes enough that I notice it.",
        "enterprisePrompt": "Within a day or two of fragmented or unrestorative sleep, my focus, mood, or judgment changes enough that I notice it."
    },
    "H1-Disc": {
        "prompt": "Sleep disruption often has a physical driver I can name, such as temperature, night sweats, body agitation, bathroom trips, alcohol, or late caffeine.",
        "enterprisePrompt": "Sleep disruption often has a physical driver I can name, not only worry or schedule.",
        "privatePrompt": "Sleep disruption often has a physical driver I can name, such as temperature, night sweats, body agitation, bathroom trips, alcohol, or late caffeine."
    },
    "H1-Mod": {
        "prompt": "When sleep is more consolidated for two or more nights, next-day focus, mood, or word-finding noticeably improves.",
        "enterprisePrompt": "When sleep is more consolidated for two or more nights, next-day focus, mood, or word-finding noticeably improves."
    },
    "H2-Sig": {
        "prompt": "My focus, mood, or energy has recognizable swings across the month or transition stage, even if I cannot predict exact days.",
        "enterprisePrompt": "My focus, mood, or energy has recognizable swings across the month or transition stage, even if I cannot predict exact days."
    },
    "H2-Cost": {
        "prompt": "This past month, a body-state swing produced a day below my usual functioning baseline.",
        "enterprisePrompt": "This past month, a body-state swing produced a day below my usual functioning baseline.",
        "privatePrompt": "This past month, a body-state swing produced a day below my usual functioning baseline."
    },
    "H2-Disc": {
        "prompt": "The swings line up more with cycle changes, vasomotor symptoms, sleep disruption, or hormone-related treatment changes than with workload alone.",
        "enterprisePrompt": "The swings line up more with body-state changes or sleep disruption than with workload alone.",
        "privatePrompt": "The swings line up more with cycle changes, vasomotor symptoms, sleep disruption, or hormone-related treatment changes than with workload alone."
    },
    "H2-Mod": {
        "prompt": "Tracking sleep, symptoms, timing, and demand helps me plan better days and lower-demand days more accurately.",
        "enterprisePrompt": "Tracking sleep, symptoms, timing, and demand helps me plan better days and lower-demand days more accurately."
    },
    "H3-Mod": {
        "prompt": "Planning demanding work inside known higher-energy windows improves outcomes more than scheduling by calendar convenience.",
        "enterprisePrompt": "Planning demanding work inside known higher-energy windows improves outcomes more than scheduling by calendar convenience."
    },
    "H4-Mod": {
        "prompt": "A concrete downshift - walking, breathing, quiet, shower, or movement - reduces body activation within about 30 minutes.",
        "enterprisePrompt": "A concrete downshift - walking, breathing, quiet, shower, or movement - reduces body activation within about 30 minutes."
    },
    "H5-Sig": {
        "prompt": "When I go too long without food, or when caffeine timing is off, my thinking changes within a few hours.",
        "enterprisePrompt": "When I go too long without food, or when caffeine timing is off, my thinking changes within a few hours."
    },
    "H5-Cost": {
        "prompt": "This month, food or caffeine timing contributed to a crash, irritability, or scattered thinking that changed what I could get done.",
        "enterprisePrompt": "This month, food or caffeine timing contributed to a crash, irritability, or scattered thinking that changed what I could get done."
    },
    "H5-Disc": {
        "prompt": "Focus or mood shifts happen even when the task is familiar; food, hydration, or caffeine timing is the clearer variable.",
        "enterprisePrompt": "Focus or mood shifts happen even when the task is familiar; food, hydration, or caffeine timing is the clearer variable."
    },
    "H5-Mod": {
        "prompt": "A predictable meal rhythm, hydration plan, or caffeine cutoff changes the afternoon pattern enough for me to notice.",
        "enterprisePrompt": "A predictable meal rhythm, hydration plan, or caffeine cutoff changes the afternoon pattern enough for me to notice."
    },
    "H6-Sig": {
        "prompt": "Body discomfort pulls attention away from thinking, such as pain, headaches, gut symptoms, temperature shifts, or tension.",
        "enterprisePrompt": "Body discomfort pulls attention away from thinking, such as pain, headaches, gut symptoms, temperature shifts, or tension."
    },
    "H6-Cost": {
        "prompt": "This month, body symptoms changed what I could attend, finish, tolerate, or recover from.",
        "enterprisePrompt": "This month, body symptoms changed what I could attend, finish, tolerate, or recover from."
    },
    "H6-Disc": {
        "prompt": "Body symptoms worsen in recognizable conditions such as poor sleep, heat, stress load, cycle or transition changes, or prolonged sitting.",
        "enterprisePrompt": "Body symptoms worsen in recognizable conditions such as poor sleep, heat, stress load, or prolonged sitting.",
        "privatePrompt": "Body symptoms worsen in recognizable conditions such as poor sleep, heat, stress load, cycle or transition changes, or prolonged sitting."
    },
    "H6-Mod": {
        "prompt": "A specific body support I can name reduces the distraction enough to improve functioning.",
        "enterprisePrompt": "A specific body support I can name reduces the distraction enough to improve functioning."
    },
    "H7-Sig": {
        "prompt": "Something I take or use clearly changes my focus, mood, sleep, or energy.",
        "enterprisePrompt": "Something I take or use clearly changes my focus, mood, sleep, or energy.",
        "privatePrompt": "Something I take or use clearly changes my focus, mood, sleep, or energy."
    },
    "H7-Cost": {
        "prompt": "This month, side effects, wearing-off, rebound, or timing effects from something I take or use disrupted my day.",
        "privatePrompt": "This month, side effects, wearing-off, rebound, or timing effects from something I take or use disrupted my day."
    },
    "H7-Disc": {
        "prompt": "The pattern seems linked to timing, missed doses, dose changes, or wearing-off periods more than to workload alone.",
        "privatePrompt": "The pattern seems linked to timing, missed doses, dose changes, or wearing-off periods more than to workload alone."
    },
    "H7-Mod": {
        "prompt": "When timing is consistent, I can tell more clearly whether the pattern improves, worsens, or stays the same.",
        "privatePrompt": "When timing is consistent, I can tell more clearly whether the pattern improves, worsens, or stays the same."
    },
    "H8-Mod": {
        "prompt": "Planned recovery before and after demanding periods changes the length of the crash.",
        "enterprisePrompt": "Planned recovery before and after demanding periods changes the length of the crash."
    }
}


def clean_text(value):
    if value is None:
        return None
    text = str(value)
    text = text.replace("\u2014", " - ")
    text = text.replace("\u2013", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def main():
    wb = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    ws = wb["v1.1_Scored_Spine"]
    headers = [cell.value for cell in ws[1]]
    items = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        record = dict(zip(headers, row))
        item_id = record.get("Item ID")
        if not item_id:
            continue
        kernel = clean_text(record["Kernel"])
        private_item = clean_text(record.get("Private-clinical item"))
        enterprise_item = clean_text(record.get("Enterprise-safe item"))
        item = {
            "id": clean_text(item_id),
            "kernelId": clean_text(item_id).split("-")[0],
            "domain": "Cognition" if clean_text(item_id).startswith("C") else "Chemistry",
            "kernel": kernel,
            "function": clean_text(record["Function"]),
            "heuristic": clean_text(record["Binary heuristic"]),
            "prompt": private_item or enterprise_item,
            "enterprisePrompt": enterprise_item,
            "privatePrompt": private_item,
            "routing": clean_text(record["Layer routing"]),
            "evidenceThemes": THEME_BY_KERNEL.get(kernel, ["dimensional-framing"]),
        }
        item.update(PROMPT_OVERRIDES.get(item["id"], {}))
        items.append(item)

    ts = (
        "// Generated by scripts/export_spine.py from the EC Map v1.1 64-item spine.\n"
        "// Do not edit item text here; update the source workbook and rerun npm run import:spine.\n\n"
        'import { SpineItem, ResponseScaleOption, ContextPrompt, NarrativePrompt, SafetyItem } from "./types.js";\n\n'
        f"export const SPINE_ITEMS: SpineItem[] = {json.dumps(items, indent=2)};\n\n"
        "export const RESPONSE_SCALE: ResponseScaleOption[] = [\n"
        "  { value: 0, label: 'Never or almost never' },\n"
        "  { value: 1, label: 'Rarely' },\n"
        "  { value: 2, label: 'Sometimes' },\n"
        "  { value: 3, label: 'Often' },\n"
        "  { value: 4, label: 'Very often or almost always' }\n"
        "];\n\n"
        "export const CONTEXT_PROMPTS: ContextPrompt[] = [\n"
        "  { id: 'role_type', label: 'Current work or role pattern', type: 'choice', options: ['Heavy-output knowledge work', 'Leadership or management', 'Clinical/caregiving/front-line', 'Mixed creative and operational', 'Self-employed or portfolio', 'Out of paid work currently', 'Other'] },\n"
        "  { id: 'meeting_load', label: 'Weekly meeting and interruption load', type: 'choice', options: ['Under 5 hours', '5 to 15 hours', '15 to 25 hours', '25+ hours'] },\n"
        "  { id: 'sleep_stability', label: 'Sleep and wake timing across a typical week', type: 'choice', options: ['Very consistent', 'Mostly consistent', 'Variable', 'Highly disrupted'] },\n"
        "  { id: 'transition_context', label: 'Hormonal-transition context', type: 'choice', options: ['Cycling regularly', 'Cycling irregularly', 'Perimenopausal', 'Postmenopausal', 'On hormonal contraception', 'On menopausal hormone therapy', 'Prefer not to say'] },\n"
        "  { id: 'lifelong_attention_pattern', label: 'Attention and organization before midlife', type: 'choice', options: ['Longstanding since childhood or teen years', 'Present for many adult years', 'Mainly changed in midlife', 'Mainly appears under high stress', 'Unsure'] },\n"
        "  { id: 'setting_spread', label: 'Where the pattern shows up', type: 'choice', options: ['Across work, home, and relationships', 'Mostly at work', 'Mostly at home', 'Mostly during hormonal or sleep disruption', 'Only in unusual stress', 'Unsure'] },\n"
        "  { id: 'timeline', label: 'Compared with five years ago, current functional capacity is...', type: 'choice', options: ['Clearly better', 'About the same', 'Somewhat worse', 'Significantly worse', 'Has fluctuated'] }\n"
        "];\n\n"
        "export const NARRATIVE_PROMPTS: NarrativePrompt[] = [\n"
        "  { id: 'compensating_for', label: 'What are you most tired of compensating for?' },\n"
        "  { id: 'public_private_cost', label: 'Where do you function well publicly but pay for it privately?' },\n"
        "  { id: 'capacity_shift', label: 'If next month felt 25% easier to function in, what would change first?' },\n"
        "  { id: 'what_helped', label: 'What have you already tried that helped, even briefly?' }\n"
        "];\n\n"
        "export const SAFETY_ITEMS: SafetyItem[] = [\n"
        "  { id: 'S1', prompt: 'My sleep has been severely reduced lately, but my energy or mood has noticeably increased.', flag: 'Possible mania or hypomania pattern' },\n"
        "  { id: 'S2', prompt: 'My cognition has changed suddenly, severely, or in a way that feels medically unusual.', flag: 'Sudden or medically unusual cognitive change' },\n"
        "  { id: 'S3', prompt: 'Something I take or use is starting to feel hard to control, risky, or concerning to me or someone close to me.', flag: 'Substance, medication, or supplement concern' },\n"
        "  { id: 'S4', prompt: 'My functioning has declined to the point that my safety, basic self-care, or stability is at risk.', flag: 'Safety, self-care, or stability concern' }\n"
        "];\n"
    )
    OUT.write_text(ts, encoding="utf-8")
    print(f"Wrote {len(items)} items to {OUT}")


if __name__ == "__main__":
    main()

"""Build the printable question bank from the site's single content source.

Requires reportlab. Run from any directory:
    python3 scripts/build-practice-pdf.py
The existing legacy packs are not modified.
"""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "app/src/resources/questionData.json").read_text())
OUTPUT = ROOT / "resources/Practice-Questions-Reviewed.pdf"
INK = colors.HexColor("#263c38")
MUTED = colors.HexColor("#4e5c58")
ACCENT = colors.HexColor("#8c613c")
RULE = colors.HexColor("#d8d8ce")
STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle("PackTitle", fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=INK, spaceAfter=9))
STYLES.add(ParagraphStyle("PackDeck", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=MUTED, spaceAfter=8))
STYLES.add(ParagraphStyle("TopicTitle", fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=12, spaceAfter=8))
STYLES.add(ParagraphStyle("Question", fontName="Helvetica", fontSize=10.1, leading=14.5, textColor=INK, leftIndent=20, firstLineIndent=-20, spaceAfter=9))
STYLES.add(ParagraphStyle("Checklist", fontName="Helvetica", fontSize=9.3, leading=13.2, textColor=MUTED, spaceAfter=4))
STYLES.add(ParagraphStyle("NoteHeading", fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=ACCENT, spaceBefore=10, spaceAfter=5))


def text(value):
    # Core PDF fonts support these punctuation substitutions consistently.
    return escape(value.replace("’", "'").replace("“", '"').replace("”", '"').replace("—", "-").replace("–", "-"))


def footer(canvas, doc):
    width, _ = A4
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.line(44, 45, width - 44, 45)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(44, 31, "Sapere aude | Original practice prompts | September 2026")
    canvas.drawRightString(width - 44, 31, f"{doc.page} / 3")
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, rightMargin=44, leftMargin=44, topMargin=40, bottomMargin=60,
                            title=DATA["title"], author="Sapere aude philosophy resources", subject="Original philosophy and ethics study prompts; unofficial")
    story = []
    number = 0
    for page in range(3):
        if page:
            story.append(PageBreak())
        story.append(Paragraph("Philosophy &amp; Ethics" if page == 0 else "Practice questions", STYLES["PackTitle"]))
        if page == 0:
            story.append(Paragraph("27 questions for explanation, comparison, application, and evaluation.", STYLES["PackDeck"]))
            story.append(Paragraph(text(DATA["notice"]), STYLES["PackDeck"]))
        else:
            story.append(Paragraph("Develop a reasoned answer. A different conclusion can be strong if it is well supported.", STYLES["PackDeck"]))
        for topic in DATA["topics"][page * 3:page * 3 + 3]:
            block = [Paragraph(text(topic["label"]), STYLES["TopicTitle"])]
            for question in topic["questions"]:
                number += 1
                block.append(Paragraph(f'<b>{number:02d}.</b> {text(question["prompt"])}', STYLES["Question"]))
            story.append(KeepTogether(block))
        if page == 0:
            story.append(Paragraph("A productive first step", STYLES["NoteHeading"]))
            story.append(Paragraph("Define the dispute. Write a provisional judgement and one reason. Test the strongest objection; refine or change your position if it succeeds. For timed work, follow your teacher's timing and assessment guidance.", STYLES["Checklist"]))
        elif page == 1:
            story.append(Paragraph("Handle applied questions carefully", STYLES["NoteHeading"]))
            story.append(Paragraph("Define the relevant practice and distinguish principles from assumptions about a case. These prompts support philosophical analysis, not medical or legal advice. Avoid treating legality, popularity, or sincerity as proof of moral rightness.", STYLES["Checklist"]))
        else:
            story.append(Paragraph("Self-review: reasons, not a grade calculator", STYLES["NoteHeading"]))
            for item in DATA["checklist"]:
                head, tail = item.split(":", 1)
                story.append(Paragraph(f'<b>{text(head)}:</b>{text(tail)}', STYLES["Checklist"]))
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    build()

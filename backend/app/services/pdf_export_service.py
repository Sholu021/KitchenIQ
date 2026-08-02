from io import BytesIO

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
)
from reportlab.lib.styles import getSampleStyleSheet


def generate_pdf(title: str, data: dict):

    buffer = BytesIO()

    doc = SimpleDocTemplate(buffer)

    styles = getSampleStyleSheet()

    story = []

    story.append(
        Paragraph(title, styles["Heading1"])
    )

    for key, value in data.items():

        story.append(
            Paragraph(
                f"<b>{key}</b>: {value}",
                styles["BodyText"],
            )
        )

    doc.build(story)

    buffer.seek(0)

    return buffer
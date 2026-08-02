from io import BytesIO

from openpyxl import Workbook


def generate_excel(
    title: str,
    rows: list,
):

    wb = Workbook()

    ws = wb.active

    ws.title = title

    if rows:

        headers = list(rows[0].keys())

        ws.append(headers)

        for row in rows:

            ws.append(
                list(row.values())
            )

    buffer = BytesIO()

    wb.save(buffer)

    buffer.seek(0)

    return buffer
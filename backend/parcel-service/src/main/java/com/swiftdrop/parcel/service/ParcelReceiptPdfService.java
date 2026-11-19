
package com.swiftdrop.parcel.service;

import com.swiftdrop.parcel.dto.ParcelResponse;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
public class ParcelReceiptPdfService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm 'UTC'")
                    .withZone(ZoneOffset.UTC);

    public byte[] generateReceipt(
            ParcelResponse parcel,
            String pickupZoneName,
            String dropoffZoneName
    ) {

        try (
                PDDocument document = new PDDocument();
                ByteArrayOutputStream output = new ByteArrayOutputStream()
        ) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDType1Font boldFont =
                    new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDType1Font regularFont =
                    new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            try (PDPageContentStream content =
                         new PDPageContentStream(document, page)) {

                float x = 50;
                float y = 780;

                // Company branding
                writeText(content, boldFont, 25, "SwiftDrop", x, y);

                y -= 30;

                writeText(
                        content,
                        boldFont,
                        16,
                        "DELIVERY BOOKING RECEIPT",
                        x,
                        y
                );

                y -= 20;

                drawDivider(content, y);
                y -= 30;

                // Booking information
                writeText(content, boldFont, 13, "BOOKING INFORMATION", x, y);
                y -= 25;

                y = writeField(content, boldFont, regularFont,
                        "Parcel ID", parcel.parcelId().toString(), x, y);

                y = writeField(content, boldFont, regularFont,
                        "Tracking Number", parcel.trackingNumber(), x, y);

                y = writeField(content, boldFont, regularFont,
                        "Booking Date", DATE_FORMAT.format(parcel.createdAt()), x, y);

                y = writeField(content, boldFont, regularFont,
                        "Current Status", parcel.currentStatus(), x, y);

                y -= 10;

                drawDivider(content, y);
                y -= 30;

                // Customer information
                writeText(content, boldFont, 13, "CUSTOMER INFORMATION", x, y);
                y -= 25;

                if (parcel.customerId() != null) {
                    y = writeField(content, boldFont, regularFont,
                            "Customer ID", parcel.customerId().toString(), x, y);
                } else if (parcel.merchantId() != null) {
                    y = writeField(content, boldFont, regularFont,
                            "Merchant ID", parcel.merchantId().toString(), x, y);
                }

                y -= 10;

                drawDivider(content, y);
                y -= 30;

                // Pickup information
                writeText(content, boldFont, 13, "PICKUP DETAILS", x, y);
                y -= 25;

                y = writeWrappedField(content, boldFont, regularFont,
                        "Pickup Address", parcel.pickupAddress(), x, y);

                y = writeField(content, boldFont, regularFont,
                        "Pickup Zone", pickupZoneName, x, y);

                y -= 10;

                // Delivery information
                writeText(content, boldFont, 13, "DELIVERY DETAILS", x, y);
                y -= 25;

                y = writeWrappedField(content, boldFont, regularFont,
                        "Delivery Address", parcel.dropoffAddress(), x, y);

                y = writeField(content, boldFont, regularFont,
                        "Delivery Zone", dropoffZoneName, x, y);

                y -= 10;

                drawDivider(content, y);
                y -= 30;

                // Parcel and payment information
                writeText(content, boldFont, 13, "PARCEL & PAYMENT DETAILS", x, y);
                y -= 25;

                y = writeField(content, boldFont, regularFont,
                        "Parcel Weight", parcel.weightKg() + " kg", x, y);

                y = writeField(content, boldFont, regularFont,
                        "Estimated Delivery Fee",
                        "LKR " + parcel.estimatedFee(), x, y);

                y -= 35;

                drawDivider(content, y);
                y -= 30;

                // Footer
                writeText(
                        content,
                        regularFont,
                        10,
                        "Thank you for choosing SwiftDrop!",
                        x,
                        y
                );

                y -= 18;

                writeText(
                        content,
                        regularFont,
                        9,
                        "Please keep this receipt for your reference.",
                        x,
                        y
                );
            }

            document.save(output);

            return output.toByteArray();

        } catch (IOException exception) {
            throw new IllegalStateException(
                    "Unable to generate parcel receipt PDF",
                    exception
            );
        }
    }

    private float writeField(
            PDPageContentStream content,
            PDType1Font boldFont,
            PDType1Font regularFont,
            String label,
            String value,
            float x,
            float y
    ) throws IOException {

        writeText(content, boldFont, 11, label + ":", x, y);

        writeText(
                content,
                regularFont,
                11,
                sanitize(value),
                x + 145,
                y
        );

        return y - 20;
    }

    private float writeWrappedField(
            PDPageContentStream content,
            PDType1Font boldFont,
            PDType1Font regularFont,
            String label,
            String value,
            float x,
            float y
    ) throws IOException {

        writeText(content, boldFont, 11, label + ":", x, y);

        String safeValue = sanitize(value);
        String[] words = safeValue.split("\\s+");

        StringBuilder line = new StringBuilder();

        for (String word : words) {

            if (line.length() + word.length() > 55) {

                writeText(
                        content,
                        regularFont,
                        11,
                        line.toString(),
                        x + 145,
                        y
                );

                y -= 16;
                line = new StringBuilder();
            }

            if (line.length() > 0) {
                line.append(" ");
            }

            line.append(word);
        }

        if (line.length() > 0) {
            writeText(
                    content,
                    regularFont,
                    11,
                    line.toString(),
                    x + 145,
                    y
            );
        }

        return y - 20;
    }

    private void writeText(
            PDPageContentStream content,
            PDType1Font font,
            float fontSize,
            String text,
            float x,
            float y
    ) throws IOException {

        content.beginText();
        content.setFont(font, fontSize);
        content.newLineAtOffset(x, y);
        content.showText(sanitize(text));
        content.endText();
    }

    private void drawDivider(
            PDPageContentStream content,
            float y
    ) throws IOException {

        content.moveTo(50, y);
        content.lineTo(545, y);
        content.stroke();
    }

    private String sanitize(String value) {

        if (value == null) {
            return "-";
        }

        // Standard PDF fonts support a limited character set.
        return value.replaceAll("[^\\x20-\\x7E]", "?");
    }
}

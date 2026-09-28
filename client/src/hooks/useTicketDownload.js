import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function useTicketDownload() {
    const [downloading, setDownloading] = useState(false);

    const downloadPng = useCallback(async(element, filename) => {
        if (!element) return;
        setDownloading(true);
        try {
            if (document.fonts) {
                await document.fonts.ready;
            }
            const dataUrl = await toPng(element, {
                pixelRatio: 2, // 2x for retina clarity
                cacheBust: true,
                backgroundColor: '#ffffff',
                style: {
                    transform: 'scale(1)', // ensure no CSS transform breaks capture
                    transformOrigin: 'top left',
                },
            });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${filename}.png`;
            a.click();
        } catch (err) {
            console.error('PNG download failed', err);
        } finally {
            setDownloading(false);
        }
    }, []);

    const downloadPdf = useCallback(async(element, filename) => {
        if (!element) return;
        setDownloading(true);
        try {
            if (document.fonts) {
                await document.fonts.ready;
            }
            const dataUrl = await toPng(element, {
                pixelRatio: 2,
                cacheBust: true,
                backgroundColor: '#ffffff',
            });

            // A4 landscape: 297 x 210 mm
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // Get image aspect ratio
            const img = new Image();
            img.src = dataUrl;
            await new Promise((r) => (img.onload = r));

            const imgW = img.width;
            const imgH = img.height;
            const ratio = imgW / imgH;

            // Fit to page with 10mm margin
            const maxW = pageW - 20;
            const maxH = pageH - 20;
            let w = maxW;
            let h = w / ratio;
            if (h > maxH) {
                h = maxH;
                w = h * ratio;
            }

            const x = (pageW - w) / 2;
            const y = (pageH - h) / 2;

            pdf.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'FAST');
            pdf.save(`${filename}.pdf`);
        } catch (err) {
            console.error('PDF download failed', err);
        } finally {
            setDownloading(false);
        }
    }, []);

    const downloadQrOnly = useCallback(async(text, filename) => {
        if (!text) return;
        setDownloading(true);
        try {
            const dataUrl = await QRCode.toDataURL(text, { width: 400, margin: 2 });
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${filename}-qr.png`;
            a.click();
        } catch (err) {
            console.error('QR download failed', err);
        } finally {
            setDownloading(false);
        }
    }, []);

    return { downloadPng, downloadPdf, downloadQrOnly, downloading };
}
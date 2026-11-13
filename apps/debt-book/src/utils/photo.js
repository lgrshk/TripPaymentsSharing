const MAX_SIZE = 160;
const JPEG_QUALITY = 0.72;

/**
 * Compress an image file to a small JPEG data URL suitable for Firestore + dashboard thumbnails.
 */
export function compressImageFile(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
            reject(new Error("Оберіть файл зображення"));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            try {
                const { width, height } = fitWithin(img.width, img.height, MAX_SIZE);
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
                URL.revokeObjectURL(objectUrl);
                resolve(dataUrl);
            } catch (err) {
                URL.revokeObjectURL(objectUrl);
                reject(err);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Не вдалося завантажити зображення"));
        };

        img.src = objectUrl;
    });
}

function fitWithin(w, h, max) {
    if (w <= max && h <= max) return { width: w, height: h };
    const ratio = Math.min(max / w, max / h);
    return {
        width: Math.max(1, Math.round(w * ratio)),
        height: Math.max(1, Math.round(h * ratio)),
    };
}

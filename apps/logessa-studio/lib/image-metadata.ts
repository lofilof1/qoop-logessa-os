// Read dimensions from the actual file header, independent of browser-supplied metadata.
export function imageMetadata(data: ArrayBuffer) {
    const b = new Uint8Array(data), v = new DataView(data);
    let width = 0, height = 0, mime = "";
    if (b.length >= 24 && b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71 && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10 && v.getUint32(12) === 0x49484452) {
        mime = "image/png";
        width = v.getUint32(16);
        height = v.getUint32(20);
    }
    else if (b.length > 12 && b[0] === 255 && b[1] === 216) {
        mime = "image/jpeg";
        let p = 2;
        while (p + 8 < b.length) {
            if (b[p++] !== 255)
                continue;
            while (b[p] === 255)
                p++;
            const marker = b[p++];
            if (marker === 0xd9 || marker === 0xda)
                break;
            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7))
                continue;
            const len = v.getUint16(p);
            if (len < 2 || p + len > b.length)
                break;
            if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
                height = v.getUint16(p + 3);
                width = v.getUint16(p + 5);
                break;
            }
            p += len;
        }
    }
    else if (b.length >= 30 && v.getUint32(0) === 0x52494646 && v.getUint32(8) === 0x57454250) {
        mime = "image/webp";
        const tag = v.getUint32(12);
        if (tag === 0x56503858) {
            width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
            height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
        }
        else if (tag === 0x56503820 && b[23] === 157 && b[24] === 1 && b[25] === 42) {
            width = v.getUint16(26, true) & 0x3fff;
            height = v.getUint16(28, true) & 0x3fff;
        }
        else if (tag === 0x5650384c && b[20] === 47) {
            width = 1 + (((b[22] & 63) << 8) | b[21]);
            height = 1 + (((b[24] & 15) << 10) | (b[23] << 2) | ((b[22] & 192) >> 6));
        }
    }
    if (!width || !height || width > 100000 || height > 100000 || width * height > 100000000)
        return null;
    return { width, height, mime };
}

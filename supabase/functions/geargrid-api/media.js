const mediaTypes = {
  'image/png': ['png', [137, 80, 78, 71, 13, 10, 26, 10]],
  'image/jpeg': ['jpg', [255, 216, 255]],
  'image/webp': ['webp', [82, 73, 70, 70]],
  'image/gif': ['gif', [71, 73, 70, 56]],
  'image/x-icon': ['ico', [0, 0, 1, 0]],
};

export async function uploadMedia(url, key, file) {
  const type = file?.type === 'image/vnd.microsoft.icon' ? 'image/x-icon' : file?.type;
  const format = mediaTypes[type];
  if (!format || !file?.size || file.size > 3 * 1024 * 1024)
    throw new Error('Choose a PNG, JPG, WebP, GIF or ICO image up to 3 MB');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const [extension, signature] = format;
  if (!signature.every((byte, index) => bytes[index] === byte)
    || (type === 'image/webp' && String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP'))
    throw new Error('The image format does not match the file');
  const path = 'geargrid-media/' + crypto.randomUUID() + '.' + extension;
  const headers = { apikey: key, 'Content-Type': type, 'Cache-Control': 'max-age=31536000' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const result = await fetch(new URL('/storage/v1/object/' + path, url), {
    method: 'POST', headers, body: bytes,
  }).catch(() => null);
  if (!result?.ok) throw new Error('Media upload failed. Try again');
  return { url: new URL('/storage/v1/object/public/' + path, url).href };
}

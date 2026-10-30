export function skuFromFilename(filename: string) {
  const text = filename.replace(/\.[^.]+$/, "").toUpperCase();
  const matches = [
    ...text.matchAll(
      /(?:^|[^A-Z0-9])((?:[A-Z]{2,5}-?\d{3,8}(?:-[A-Z0-9]{1,6})?|(?:QOOP|LOGESSA)-[A-Z0-9]{6,12}))(?=$|[^A-Z0-9])/g,
    ),
  ].map((m) => m[1]);
  const unique = [...new Set(matches)];
  if (unique.length > 1)
    throw Error("Dosya adında birden fazla SKU var; kullanılacak kodu seç.");
  return unique[0] || null;
}

// User-supplied commercial copy, approved 2026-10-28. Not a production-PPI profile.
export const descriptionStandardVersion='qoop-2026-10-28' as const;
export function standardDescriptionBodies(product:string){return {
Size:[product==='wall mural'?'• This is a wall mural: one complete artwork that covers your whole wall.':'• Choose the wallpaper size closest to your wall in the Size menu (width x height, in inches).',...(product==='wall mural'?['• Choose the size closest to your wall in the Size menu (width x height, in inches).']:[]),"• Your mural arrives in numbered vertical panels, ready to hang in order. Each panel is 24 in wide: 23 in of design plus an overlap edge, so the artwork continues seamlessly across your wall.".replace('Your mural',product==='wall mural'?'Your mural':'Your wallpaper'),"• Can't find a size that fits? Send us your wall width and height, and our team can adjust this design to fit your measurements at no extra cost."].join('\n'),
'Material & installation':`Choose your material in the Material menu:
• Textured Traditional: textured matte wallpaper hung with wallpaper paste (paste not included). Our best choice for rough or textured walls, and also suitable for smooth walls.
• Textured Peel and Stick: self-adhesive with a textured matte finish. Repositionable while you install and removable, ideal for renters. Best on smooth, painted walls. Cannot be reused once removed.
• 3M Vinyl Smooth: smooth, self-adhesive 3M vinyl with sharp print detail. Also works on glass, wood and plastic. Needs a perfectly smooth surface. Cannot be reused once removed.
Printed in the USA with water-based HP Latex inks (UL GREENGUARD Gold certified inks). Wipe clean with a soft, damp cloth; suitable for humid rooms such as bathrooms and kitchens.
In the box: your numbered panels, an application tool kit (felt-edged smoother, utility knife, masking tape) and a step-by-step installation guide.
Before you install: wait at least 15 days on freshly painted walls, and make sure the surface is clean, dry and dust-free. The smoother your wall, the better the result.`,
Samples:`Not sure about the colour, texture or material? Order a 15 x 20 inch sample in the material you like. You receive the full view of this design, scaled to the sample size, printed on your chosen material. Samples are sent in a special sample envelope.`,
'Production & shipping':`• Processing time: 5-7 business days. Every order is printed after you place it and checked before it ships.
• Made in the USA.
• Arrived damaged or with a print fault? Send us clear photos; once confirmed, we send a free replacement.
• Wallpapers are printed to order, so returns can't be accepted once applied to the wall. Please check your order before installing.`
};}

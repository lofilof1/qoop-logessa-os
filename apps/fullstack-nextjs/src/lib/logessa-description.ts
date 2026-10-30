export const logessaDescriptionVersion='logessa-2026-10-29' as const;
export function logessaDescription(opening:string,details:string,ideas:string,product:string,title:string,design:string,mockups:string){
 const mural=product==='wall mural',item=mural?'wallpaper mural':'wallpaper';
 const sections=[
 {heading:'📏 SIZE & CUSTOM ORDERS',body:`This listing is for ${mural?'one complete wallpaper mural':'wallpaper'} in your selected size.

• Select your wall dimensions from the Size menu (width × height, in inches).
• Your ${mural?'mural':'wallpaper'} arrives in numbered vertical panels, ready to install in order.
• Each panel is 24 inches wide, including 23 inches of visible design and a 1-inch overlap.
• The overlap allows the artwork to continue seamlessly across your wall.

Quantity 1 = ${mural?'One Complete Wall Mural':'Wallpaper for Your Wall'} in Your Selected Size.

Need a custom size? Send us your wall width and height. We can adjust the design to your measurements with no additional customization fee. The ${mural?'mural':'wallpaper'} price depends on the final size.

Please double-check your measurements before ordering.`},
 {heading:'✨ CHOOSE YOUR WALLPAPER MATERIAL',body:`Select your preferred material from the Material menu.

1. Traditional Luxury Textured Fabric | Paste Required

• Textured fabric surface with non-woven backing
• Excellent dimensional stability
• Designed for long-term installations
• Requires wallpaper paste (not included)

2. Luxury Textured Fabric | Peel & Stick

• Premium textured fabric surface
• Self-adhesive application; no paste required
• Repositionable during installation

3. 3M Smooth Vinyl | Peel & Stick

• Smooth, contemporary finish
• Self-adhesive 3M vinyl
• Controltac air-release technology helps reduce bubbles and wrinkles
• Also suitable for smooth glass, cabinets, doors, and furniture

All three materials are made with American-made materials and printed to order in Houston, Texas, using HP Latex inks that are UL GREENGUARD Gold certified for low chemical emissions.`},
 {heading:"📦 WHAT'S INCLUDED",body:`• Complete ${item} in numbered vertical panels
• Top and bottom orientation markings
• Utility knife for trimming
• Smoothing tool for installation

Wallpaper paste is not included.

For best results, we recommend installation on a smooth surface.`},
 {heading:'🎨 WALLPAPER SAMPLES',body:`Order a 20 × 15 inch sample to see the colors, print quality, and material texture before purchasing your full ${mural?'mural':'wallpaper'}.

Colors may vary slightly depending on screen settings, room lighting, and material selection.

Sample orders do not include installation tools.`},
 {heading:'🏡 PERFECT FOR',body:ideas},
 {heading:'🚚 PRODUCTION & SHIPPING',body:`Each ${item} is printed to order in Houston, Texas, USA.

• Production: 3–7 business days
• US shipping: 2–6 business days

Shipping times are estimates and may vary.`},
 {heading:'↩️ RETURNS & ORDER SUPPORT',body:`All LOGESSA wallpapers are made to order. We do not accept returns or exchanges for change of mind or incorrect measurements selected by the buyer.

If your order arrives damaged, has a printing defect, or does not match your order, please contact us with clear photos. We will help resolve the issue in accordance with applicable Etsy policies.`},
 {heading:'🎨 DESIGN & MOCKUP DISCLOSURE',body:design+'\n\n'+mockups},
 {heading:'💌 NEED HELP?',body:`Have questions about sizing, materials, or your order? Send us a message. We're happy to help!

Thank you for choosing LOGESSA.`}
 ].map(s=>({...s,state:s.body.trim()?'READY' as const:'MISSING' as const}));
 const cleanOpening=opening.replace(/^.*\|\s*(?:LOGESSA|QOOP)\s*\n*/i,'').replace(/LOGESSA(?: OS)?/gi,'LOGESSA').trim();
 const intro=[title?title.replace(/\s*\|\s*LOGESSA\s*$/i,'')+' | LOGESSA':'',cleanOpening,details?`Design details:\n${details}`:''].filter(Boolean).join('\n\n');
 return{description:[intro,...sections.map(s=>s.heading+'\n\n'+s.body)].filter(Boolean).join('\n\n'),sections,missing:sections.filter(s=>s.state==='MISSING').map(s=>s.heading)};
}

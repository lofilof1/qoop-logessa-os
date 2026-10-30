// Remove product-presentation language without changing the chosen artwork subjects.
export function midjourneyArtwork(text:string,tile:boolean){
 return text
 .replace(/\b(?:no|without|avoid|exclude)\s+(?:a\s+)?(?:(?:room|interior|product|wall)\s+)?mockups?\b/gi,'')
 .replace(/\bWall target\s+[\d.,]+\s*[×x]\s*[\d.,]+\s*cm\.?/gi,'')
 .replace(/Derive adjacent panels by slicing a single master image, not by generating separate panels\./gi,'Keep one uninterrupted master composition in a single flat image.')
 .replace(/Adjacent panels must come from the same master; separately generated scenes are not guaranteed to join\./gi,'Keep one uninterrupted master composition in a single flat image.')
 .replace(/\b(?:wallpaper mural|wall mural|wallpaper|mural)\b/gi,tile?'decorative pattern':'artwork')
 .replace(/\b(?:for|on) (?:a |the |your )?(?:feature wall|accent wall|living room wall|bedroom wall|nursery wall)\b/gi,'')
 .replace(/\b(?:installed on|applied to|displayed on|hanging on) (?:a |the |your )?wall\b/gi,'')
 .replace(/\b(?:room mockup|interior mockup|product mockup|wall mockup)\b/gi,'flat artwork')
 .replace(/\s{2,}/g,' ').trim();
}
export function midjourneyPresentation(tile:boolean){return tile?'Flat 2D decorative repeat artwork, a single edge-to-edge pattern tile, entire image filled with the illustration, direct digital artwork.':'Flat 2D original artwork, one uninterrupted edge-to-edge image, the illustration itself fills the entire canvas. Painted scene depth stays within the artwork.';}

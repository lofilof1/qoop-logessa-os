export type ContinuityContext = {
  mode?: "pattern" | "continuous" | "mural" | "motif" | "edit";
  repeat?: string;
};
export function continuityDirection(
  tile: boolean,
  context: ContinuityContext = {},
) {
  if (tile)
    return [
      "Seamless four-edge repeat: left and right boundaries must match at the same vertical coordinates; top and bottom must match at the same horizontal coordinates. Any motif crossing a boundary continues on the opposite boundary with identical position, orientation, scale, contour and stroke weight. Keep all four corners compatible in diagonal repeats.",
      "Maintain identical background color, lighting, paint texture, motif density and spacing through every join. Distribute motifs across the full tile, including boundaries; no empty edge band, border, vignette, visible grid or isolated central emblem. Show one tile, not a checkerboard preview.",
      context.repeat === "Half-drop"
        ? "Encode the half-drop layout in a rectangular two-column supertile: adjacent columns are offset by half the repeat height; the complete supertile must still match all four opposite edges. Do not treat a single offset column as a straight repeat."
        : context.repeat === "Brick"
          ? "Encode the brick layout in a rectangular two-row supertile: adjacent rows are offset by half the repeat width; the complete supertile must still match all four opposite edges."
          : "Use a straight rectangular edge-matching tile; visual motif staggering must not change the boundary alignment.",
    ].join(" ");
  if (context.mode === "continuous")
    return "Horizontal mural continuity: match the left and right boundaries at identical heights, continuing edge-crossing forms and contours while preserving horizon level, depth, scale, sky and ground colors, lighting and paint texture. Keep sky above and ground below; do not tile vertically. Use a single cohesive scenic master with locally balanced crop zones and no indispensable central focal point. Adjacent panels must come from the same master; separately generated scenes are not guaranteed to join.";
  if (context.mode === "mural")
    return "Preserve an uninterrupted horizon, forms, perspective, palette and lighting across the whole mural. Derive adjacent panels by slicing a single master image, not by generating separate panels. This scene does not require its far left and right edges to loop together.";
  return "";
}

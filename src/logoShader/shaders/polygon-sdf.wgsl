// Generalized signed-distance-to-outline test, replacing the triangle-only
// closed-form SDF from the original example. `segments` is an arbitrary flat
// list of line segments (possibly several disjoint closed loops, flattened
// from SVG paths) and "inside" is decided with the standard even-odd
// crossing rule, which handles nested loops (letterform counters) correctly
// regardless of winding direction.
fn segment_distance(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  return length(pa - ba * h);
}

export fn sdf_polygon(p: vec2f, segs: ptr<storage, array<vec4f>, read>, count: u32) -> f32 {
  var min_dist = 1e30;
  var crossings = 0u;
  for (var i = 0u; i < count; i = i + 1u) {
    let seg = (*segs)[i];
    let a = seg.xy;
    let b = seg.zw;
    min_dist = min(min_dist, segment_distance(p, a, b));
    if ((a.y > p.y) != (b.y > p.y)) {
      let x_intersect = a.x + (p.y - a.y) / (b.y - a.y) * (b.x - a.x);
      if (p.x < x_intersect) {
        crossings = crossings + 1u;
      }
    }
  }
  let inside = (crossings % 2u) == 1u;
  return select(min_dist, -min_dist, inside);
}

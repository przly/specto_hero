// Replaces the original example's analytic ray-vs-triangle-edge raycast (which only
// works in closed form for exactly 3 straight edges) with a direct point-light sum
// over every LED emitter. This is the deliberate simplification for an arbitrary,
// many-vertex, multi-contour outline: no occlusion test, just distance-weighted
// falloff per LED, same falloff shape as the original (inverse-power + Beer-Lambert
// absorption) so the visual language stays consistent.
struct Config {
  target_info: vec4f,
  tunables: vec4f,
  params: vec4f,
};
struct Led {
  pos_brightness: vec4f,
  color: vec4f,
};
@group(0) @binding(0) var<uniform> cfg: Config;
@group(0) @binding(1) var<storage, read> leds: array<Led>;

struct VSOut { @builtin(position) pos: vec4f };

@vertex fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  var out: VSOut;
  out.pos = vec4f(p[vi], 0.0, 1.0);
  return out;
}

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let target_scale = max(cfg.target_info.x, 1e-4);
  let sim_pos = in.pos.xy / target_scale;

  var sum = vec3f(0.0);
  let n = arrayLength(&leds);
  for (var i = 0u; i < n; i = i + 1u) {
    let led = leds[i];
    let n01 = clamp(led.pos_brightness.z, 0.0, 1.0);
    let intensity = mix(cfg.tunables.y, cfg.tunables.z, n01) * cfg.tunables.x;
    if (intensity <= 1e-4) {
      continue;
    }
    let dist = distance(sim_pos, led.pos_brightness.xy);
    let falloff_dist = dist * cfg.target_info.y;
    let weight = pow(max(falloff_dist, 1.0), -cfg.params.y) * exp(-cfg.params.x * dist);
    sum += led.color.rgb * intensity * weight;
  }

  let radiance = sum * cfg.params.z;
  return vec4f(radiance, 1.0);
}

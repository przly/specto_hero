import { sdf_polygon } from "./polygon-sdf.wgsl";

struct Config {
  resolution: vec2f,
  tunables: vec4f,
  led_clip: vec4f,
};
struct Led {
  pos_brightness: vec4f,
  color: vec4f,
};
@group(0) @binding(0) var<uniform> cfg: Config;
@group(0) @binding(1) var<storage, read> leds: array<Led>;
@group(0) @binding(2) var<storage, read> segments: array<vec4f>;

struct VSIn {
  @location(0) position: vec2f,
  @location(1) led_index: f32,
};
struct VSOut {
  @builtin(position) pos: vec4f,
  @location(0) led_index: f32,
  @location(1) sim_pos: vec2f,
};

@vertex fn vs_main(in: VSIn) -> VSOut {
  var out: VSOut;
  let clip = (in.position / cfg.resolution) * vec2f(2.0, -2.0) + vec2f(-1.0, 1.0);
  out.pos = vec4f(clip, 0.0, 1.0);
  out.led_index = in.led_index;
  out.sim_pos = in.position;
  return out;
}

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let shape_dist = sdf_polygon(in.sim_pos, &segments, arrayLength(&segments));
  // Positive expansion reveals emitter pixels slightly outside the outline.
  if (shape_dist - cfg.led_clip.x > 0.0) {
    discard;
  }

  let raw_index = u32(max(round(in.led_index), 0.0));
  let i = min(raw_index, arrayLength(&leds) - 1u);
  let n01 = clamp(leds[i].pos_brightness.z, 0.0, 1.0);
  let intensity = mix(cfg.tunables.y, cfg.tunables.z, n01);
  let emit = leds[i].color.rgb * cfg.tunables.x * intensity;
  return vec4f(emit, 0.0);
}

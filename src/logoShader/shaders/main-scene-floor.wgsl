// Dark-theme floor material adapted from the vgpu.sh triangle-led-front example.
// The compositing, grain, tonemap, and glow-falloff math is kept close to the
// original; what changed is the occluder test, which now reads an arbitrary
// polygon outline (flattened from the Specto logo's SVG paths) via a signed
// distance + even-odd inside test instead of a closed-form triangle SDF.
import { col3v, oklab_to_rgb, tonemap, value_remap_clamp } from "./color-utils.wgsl";
import { sdf_polygon } from "./polygon-sdf.wgsl";
import { near_falloff, far_falloff } from "./floor-falloff.wgsl";

struct Config { screen: vec4f, light_sources: vec4f, shape: vec4f, radiance_fit: vec4f, sim_transform: vec4f };
@group(0) @binding(0) var<uniform> cfg: Config;
@group(0) @binding(1) var radiance_tex: texture_2d<f32>;
@group(0) @binding(2) var light_sources_tex: texture_2d<f32>;
@group(0) @binding(3) var<storage, read> segments: array<vec4f>;
@group(0) @binding(4) var floor_noise_tex: texture_2d<f32>;

struct VSOut { @builtin(position) pos: vec4f };
const FLOOR_NOISE_SIZE: i32 = 500;

@vertex fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
  var out: VSOut;
  out.pos = vec4f(p[vi], 0.0, 1.0);
  return out;
}

fn wrapNoiseCoord(v: i32) -> i32 {
  return ((v % FLOOR_NOISE_SIZE) + FLOOR_NOISE_SIZE) % FLOOR_NOISE_SIZE;
}

const FLOOR_NOISE_DENSITY: f32 = 2.0;
const DARK_FLOOR_GRAIN_DPR1_SCALE: f32 = 0.5;

fn sample_floor_noise(p: vec2f) -> f32 {
  let css_px = p / max(cfg.screen.w, 1e-4);
  let noise_px = vec2i(floor(css_px * FLOOR_NOISE_DENSITY));
  let noise_uv = vec2i(wrapNoiseCoord(noise_px.x), wrapNoiseCoord(noise_px.y));
  return textureLoad(floor_noise_tex, noise_uv, 0).r;
}

fn bg(p: vec2f) -> vec3f {
  let floor_noise = sample_floor_noise(p);
  let grain_intensity = select(1.0, DARK_FLOOR_GRAIN_DPR1_SCALE, cfg.screen.w < 1.5);
  let floor_brightness = mix(1.0, 0.5, floor_noise * grain_intensity);
  return vec3f(floor_brightness);
}

const LUMA = vec3f(0.2126, 0.7152, 0.0722);

fn sample_light_sources(pixel_screen: vec2f) -> vec4f {
  let sim_px = (pixel_screen - cfg.sim_transform.xy) / cfg.sim_transform.z;
  let px = clamp(vec2i(floor(sim_px)), vec2i(0), vec2i(cfg.light_sources.xy) - vec2i(1));
  let inside_sim =
    sim_px.x >= 0.0 && sim_px.x < cfg.light_sources.x &&
    sim_px.y >= 0.0 && sim_px.y < cfg.light_sources.y;
  var light_sources = textureLoad(light_sources_tex, px, 0);
  if (!inside_sim) {
    light_sources = vec4f(0.0, 0.0, 0.0, 1.0);
  }
  return light_sources;
}

const UPSAMPLE_B: f32 = 1;
const UPSAMPLE_C: f32 = 0.;

fn bc_spline_weight(x: f32) -> f32 {
  let ax = abs(x);
  let b = UPSAMPLE_B;
  let c = UPSAMPLE_C;
  if (ax < 1.0) {
    return ((12.0 - 9.0 * b - 6.0 * c) * ax * ax * ax
      + (-18.0 + 12.0 * b + 6.0 * c) * ax * ax
      + (6.0 - 2.0 * b)) / 6.0;
  }
  if (ax < 2.0) {
    return ((-b - 6.0 * c) * ax * ax * ax
      + (6.0 * b + 30.0 * c) * ax * ax
      + (-12.0 * b - 48.0 * c) * ax
      + (8.0 * b + 24.0 * c)) / 6.0;
  }
  return 0.0;
}

fn sample_radiance_cubic(uv: vec2f) -> vec3f {
  let dims_u = textureDimensions(radiance_tex);
  let dims = vec2f(dims_u);
  let texel = clamp(uv, vec2f(0.0), vec2f(1.0)) * dims - vec2f(0.5);
  let base = floor(texel);
  let f = texel - base;
  var sum = vec3f(0.0);
  var weight_sum = 0.0;
  for (var y: i32 = -1; y <= 2; y = y + 1) {
    let wy = bc_spline_weight(f.y - f32(y));
    for (var x: i32 = -1; x <= 2; x = x + 1) {
      let wx = bc_spline_weight(f.x - f32(x));
      let w = wx * wy;
      let tap = clamp(vec2i(base) + vec2i(x, y), vec2i(0), vec2i(dims_u) - vec2i(1));
      sum += textureLoad(radiance_tex, tap, 0).rgb * w;
      weight_sum += w;
    }
  }
  return max(sum / max(weight_sum, 1e-5), vec3f(0.0));
}

fn sample_radiance(pixel_screen: vec2f) -> vec3f {
  let fitted_uv = (pixel_screen - cfg.radiance_fit.xy) / cfg.radiance_fit.zw;
  let inside_fit =
    fitted_uv.x >= 0.0 && fitted_uv.x <= 1.0 &&
    fitted_uv.y >= 0.0 && fitted_uv.y <= 1.0;
  var radiance = sample_radiance_cubic(fitted_uv);
  if (!inside_fit) {
    radiance = vec3f(0.0);
  }
  return radiance;
}

fn compose_floor(
  base_colour: vec3f,
  radiance: vec3f,
  light_sources: vec4f,
  surface: f32,
  brightness_factor: f32,
) -> vec3f {
  var colour = max(base_colour, vec3f(0.0));
  colour *= radiance;
  colour = mix(colour, light_sources.rgb, surface);
  let sat = 1.0 + (2.0 - 1.0) * brightness_factor;
  let luma = dot(colour, LUMA);
  colour = max(mix(vec3f(luma), colour, sat), vec3f(0.0));
  colour *= brightness_factor;
  return colour;
}

const DARK_EDGE_FADE_MOBILE_BOOST: f32 = 2.0;

fn edge_fade(pixel_screen: vec2f) -> f32 {
  let mobile_boost =
    select(1.0, DARK_EDGE_FADE_MOBILE_BOOST, cfg.screen.x < cfg.screen.y * 1.25);
  let w = max(0.2 * mobile_boost * cfg.screen.y, 1.0);
  let d = min(pixel_screen.y, cfg.screen.y - pixel_screen.y);
  let t = clamp(d / w, 0.0, 1.0);
  return sqrt(t);
}

const OCCLUDER_INTERIOR_MARGIN: f32 = 4.0;

@fragment fn fs_main(in: VSOut) -> @location(0) vec4f {
  let pixel_screen = in.pos.xy;
  let uv = pixel_screen / cfg.screen.xy;
  let pixel = uv * cfg.screen.xy - cfg.screen.xy * 0.5;

  let sim_pos = (pixel_screen - cfg.sim_transform.xy) / max(cfg.sim_transform.z, 1e-4);
  let shape_sdf = sdf_polygon(sim_pos, &segments, arrayLength(&segments)) * cfg.sim_transform.z;
  let occluder_edge = max(length(vec2f(dpdx(shape_sdf), dpdy(shape_sdf))), 1e-4);
  if (shape_sdf < -OCCLUDER_INTERIOR_MARGIN) {
    return vec4f(0.0, 0.0, 0.0, 1.0);
  }
  let light_sources = sample_light_sources(pixel_screen);
  let radiance = sample_radiance(pixel_screen);

  let surface = smoothstep(
    4.0,
    4.02,
    max(max(light_sources.r, light_sources.g), light_sources.b),
  );
  let floor_rgb = bg(pixel);
  var base_rgb = floor_rgb;
  if (surface > 0.0) {
    base_rgb = oklab_to_rgb(mix(col3v(floor_rgb), col3v(light_sources.rgb), surface));
  }

  let fade_inner = 0.0;
  let near_light = dot(radiance, LUMA);
  let near = near_falloff(
    shape_sdf,
    near_light,
    fade_inner,
    cfg.shape.x,
    vec4f(0.046, 1.2, 2.74, 5.0),
    4.0,
    1.0,
  );
  let far = far_falloff(
    near_light,
    vec4f(0.65, 2.0, 0.0, 8.85),
    0.05,
    1.0,
  );
  let screen_blend =
    1.0 - (1.0 - min(near, 1.0)) * (1.0 - min(far, 1.0));
  let overflow =
    max(near - 1.0, 0.0) + max(far - 1.0, 0.0);
  let brightness_factor = screen_blend + overflow;

  var colour = compose_floor(
    base_rgb,
    radiance,
    light_sources,
    surface,
    brightness_factor,
  );

  var final_colour = tonemap(colour * 0.25);
  final_colour = (final_colour - vec3f(0.5)) * 1.05 + vec3f(0.5);

  let occluder = clamp(0.5 - shape_sdf / occluder_edge, 0.0, 1.0);
  final_colour = mix(final_colour, vec3f(0.0), occluder);

  final_colour = final_colour * edge_fade(pixel_screen);

  return vec4f(final_colour, 1.0);
}

use std::collections::HashMap;

use bytemuck::{Pod, Zeroable};
use gpu::{FULLSCREEN_SHADER_SOURCE, GpuContext};
use thiserror::Error;
use wgpu::util::DeviceExt;

use crate::{EffectPass, UniformValue};

/// How a named uniform is packed into the uniform buffer.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum UniformKind {
    Scalar,
    Vec2,
    Vec3,
    Vec4,
}

impl UniformKind {
    fn components(self) -> usize {
        match self {
            UniformKind::Scalar => 1,
            UniformKind::Vec2 => 2,
            UniformKind::Vec3 => 3,
            UniformKind::Vec4 => 4,
        }
    }
}

/// Ordered uniform schema for one shader. Uniforms are packed sequentially
/// into the `values` array of `EffectUniformBuffer` in this order; WGSL reads
/// them back by fixed indices documented in each shader file.
type UniformSpec = &'static [(&'static str, UniformKind)];

const GAUSSIAN_BLUR_SHADER_ID: &str = "gaussian-blur";
const GAUSSIAN_BLUR_SHADER_SOURCE: &str = include_str!("shaders/gaussian_blur.wgsl");
const COLOR_ADJUST_SHADER_ID: &str = "color-adjust";
const COLOR_ADJUST_SHADER_SOURCE: &str = include_str!("shaders/color_adjust.wgsl");
const GLOW_SHADER_ID: &str = "glow";
const GLOW_SHADER_SOURCE: &str = include_str!("shaders/glow.wgsl");
const VIGNETTE_SHADER_ID: &str = "vignette";
const VIGNETTE_SHADER_SOURCE: &str = include_str!("shaders/vignette.wgsl");
const GRAIN_SHADER_ID: &str = "grain";
const GRAIN_SHADER_SOURCE: &str = include_str!("shaders/grain.wgsl");
const PIXELATE_SHADER_ID: &str = "pixelate";
const PIXELATE_SHADER_SOURCE: &str = include_str!("shaders/pixelate.wgsl");
const CHROMATIC_ABERRATION_SHADER_ID: &str = "chromatic-aberration";
const CHROMATIC_ABERRATION_SHADER_SOURCE: &str =
    include_str!("shaders/chromatic_aberration.wgsl");
const RGB_SPLIT_SHADER_ID: &str = "rgb-split";
const RGB_SPLIT_SHADER_SOURCE: &str = include_str!("shaders/rgb_split.wgsl");
const ZOOM_BLUR_SHADER_ID: &str = "zoom-blur";
const ZOOM_BLUR_SHADER_SOURCE: &str = include_str!("shaders/zoom_blur.wgsl");
const GLITCH_SHADER_ID: &str = "glitch";
const GLITCH_SHADER_SOURCE: &str = include_str!("shaders/glitch.wgsl");
const CHROMA_KEY_SHADER_ID: &str = "chroma-key";
const CHROMA_KEY_SHADER_SOURCE: &str = include_str!("shaders/chroma_key.wgsl");
const TRANSITION_FADE_SHADER_ID: &str = "transition-fade";
const TRANSITION_FADE_SHADER_SOURCE: &str = include_str!("shaders/transition_fade.wgsl");
const TRANSITION_DISSOLVE_SHADER_ID: &str = "transition-dissolve";
const TRANSITION_DISSOLVE_SHADER_SOURCE: &str =
    include_str!("shaders/transition_dissolve.wgsl");
const TRANSITION_WIPE_SHADER_ID: &str = "transition-wipe";
const TRANSITION_WIPE_SHADER_SOURCE: &str = include_str!("shaders/transition_wipe.wgsl");
const TRANSITION_SLIDE_SHADER_ID: &str = "transition-slide";
const TRANSITION_SLIDE_SHADER_SOURCE: &str =
    include_str!("shaders/transition_slide.wgsl");
const TRANSITION_ZOOM_SHADER_ID: &str = "transition-zoom";
const TRANSITION_ZOOM_SHADER_SOURCE: &str = include_str!("shaders/transition_zoom.wgsl");
const TRANSITION_BLUR_SHADER_ID: &str = "transition-blur";
const TRANSITION_BLUR_SHADER_SOURCE: &str = include_str!("shaders/transition_blur.wgsl");
const TRANSITION_GLITCH_SHADER_ID: &str = "transition-glitch";
const TRANSITION_GLITCH_SHADER_SOURCE: &str =
    include_str!("shaders/transition_glitch.wgsl");

/// Registry of every executable effect/transition shader. TS builds passes
/// that reference shaders by id; ids unknown here fail with
/// `EffectsError::UnknownEffectShader`.
const SHADERS: &[(&str, &str, UniformSpec)] = &[
    (
        GAUSSIAN_BLUR_SHADER_ID,
        GAUSSIAN_BLUR_SHADER_SOURCE,
        &[
            ("u_sigma", UniformKind::Scalar),
            ("u_step", UniformKind::Scalar),
            ("u_direction", UniformKind::Vec2),
        ],
    ),
    (
        COLOR_ADJUST_SHADER_ID,
        COLOR_ADJUST_SHADER_SOURCE,
        &[
            ("u_exposure", UniformKind::Scalar),
            ("u_brightness", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
            ("u_saturation", UniformKind::Scalar),
            ("u_temperature", UniformKind::Scalar),
            ("u_tint", UniformKind::Scalar),
            ("u_hue", UniformKind::Scalar),
            ("u_highlights", UniformKind::Scalar),
            ("u_shadows", UniformKind::Scalar),
            ("u_sharpen", UniformKind::Scalar),
        ],
    ),
    (
        GLOW_SHADER_ID,
        GLOW_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_threshold", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
        ],
    ),
    (
        VIGNETTE_SHADER_ID,
        VIGNETTE_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
            ("u_softness", UniformKind::Scalar),
        ],
    ),
    (
        GRAIN_SHADER_ID,
        GRAIN_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
            ("u_seed", UniformKind::Scalar),
        ],
    ),
    (
        PIXELATE_SHADER_ID,
        PIXELATE_SHADER_SOURCE,
        &[("u_pixel_size", UniformKind::Scalar)],
    ),
    (
        CHROMATIC_ABERRATION_SHADER_ID,
        CHROMATIC_ABERRATION_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        RGB_SPLIT_SHADER_ID,
        RGB_SPLIT_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
        ],
    ),
    (
        ZOOM_BLUR_SHADER_ID,
        ZOOM_BLUR_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_center", UniformKind::Vec2),
        ],
    ),
    (
        GLITCH_SHADER_ID,
        GLITCH_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_blockiness", UniformKind::Scalar),
            ("u_seed", UniformKind::Scalar),
        ],
    ),
    (
        CHROMA_KEY_SHADER_ID,
        CHROMA_KEY_SHADER_SOURCE,
        &[
            ("u_key_color", UniformKind::Vec3),
            ("u_similarity", UniformKind::Scalar),
            ("u_smoothness", UniformKind::Scalar),
            ("u_spill", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_FADE_SHADER_ID,
        TRANSITION_FADE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_color", UniformKind::Vec3),
        ],
    ),
    (
        TRANSITION_DISSOLVE_SHADER_ID,
        TRANSITION_DISSOLVE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_graininess", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_WIPE_SHADER_ID,
        TRANSITION_WIPE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
            ("u_softness", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_SLIDE_SHADER_ID,
        TRANSITION_SLIDE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_ZOOM_SHADER_ID,
        TRANSITION_ZOOM_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_BLUR_SHADER_ID,
        TRANSITION_BLUR_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_amount", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_GLITCH_SHADER_ID,
        TRANSITION_GLITCH_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        FISHEYE_SHADER_ID,
        FISHEYE_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        SWIRL_SHADER_ID,
        SWIRL_SHADER_SOURCE,
        &[
            ("u_angle", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
        ],
    ),
    (
        WAVE_SHADER_ID,
        WAVE_SHADER_SOURCE,
        &[
            ("u_amplitude", UniformKind::Scalar),
            ("u_wavelength", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        MOTION_BLUR_SHADER_ID,
        MOTION_BLUR_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
        ],
    ),
    (
        MIRROR_SHADER_ID,
        MIRROR_SHADER_SOURCE,
        &[("u_mode", UniformKind::Scalar)],
    ),
    (
        KALEIDOSCOPE_SHADER_ID,
        KALEIDOSCOPE_SHADER_SOURCE,
        &[("u_segments", UniformKind::Scalar)],
    ),
    (
        HALFTONE_SHADER_ID,
        HALFTONE_SHADER_SOURCE,
        &[
            ("u_dot_size", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        POSTERIZE_SHADER_ID,
        POSTERIZE_SHADER_SOURCE,
        &[("u_levels", UniformKind::Scalar)],
    ),
    (
        SKETCH_SHADER_ID,
        SKETCH_SHADER_SOURCE,
        &[("u_intensity", UniformKind::Scalar)],
    ),
    (
        COMIC_SHADER_ID,
        COMIC_SHADER_SOURCE,
        &[
            ("u_levels", UniformKind::Scalar),
            ("u_edge", UniformKind::Scalar),
        ],
    ),
    (
        DUOTONE_SHADER_ID,
        DUOTONE_SHADER_SOURCE,
        &[
            ("u_dark", UniformKind::Vec3),
            ("u_light", UniformKind::Vec3),
        ],
    ),
    (
        THERMAL_SHADER_ID,
        THERMAL_SHADER_SOURCE,
        &[("u_intensity", UniformKind::Scalar)],
    ),
    (
        INVERT_SHADER_ID,
        INVERT_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        NEON_EDGE_SHADER_ID,
        NEON_EDGE_SHADER_SOURCE,
        &[
            ("u_color", UniformKind::Vec3),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        SCREEN_SHAKE_SHADER_ID,
        SCREEN_SHAKE_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        PULSE_SHADER_ID,
        PULSE_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        LOOP_ZOOM_SHADER_ID,
        LOOP_ZOOM_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_period", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        LIGHT_LEAK_SHADER_ID,
        LIGHT_LEAK_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_hue", UniformKind::Scalar),
        ],
    ),
    (
        SNOW_SHADER_ID,
        SNOW_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        OLD_TV_SHADER_ID,
        OLD_TV_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        SCANLINES_SHADER_ID,
        SCANLINES_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_spacing", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        HOLOGRAPHIC_SHADER_ID,
        HOLOGRAPHIC_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_SPIN_SHADER_ID,
        TRANSITION_SPIN_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_BLINDS_SHADER_ID,
        TRANSITION_BLINDS_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_count", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_FLASH_SHADER_ID,
        TRANSITION_FLASH_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        NIGHT_VISION_SHADER_ID,
        NIGHT_VISION_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        GLASS_SHADER_ID,
        GLASS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        CROSS_HATCH_SHADER_ID,
        CROSS_HATCH_SHADER_SOURCE,
        &[
            ("u_spacing", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        BLUEPRINT_SHADER_ID,
        BLUEPRINT_SHADER_SOURCE,
        &[("u_intensity", UniformKind::Scalar)],
    ),
    (
        PRISM_SHADER_ID,
        PRISM_SHADER_SOURCE,
        &[("u_intensity", UniformKind::Scalar)],
    ),
    (
        VHS_SHADER_ID,
        VHS_SHADER_SOURCE,
        &[
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        BLUR_EDGE_SHADER_ID,
        BLUR_EDGE_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        WATERCOLOR_SHADER_ID,
        WATERCOLOR_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        BOKEH_SHADER_ID,
        BOKEH_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        GLITTER_SHADER_ID,
        GLITTER_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        RAIN_SHADER_ID,
        RAIN_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        SPOTLIGHT_SHADER_ID,
        SPOTLIGHT_SHADER_SOURCE,
        &[
            ("u_center_x", UniformKind::Scalar),
            ("u_center_y", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
            ("u_softness", UniformKind::Scalar),
            ("u_darkness", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_follow", UniformKind::Scalar),
        ],
    ),
    (
        CONFETTI_SHADER_ID,
        CONFETTI_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        BUBBLES_SHADER_ID,
        BUBBLES_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        FIREFLIES_SHADER_ID,
        FIREFLIES_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_glow", UniformKind::Scalar),
        ],
    ),
    (
        WOBBLE_SHADER_ID,
        WOBBLE_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_frequency", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        TILT_SHIFT_SHADER_ID,
        TILT_SHIFT_SHADER_SOURCE,
        &[
            ("u_center", UniformKind::Scalar),
            ("u_band", UniformKind::Scalar),
            ("u_blur", UniformKind::Scalar),
        ],
    ),
    (
        HEARTS_SHADER_ID,
        HEARTS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        LETTERBOX_SHADER_ID,
        LETTERBOX_SHADER_SOURCE,
        &[
            ("u_bar", UniformKind::Scalar),
            ("u_feather", UniformKind::Scalar),
        ],
    ),
    (
        BEAUTY_SHADER_ID,
        BEAUTY_SHADER_SOURCE,
        &[
            ("u_smoothing", UniformKind::Scalar),
            ("u_brightness", UniformKind::Scalar),
            ("u_warmth", UniformKind::Scalar),
        ],
    ),
    (
        SHARPEN_SHADER_ID,
        SHARPEN_SHADER_SOURCE,
        &[("u_amount", UniformKind::Scalar)],
    ),
    (
        LOWLIGHT_SHADER_ID,
        LOWLIGHT_SHADER_SOURCE,
        &[
            ("u_lift", UniformKind::Scalar),
            ("u_warmth", UniformKind::Scalar),
            ("u_denoise", UniformKind::Scalar),
        ],
    ),
    (
        FOG_SHADER_ID,
        FOG_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_scale", UniformKind::Scalar),
        ],
    ),
    (
        LIGHTNING_SHADER_ID,
        LIGHTNING_SHADER_SOURCE,
        &[
            ("u_frequency", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_seed", UniformKind::Scalar),
        ],
    ),
    (
        STARS_SHADER_ID,
        STARS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        OIL_SHADER_ID,
        OIL_SHADER_SOURCE,
        &[
            ("u_radius", UniformKind::Scalar),
            ("u_mix", UniformKind::Scalar),
        ],
    ),
    (
        INK_SHADER_ID,
        INK_SHADER_SOURCE,
        &[
            ("u_strength", UniformKind::Scalar),
            ("u_threshold", UniformKind::Scalar),
            ("u_softness", UniformKind::Scalar),
        ],
    ),
    (
        GHOST_SHADER_ID,
        GHOST_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_offset", UniformKind::Scalar),
            ("u_count", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        AURORA_SHADER_ID,
        AURORA_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_hue", UniformKind::Scalar),
        ],
    ),
    (
        SUNSET_SHADER_ID,
        SUNSET_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_warmth", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_breathing", UniformKind::Scalar),
        ],
    ),
    (
        DIZZY_SHADER_ID,
        DIZZY_SHADER_SOURCE,
        &[
            ("u_rotation", UniformKind::Scalar),
            ("u_zoom", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        RAINBOW_EDGE_SHADER_ID,
        RAINBOW_EDGE_SHADER_SOURCE,
        &[
            ("u_strength", UniformKind::Scalar),
            ("u_width", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_shift", UniformKind::Scalar),
        ],
    ),
    (
        FILM_FADE_SHADER_ID,
        FILM_FADE_SHADER_SOURCE,
        &[
            ("u_fade", UniformKind::Scalar),
            ("u_grain", UniformKind::Scalar),
            ("u_warmth", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        CROSS_PROCESS_SHADER_ID,
        CROSS_PROCESS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
        ],
    ),
    (
        BLEACH_BYPASS_SHADER_ID,
        BLEACH_BYPASS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
        ],
    ),
    (
        LOMO_SHADER_ID,
        LOMO_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_saturation", UniformKind::Scalar),
            ("u_vignette", UniformKind::Scalar),
        ],
    ),
    (
        HALATION_SHADER_ID,
        HALATION_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
            ("u_threshold", UniformKind::Scalar),
        ],
    ),
    (
        DREAM_SHADER_ID,
        DREAM_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_drift", UniformKind::Scalar),
            ("u_pulse", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        RAIN_WINDOW_SHADER_ID,
        RAIN_WINDOW_SHADER_SOURCE,
        &[
            ("u_drops", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_scale", UniformKind::Scalar),
            ("u_blur", UniformKind::Scalar),
        ],
    ),
    (
        MIRROR_GRID_SHADER_ID,
        MIRROR_GRID_SHADER_SOURCE,
        &[
            ("u_mode", UniformKind::Scalar),
            ("u_amount", UniformKind::Scalar),
        ],
    ),
    (
        TEAL_ORANGE_SHADER_ID,
        TEAL_ORANGE_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_balance", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
        ],
    ),
    (
        SPEED_LINES_SHADER_ID,
        SPEED_LINES_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_lines", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_width", UniformKind::Scalar),
        ],
    ),
    (
        MATRIX_RAIN_SHADER_ID,
        MATRIX_RAIN_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_density", UniformKind::Scalar),
            ("u_glow", UniformKind::Scalar),
        ],
    ),
    (
        HEXAGON_PIXEL_SHADER_ID,
        HEXAGON_PIXEL_SHADER_SOURCE,
        &[
            ("u_size", UniformKind::Scalar),
            ("u_mix", UniformKind::Scalar),
        ],
    ),
    (
        XRAY_SHADER_ID,
        XRAY_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_tint", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
        ],
    ),
    (
        METEOR_SHADER_ID,
        METEOR_SHADER_SOURCE,
        &[
            ("u_frequency", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_trail", UniformKind::Scalar),
        ],
    ),
    (
        PETALS_SHADER_ID,
        PETALS_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        VHS_TRACKING_SHADER_ID,
        VHS_TRACKING_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_height", UniformKind::Scalar),
            ("u_jitter", UniformKind::Scalar),
        ],
    ),
    (
        NEON_FRAME_SHADER_ID,
        NEON_FRAME_SHADER_SOURCE,
        &[
            ("u_border", UniformKind::Scalar),
            ("u_glow", UniformKind::Scalar),
            ("u_hue_speed", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_CUBE_SHADER_ID,
        TRANSITION_CUBE_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_PIXEL_WIPE_SHADER_ID,
        TRANSITION_PIXEL_WIPE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_cell", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_WINDMILL_SHADER_ID,
        TRANSITION_WINDMILL_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        GHOST_SHADER_ID,
        GHOST_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_dist", UniformKind::Scalar),
            ("u_decay", UniformKind::Scalar),
        ],
    ),
    (
        BLOOM_SHADER_ID,
        BLOOM_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_threshold", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
        ],
    ),
    (
        MOONLIGHT_SHADER_ID,
        MOONLIGHT_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_strength", UniformKind::Scalar),
        ],
    ),
    (
        LIQUID_SHADER_ID,
        LIQUID_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_speed", UniformKind::Scalar),
            ("u_scale", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        MAGNIFIER_SHADER_ID,
        MAGNIFIER_SHADER_SOURCE,
        &[
            ("u_center_x", UniformKind::Scalar),
            ("u_center_y", UniformKind::Scalar),
            ("u_radius", UniformKind::Scalar),
            ("u_zoom", UniformKind::Scalar),
        ],
    ),
    (
        STROBE_SHADER_ID,
        STROBE_SHADER_SOURCE,
        &[
            ("u_speed", UniformKind::Scalar),
            ("u_invert", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        CINEMATIC_SHADER_ID,
        CINEMATIC_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_contrast", UniformKind::Scalar),
            ("u_warmth", UniformKind::Scalar),
        ],
    ),
    (
        CYBERPUNK_SHADER_ID,
        CYBERPUNK_SHADER_SOURCE,
        &[
            ("u_amount", UniformKind::Scalar),
            ("u_glow", UniformKind::Scalar),
            ("u_time", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_IRIS_SHADER_ID,
        TRANSITION_IRIS_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_feather", UniformKind::Scalar),
            ("u_shape", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_CLOCK_SHADER_ID,
        TRANSITION_CLOCK_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_WHIP_SHADER_ID,
        TRANSITION_WHIP_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_direction", UniformKind::Scalar),
            ("u_blur", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_SHAKE_T_SHADER_ID,
        TRANSITION_SHAKE_T_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_SPLIT_SHADER_ID,
        TRANSITION_SPLIT_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_direction", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_DREAM_SHADER_ID,
        TRANSITION_DREAM_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_amount", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_FISHEYE_T_SHADER_ID,
        TRANSITION_FISHEYE_T_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_GLITCH_DRIFT_SHADER_ID,
        TRANSITION_GLITCH_DRIFT_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_LUMA_SHADER_ID,
        TRANSITION_LUMA_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_softness", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_RIPPLE_T_SHADER_ID,
        TRANSITION_RIPPLE_T_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_amplitude", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_ZOOM_OUT_SHADER_ID,
        TRANSITION_ZOOM_OUT_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_CROSS_ZOOM_SHADER_ID,
        TRANSITION_CROSS_ZOOM_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_PIXELATE_SHADER_ID,
        TRANSITION_PIXELATE_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_size", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_DROP_SHADER_ID,
        TRANSITION_DROP_SHADER_SOURCE,
        &[("u_progress", UniformKind::Scalar)],
    ),
    (
        TRANSITION_SWIRL_MORPH_SHADER_ID,
        TRANSITION_SWIRL_MORPH_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
        ],
    ),
    (
        TRANSITION_STREAKS_SHADER_ID,
        TRANSITION_STREAKS_SHADER_SOURCE,
        &[
            ("u_progress", UniformKind::Scalar),
            ("u_intensity", UniformKind::Scalar),
            ("u_angle", UniformKind::Scalar),
        ],
    ),
];

fn shader_spec(shader_id: &str) -> Option<UniformSpec> {
    SHADERS
        .iter()
        .find(|(id, _, _)| *id == shader_id)
        .map(|(_, _, spec)| *spec)
}

const FISHEYE_SHADER_ID: &str = "fisheye";
const FISHEYE_SHADER_SOURCE: &str = include_str!("shaders/fisheye.wgsl");
const SWIRL_SHADER_ID: &str = "swirl";
const SWIRL_SHADER_SOURCE: &str = include_str!("shaders/swirl.wgsl");
const WAVE_SHADER_ID: &str = "wave";
const WAVE_SHADER_SOURCE: &str = include_str!("shaders/wave.wgsl");
const MOTION_BLUR_SHADER_ID: &str = "motion-blur";
const MOTION_BLUR_SHADER_SOURCE: &str = include_str!("shaders/motion_blur.wgsl");
const MIRROR_SHADER_ID: &str = "mirror";
const MIRROR_SHADER_SOURCE: &str = include_str!("shaders/mirror.wgsl");
const KALEIDOSCOPE_SHADER_ID: &str = "kaleidoscope";
const KALEIDOSCOPE_SHADER_SOURCE: &str = include_str!("shaders/kaleidoscope.wgsl");
const HALFTONE_SHADER_ID: &str = "halftone";
const HALFTONE_SHADER_SOURCE: &str = include_str!("shaders/halftone.wgsl");
const POSTERIZE_SHADER_ID: &str = "posterize";
const POSTERIZE_SHADER_SOURCE: &str = include_str!("shaders/posterize.wgsl");
const SKETCH_SHADER_ID: &str = "sketch";
const SKETCH_SHADER_SOURCE: &str = include_str!("shaders/sketch.wgsl");
const COMIC_SHADER_ID: &str = "comic";
const COMIC_SHADER_SOURCE: &str = include_str!("shaders/comic.wgsl");
const DUOTONE_SHADER_ID: &str = "duotone";
const DUOTONE_SHADER_SOURCE: &str = include_str!("shaders/duotone.wgsl");
const THERMAL_SHADER_ID: &str = "thermal";
const THERMAL_SHADER_SOURCE: &str = include_str!("shaders/thermal.wgsl");
const INVERT_SHADER_ID: &str = "invert";
const INVERT_SHADER_SOURCE: &str = include_str!("shaders/invert.wgsl");
const NEON_EDGE_SHADER_ID: &str = "neon-edge";
const NEON_EDGE_SHADER_SOURCE: &str = include_str!("shaders/neon_edge.wgsl");
const SCREEN_SHAKE_SHADER_ID: &str = "screen-shake";
const SCREEN_SHAKE_SHADER_SOURCE: &str = include_str!("shaders/screen_shake.wgsl");
const PULSE_SHADER_ID: &str = "pulse";
const PULSE_SHADER_SOURCE: &str = include_str!("shaders/pulse.wgsl");
const LOOP_ZOOM_SHADER_ID: &str = "loop-zoom";
const LOOP_ZOOM_SHADER_SOURCE: &str = include_str!("shaders/loop_zoom.wgsl");
const LIGHT_LEAK_SHADER_ID: &str = "light-leak";
const LIGHT_LEAK_SHADER_SOURCE: &str = include_str!("shaders/light_leak.wgsl");
const SNOW_SHADER_ID: &str = "snow";
const SNOW_SHADER_SOURCE: &str = include_str!("shaders/snow.wgsl");
const OLD_TV_SHADER_ID: &str = "old-tv";
const OLD_TV_SHADER_SOURCE: &str = include_str!("shaders/old_tv.wgsl");
const SCANLINES_SHADER_ID: &str = "scanlines";
const SCANLINES_SHADER_SOURCE: &str = include_str!("shaders/scanlines.wgsl");
const HOLOGRAPHIC_SHADER_ID: &str = "holographic";
const HOLOGRAPHIC_SHADER_SOURCE: &str = include_str!("shaders/holographic.wgsl");
const TRANSITION_SPIN_SHADER_ID: &str = "transition-spin";
const TRANSITION_SPIN_SHADER_SOURCE: &str = include_str!("shaders/transition_spin.wgsl");
const TRANSITION_BLINDS_SHADER_ID: &str = "transition-blinds";
const TRANSITION_BLINDS_SHADER_SOURCE: &str =
    include_str!("shaders/transition_blinds.wgsl");
const TRANSITION_FLASH_SHADER_ID: &str = "transition-flash";
const TRANSITION_FLASH_SHADER_SOURCE: &str =
    include_str!("shaders/transition_flash.wgsl");
const NIGHT_VISION_SHADER_ID: &str = "night-vision";
const NIGHT_VISION_SHADER_SOURCE: &str = include_str!("shaders/night_vision.wgsl");
const GLASS_SHADER_ID: &str = "glass";
const GLASS_SHADER_SOURCE: &str = include_str!("shaders/glass.wgsl");
const CROSS_HATCH_SHADER_ID: &str = "cross-hatch";
const CROSS_HATCH_SHADER_SOURCE: &str = include_str!("shaders/cross_hatch.wgsl");
const BLUEPRINT_SHADER_ID: &str = "blueprint";
const BLUEPRINT_SHADER_SOURCE: &str = include_str!("shaders/blueprint.wgsl");
const PRISM_SHADER_ID: &str = "prism";
const PRISM_SHADER_SOURCE: &str = include_str!("shaders/prism.wgsl");
const VHS_SHADER_ID: &str = "vhs";
const VHS_SHADER_SOURCE: &str = include_str!("shaders/vhs.wgsl");
const BLUR_EDGE_SHADER_ID: &str = "blur-edge";
const BLUR_EDGE_SHADER_SOURCE: &str = include_str!("shaders/blur_edge.wgsl");
const WATERCOLOR_SHADER_ID: &str = "watercolor";
const WATERCOLOR_SHADER_SOURCE: &str = include_str!("shaders/watercolor.wgsl");
const BOKEH_SHADER_ID: &str = "bokeh";
const BOKEH_SHADER_SOURCE: &str = include_str!("shaders/bokeh.wgsl");
const GLITTER_SHADER_ID: &str = "glitter";
const GLITTER_SHADER_SOURCE: &str = include_str!("shaders/glitter.wgsl");
const RAIN_SHADER_ID: &str = "rain";
const RAIN_SHADER_SOURCE: &str = include_str!("shaders/rain.wgsl");

const SPOTLIGHT_SHADER_ID: &str = "spotlight";
const SPOTLIGHT_SHADER_SOURCE: &str = include_str!("shaders/spotlight.wgsl");
const CONFETTI_SHADER_ID: &str = "confetti";
const CONFETTI_SHADER_SOURCE: &str = include_str!("shaders/confetti.wgsl");
const BUBBLES_SHADER_ID: &str = "bubbles";
const BUBBLES_SHADER_SOURCE: &str = include_str!("shaders/bubbles.wgsl");
const FIREFLIES_SHADER_ID: &str = "fireflies";
const FIREFLIES_SHADER_SOURCE: &str = include_str!("shaders/fireflies.wgsl");
const WOBBLE_SHADER_ID: &str = "wobble";
const WOBBLE_SHADER_SOURCE: &str = include_str!("shaders/wobble.wgsl");
const TILT_SHIFT_SHADER_ID: &str = "tilt-shift";
const TILT_SHIFT_SHADER_SOURCE: &str = include_str!("shaders/tilt_shift.wgsl");
const HEARTS_SHADER_ID: &str = "hearts";
const HEARTS_SHADER_SOURCE: &str = include_str!("shaders/hearts.wgsl");
const LETTERBOX_SHADER_ID: &str = "letterbox";
const LETTERBOX_SHADER_SOURCE: &str = include_str!("shaders/letterbox.wgsl");

const BEAUTY_SHADER_ID: &str = "beauty";
const BEAUTY_SHADER_SOURCE: &str = include_str!("shaders/beauty.wgsl");
const SHARPEN_SHADER_ID: &str = "sharpen";
const SHARPEN_SHADER_SOURCE: &str = include_str!("shaders/sharpen.wgsl");
const LOWLIGHT_SHADER_ID: &str = "lowlight";
const LOWLIGHT_SHADER_SOURCE: &str = include_str!("shaders/lowlight.wgsl");
const FOG_SHADER_ID: &str = "fog";
const FOG_SHADER_SOURCE: &str = include_str!("shaders/fog.wgsl");
const LIGHTNING_SHADER_ID: &str = "lightning";
const LIGHTNING_SHADER_SOURCE: &str = include_str!("shaders/lightning.wgsl");
const STARS_SHADER_ID: &str = "stars";
const STARS_SHADER_SOURCE: &str = include_str!("shaders/stars.wgsl");

const OIL_SHADER_ID: &str = "oil";
const OIL_SHADER_SOURCE: &str = include_str!("shaders/oil.wgsl");
const INK_SHADER_ID: &str = "ink";
const INK_SHADER_SOURCE: &str = include_str!("shaders/ink.wgsl");
const GHOST_SHADER_ID: &str = "ghost";
const GHOST_SHADER_SOURCE: &str = include_str!("shaders/ghost.wgsl");
const AURORA_SHADER_ID: &str = "aurora";
const AURORA_SHADER_SOURCE: &str = include_str!("shaders/aurora.wgsl");
const SUNSET_SHADER_ID: &str = "sunset";
const SUNSET_SHADER_SOURCE: &str = include_str!("shaders/sunset.wgsl");
const DIZZY_SHADER_ID: &str = "dizzy";
const DIZZY_SHADER_SOURCE: &str = include_str!("shaders/dizzy.wgsl");
const RAINBOW_EDGE_SHADER_ID: &str = "rainbow-edge";
const RAINBOW_EDGE_SHADER_SOURCE: &str = include_str!("shaders/rainbow_edge.wgsl");
const FILM_FADE_SHADER_ID: &str = "film-fade";
const FILM_FADE_SHADER_SOURCE: &str = include_str!("shaders/film_fade.wgsl");

const CROSS_PROCESS_SHADER_ID: &str = "cross-process";
const CROSS_PROCESS_SHADER_SOURCE: &str = include_str!("shaders/cross_process.wgsl");
const BLEACH_BYPASS_SHADER_ID: &str = "bleach-bypass";
const BLEACH_BYPASS_SHADER_SOURCE: &str = include_str!("shaders/bleach_bypass.wgsl");
const LOMO_SHADER_ID: &str = "lomo";
const LOMO_SHADER_SOURCE: &str = include_str!("shaders/lomo.wgsl");
const HALATION_SHADER_ID: &str = "halation";
const HALATION_SHADER_SOURCE: &str = include_str!("shaders/halation.wgsl");
const DREAM_SHADER_ID: &str = "dream";
const DREAM_SHADER_SOURCE: &str = include_str!("shaders/dream.wgsl");
const RAIN_WINDOW_SHADER_ID: &str = "rain-window";
const RAIN_WINDOW_SHADER_SOURCE: &str = include_str!("shaders/rain_window.wgsl");
const MIRROR_GRID_SHADER_ID: &str = "mirror-grid";
const MIRROR_GRID_SHADER_SOURCE: &str = include_str!("shaders/mirror_grid.wgsl");
const TEAL_ORANGE_SHADER_ID: &str = "teal-orange";
const TEAL_ORANGE_SHADER_SOURCE: &str = include_str!("shaders/teal_orange.wgsl");

const SPEED_LINES_SHADER_ID: &str = "speed-lines";
const SPEED_LINES_SHADER_SOURCE: &str = include_str!("shaders/speed_lines.wgsl");
const MATRIX_RAIN_SHADER_ID: &str = "matrix-rain";
const MATRIX_RAIN_SHADER_SOURCE: &str = include_str!("shaders/matrix_rain.wgsl");
const HEXAGON_PIXEL_SHADER_ID: &str = "hexagon-pixel";
const HEXAGON_PIXEL_SHADER_SOURCE: &str = include_str!("shaders/hexagon_pixel.wgsl");
const XRAY_SHADER_ID: &str = "xray";
const XRAY_SHADER_SOURCE: &str = include_str!("shaders/xray.wgsl");
const METEOR_SHADER_ID: &str = "meteor";
const METEOR_SHADER_SOURCE: &str = include_str!("shaders/meteor.wgsl");
const PETALS_SHADER_ID: &str = "petals";
const PETALS_SHADER_SOURCE: &str = include_str!("shaders/petals.wgsl");
const VHS_TRACKING_SHADER_ID: &str = "vhs-tracking";
const VHS_TRACKING_SHADER_SOURCE: &str = include_str!("shaders/vhs_tracking.wgsl");
const NEON_FRAME_SHADER_ID: &str = "neon-frame";
const NEON_FRAME_SHADER_SOURCE: &str = include_str!("shaders/neon_frame.wgsl");

const TRANSITION_CUBE_SHADER_ID: &str = "transition-cube";
const TRANSITION_CUBE_SHADER_SOURCE: &str = include_str!("shaders/transition_cube.wgsl");
const TRANSITION_PIXEL_WIPE_SHADER_ID: &str = "transition-pixel-wipe";
const TRANSITION_PIXEL_WIPE_SHADER_SOURCE: &str =
    include_str!("shaders/transition_pixel_wipe.wgsl");
const TRANSITION_WINDMILL_SHADER_ID: &str = "transition-windmill";
const TRANSITION_WINDMILL_SHADER_SOURCE: &str =
    include_str!("shaders/transition_windmill.wgsl");

const BLOOM_SHADER_ID: &str = "bloom";
const BLOOM_SHADER_SOURCE: &str = include_str!("shaders/bloom.wgsl");
const MOONLIGHT_SHADER_ID: &str = "moonlight";
const MOONLIGHT_SHADER_SOURCE: &str = include_str!("shaders/moonlight.wgsl");
const LIQUID_SHADER_ID: &str = "liquid";
const LIQUID_SHADER_SOURCE: &str = include_str!("shaders/liquid.wgsl");
const MAGNIFIER_SHADER_ID: &str = "magnifier";
const MAGNIFIER_SHADER_SOURCE: &str = include_str!("shaders/magnifier.wgsl");
const STROBE_SHADER_ID: &str = "strobe";
const STROBE_SHADER_SOURCE: &str = include_str!("shaders/strobe.wgsl");
const CINEMATIC_SHADER_ID: &str = "cinematic";
const CINEMATIC_SHADER_SOURCE: &str = include_str!("shaders/cinematic.wgsl");
const CYBERPUNK_SHADER_ID: &str = "cyberpunk";
const CYBERPUNK_SHADER_SOURCE: &str = include_str!("shaders/cyberpunk.wgsl");

const TRANSITION_IRIS_SHADER_ID: &str = "transition-iris";
const TRANSITION_IRIS_SHADER_SOURCE: &str = include_str!("shaders/transition_iris.wgsl");
const TRANSITION_CLOCK_SHADER_ID: &str = "transition-clock";
const TRANSITION_CLOCK_SHADER_SOURCE: &str = include_str!("shaders/transition_clock.wgsl");
const TRANSITION_WHIP_SHADER_ID: &str = "transition-whip";
const TRANSITION_WHIP_SHADER_SOURCE: &str = include_str!("shaders/transition_whip.wgsl");
const TRANSITION_SHAKE_T_SHADER_ID: &str = "transition-shake";
const TRANSITION_SHAKE_T_SHADER_SOURCE: &str = include_str!("shaders/transition_shake.wgsl");
const TRANSITION_SPLIT_SHADER_ID: &str = "transition-split";
const TRANSITION_SPLIT_SHADER_SOURCE: &str = include_str!("shaders/transition_split.wgsl");
const TRANSITION_DREAM_SHADER_ID: &str = "transition-dream";
const TRANSITION_DREAM_SHADER_SOURCE: &str = include_str!("shaders/transition_dream.wgsl");
const TRANSITION_FISHEYE_T_SHADER_ID: &str = "transition-fisheye";
const TRANSITION_FISHEYE_T_SHADER_SOURCE: &str = include_str!("shaders/transition_fisheye.wgsl");
const TRANSITION_GLITCH_DRIFT_SHADER_ID: &str = "transition-glitch-drift";
const TRANSITION_GLITCH_DRIFT_SHADER_SOURCE: &str =
    include_str!("shaders/transition_glitch_drift.wgsl");
const TRANSITION_LUMA_SHADER_ID: &str = "transition-luma";
const TRANSITION_LUMA_SHADER_SOURCE: &str = include_str!("shaders/transition_luma.wgsl");
const TRANSITION_RIPPLE_T_SHADER_ID: &str = "transition-ripple";
const TRANSITION_RIPPLE_T_SHADER_SOURCE: &str = include_str!("shaders/transition_ripple.wgsl");
const TRANSITION_ZOOM_OUT_SHADER_ID: &str = "transition-zoom-out";
const TRANSITION_ZOOM_OUT_SHADER_SOURCE: &str = include_str!("shaders/transition_zoom_out.wgsl");
const TRANSITION_CROSS_ZOOM_SHADER_ID: &str = "transition-cross-zoom";
const TRANSITION_CROSS_ZOOM_SHADER_SOURCE: &str =
    include_str!("shaders/transition_cross_zoom.wgsl");
const TRANSITION_PIXELATE_SHADER_ID: &str = "transition-pixelate";
const TRANSITION_PIXELATE_SHADER_SOURCE: &str =
    include_str!("shaders/transition_pixelate.wgsl");
const TRANSITION_DROP_SHADER_ID: &str = "transition-drop";
const TRANSITION_DROP_SHADER_SOURCE: &str = include_str!("shaders/transition_drop.wgsl");
const TRANSITION_SWIRL_MORPH_SHADER_ID: &str = "transition-swirl-morph";
const TRANSITION_SWIRL_MORPH_SHADER_SOURCE: &str =
    include_str!("shaders/transition_swirl_morph.wgsl");
const TRANSITION_STREAKS_SHADER_ID: &str = "transition-streaks";
const TRANSITION_STREAKS_SHADER_SOURCE: &str =
    include_str!("shaders/transition_streaks.wgsl");

pub struct ApplyEffectsOptions<'a> {
    pub source: &'a wgpu::Texture,
    /// Optional second input texture bound at group(0) binding(2). Shaders
    /// that declare `u_texture_b` (transitions, bloom composite) sample it;
    /// a 1x1 transparent fallback is bound when this is `None`.
    pub secondary: Option<&'a wgpu::Texture>,
    pub width: u32,
    pub height: u32,
    pub passes: &'a [EffectPass],
}

pub struct EffectPipeline {
    texture_bind_group_layout: wgpu::BindGroupLayout,
    uniform_bind_group_layout: wgpu::BindGroupLayout,
    pipelines: HashMap<String, wgpu::RenderPipeline>,
    fallback_texture: wgpu::Texture,
}

#[derive(Debug, Error)]
pub enum EffectsError {
    #[error("At least one effect pass is required")]
    MissingEffectPasses,
    #[error("Unknown effect shader '{shader}'")]
    UnknownEffectShader { shader: String },
    #[error("Missing uniform '{uniform}' for shader '{shader}'")]
    MissingUniform { shader: String, uniform: String },
    #[error("Uniform '{uniform}' for shader '{shader}' must be a number")]
    InvalidNumberUniform { shader: String, uniform: String },
    #[error(
        "Uniform '{uniform}' for shader '{shader}' must be a vector of length {expected_length}"
    )]
    InvalidVectorUniform {
        shader: String,
        uniform: String,
        expected_length: usize,
    },
    #[error("Shader '{shader}' does not support uniform '{uniform}'")]
    UnsupportedUniform { shader: String, uniform: String },
    #[error("Uniform buffer overflow for shader '{shader}': uniforms exceed 28 floats")]
    UniformBufferOverflow { shader: String },
}

/// Shared uniform block for every effect/transition shader. `resolution` and
/// `direction` keep their legacy positions for the pre-existing gaussian blur
/// shader; every other uniform is packed into `values` in the shader's spec
/// order (see `UniformSpec`).
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
struct EffectUniformBuffer {
    resolution: [f32; 2],
    direction: [f32; 2],
    values: [f32; 28],
}

impl EffectPipeline {
    pub fn new(context: &GpuContext) -> Self {
        let device = context.device();

        let texture_bind_group_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-texture-bind-group-layout"),
                    entries: &[
                        wgpu::BindGroupLayoutEntry {
                            binding: 0,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Texture {
                                sample_type: wgpu::TextureSampleType::Float {
                                    filterable: true,
                                },
                                view_dimension: wgpu::TextureViewDimension::D2,
                                multisampled: false,
                            },
                            count: None,
                        },
                        wgpu::BindGroupLayoutEntry {
                            binding: 1,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Sampler(
                                wgpu::SamplerBindingType::Filtering,
                            ),
                            count: None,
                        },
                        wgpu::BindGroupLayoutEntry {
                            binding: 2,
                            visibility: wgpu::ShaderStages::FRAGMENT,
                            ty: wgpu::BindingType::Texture {
                                sample_type: wgpu::TextureSampleType::Float {
                                    filterable: true,
                                },
                                view_dimension: wgpu::TextureViewDimension::D2,
                                multisampled: false,
                            },
                            count: None,
                        },
                    ],
                });
        let uniform_bind_group_layout =
            device
                .create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
                    label: Some("effects-uniform-bind-group-layout"),
                    entries: &[wgpu::BindGroupLayoutEntry {
                        binding: 0,
                        visibility: wgpu::ShaderStages::FRAGMENT,
                        ty: wgpu::BindingType::Buffer {
                            ty: wgpu::BufferBindingType::Uniform,
                            has_dynamic_offset: false,
                            min_binding_size: None,
                        },
                        count: None,
                    }],
                });
        let vertex_shader_module = device.create_shader_module(
            wgpu::ShaderModuleDescriptor {
                label: Some("effects-fullscreen-shader"),
                source: wgpu::ShaderSource::Wgsl(FULLSCREEN_SHADER_SOURCE.into()),
            },
        );
        let pipeline_layout = device.create_pipeline_layout(
            &wgpu::PipelineLayoutDescriptor {
                label: Some("effects-pipeline-layout"),
                bind_group_layouts: &[
                    Some(&texture_bind_group_layout),
                    Some(&uniform_bind_group_layout),
                ],
                immediate_size: 0,
            },
        );

        let mut pipelines = HashMap::new();
        for (shader_id, shader_source, _) in SHADERS {
            let shader_module = device.create_shader_module(
                wgpu::ShaderModuleDescriptor {
                    label: Some(&format!("effects-{shader_id}-shader")),
                    source: wgpu::ShaderSource::Wgsl((*shader_source).into()),
                },
            );
            let pipeline = device.create_render_pipeline(
                &wgpu::RenderPipelineDescriptor {
                    label: Some(&format!("effects-{shader_id}-pipeline")),
                    layout: Some(&pipeline_layout),
                    vertex: wgpu::VertexState {
                        module: &vertex_shader_module,
                        entry_point: Some("vertex_main"),
                        buffers: &[wgpu::VertexBufferLayout {
                            array_stride: std::mem::size_of::<[f32; 2]>() as u64,
                            step_mode: wgpu::VertexStepMode::Vertex,
                            attributes: &[wgpu::VertexAttribute {
                                format: wgpu::VertexFormat::Float32x2,
                                offset: 0,
                                shader_location: 0,
                            }],
                        }],
                        compilation_options: wgpu::PipelineCompilationOptions::default(),
                    },
                    fragment: Some(wgpu::FragmentState {
                        module: &shader_module,
                        entry_point: Some("fragment_main"),
                        targets: &[Some(wgpu::ColorTargetState {
                            format: context.texture_format(),
                            blend: None,
                            write_mask: wgpu::ColorWrites::ALL,
                        })],
                        compilation_options: wgpu::PipelineCompilationOptions::default(),
                    }),
                    primitive: wgpu::PrimitiveState::default(),
                    depth_stencil: None,
                    multisample: wgpu::MultisampleState::default(),
                    multiview_mask: None,
                    cache: None,
                },
            );
            pipelines.insert((*shader_id).to_string(), pipeline);
        }

        let fallback_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("effects-secondary-fallback"),
            size: wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        context.queue().write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &fallback_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &[0u8, 0, 0, 0],
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4),
                rows_per_image: None,
            },
            wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
        );

        Self {
            texture_bind_group_layout,
            uniform_bind_group_layout,
            pipelines,
            fallback_texture,
        }
    }

    pub fn apply(
        &self,
        context: &GpuContext,
        ApplyEffectsOptions {
            source,
            secondary,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut encoder =
            context
                .device()
                .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                    label: Some("effects-command-encoder"),
                });
        let output = self.apply_with_encoder(
            context,
            &mut encoder,
            ApplyEffectsOptions {
                source,
                secondary,
                width,
                height,
                passes,
            },
        )?;
        context.queue().submit([encoder.finish()]);
        Ok(output)
    }

    pub fn apply_with_encoder(
        &self,
        context: &GpuContext,
        encoder: &mut wgpu::CommandEncoder,
        ApplyEffectsOptions {
            source,
            secondary,
            width,
            height,
            passes,
        }: ApplyEffectsOptions<'_>,
    ) -> Result<wgpu::Texture, EffectsError> {
        let mut current_texture: Option<wgpu::Texture> = None;

        for pass in passes {
            let input_texture = current_texture.as_ref().unwrap_or(source);
            let output_texture =
                context.create_render_texture(width, height, "effects-pass-output");
            let input_view = input_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let output_view = output_texture.create_view(&wgpu::TextureViewDescriptor::default());
            let secondary_view = secondary
                .unwrap_or(&self.fallback_texture)
                .create_view(&wgpu::TextureViewDescriptor::default());
            let texture_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-texture-bind-group"),
                        layout: &self.texture_bind_group_layout,
                        entries: &[
                            wgpu::BindGroupEntry {
                                binding: 0,
                                resource: wgpu::BindingResource::TextureView(&input_view),
                            },
                            wgpu::BindGroupEntry {
                                binding: 1,
                                resource: wgpu::BindingResource::Sampler(context.linear_sampler()),
                            },
                            wgpu::BindGroupEntry {
                                binding: 2,
                                resource: wgpu::BindingResource::TextureView(&secondary_view),
                            },
                        ],
                    });
            let uniform_buffer =
                context
                    .device()
                    .create_buffer_init(&wgpu::util::BufferInitDescriptor {
                        label: Some("effects-uniform-buffer"),
                        contents: bytemuck::bytes_of(&pack_effect_uniforms(pass, width, height)?),
                        usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
                    });
            let uniform_bind_group =
                context
                    .device()
                    .create_bind_group(&wgpu::BindGroupDescriptor {
                        label: Some("effects-uniform-bind-group"),
                        layout: &self.uniform_bind_group_layout,
                        entries: &[wgpu::BindGroupEntry {
                            binding: 0,
                            resource: uniform_buffer.as_entire_binding(),
                        }],
                    });
            let pipeline = self.pipelines.get(&pass.shader).ok_or_else(|| {
                EffectsError::UnknownEffectShader {
                    shader: pass.shader.clone(),
                }
            })?;

            {
                let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                    label: Some("effects-render-pass"),
                    color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                        view: &output_view,
                        resolve_target: None,
                        depth_slice: None,
                        ops: wgpu::Operations {
                            load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                            store: wgpu::StoreOp::Store,
                        },
                    })],
                    depth_stencil_attachment: None,
                    occlusion_query_set: None,
                    timestamp_writes: None,
                    multiview_mask: None,
                });
                render_pass.set_pipeline(pipeline);
                render_pass.set_vertex_buffer(0, context.fullscreen_quad().slice(..));
                render_pass.set_bind_group(0, &texture_bind_group, &[]);
                render_pass.set_bind_group(1, &uniform_bind_group, &[]);
                render_pass.draw(0..6, 0..1);
            }

            current_texture = Some(output_texture);
        }

        current_texture.ok_or(EffectsError::MissingEffectPasses)
    }
}

fn pack_effect_uniforms(
    pass: &EffectPass,
    width: u32,
    height: u32,
) -> Result<EffectUniformBuffer, EffectsError> {
    let shader = pass.shader.as_str();
    let spec = shader_spec(shader).ok_or_else(|| EffectsError::UnknownEffectShader {
        shader: shader.to_string(),
    })?;

    let mut buffer = EffectUniformBuffer {
        resolution: [width as f32, height as f32],
        direction: [0.0, 0.0],
        values: [0.0; 28],
    };

    let mut cursor = 0usize;
    for (name, kind) in spec {
        let value = pass.uniforms.get(*name).ok_or_else(|| {
            EffectsError::MissingUniform {
                shader: shader.to_string(),
                uniform: (*name).to_string(),
            }
        })?;
        let components = kind.components();
        if cursor + components > buffer.values.len() {
            return Err(EffectsError::UniformBufferOverflow {
                shader: shader.to_string(),
            });
        }
        match (kind, value) {
            (UniformKind::Scalar, UniformValue::Number(value)) => {
                buffer.values[cursor] = *value;
            }
            (UniformKind::Scalar, UniformValue::Vector(_)) => {
                return Err(EffectsError::InvalidNumberUniform {
                    shader: shader.to_string(),
                    uniform: (*name).to_string(),
                });
            }
            (_, UniformValue::Number(_)) => {
                return Err(EffectsError::InvalidVectorUniform {
                    shader: shader.to_string(),
                    uniform: (*name).to_string(),
                    expected_length: components,
                });
            }
            (_, UniformValue::Vector(values)) => {
                if values.len() != components {
                    return Err(EffectsError::InvalidVectorUniform {
                        shader: shader.to_string(),
                        uniform: (*name).to_string(),
                        expected_length: components,
                    });
                }
                buffer.values[cursor..cursor + components].copy_from_slice(values);
            }
        }
        if *name == "u_direction" {
            buffer.direction = [buffer.values[cursor], buffer.values[cursor + 1]];
        }
        cursor += components;
    }

    for uniform in pass.uniforms.keys() {
        if !spec.iter().any(|(name, _)| name == uniform) {
            return Err(EffectsError::UnsupportedUniform {
                shader: shader.to_string(),
                uniform: uniform.clone(),
            });
        }
    }

    Ok(buffer)
}

// Keep claim tests independent of WebKit/GTK development headers. The pure
// local capture contract is compiled in every `cargo test`; the Tauri shell is
// compiled for the application and package builds only.
#[cfg_attr(not(feature = "desktop"), allow(dead_code))]
mod core;

#[cfg(test)]
mod tests;

#[cfg(feature = "desktop")]
use crate::core::{
    bounded_region, read_with_local_runner, CommandLocalOcr, Region, Settings, SettingsStore,
    TemporaryCapture,
};
#[cfg(feature = "desktop")]
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
#[cfg(feature = "desktop")]
use serde::Serialize;
#[cfg(feature = "desktop")]
use std::{
    io::Cursor,
    path::PathBuf,
    sync::Mutex,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
#[cfg(feature = "desktop")]
use tauri::{AppHandle, Emitter, Manager, State};
#[cfg(feature = "desktop")]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(feature = "desktop")]
struct SettingsState(Mutex<Settings>);

#[cfg(feature = "desktop")]
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayPreview {
    png_base64: String,
    width: u32,
    height: u32,
}

#[cfg(feature = "desktop")]
fn primary_display() -> Result<xcap::Monitor, String> {
    xcap::Monitor::all()
        .map_err(|e| format!("Could not find a display: {e}"))?
        .into_iter()
        .next()
        .ok_or_else(|| "No display is available.".into())
}

#[cfg(feature = "desktop")]
fn local_ocr(capture: &TemporaryCapture) -> Result<String, String> {
    read_with_local_runner(
        &CommandLocalOcr {
            executable: "tesseract",
        },
        capture,
    )
}

#[cfg(feature = "desktop")]
fn capture_and_ocr(region: Region) -> Result<String, String> {
    let image = primary_display()?.capture_image().map_err(|e| {
        format!("Could not capture the display. Use windowed or borderless mode: {e}")
    })?;
    let (x, y, width, height) = bounded_region(&region, image.width(), image.height())?;
    let crop = image::imageops::crop_imm(&image, x, y, width, height).to_image();
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let capture = TemporaryCapture {
        path: std::env::temp_dir().join(format!("game-text-beacon-{stamp}.png")),
    };
    crop.save(&capture.path)
        .map_err(|e| format!("Could not prepare the local capture: {e}"))?;
    local_ocr(&capture)
}

#[cfg(feature = "desktop")]
fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not find the settings folder: {e}"))?;
    Ok(directory)
}

#[cfg(feature = "desktop")]
fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app)
        .map(SettingsStore::new)
        .map(|store| store.load())
        .unwrap_or_default()
}

#[cfg(feature = "desktop")]
fn persist_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    SettingsStore::new(settings_path(app)?).save(settings)
}

#[cfg(feature = "desktop")]
fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;
    let shortcut = hotkey
        .parse::<Shortcut>()
        .map_err(|e| format!("That hotkey is not valid: {e}"))?;
    app.global_shortcut()
        .on_shortcut(shortcut, move |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            let state = app.state::<SettingsState>();
            let region = state.0.lock().map(|settings| settings.region.clone());
            match region
                .map_err(|_| "Could not read the saved capture frame.".to_string())
                .and_then(capture_and_ocr)
            {
                Ok(text) => {
                    let _ = app.emit("beacon-read", serde_json::json!({ "text": text }));
                }
                Err(error) => {
                    let _ = app.emit("beacon-error", serde_json::json!({ "error": error }));
                }
            }
        })
        .map_err(|e| format!("That hotkey is unavailable: {e}"))
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_settings(state: State<'_, SettingsState>) -> Result<Settings, String> {
    state
        .0
        .lock()
        .map(|settings| settings.clone())
        .map_err(|_| "Could not read saved settings.".into())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn save_settings(
    app: AppHandle,
    state: State<'_, SettingsState>,
    settings: Settings,
) -> Result<(), String> {
    if settings.region.width < 1 || settings.region.height < 1 {
        return Err("The capture frame needs a width and height.".into());
    }
    register_hotkey(&app, &settings.hotkey)?;
    persist_settings(&app, &settings)?;
    *state
        .0
        .lock()
        .map_err(|_| "Could not save settings.".to_string())? = settings;
    Ok(())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn capture_region(region: Region) -> Result<String, String> {
    capture_and_ocr(region)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn capture_preview(app: AppHandle) -> Result<DisplayPreview, String> {
    // The picker must show the game, not Beacon itself. Briefly hide the
    // control window before sampling the primary display, then restore it.
    let window = app.get_webview_window("main");
    if let Some(window) = &window {
        let _ = window.hide();
        thread::sleep(std::time::Duration::from_millis(180));
    }
    let captured = primary_display().and_then(|monitor| {
        monitor
            .capture_image()
            .map_err(|e| format!("Could not show the display preview: {e}"))
    });
    if let Some(window) = &window {
        let _ = window.show();
        let _ = window.set_focus();
    }
    let image = captured?;
    let (width, height) = (image.width(), image.height());
    let mut png = Vec::new();
    image::DynamicImage::ImageRgba8(image)
        .write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
        .map_err(|e| format!("Could not prepare the display preview: {e}"))?;
    Ok(DisplayPreview {
        png_base64: BASE64.encode(png),
        width,
        height,
    })
}

#[cfg(feature = "desktop")]
pub fn run() {
    tauri::Builder::default()
        .manage(SettingsState(Mutex::new(Settings::default())))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = load_settings(&handle);
            *handle
                .state::<SettingsState>()
                .0
                .lock()
                .expect("settings lock") = settings.clone();
            if let Err(error) = register_hotkey(&handle, &settings.hotkey) {
                eprintln!(
                    "Game Text Beacon could not register {}: {error}",
                    settings.hotkey
                );
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            capture_region,
            capture_preview
        ])
        .run(tauri::generate_context!())
        .expect("error while running Game Text Beacon");
}

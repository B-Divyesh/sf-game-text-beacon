use crate::core::{load_settings_at, local_ocr_with, persist_settings_at, Region, Settings, TemporaryCapture};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use std::{io::Cursor, path::PathBuf, sync::Mutex, thread, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

struct SettingsState(Mutex<Settings>);

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayPreview { png_base64: String, width: u32, height: u32 }

fn primary_display() -> Result<xcap::Monitor, String> {
    xcap::Monitor::all().map_err(|e| format!("Could not find a display: {e}"))?
        .into_iter().next().ok_or_else(|| "No display is available.".into())
}

fn capture_and_ocr(region: Region) -> Result<String, String> {
    if region.width < 1 || region.height < 1 { return Err("The capture frame needs a width and height.".into()); }
    let image = primary_display()?.capture_image().map_err(|e| format!("Could not capture the display. Use windowed or borderless mode: {e}"))?;
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    if x >= image.width() || y >= image.height() { return Err("The capture frame is outside the primary display. Move it back over the game text.".into()); }
    let width = (region.width as u32).min(image.width() - x);
    let height = (region.height as u32).min(image.height() - y);
    let crop = image::imageops::crop_imm(&image, x, y, width, height).to_image();
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_millis();
    let capture = TemporaryCapture::from_path(std::env::temp_dir().join(format!("game-text-beacon-{stamp}.png")));
    crop.save(capture.path()).map_err(|e| format!("Could not prepare the local capture: {e}"))?;
    local_ocr_with("tesseract", &capture)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app.path().app_data_dir().map_err(|e| format!("Could not find the settings folder: {e}"))?.join("settings.json"))
}
fn load_settings(app: &AppHandle) -> Settings { settings_path(app).map(|path| load_settings_at(&path)).unwrap_or_default() }
fn persist_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> { persist_settings_at(&settings_path(app)?, settings) }

fn register_hotkey(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
    let shortcut = hotkey.parse::<Shortcut>().map_err(|e| format!("That hotkey is not valid: {e}"))?;
    app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state != ShortcutState::Pressed { return; }
        let state = app.state::<SettingsState>();
        let region = state.0.lock().map(|settings| settings.region.clone());
        match region.map_err(|_| "Could not read the saved capture frame.".to_string()).and_then(capture_and_ocr) {
            Ok(text) => { let _ = app.emit("beacon-read", serde_json::json!({ "text": text })); }
            Err(error) => { let _ = app.emit("beacon-error", serde_json::json!({ "error": error })); }
        }
    }).map_err(|e| format!("That hotkey is unavailable: {e}"))
}

#[tauri::command]
fn get_settings(state: State<'_, SettingsState>) -> Result<Settings, String> { state.0.lock().map(|settings| settings.clone()).map_err(|_| "Could not read saved settings.".into()) }

#[tauri::command]
fn save_settings(app: AppHandle, state: State<'_, SettingsState>, settings: Settings) -> Result<(), String> {
    if settings.region.width < 1 || settings.region.height < 1 { return Err("The capture frame needs a width and height.".into()); }
    register_hotkey(&app, &settings.hotkey)?;
    persist_settings(&app, &settings)?;
    *state.0.lock().map_err(|_| "Could not save settings.".to_string())? = settings;
    Ok(())
}
#[tauri::command]
fn capture_region(region: Region) -> Result<String, String> { capture_and_ocr(region) }

#[tauri::command]
fn capture_preview(app: AppHandle) -> Result<DisplayPreview, String> {
    let window = app.get_webview_window("main");
    if let Some(window) = &window { let _ = window.hide(); thread::sleep(std::time::Duration::from_millis(180)); }
    let captured = primary_display().and_then(|monitor| monitor.capture_image().map_err(|e| format!("Could not show the display preview: {e}")));
    if let Some(window) = &window { let _ = window.show(); let _ = window.set_focus(); }
    let image = captured?;
    let (width, height) = (image.width(), image.height());
    let mut png = Vec::new();
    image::DynamicImage::ImageRgba8(image).write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png).map_err(|e| format!("Could not prepare the display preview: {e}"))?;
    Ok(DisplayPreview { png_base64: BASE64.encode(png), width, height })
}

pub fn run() {
    tauri::Builder::default().manage(SettingsState(Mutex::new(Settings::default()))).plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone(); let settings = load_settings(&handle);
            *handle.state::<SettingsState>().0.lock().expect("settings lock") = settings.clone();
            if let Err(error) = register_hotkey(&handle, &settings.hotkey) { eprintln!("Game Text Beacon could not register {}: {error}", settings.hotkey); }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_settings, save_settings, capture_region, capture_preview])
        .run(tauri::generate_context!()).expect("error while running Game Text Beacon");
}

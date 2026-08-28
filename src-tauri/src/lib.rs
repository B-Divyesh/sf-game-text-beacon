use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::Cursor,
    path::PathBuf,
    process::Command,
    sync::Mutex,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Region { x: i32, y: i32, width: i32, height: i32 }

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Settings { region: Region, hotkey: String }

impl Default for Settings {
    fn default() -> Self {
        Self { region: Region { x: 100, y: 100, width: 960, height: 260 }, hotkey: "Ctrl+Shift+R".into() }
    }
}

struct SettingsState(Mutex<Settings>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DisplayPreview { png_base64: String, width: u32, height: u32 }

/// Owns a capture until OCR has finished. Drop is deliberately the cleanup
/// boundary: every return path, including a missing OCR executable, removes it.
struct TemporaryCapture { path: PathBuf }

impl Drop for TemporaryCapture {
    fn drop(&mut self) { let _ = fs::remove_file(&self.path); }
}

fn primary_display() -> Result<xcap::Monitor, String> {
    xcap::Monitor::all().map_err(|e| format!("Could not find a display: {e}"))?
        .into_iter().next().ok_or_else(|| "No display is available.".into())
}

fn local_ocr(capture: &TemporaryCapture) -> Result<String, String> {
    local_ocr_with("tesseract", capture)
}

fn local_ocr_with(executable: &str, capture: &TemporaryCapture) -> Result<String, String> {
    let output = Command::new(executable).arg(&capture.path).arg("stdout").arg("--psm").arg("6").output()
        .map_err(|_| "Beacon needs the local Tesseract OCR engine. Install the packaged OCR dependency, then press the hotkey again.".to_string())?;
    if !output.status.success() { return Err("Tesseract could not read this region. Try a tighter frame with larger text.".into()); }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    if text.is_empty() { return Err("No readable text was found. Move the frame closer to the words and try again.".into()); }
    Ok(text)
}

fn capture_and_ocr(region: Region) -> Result<String, String> {
    if region.width < 1 || region.height < 1 { return Err("The capture frame needs a width and height.".into()); }
    let image = primary_display()?.capture_image()
        .map_err(|e| format!("Could not capture the display. Use windowed or borderless mode: {e}"))?;
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    if x >= image.width() || y >= image.height() { return Err("The capture frame is outside the primary display. Move it back over the game text.".into()); }
    let width = (region.width as u32).min(image.width() - x);
    let height = (region.height as u32).min(image.height() - y);
    let crop = image::imageops::crop_imm(&image, x, y, width, height).to_image();
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_millis();
    let capture = TemporaryCapture { path: std::env::temp_dir().join(format!("game-text-beacon-{stamp}.png")) };
    crop.save(&capture.path).map_err(|e| format!("Could not prepare the local capture: {e}"))?;
    local_ocr(&capture)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|e| format!("Could not find the settings folder: {e}"))?;
    fs::create_dir_all(&directory).map_err(|e| format!("Could not create the settings folder: {e}"))?;
    Ok(directory.join("settings.json"))
}

fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app).ok().and_then(|path| fs::read_to_string(path).ok())
        .and_then(|json| serde_json::from_str(&json).ok()).unwrap_or_default()
}

fn persist_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let json = serde_json::to_vec_pretty(settings).map_err(|e| format!("Could not save settings: {e}"))?;
    fs::write(settings_path(app)?, json).map_err(|e| format!("Could not save settings: {e}"))
}

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
fn get_settings(state: State<'_, SettingsState>) -> Result<Settings, String> {
    state.0.lock().map(|settings| settings.clone()).map_err(|_| "Could not read saved settings.".into())
}

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
    // The picker must show the game, not Beacon itself. Briefly hide the
    // control window before sampling the primary display, then restore it.
    let window = app.get_webview_window("main");
    if let Some(window) = &window { let _ = window.hide(); thread::sleep(std::time::Duration::from_millis(180)); }
    let captured = primary_display().and_then(|monitor| monitor.capture_image()
        .map_err(|e| format!("Could not show the display preview: {e}")));
    if let Some(window) = &window { let _ = window.show(); let _ = window.set_focus(); }
    let image = captured?;
    let (width, height) = (image.width(), image.height());
    let mut png = Vec::new();
    image::DynamicImage::ImageRgba8(image).write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
        .map_err(|e| format!("Could not prepare the display preview: {e}"))?;
    Ok(DisplayPreview { png_base64: BASE64.encode(png), width, height })
}

pub fn run() {
    tauri::Builder::default()
        .manage(SettingsState(Mutex::new(Settings::default())))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = load_settings(&handle);
            *handle.state::<SettingsState>().0.lock().expect("settings lock") = settings.clone();
            if let Err(error) = register_hotkey(&handle, &settings.hotkey) {
                eprintln!("Game Text Beacon could not register {}: {error}", settings.hotkey);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_settings, save_settings, capture_region, capture_preview])
        .run(tauri::generate_context!())
        .expect("error while running Game Text Beacon");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claim_desktop_local_ocr_removes_a_capture_when_tesseract_is_unavailable() {
        println!("@claim:desktop-local-ocr");
        let path = std::env::temp_dir().join(format!("game-text-beacon-test-{}.png", std::process::id()));
        fs::write(&path, b"private pixels").expect("test capture");
        {
            let capture = TemporaryCapture { path: path.clone() };
            let error = local_ocr_with("game-text-beacon-no-tesseract", &capture).expect_err("missing OCR must return an actionable error");
            assert!(error.contains("local Tesseract"));
        }
        assert!(!path.exists(), "the private capture must be removed on the error path");
    }

    #[test]
    fn claim_saved_region_settings_have_a_real_default_frame_and_hotkey() {
        println!("@claim:saved-region-settings");
        let settings = Settings::default();
        assert_eq!(settings.hotkey, "Ctrl+Shift+R");
        assert!(settings.region.width > 0 && settings.region.height > 0);
    }
}

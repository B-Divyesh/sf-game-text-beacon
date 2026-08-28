use serde::Deserialize;
use std::{fs, process::Command, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Region { x: i32, y: i32, width: i32, height: i32 }

fn capture_and_ocr(region: Region) -> Result<String, String> {
    if region.width < 1 || region.height < 1 { return Err("The capture frame needs a width and height.".into()); }
    let monitor = xcap::Monitor::all().map_err(|e| format!("Could not find a display: {e}"))?
        .into_iter().next().ok_or("No display is available.")?;
    let image = monitor.capture_image().map_err(|e| format!("Could not capture the display. Use windowed or borderless mode: {e}"))?;
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    if x >= image.width() || y >= image.height() { return Err("The capture frame is outside the primary display. Move it back over the game text.".into()); }
    let width = (region.width as u32).min(image.width() - x);
    let height = (region.height as u32).min(image.height() - y);
    let crop = image::imageops::crop_imm(&image, x, y, width, height).to_image();
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e| e.to_string())?.as_millis();
    let path = std::env::temp_dir().join(format!("game-text-beacon-{stamp}.png"));
    crop.save(&path).map_err(|e| format!("Could not prepare the local capture: {e}"))?;
    let output = Command::new("tesseract").arg(&path).arg("stdout").arg("--psm").arg("6").output()
        .map_err(|_| "Beacon needs the local Tesseract OCR engine. Install Tesseract, then press the hotkey again.".to_string())?;
    let _ = fs::remove_file(&path);
    if !output.status.success() { return Err("Tesseract could not read this region. Try a tighter frame with larger text.".into()); }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    if text.is_empty() { return Err("No readable text was found. Move the frame closer to the words and try again.".into()); }
    Ok(text)
}

#[tauri::command]
fn set_hotkey(app: AppHandle, hotkey: String, region: Region) -> Result<(), String> {
    app.global_shortcut().unregister_all().map_err(|e| e.to_string())?;
    let shortcut = hotkey.parse::<Shortcut>().map_err(|e| format!("That hotkey is not valid: {e}"))?;
    let frame = region.clone();
    app.global_shortcut().on_shortcut(shortcut, move |app, _shortcut, event| {
        if event.state != ShortcutState::Pressed { return; }
        match capture_and_ocr(frame.clone()) {
            Ok(text) => { let _ = app.emit("beacon-read", serde_json::json!({ "text": text })); }
            Err(error) => { let _ = app.emit("beacon-error", serde_json::json!({ "error": error })); }
        }
    }).map_err(|e| format!("That hotkey is unavailable: {e}"))
}

#[tauri::command]
fn capture_region(region: Region) -> Result<String, String> { capture_and_ocr(region) }

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![set_hotkey, capture_region])
        .run(tauri::generate_context!())
        .expect("error while running Game Text Beacon");
}

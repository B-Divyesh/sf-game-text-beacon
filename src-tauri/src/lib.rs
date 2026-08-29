// Keep claim tests independent of WebKit/GTK development headers. The pure
// local capture contract is compiled in every `cargo test`; the Tauri shell is
// compiled for the application and package builds only.
#[cfg_attr(not(feature = "desktop"), allow(dead_code))]
mod core;

#[cfg(test)]
mod tests;

#[cfg(feature = "desktop")]
use crate::core::{
    bounded_region, bundled_ocr_runtime, development_ocr_runner, platform_runtime_name,
    read_with_local_runner, spawn_bundled_linux_speech, spawn_local_speech, BundledOcrRuntime,
    Region, Settings, SettingsStore, TemporaryCapture,
};
#[cfg(feature = "desktop")]
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
#[cfg(feature = "desktop")]
use serde::Serialize;
#[cfg(feature = "desktop")]
use std::{
    io::Cursor,
    path::PathBuf,
    sync::{Arc, Mutex},
    thread,
    time::Duration,
    time::{SystemTime, UNIX_EPOCH},
};
#[cfg(feature = "desktop")]
use tauri::{AppHandle, Emitter, Manager, State};
#[cfg(feature = "desktop")]
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[cfg(feature = "desktop")]
struct SettingsState(Mutex<Settings>);

#[cfg(feature = "desktop")]
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyStatus {
    hotkey: String,
    is_registered: bool,
    error: Option<String>,
}

#[cfg(feature = "desktop")]
impl HotkeyStatus {
    fn checking(hotkey: String) -> Self {
        Self {
            hotkey,
            is_registered: false,
            error: Some("Beacon has not confirmed this hotkey yet.".into()),
        }
    }

    fn registered(hotkey: String) -> Self {
        Self {
            hotkey,
            is_registered: true,
            error: None,
        }
    }

    fn unavailable(hotkey: String, error: String) -> Self {
        Self {
            hotkey,
            is_registered: false,
            error: Some(error),
        }
    }
}

#[cfg(feature = "desktop")]
struct HotkeyState(Mutex<HotkeyStatus>);

#[cfg(feature = "desktop")]
#[derive(Clone, Default)]
struct SpeechState {
    current: Arc<Mutex<Option<std::process::Child>>>,
    serial: Arc<Mutex<()>>,
}

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
fn app_bundled_ocr_runtime(app: &AppHandle) -> Option<BundledOcrRuntime> {
    let resource_dir = app.path().resource_dir().ok();
    let mut roots = resource_dir.clone().into_iter().collect::<Vec<_>>();
    if let Some(product_name) = app.config().product_name.as_ref() {
        if let Some(library_directory) = resource_dir.as_ref().and_then(|path| path.parent()) {
            roots.push(library_directory.join(product_name));
        }
        if let Ok(executable) = std::env::current_exe() {
            if let Some(usr_directory) =
                executable.parent().and_then(|directory| directory.parent())
            {
                roots.push(usr_directory.join("lib").join(product_name));
            }
        }
        // Debian installs Tauri resources below /usr/lib/<Product Name>.
        // Ask the packaged location directly as well: resource_dir differs
        // across tauri-bundler versions and can be unavailable in a sandboxed
        // installed process.
        #[cfg(target_os = "linux")]
        roots.push(PathBuf::from("/usr/lib").join(product_name));
    }
    // Tauri's resource directory is the `resources` folder on Windows and
    // macOS, while Linux package layouts may expose the app library directory
    // above it. The package-name path can also differ from the display product
    // name on Linux, so check the concrete bundled product directory too.
    // No release build ever falls back to a system OCR executable.
    roots
        .into_iter()
        .flat_map(|directory| [directory.clone(), directory.join("resources")])
        .map(|directory| bundled_ocr_runtime(&directory, platform_runtime_name()))
        .find(BundledOcrRuntime::is_complete)
}

#[cfg(feature = "desktop")]
fn local_ocr(app: &AppHandle, capture: &TemporaryCapture) -> Result<String, String> {
    if let Some(bundled) = app_bundled_ocr_runtime(app) {
        return read_with_local_runner(&bundled.into_runner(), capture);
    }

    // A dev build is intentionally allowed to use the developer's Tesseract
    // installation. This branch is compiled out of release builds so every
    // downloaded app uses its own OCR payload and language data.
    if cfg!(debug_assertions) {
        return read_with_local_runner(&development_ocr_runner(), capture);
    }

    Err("Beacon's bundled OCR engine is incomplete. Reinstall the desktop package, then press the hotkey again.".into())
}

#[cfg(feature = "desktop")]
fn capture_and_ocr(app: &AppHandle, region: Region) -> Result<String, String> {
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
    local_ocr(app, &capture)
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
    let shortcut = hotkey
        .parse::<Shortcut>()
        .map_err(|e| format!("That hotkey is not valid: {e}"))?;
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;
    app.global_shortcut()
        .on_shortcut(shortcut, move |app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }
            let state = app.state::<SettingsState>();
            let region = state.0.lock().map(|settings| settings.region.clone());
            match region
                .map_err(|_| "Could not read the saved capture frame.".to_string())
                .and_then(|region| capture_and_ocr(app, region))
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
fn record_hotkey_status(app: &AppHandle, status: HotkeyStatus) -> Result<(), String> {
    *app.state::<HotkeyState>()
        .0
        .lock()
        .map_err(|_| "Could not update the hotkey status.".to_string())? = status;
    Ok(())
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
fn get_hotkey_status(state: State<'_, HotkeyState>) -> Result<HotkeyStatus, String> {
    state
        .0
        .lock()
        .map(|status| status.clone())
        .map_err(|_| "Could not read the hotkey status.".into())
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
    let previous = state
        .0
        .lock()
        .map_err(|_| "Could not read saved settings.".to_string())?
        .clone();
    if let Err(error) = register_hotkey(&app, &settings.hotkey) {
        // Registering a replacement first releases the current shortcut. Put
        // the last working shortcut back so a rejected edit does not silently
        // disable an otherwise usable app.
        let restored = register_hotkey(&app, &previous.hotkey).is_ok();
        record_hotkey_status(
            &app,
            if restored {
                HotkeyStatus::registered(previous.hotkey)
            } else {
                HotkeyStatus::unavailable(settings.hotkey.clone(), error.clone())
            },
        )?;
        return Err(error);
    }
    record_hotkey_status(&app, HotkeyStatus::registered(settings.hotkey.clone()))?;
    persist_settings(&app, &settings)?;
    *state
        .0
        .lock()
        .map_err(|_| "Could not save settings.".to_string())? = settings;
    Ok(())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn capture_region(app: AppHandle, region: Region) -> Result<String, String> {
    capture_and_ocr(&app, region)
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
fn bundled_speech_runtime(app: &AppHandle) -> Result<Option<(PathBuf, PathBuf)>, String> {
    #[cfg(target_os = "linux")]
    {
        if let Some(runtime) = app_bundled_ocr_runtime(app) {
            let executable = runtime
                .executable
                .parent()
                .unwrap_or(&runtime.executable)
                .join("speech/espeak-ng");
            if executable.is_file() {
                return Ok(Some((executable, runtime.library_dir)));
            }
        }
        if !cfg!(debug_assertions) {
            return Err("Beacon's bundled local voice is incomplete. Reinstall the desktop package, then try again.".into());
        }
    }
    Ok(None)
}

#[cfg(feature = "desktop")]
fn run_local_speech(
    state: SpeechState,
    text: String,
    bundled_speech: Option<(PathBuf, PathBuf)>,
) -> Result<(), String> {
    let _turn = state
        .serial
        .lock()
        .map_err(|_| "The local speech queue is unavailable.".to_string())?;
    let child = match bundled_speech {
        Some((executable, library_dir)) => {
            spawn_bundled_linux_speech(&text, &executable, &library_dir)?
        }
        None => spawn_local_speech(&text)?,
    };
    *state
        .current
        .lock()
        .map_err(|_| "The local voice could not start.".to_string())? = Some(child);

    loop {
        let mut current = state
            .current
            .lock()
            .map_err(|_| "The local voice became unavailable.".to_string())?;
        let Some(child) = current.as_mut() else {
            // Stop reading removes and terminates the current child.
            return Ok(());
        };
        match child
            .try_wait()
            .map_err(|error| format!("The local voice stopped unexpectedly: {error}"))?
        {
            Some(status) => {
                current.take();
                return if status.success() {
                    Ok(())
                } else {
                    Err("The local voice could not use the system audio output. Check the selected output device, then try again.".into())
                };
            }
            None => {
                drop(current);
                thread::sleep(Duration::from_millis(20));
            }
        }
    }
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn speak_text(
    app: AppHandle,
    text: String,
    state: State<'_, SpeechState>,
) -> Result<(), String> {
    let state = state.inner().clone();
    let bundled_speech = bundled_speech_runtime(&app)?;
    tauri::async_runtime::spawn_blocking(move || run_local_speech(state, text, bundled_speech))
        .await
        .map_err(|error| format!("The local voice task ended unexpectedly: {error}"))?
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn stop_speech(state: State<'_, SpeechState>) -> Result<(), String> {
    let mut current = state
        .current
        .lock()
        .map_err(|_| "The local voice could not be stopped.".to_string())?;
    if let Some(mut child) = current.take() {
        child
            .kill()
            .map_err(|error| format!("The local voice could not be stopped: {error}"))?;
        let _ = child.wait();
    }
    Ok(())
}

#[cfg(feature = "desktop")]
pub fn run() {
    let default_hotkey = Settings::default().hotkey;
    tauri::Builder::default()
        .manage(SettingsState(Mutex::new(Settings::default())))
        .manage(HotkeyState(Mutex::new(HotkeyStatus::checking(
            default_hotkey,
        ))))
        .manage(SpeechState::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            let settings = load_settings(&handle);
            *handle
                .state::<SettingsState>()
                .0
                .lock()
                .expect("settings lock") = settings.clone();
            let status = match register_hotkey(&handle, &settings.hotkey) {
                Ok(()) => HotkeyStatus::registered(settings.hotkey.clone()),
                Err(error) => {
                    eprintln!(
                        "Game Text Beacon could not register {}: {error}",
                        settings.hotkey
                    );
                    HotkeyStatus::unavailable(settings.hotkey.clone(), error)
                }
            };
            record_hotkey_status(&handle, status).map_err(std::io::Error::other)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            get_hotkey_status,
            save_settings,
            capture_region,
            capture_preview,
            speak_text,
            stop_speech
        ])
        .run(tauri::generate_context!())
        .expect("error while running Game Text Beacon");
}

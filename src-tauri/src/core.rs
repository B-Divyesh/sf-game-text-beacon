use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Child, Command},
};

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Region {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub region: Region,
    pub hotkey: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            region: Region {
                x: 100,
                y: 100,
                width: 960,
                height: 260,
            },
            hotkey: "Ctrl+Shift+R".into(),
        }
    }
}

/// A private capture owns its file until the local OCR process has finished.
pub struct TemporaryCapture {
    pub path: PathBuf,
}

impl Drop for TemporaryCapture {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}

pub trait LocalOcrRunner {
    fn read(&self, image_path: &Path) -> Result<String, String>;
}

/// The desktop shell invokes the Tesseract executable installed with the app's
/// Linux package. This runner is deliberately process-only: it has no HTTP
/// client, endpoint, or upload path.
pub struct CommandLocalOcr {
    pub executable: &'static str,
}

/// Starts speech with the operating system's local voice command. Linux
/// packages install eSpeak NG alongside Beacon; macOS and Windows use their
/// built-in speech commands. Text is always passed as one process argument,
/// never through a shell.
pub fn spawn_local_speech(text: &str) -> Result<Child, String> {
    if text.trim().is_empty() {
        return Err("There is no text to read aloud.".into());
    }

    #[cfg(target_os = "linux")]
    let candidates: &[(&str, &[&str])] = &[
        ("espeak-ng", &["-s", "160", "--"]),
        ("espeak", &["-s", "160", "--"]),
    ];
    #[cfg(target_os = "macos")]
    let candidates: &[(&str, &[&str])] = &[("say", &["-r", "185", "--"])];
    #[cfg(target_os = "windows")]
    let candidates: &[(&str, &[&str])] = &[(
        "powershell.exe",
        &[
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "Add-Type -AssemblyName System.Speech; $voice = New-Object System.Speech.Synthesis.SpeechSynthesizer; $voice.Rate = -1; $voice.Speak($args[0])",
            "--",
        ],
    )];

    let mut last_error = None;
    for (program, arguments) in candidates {
        match Command::new(program).args(*arguments).arg(text).spawn() {
            Ok(child) => return Ok(child),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => last_error = Some(error),
            Err(error) => {
                return Err(format!(
                    "The local voice could not start. Check the system audio output, then try again: {error}"
                ))
            }
        }
    }

    Err(format!(
        "No local voice is installed. Reinstall the Beacon package to add its speech engine, then try again.{}",
        last_error
            .map(|error| format!(" ({error})"))
            .unwrap_or_default()
    ))
}

impl LocalOcrRunner for CommandLocalOcr {
    fn read(&self, image_path: &Path) -> Result<String, String> {
        let output = Command::new(self.executable)
            .arg(image_path)
            .arg("stdout")
            .arg("--psm")
            .arg("6")
            .output()
            .map_err(|_| "Beacon needs the local Tesseract OCR engine. Install the packaged OCR dependency, then press the hotkey again.".to_string())?;
        if !output.status.success() {
            return Err(
                "Tesseract could not read this region. Try a tighter frame with larger text."
                    .into(),
            );
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }
}

pub fn read_with_local_runner(
    runner: &impl LocalOcrRunner,
    capture: &TemporaryCapture,
) -> Result<String, String> {
    let text = runner.read(&capture.path)?.trim().to_owned();
    if text.is_empty() {
        return Err(
            "No readable text was found. Move the frame closer to the words and try again.".into(),
        );
    }
    Ok(text)
}

pub struct SettingsStore {
    directory: PathBuf,
}

impl SettingsStore {
    pub fn new(directory: PathBuf) -> Self {
        Self { directory }
    }
    fn path(&self) -> PathBuf {
        self.directory.join("settings.json")
    }
    pub fn load(&self) -> Settings {
        fs::read_to_string(self.path())
            .ok()
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or_default()
    }
    pub fn save(&self, settings: &Settings) -> Result<(), String> {
        fs::create_dir_all(&self.directory)
            .map_err(|e| format!("Could not create the settings folder: {e}"))?;
        let json = serde_json::to_vec_pretty(settings)
            .map_err(|e| format!("Could not save settings: {e}"))?;
        fs::write(self.path(), json).map_err(|e| format!("Could not save settings: {e}"))
    }
}

pub fn bounded_region(
    region: &Region,
    image_width: u32,
    image_height: u32,
) -> Result<(u32, u32, u32, u32), String> {
    if region.width < 1 || region.height < 1 {
        return Err("The capture frame needs a width and height.".into());
    }
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    if x >= image_width || y >= image_height {
        return Err(
            "The capture frame is outside the primary display. Move it back over the game text."
                .into(),
        );
    }
    Ok((
        x,
        y,
        (region.width as u32).min(image_width - x),
        (region.height as u32).min(image_height - y),
    ))
}

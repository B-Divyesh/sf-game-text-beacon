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

/// The desktop shell invokes the Tesseract runtime that ships inside the app.
/// This runner is deliberately process-only: it has no HTTP client, endpoint,
/// or upload path.
pub struct CommandLocalOcr {
    pub executable: PathBuf,
    pub tessdata_dir: Option<PathBuf>,
    pub library_dir: Option<PathBuf>,
}

/// Exact layout copied by `scripts/prepare-ocr-runtime.mjs` and Tauri's
/// `bundle.resources` mapping. Keeping the layout in one pure function lets
/// the app and installed-package checks prove the same contract.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BundledOcrRuntime {
    pub executable: PathBuf,
    pub tessdata_dir: PathBuf,
    pub library_dir: PathBuf,
}

pub fn bundled_ocr_runtime(resource_dir: &Path, platform: &str) -> BundledOcrRuntime {
    let runtime = resource_dir.join("ocr").join(platform);
    let executable = if platform == "windows" {
        runtime.join("tesseract.exe")
    } else {
        runtime.join("tesseract")
    };
    BundledOcrRuntime {
        executable,
        tessdata_dir: runtime.join("tessdata"),
        library_dir: runtime.join("lib"),
    }
}

pub fn platform_runtime_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

impl BundledOcrRuntime {
    pub fn into_runner(self) -> CommandLocalOcr {
        CommandLocalOcr {
            executable: self.executable,
            tessdata_dir: Some(self.tessdata_dir),
            library_dir: Some(self.library_dir),
        }
    }

    pub fn is_complete(&self) -> bool {
        self.executable.is_file() && self.tessdata_dir.join("eng.traineddata").is_file()
    }
}

/// Development runs do not have a bundle resource directory. They may use the
/// developer's locally installed Tesseract, but release builds never do: a
/// missing bundled engine is an actionable packaging failure rather than a
/// surprise PATH dependency for a player.
pub fn development_ocr_runner() -> CommandLocalOcr {
    CommandLocalOcr {
        executable: PathBuf::from("tesseract"),
        tessdata_dir: None,
        library_dir: None,
    }
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

/// Linux AppImage installs have no package manager to provide a voice engine.
/// The release build therefore places eSpeak NG alongside the bundled OCR
/// runtime and starts it by absolute path with its private library directory.
pub fn spawn_bundled_linux_speech(
    text: &str,
    executable: &Path,
    library_dir: &Path,
) -> Result<Child, String> {
    if text.trim().is_empty() {
        return Err("There is no text to read aloud.".into());
    }
    let mut command = Command::new(executable);
    let data_root = executable.parent().ok_or({
        "The bundled local voice has no data folder. Reinstall the desktop package, then try again."
    })?;
    command
        .arg(format!("--path={}", data_root.display()))
        .args(["-s", "160", "--"])
        .arg(text);
    #[cfg(target_os = "linux")]
    command.env("LD_LIBRARY_PATH", library_dir);
    command.spawn().map_err(|error| {
        format!(
            "The bundled local voice could not start. Reinstall the desktop package, then try again: {error}"
        )
    })
}

impl LocalOcrRunner for CommandLocalOcr {
    fn read(&self, image_path: &Path) -> Result<String, String> {
        let mut command = Command::new(&self.executable);
        command.arg(image_path).arg("stdout").arg("--psm").arg("6");
        if let Some(tessdata_dir) = &self.tessdata_dir {
            command.env("TESSDATA_PREFIX", tessdata_dir);
        }
        if let Some(library_dir) = &self.library_dir {
            if library_dir.is_dir() {
                #[cfg(target_os = "windows")]
                {
                    let existing = std::env::var_os("PATH").unwrap_or_default();
                    let paths = std::env::join_paths(
                        std::iter::once(library_dir.to_path_buf())
                            .chain(std::env::split_paths(&existing)),
                    )
                    .map_err(|error| format!("Could not start the bundled OCR engine: {error}"))?;
                    command.env("PATH", paths);
                }
                #[cfg(target_os = "macos")]
                command.env("DYLD_LIBRARY_PATH", library_dir);
                #[cfg(target_os = "linux")]
                command.env("LD_LIBRARY_PATH", library_dir);
            }
        }
        let output = command
            .output()
            .map_err(|_| "Beacon could not start its bundled local Tesseract OCR engine. Reinstall the desktop package, then press the hotkey again.".to_string())?;
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

use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
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

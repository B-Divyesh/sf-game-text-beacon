use super::core::*;
use std::{cell::RefCell, fs, path::Path};

fn temp_directory(label: &str) -> std::path::PathBuf {
    let path =
        std::env::temp_dir().join(format!("game-text-beacon-{label}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

struct RecordingLocalOcr {
    seen: RefCell<Vec<std::path::PathBuf>>,
}
impl LocalOcrRunner for RecordingLocalOcr {
    fn read(&self, image_path: &Path) -> Result<String, String> {
        self.seen.borrow_mut().push(image_path.to_path_buf());
        assert_eq!(
            fs::read(image_path).expect("private capture exists"),
            b"private pixels"
        );
        Ok("Find the weathered radio tower.".into())
    }
}

#[test]
fn claim_desktop_local_ocr_runs_a_local_reader_and_discards_private_pixels() {
    println!("@claim:desktop-local-ocr");
    let directory = temp_directory("ocr");
    fs::create_dir_all(&directory).expect("test directory");
    let path = directory.join("capture.png");
    fs::write(&path, b"private pixels").expect("private test capture");
    let runner = RecordingLocalOcr {
        seen: RefCell::new(vec![]),
    };
    {
        let capture = TemporaryCapture { path: path.clone() };
        assert_eq!(
            read_with_local_runner(&runner, &capture).expect("local result"),
            "Find the weathered radio tower."
        );
    }
    assert_eq!(runner.seen.into_inner(), vec![path.clone()]);
    assert!(
        !path.exists(),
        "the capture is deleted after local OCR completes"
    );
    let _ = fs::remove_dir_all(directory);
}

#[test]
fn claim_saved_region_settings_persist_across_a_fresh_local_store() {
    println!("@claim:saved-region-settings");
    let directory = temp_directory("settings");
    let expected = Settings {
        region: Region {
            x: 44,
            y: 88,
            width: 640,
            height: 240,
        },
        hotkey: "Ctrl+Alt+T".into(),
    };
    SettingsStore::new(directory.clone())
        .save(&expected)
        .expect("save settings locally");
    assert_eq!(SettingsStore::new(directory.clone()).load(), expected);
    assert!(
        directory.join("settings.json").exists(),
        "settings have an observable local file"
    );
    let _ = fs::remove_dir_all(directory);
}

#[test]
fn claim_windowed_capture_bounds_the_selected_frame_to_the_local_display() {
    println!("@claim:windowed-capture");
    let selected = Region {
        x: -10,
        y: 700,
        width: 960,
        height: 260,
    };
    assert_eq!(
        bounded_region(&selected, 1280, 800).expect("bounded region"),
        (0, 700, 960, 100)
    );
    assert!(bounded_region(
        &Region {
            x: 1280,
            y: 0,
            width: 1,
            height: 1
        },
        1280,
        800
    )
    .is_err());
}

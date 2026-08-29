use super::core::*;
use std::{fs, path::Path};

fn temp_directory(label: &str) -> std::path::PathBuf {
    let path =
        std::env::temp_dir().join(format!("game-text-beacon-{label}-{}", std::process::id()));
    let _ = fs::remove_dir_all(&path);
    path
}

#[test]
fn claim_desktop_local_ocr_invokes_local_tesseract_without_a_network_path() {
    println!("@claim:desktop-local-ocr");
    let directory = temp_directory("ocr");
    fs::create_dir_all(&directory).expect("test directory");
    let path = directory.join("capture.png");
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("icons/32x32.png");
    fs::copy(&fixture, &path).expect("copy local image fixture");
    let runner = CommandLocalOcr {
        executable: "tesseract".into(),
        tessdata_dir: None,
        library_dir: None,
    };
    {
        let capture = TemporaryCapture { path: path.clone() };
        // A tiny icon may contain no text, but this still executes the real
        // packaged OCR process through the same desktop command runner.
        let result = read_with_local_runner(&runner, &capture);
        assert!(result.is_ok() || result == Err("No readable text was found. Move the frame closer to the words and try again.".into()));
    }
    assert!(
        !path.exists(),
        "the capture is deleted after local OCR completes"
    );
    let core_source = include_str!("core.rs");
    assert!(core_source.contains("Command::new(&self.executable)"));
    assert!(core_source.contains("TESSDATA_PREFIX"));
    assert!(!core_source.contains("http://") && !core_source.contains("https://"));
    let _ = fs::remove_dir_all(directory);
}

#[test]
fn bundled_ocr_runtime_requires_an_executable_and_english_language_data() {
    let directory = temp_directory("bundled-runtime");
    let runtime = bundled_ocr_runtime(&directory, "windows");
    assert_eq!(
        runtime.executable,
        directory.join("ocr/windows/tesseract.exe")
    );
    assert_eq!(runtime.tessdata_dir, directory.join("ocr/windows/tessdata"));
    assert!(!runtime.is_complete());

    fs::create_dir_all(&runtime.tessdata_dir).expect("runtime data directory");
    fs::write(&runtime.executable, b"bundled OCR executable").expect("runtime executable");
    fs::write(
        runtime.tessdata_dir.join("eng.traineddata"),
        b"English data",
    )
    .expect("English data");
    assert!(runtime.is_complete());
    let runner = runtime.into_runner();
    assert_eq!(
        runner.executable,
        directory.join("ocr/windows/tesseract.exe")
    );
    assert_eq!(
        runner.tessdata_dir,
        Some(directory.join("ocr/windows/tessdata"))
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

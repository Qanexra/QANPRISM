use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WebviewBuilder, WebviewUrl, LogicalPosition, LogicalSize, Position, Size};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,     // INFO, WARN, ERROR, NETWORK, AGENT
    pub category: String,  // Fetch, Navigation, Script, DOM, Agent, API
    pub message: String,
    pub details: Option<String>,
}

static LOG_BUFFER: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();

fn get_log_buffer() -> &'static Mutex<Vec<LogEntry>> {
    LOG_BUFFER.get_or_init(|| Mutex::new(Vec::with_capacity(500)))
}

fn internal_log(level: &str, category: &str, message: &str, details: Option<&str>) {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let id = format!("log-{}-{}", now.as_millis(), now.subsec_nanos() % 10000);
    let entry = LogEntry {
        id,
        timestamp: format!("{}.{:03}Z", now.as_secs(), now.subsec_millis()),
        level: level.to_string(),
        category: category.to_string(),
        message: message.to_string(),
        details: details.map(|s| s.to_string()),
    };

    println!("[{}] [{}] {}", level, category, message);

    if let Ok(mut buffer) = get_log_buffer().lock() {
        if buffer.len() >= 500 {
            buffer.remove(0);
        }
        buffer.push(entry.clone());
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open("qanprism_internal.log") {
        let _ = writeln!(file, "[{}] [{}] [{}] {}", entry.timestamp, level, category, message);
    }
}

#[tauri::command]
fn log_event(level: String, category: String, message: String, details: Option<String>) {
    internal_log(&level, &category, &message, details.as_deref());
}

#[tauri::command]
fn get_debug_logs() -> Vec<LogEntry> {
    if let Ok(buffer) = get_log_buffer().lock() {
        buffer.clone()
    } else {
        Vec::new()
    }
}

#[tauri::command]
fn clear_debug_logs() {
    if let Ok(mut buffer) = get_log_buffer().lock() {
        buffer.clear();
    }
}

// ------------------------------------------------------------------------------------------------
// Native Multi-Webview Tab Engine (Ladybird / Tauri v2 Native Architecture)
// ------------------------------------------------------------------------------------------------



fn adjust_webviews_layout(app: &AppHandle, active_tab_id: &str, x: f64, y: f64, width: f64, height: f64) {
    // 1. Constrain main UI webview so it ONLY covers the top bar (y: 0 to y: y)
    if let Some(main_webview) = app.get_webview("main") {
        if let Some(window) = app.get_window("main") {
            if let Ok(win_size) = window.inner_size() {
                let win_w = win_size.width as f64;
                let top_h = if y > 0.0 { y } else { 96.0 };
                let _ = main_webview.set_position(Position::Logical(LogicalPosition::new(0.0, 0.0)));
                let _ = main_webview.set_size(Size::Logical(LogicalSize::new(win_w, top_h)));
            }
        }
    }

    // 2. Position active tab webview in the remaining content area
    for (label, webview) in app.webviews() {
        if label == "main" {
            continue;
        }
        if label == active_tab_id {
            let _ = webview.set_position(Position::Logical(LogicalPosition::new(x, y)));
            let _ = webview.set_size(Size::Logical(LogicalSize::new(width, height)));
            let _ = webview.set_focus();
        } else {
            let _ = webview.set_position(Position::Logical(LogicalPosition::new(-20000.0, -20000.0)));
            let _ = webview.set_size(Size::Logical(LogicalSize::new(100.0, 100.0)));
        }
    }
}

#[tauri::command]
fn create_tab_webview(
    app: AppHandle,
    tab_id: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    internal_log("INFO", "TabEngine", &format!("Create request: [{}] -> {} at ({},{},{},{})", tab_id, url, x, y, width, height), None);

    if let Some(existing_webview) = app.get_webview(&tab_id) {
        adjust_webviews_layout(&app, &tab_id, x, y, width, height);
        if let Ok(parsed) = url.parse() {
            let _ = existing_webview.navigate(parsed);
        }
        return Ok(());
    }

    let app_clone = app.clone();
    let tab_id_clone = tab_id.clone();
    let url_clone = url.clone();

    tauri::async_runtime::spawn(async move {
        let window = match app_clone.get_window("main") {
            Some(w) => w,
            None => {
                internal_log("ERROR", "TabEngine", "Main window not found", None);
                return;
            }
        };

        let parsed_url: url::Url = match url_clone.parse() {
            Ok(u) => u,
            Err(_) => match format!("https://{}", url_clone).parse() {
                Ok(u) => u,
                Err(_) => match url::Url::parse("https://www.google.com") {
                    Ok(u) => u,
                    Err(e) => {
                        internal_log("ERROR", "TabEngine", &format!("Failed to parse URL: {}", e), None);
                        return;
                    }
                },
            },
        };

        let webview_builder = WebviewBuilder::new(&tab_id_clone, WebviewUrl::External(parsed_url))
            .auto_resize();

        match window.add_child(
            webview_builder,
            Position::Logical(LogicalPosition::new(x, y)),
            Size::Logical(LogicalSize::new(width, height)),
        ) {
            Ok(_) => {
                internal_log("INFO", "TabEngine", &format!("Native webview [{}] attached successfully at ({},{},{},{})", tab_id_clone, x, y, width, height), None);
                adjust_webviews_layout(&app_clone, &tab_id_clone, x, y, width, height);
            }
            Err(e) => {
                internal_log("ERROR", "TabEngine", &format!("Failed to add child webview [{}]: {}", tab_id_clone, e), None);
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn set_tab_webview_active(
    app: AppHandle,
    active_tab_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    adjust_webviews_layout(&app, &active_tab_id, x, y, width, height);
    Ok(())
}

#[tauri::command]
fn update_tab_webview_bounds(
    app: AppHandle,
    tab_id: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    adjust_webviews_layout(&app, &tab_id, x, y, width, height);
    Ok(())
}

#[tauri::command]
fn navigate_tab_webview(app: AppHandle, tab_id: String, url: String) -> Result<(), String> {
    internal_log("INFO", "Navigation", &format!("Navigating tab [{}] -> {}", tab_id, url), None);
    if let Some(webview) = app.get_webview(&tab_id) {
        let parsed_url: Result<url::Url, _> = url.parse().or_else(|_| format!("https://{}", url).parse());
        if let Ok(u) = parsed_url {
            let _ = webview.navigate(u);
        }
    }
    Ok(())
}

#[tauri::command]
fn close_tab_webview(app: AppHandle, tab_id: String) -> Result<(), String> {
    internal_log("INFO", "TabEngine", &format!("Closing native webview [{}]", tab_id), None);
    if let Some(webview) = app.get_webview(&tab_id) {
        let _ = webview.close();
    }
    Ok(())
}

#[tauri::command]
fn tab_reload(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        let _ = webview.eval("window.location.reload();");
    }
    Ok(())
}

#[tauri::command]
fn tab_go_back(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        let _ = webview.eval("window.history.back();");
    }
    Ok(())
}

#[tauri::command]
fn tab_go_forward(app: AppHandle, tab_id: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        let _ = webview.eval("window.history.forward();");
    }
    Ok(())
}

#[tauri::command]
fn tab_eval_js(app: AppHandle, tab_id: String, script: String) -> Result<(), String> {
    if let Some(webview) = app.get_webview(&tab_id) {
        let _ = webview.eval(&script);
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        log_event,
        get_debug_logs,
        clear_debug_logs,
        create_tab_webview,
        set_tab_webview_active,
        update_tab_webview_bounds,
        navigate_tab_webview,
        close_tab_webview,
        tab_reload,
        tab_go_back,
        tab_go_forward,
        tab_eval_js
    ])
    .setup(|app| {
      internal_log("INFO", "Lifecycle", "QanPrism Native Browser Engine initialized", None);
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

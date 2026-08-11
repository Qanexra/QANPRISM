use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use tauri::{LogicalPosition, LogicalSize, WebviewBuilder, WebviewUrl, Window, Manager};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageResponse {
    pub html: String,
    pub url: String,
    pub status: u16,
}

static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();

fn get_client() -> &'static reqwest::blocking::Client {
    CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
            .timeout(std::time::Duration::from_secs(15))
            .cookie_store(true)
            .build()
            .expect("Failed to initialize persistent HTTP client")
    })
}

#[tauri::command]
fn fetch_page_context(url: String) -> Result<PageResponse, String> {
    let client = get_client();

    let response = client.get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1")
        .send()
        .map_err(|e| e.to_string())?;

    let final_url = response.url().to_string();
    let status = response.status().as_u16();
    let html = response.text().map_err(|e| e.to_string())?;

    Ok(PageResponse {
        html,
        url: final_url,
        status,
    })
}

#[tauri::command]
fn create_or_update_tab_webview(
    window: Window,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let parsed_url = url.parse::<url::Url>().map_err(|e| e.to_string())?;
    
    if let Some(existing_webview) = window.get_webview(&label) {
        existing_webview
            .set_position(LogicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
        existing_webview
            .set_size(LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
        existing_webview.show().map_err(|e| e.to_string())?;
        let _ = existing_webview.eval(&format!("window.location.href = '{}';", url));
        return Ok(());
    }

    let webview_builder = WebviewBuilder::new(&label, WebviewUrl::External(parsed_url))
        .auto_resize();

    window
        .add_child(
            webview_builder,
            LogicalPosition::new(x, y),
            LogicalSize::new(width, height),
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn set_tab_webview_bounds(
    window: Window,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(webview) = window.get_webview(&label) {
        webview
            .set_position(LogicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
        webview
            .set_size(LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn set_tab_webview_visibility(
    window: Window,
    label: String,
    visible: bool,
) -> Result<(), String> {
    if let Some(webview) = window.get_webview(&label) {
        if visible {
            webview.show().map_err(|e| e.to_string())?;
        } else {
            webview.hide().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn close_tab_webview(window: Window, label: String) -> Result<(), String> {
    if let Some(webview) = window.get_webview(&label) {
        let _ = webview.close();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        fetch_page_context,
        create_or_update_tab_webview,
        set_tab_webview_bounds,
        set_tab_webview_visibility,
        close_tab_webview
    ])
    .setup(|app| {
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

use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;
use tauri::{AppHandle, Manager, WebviewBuilder, WebviewUrl, LogicalPosition, LogicalSize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PageResponse {
    pub html: String,
    pub url: String,
    pub status: u16,
    pub cookies: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ApiResponse {
    pub status: u16,
    pub status_text: String,
    pub body: String,
    pub headers: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: String,     // INFO, WARN, ERROR, NETWORK, AGENT
    pub category: String,  // Fetch, Navigation, Script, DOM, Agent, API
    pub message: String,
    pub details: Option<String>,
}

static CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();
static LOG_BUFFER: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();
static COOKIE_JAR: OnceLock<Mutex<HashMap<String, HashMap<String, String>>>> = OnceLock::new();

fn get_client() -> &'static reqwest::blocking::Client {
    CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 QanPrism/1.0")
            .timeout(std::time::Duration::from_secs(20))
            .cookie_store(true)
            .build()
            .expect("Failed to initialize persistent HTTP client")
    })
}

fn get_log_buffer() -> &'static Mutex<Vec<LogEntry>> {
    LOG_BUFFER.get_or_init(|| Mutex::new(Vec::with_capacity(500)))
}

fn get_cookie_jar() -> &'static Mutex<HashMap<String, HashMap<String, String>>> {
    COOKIE_JAR.get_or_init(|| Mutex::new(HashMap::new()))
}

fn save_response_cookies(url_str: &str, headers: &reqwest::header::HeaderMap) {
    let domain = if let Ok(parsed_url) = reqwest::Url::parse(url_str) {
        parsed_url.host_str().unwrap_or("").to_string()
    } else {
        return;
    };

    if let Ok(mut jar) = get_cookie_jar().lock() {
        let domain_cookies = jar.entry(domain.clone()).or_insert_with(HashMap::new);
        for cookie_header in headers.get_all(reqwest::header::SET_COOKIE) {
            if let Ok(cookie_str) = cookie_header.to_str() {
                if let Some(first_part) = cookie_str.split(';').next() {
                    let mut kv = first_part.splitn(2, '=');
                    if let (Some(k), Some(v)) = (kv.next(), kv.next()) {
                        let k_clean = k.trim().to_string();
                        let v_clean = v.trim().to_string();
                        if !k_clean.is_empty() {
                            domain_cookies.insert(k_clean, v_clean);
                        }
                    }
                }
            }
        }
    }
}

fn get_cookies_for_url(url_str: &str) -> String {
    let host = if let Ok(parsed_url) = reqwest::Url::parse(url_str) {
        parsed_url.host_str().unwrap_or("").to_string()
    } else {
        return String::new();
    };

    let mut result_map = HashMap::new();
    if let Ok(jar) = get_cookie_jar().lock() {
        for (domain, cookies) in jar.iter() {
            if host.ends_with(domain) || domain.ends_with(&host) || host == *domain {
                for (k, v) in cookies {
                    result_map.insert(k.clone(), v.clone());
                }
            }
        }
    }

    result_map.iter().map(|(k, v)| format!("{}={}", k, v)).collect::<Vec<_>>().join("; ")
}

fn get_current_timestamp() -> String {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = now.as_secs();
    let millis = now.subsec_millis();
    format!("{}.{:03}Z", secs, millis)
}

fn append_to_disk_log(entry: &LogEntry) {
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open("qanprism_debug.log") {
        let line = format!(
            "[{}] [{}] [{}] {} {}\n",
            entry.timestamp,
            entry.level,
            entry.category,
            entry.message,
            entry.details.as_deref().unwrap_or("")
        );
        let _ = file.write_all(line.as_bytes());
    }
}

fn internal_log(level: &str, category: &str, message: &str, details: Option<&str>) {
    let entry = LogEntry {
        id: format!("log-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos()),
        timestamp: get_current_timestamp(),
        level: level.to_string(),
        category: category.to_string(),
        message: message.to_string(),
        details: details.map(|s| s.to_string()),
    };

    append_to_disk_log(&entry);

    if let Ok(mut buffer) = get_log_buffer().lock() {
        if buffer.len() >= 500 {
            buffer.remove(0);
        }
        buffer.push(entry);
    }
}

#[tauri::command]
fn log_event(level: String, category: String, message: String, details: Option<String>) -> Result<(), String> {
    internal_log(&level, &category, &message, details.as_deref());
    Ok(())
}

#[tauri::command]
fn get_debug_logs() -> Result<Vec<LogEntry>, String> {
    let buffer = get_log_buffer().lock().map_err(|e| e.to_string())?;
    Ok(buffer.clone())
}

#[tauri::command]
fn clear_debug_logs() -> Result<(), String> {
    if let Ok(mut buffer) = get_log_buffer().lock() {
        buffer.clear();
    }
    let _ = std::fs::remove_file("qanprism_debug.log");
    internal_log("INFO", "System", "Debug logs cleared by user", None);
    Ok(())
}

#[tauri::command]
fn fetch_page_context(url: String) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    internal_log("NETWORK", "Fetch", &format!("Initiating request -> {}", url), None);

    let client = get_client();

    let response_result = client.get(&url)
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "none")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1")
        .send();

    let response = match response_result {
        Ok(resp) => resp,
        Err(err) => {
            let elapsed = start_time.elapsed().as_millis();
            let err_msg = format!("HTTP Request failed after {}ms: {}", elapsed, err);
            internal_log("ERROR", "Fetch", &err_msg, Some(&url));
            return Err(err_msg);
        }
    };

    let final_url = response.url().to_string();
    let status = response.status().as_u16();
    let elapsed = start_time.elapsed().as_millis();

    save_response_cookies(&final_url, response.headers());

    let html = match response.text() {
        Ok(text) => text,
        Err(err) => {
            let err_msg = format!("Failed to read response body: {}", err);
            internal_log("ERROR", "Fetch", &err_msg, Some(&final_url));
            return Err(err_msg);
        }
    };

    let size_kb = (html.len() as f64) / 1024.0;
    let log_level = if status >= 400 { "WARN" } else { "NETWORK" };
    let redirect_info = if final_url != url {
        Some(format!("Redirected from: {}", url))
    } else {
        None
    };

    internal_log(
        log_level,
        "Fetch",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, elapsed, size_kb, final_url),
        redirect_info.as_deref()
    );

    let cookies = get_cookies_for_url(&final_url);

    Ok(PageResponse {
        html,
        url: final_url,
        status,
        cookies,
    })
}

#[tauri::command]
fn submit_form_context(
    url: String,
    method: String,
    form_data: HashMap<String, String>,
) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    internal_log("NETWORK", "FormSubmit", &format!("Submitting {} request to -> {}", method.to_uppercase(), url), None);

    let client = get_client();

    let request_builder = if method.to_uppercase() == "POST" {
        client.post(&url).form(&form_data)
    } else {
        client.get(&url).query(&form_data)
    };

    let response_result = request_builder
        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
        .header("Accept-Language", "en-US,en;q=0.9,vi;q=0.8")
        .header("Sec-Fetch-Dest", "document")
        .header("Sec-Fetch-Mode", "navigate")
        .header("Sec-Fetch-Site", "same-origin")
        .header("Sec-Fetch-User", "?1")
        .header("Upgrade-Insecure-Requests", "1")
        .header("Referer", &url)
        .send();

    let response = match response_result {
        Ok(resp) => resp,
        Err(err) => {
            let elapsed = start_time.elapsed().as_millis();
            let err_msg = format!("Form submission failed after {}ms: {}", elapsed, err);
            internal_log("ERROR", "FormSubmit", &err_msg, Some(&url));
            return Err(err_msg);
        }
    };

    let final_url = response.url().to_string();
    let status = response.status().as_u16();
    let elapsed = start_time.elapsed().as_millis();

    save_response_cookies(&final_url, response.headers());

    let html = match response.text() {
        Ok(text) => text,
        Err(err) => {
            let err_msg = format!("Failed to read form response body: {}", err);
            internal_log("ERROR", "FormSubmit", &err_msg, Some(&final_url));
            return Err(err_msg);
        }
    };

    let size_kb = (html.len() as f64) / 1024.0;
    let log_level = if status >= 400 { "WARN" } else { "NETWORK" };
    let redirect_info = if final_url != url {
        Some(format!("Redirected from: {}", url))
    } else {
        None
    };

    internal_log(
        log_level,
        "FormSubmit",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, elapsed, size_kb, final_url),
        redirect_info.as_deref()
    );

    let cookies = get_cookies_for_url(&final_url);

    Ok(PageResponse {
        html,
        url: final_url,
        status,
        cookies,
    })
}

#[tauri::command]
fn fetch_api_context(
    url: String,
    method: String,
    headers: HashMap<String, String>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let client = get_client();
    let method_upper = method.to_uppercase();

    let mut req = match method_upper.as_str() {
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => client.get(&url),
    };

    for (k, v) in headers {
        if !k.eq_ignore_ascii_case("host") && !k.eq_ignore_ascii_case("content-length") {
            req = req.header(k, v);
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let response = req.send().map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("OK").to_string();
    
    save_response_cookies(&url, response.headers());

    let mut resp_headers = HashMap::new();
    for (k, v) in response.headers() {
        if let Ok(val_str) = v.to_str() {
            resp_headers.insert(k.as_str().to_string(), val_str.to_string());
        }
    }

    let body_text = response.text().unwrap_or_default();

    Ok(ApiResponse {
        status,
        status_text,
        body: body_text,
        headers: resp_headers,
    })
}

#[tauri::command]
fn create_or_update_tab_webview(
    app: AppHandle,
    tab_id: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    visible: bool,
) -> Result<(), String> {
    println!("create_or_update_tab_webview: tab={} url={} x={} y={} w={} h={} visible={}", tab_id, url, x, y, width, height, visible);
    
    let app_handle = app.clone();
    
    let _ = app.run_on_main_thread(move || {
        if let Some(window) = app_handle.get_window("main") {
            if let Some(existing) = app_handle.get_webview(&tab_id) {
                let _ = existing.set_position(LogicalPosition::new(x, y));
                let _ = existing.set_size(LogicalSize::new(width, height));
                if visible {
                    let _ = existing.show();
                    let _ = existing.set_focus();
                    if let Ok(current_url) = existing.url() {
                        if current_url.as_str() != url && !url.is_empty() {
                            if let Ok(parsed) = url.parse() {
                                let _ = existing.navigate(parsed);
                            }
                        }
                    }
                } else {
                    let _ = existing.hide();
                }
            } else {
                if !url.is_empty() {
                    if let Ok(parsed) = url.parse() {
                        let builder = WebviewBuilder::new(&tab_id, WebviewUrl::External(parsed))
                            .auto_resize();

                        match window.add_child(
                            builder,
                            LogicalPosition::new(x, y),
                            LogicalSize::new(width, height),
                        ) {
                            Ok(wv) => {
                                if visible {
                                    let _ = wv.show();
                                    let _ = wv.set_focus();
                                } else {
                                    let _ = wv.hide();
                                }
                            },
                            Err(e) => {
                                eprintln!("Failed to add child webview for tab {}: {:?}", tab_id, e);
                            }
                        }
                    }
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn navigate_tab_webview(app: AppHandle, tab_id: String, url: String) -> Result<(), String> {
    let app_handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(existing) = app_handle.get_webview(&tab_id) {
            if let Ok(parsed) = url.parse() {
                let _ = existing.navigate(parsed);
            }
        }
    });
    Ok(())
}

#[tauri::command]
fn close_tab_webview(app: AppHandle, tab_id: String) -> Result<(), String> {
    let app_handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(existing) = app_handle.get_webview(&tab_id) {
            let _ = existing.close();
        }
    });
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        create_or_update_tab_webview,
        navigate_tab_webview,
        close_tab_webview,
        fetch_page_context,
        submit_form_context,
        fetch_api_context,
        log_event,
        get_debug_logs,
        clear_debug_logs
    ])
    .setup(|app| {
      internal_log("INFO", "Lifecycle", "QanPrism Core Engine initialized", None);
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

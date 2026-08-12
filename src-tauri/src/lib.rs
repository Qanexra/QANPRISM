use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use std::collections::HashMap;


// Shared persistent HTTP client with cookie jar for the qanprism:// proxy
static PROXY_CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();

fn get_proxy_client() -> &'static reqwest::blocking::Client {
    PROXY_CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .cookie_store(true)
            .redirect(reqwest::redirect::Policy::none())
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
            .tcp_nodelay(true)
            .pool_max_idle_per_host(50)
            .pool_idle_timeout(Some(std::time::Duration::from_secs(90)))
            .build()
            .unwrap()
    })
}

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
    internal_log("INFO", "Diagnostics", "Debug logs buffer cleared by user", None);
    Ok(())
}

#[tauri::command]
fn fetch_page_context(url: String) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    internal_log("NETWORK", "Fetch", &format!("Initiating request -> {}", url), None);

    let client = get_client();
    let mut req = client.get(&url);

    let stored_cookies = get_cookies_for_url(&url);
    if !stored_cookies.is_empty() {
        req = req.header("Cookie", stored_cookies);
    }

    let response = req.send().map_err(|e| {
        let err_msg = format!("Network request failed: {}", e);
        internal_log("ERROR", "Fetch", &err_msg, Some(&url));
        err_msg
    })?;

    let duration_ms = start_time.elapsed().as_millis();
    let status = response.status().as_u16();
    let final_url = response.url().to_string();

    save_response_cookies(&final_url, response.headers());

    let cookies = get_cookies_for_url(&final_url);
    let html = response.text().unwrap_or_default();

    let details_msg = if final_url != url {
        format!("Redirected from: {}", url)
    } else {
        format!("Loaded in {}ms", duration_ms)
    };

    let log_level = if status >= 400 { "ERROR" } else { "NETWORK" };
    internal_log(
        log_level,
        "Fetch",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, duration_ms, html.len() as f64 / 1024.0, final_url),
        Some(&details_msg),
    );

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
    form_data: HashMap<String, String>,
    method: Option<String>,
) -> Result<PageResponse, String> {
    let start_time = Instant::now();
    let http_method = method.unwrap_or_else(|| "POST".to_string()).to_uppercase();
    internal_log("NETWORK", "FormSubmit", &format!("Submitting form [{}] -> {}", http_method, url), None);

    let client = get_client();
    let mut req = match http_method.as_str() {
        "GET" => client.get(&url).query(&form_data),
        _ => client.post(&url).form(&form_data),
    };

    let stored_cookies = get_cookies_for_url(&url);
    if !stored_cookies.is_empty() {
        req = req.header("Cookie", stored_cookies);
    }

    let response = req.send().map_err(|e| {
        let err_msg = format!("Form submission failed: {}", e);
        internal_log("ERROR", "FormSubmit", &err_msg, Some(&url));
        err_msg
    })?;

    let duration_ms = start_time.elapsed().as_millis();
    let status = response.status().as_u16();
    let final_url = response.url().to_string();

    save_response_cookies(&final_url, response.headers());

    let cookies = get_cookies_for_url(&final_url);
    let html = response.text().unwrap_or_default();

    let log_level = if status >= 400 { "ERROR" } else { "NETWORK" };
    internal_log(
        log_level,
        "FormSubmit",
        &format!("Status: {} ({}ms, {:.1} KB) -> {}", status, duration_ms, html.len() as f64 / 1024.0, final_url),
        None,
    );

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
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
) -> Result<ApiResponse, String> {
    let start_time = Instant::now();
    let http_method = method.to_uppercase();
    internal_log("NETWORK", "ApiCall", &format!("API Request [{}] -> {}", http_method, url), None);

    let client = get_client();
    let req_method = reqwest::Method::from_bytes(http_method.as_bytes())
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut req = client.request(req_method, &url);

    let stored_cookies = get_cookies_for_url(&url);
    if !stored_cookies.is_empty() {
        req = req.header("Cookie", stored_cookies);
    }

    if let Some(custom_headers) = headers {
        for (k, v) in custom_headers {
            req = req.header(k, v);
        }
    }

    if let Some(b) = body {
        req = req.body(b);
    }

    let response = req.send().map_err(|e| {
        let err_msg = format!("API Request failed: {}", e);
        internal_log("ERROR", "ApiCall", &err_msg, Some(&url));
        err_msg
    })?;

    let _duration_ms = start_time.elapsed().as_millis();
    let status = response.status().as_u16();
    let status_text = response.status().canonical_reason().unwrap_or("").to_string();

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

// Legacy webview commands removed as architecture has migrated to qanprism:// protocol

fn sanitize_set_cookie(cookie: &str) -> String {
    let parts: Vec<&str> = cookie.split(';').collect();
    let mut new_parts = Vec::new();
    for part in parts {
        let trimmed = part.trim();
        let lower = trimmed.to_lowercase();
        if lower.starts_with("domain=") {
            continue;
        }
        if lower == "secure" {
            continue;
        }
        if lower.starts_with("samesite=") {
            new_parts.push("SameSite=Lax");
            continue;
        }
        if lower.starts_with("path=") {
            new_parts.push("Path=/");
            continue;
        }
        new_parts.push(trimmed);
    }
    if !new_parts.iter().any(|p| p.to_lowercase().starts_with("path=")) {
        new_parts.push("Path=/");
    }
    new_parts.join("; ")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .register_uri_scheme_protocol("qanprism", move |_app, request| {
        let path = request.uri().path().strip_prefix('/').unwrap_or(request.uri().path());
        
        let mut target_url = String::new();
        
        // Check if path is URL-encoded full URL
        let path_lower = path.to_lowercase();
        if path_lower.starts_with("http%3a") || path_lower.starts_with("https%3a") {
            // It's the root iframe request
            if let Ok(decoded) = urlencoding::decode(path) {
                target_url = decoded.into_owned();
                if let Some(query) = request.uri().query() {
                    if !target_url.contains('?') {
                        target_url = format!("{}?{}", target_url, query);
                    }
                }
            }
        } else if path_lower.starts_with("http://") || path_lower.starts_with("https://") {
            target_url = path.to_string();
            if let Some(query) = request.uri().query() {
                if !target_url.contains('?') {
                    target_url = format!("{}?{}", target_url, query);
                }
            }
        } else if path_lower.starts_with("http:/") || path_lower.starts_with("https:/") {
            // Handle collapsed slashes
            let fixed = if path_lower.starts_with("https:/") {
                format!("https://{}", &path[7..])
            } else {
                format!("http://{}", &path[6..])
            };
            target_url = fixed;
            if let Some(query) = request.uri().query() {
                if !target_url.contains('?') {
                    target_url = format!("{}?{}", target_url, query);
                }
            }
        } else {
            // It's a relative request, check Referer
            let mut referer_str = String::new();
            if let Some(r) = request.headers().get("referer") {
                if let Ok(r_str) = r.to_str() {
                    referer_str = r_str.to_string();
                }
            }
            
            if !referer_str.is_empty() {
                if let Ok(ref_url) = reqwest::Url::parse(&referer_str) {
                    let ref_path = ref_url.path().strip_prefix('/').unwrap_or("");
                    let ref_path_lower = ref_path.to_lowercase();
                    if ref_path_lower.starts_with("http%3a") || ref_path_lower.starts_with("https%3a") {
                        if let Ok(decoded_ref) = urlencoding::decode(ref_path) {
                            if let Ok(base_url) = reqwest::Url::parse(&decoded_ref) {
                                if let Ok(resolved) = base_url.join(&format!("/{}", path)) {
                                    let mut final_url = resolved;
                                    if let Some(query) = request.uri().query() {
                                        final_url.set_query(Some(query));
                                    }
                                    target_url = final_url.to_string();
                                }
                            }
                        }
                    } else if referer_str.starts_with("http://") || referer_str.starts_with("https://") {
                        if let Ok(base_url) = reqwest::Url::parse(&referer_str) {
                            if let Ok(resolved) = base_url.join(&format!("/{}", path)) {
                                target_url = resolved.to_string();
                            }
                        }
                    }
                }
            }
        }
        
        if target_url.is_empty() {
            internal_log("WARN", "Fetch", &format!("Missing Target URL or Referer for path: {}", path), None);
            return tauri::http::Response::builder()
                .status(400)
                .body(b"Bad Request: Missing Target URL or Referer".to_vec())
                .unwrap();
        }

        let start_time = Instant::now();
        let client = get_proxy_client();

        let method_str = request.method().as_str();
        let req_method = reqwest::Method::from_bytes(method_str.as_bytes()).unwrap_or(reqwest::Method::GET);
        let mut req_builder = client.request(req_method.clone(), &target_url);

        let mut incoming_referer_url = String::new();
        if let Some(r) = request.headers().get("referer") {
            if let Ok(r_str) = r.to_str() {
                if let Ok(ref_url) = reqwest::Url::parse(r_str) {
                    let ref_path = ref_url.path().strip_prefix('/').unwrap_or("");
                    let ref_path_lower = ref_path.to_lowercase();
                    if ref_path_lower.starts_with("http%3a") || ref_path_lower.starts_with("https%3a") {
                        if let Ok(decoded_ref) = urlencoding::decode(ref_path) {
                            incoming_referer_url = decoded_ref.into_owned();
                        }
                    } else if r_str.starts_with("http://") || r_str.starts_with("https://") {
                        incoming_referer_url = r_str.to_string();
                    }
                }
            }
        }

        // Forward headers safely (exclude host, origin, referer, cookie, accept-encoding, sec-fetch-* so reqwest handles per-domain cookie jar & decompression cleanly)
        for (k, v) in request.headers() {
            let k_lower = k.as_str().to_lowercase();
            if k_lower == "host" 
                || k_lower == "origin" 
                || k_lower == "referer" 
                || k_lower == "cookie"
                || k_lower == "accept-encoding"
                || k_lower == "sec-fetch-site" 
                || k_lower == "sec-fetch-mode" 
                || k_lower == "sec-fetch-dest"
                || k_lower == "content-length"
            {
                continue;
            }
            if let Ok(header_val) = reqwest::header::HeaderValue::from_bytes(v.as_bytes()) {
                if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(k.as_str().as_bytes()) {
                    req_builder = req_builder.header(header_name, header_val);
                }
            }
        }

        // Add proper origin and referer for the target site to prevent CSRF blocks
        if let Ok(parsed_target) = reqwest::Url::parse(&target_url) {
            let origin = format!("{}://{}", parsed_target.scheme(), parsed_target.host_str().unwrap_or(""));
            if req_method != reqwest::Method::GET && req_method != reqwest::Method::HEAD {
                req_builder = req_builder.header("Origin", origin);
            }
            if !incoming_referer_url.is_empty() {
                req_builder = req_builder.header("Referer", incoming_referer_url);
            } else {
                req_builder = req_builder.header("Referer", &target_url);
            }
        }

        // Forward the request body (critical for POST form submissions like login!)
        let body = request.body().to_vec();
        if !body.is_empty() {
            req_builder = req_builder.body(body);
        }

        if let Ok(response) = req_builder.send() {
            let duration_ms = start_time.elapsed().as_millis();
            let status_code = response.status().as_u16();

            let mut builder = tauri::http::Response::builder()
                .status(status_code);

            // Capture content-type for HTML rewriting decision later
            let builder_content_type = response.headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_lowercase();

            // Iterate all headers including multiple values per name (e.g. Set-Cookie)
            for name in response.headers().keys() {
                let k_lower = name.as_str().to_lowercase();
                // Strip CORS, CSP, compression, and content-length headers
                // (reqwest has already decompressed bytes, and Tauri calculates body length)
                if k_lower == "x-frame-options" 
                    || k_lower == "content-security-policy" 
                    || k_lower == "content-security-policy-report-only" 
                    || k_lower == "cross-origin-opener-policy" 
                    || k_lower == "content-encoding"
                    || k_lower == "content-length"
                    || k_lower == "transfer-encoding"
                {
                    continue;
                }

                for v in response.headers().get_all(name) {
                    if let Ok(v_str) = v.to_str() {
                        if k_lower == "set-cookie" {
                            let sanitized = sanitize_set_cookie(v_str);
                            builder = builder.header("set-cookie", sanitized);
                        } else if k_lower == "location" {
                            let next_url = if let Ok(parsed_target) = reqwest::Url::parse(&target_url) {
                                parsed_target.join(v_str).map(|u| u.to_string()).unwrap_or_else(|_| v_str.to_string())
                            } else {
                                v_str.to_string()
                            };
                            let encoded_loc = urlencoding::encode(&next_url);
                            builder = builder.header("location", format!("http://qanprism.localhost/{}", encoded_loc));
                        } else {
                            builder = builder.header(name.as_str(), v_str);
                        }
                    }
                }
            }

            let bytes = response.bytes().unwrap_or_default().to_vec();
            let body_len = bytes.len();
            let details_msg = format!("{} bytes, {}ms", body_len, duration_ms);

            internal_log(
                if status_code >= 400 { "WARN" } else { "NETWORK" },
                "Response",
                &format!("Status: {} ({}) -> {}", status_code, details_msg, target_url),
                Some(&details_msg),
            );
            
            // Check if this is an HTML response — if so, inject the navigation interceptor
            let content_type = builder_content_type.clone();
            let final_body = if content_type.contains("text/html") {
                if let Ok(mut html) = String::from_utf8(bytes.clone()) {
                    let interceptor_template = r#"<script data-qp-injected="true">
(function() {
  var currentTarget = "TARGET_URL_PLACEHOLDER";
  
  function proxyUrl(url) {
    if (!url || typeof url !== 'string') return url;
    var s = url.trim();
    if (s.startsWith('http://qanprism.localhost/')) return s;
    if (s.startsWith('javascript:') || s.startsWith('data:') || s.startsWith('blob:') || s.startsWith('#')) return url;
    try {
      var absolute = new URL(s, currentTarget).href;
      return 'http://qanprism.localhost/' + encodeURIComponent(absolute);
    } catch(e) {
      if (s.startsWith('https://') || s.startsWith('http://')) {
        return 'http://qanprism.localhost/' + encodeURIComponent(s);
      }
      return url;
    }
  }

  // Intercept fetch()
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function(input, init) {
      try {
        if (typeof input === 'string') {
          input = proxyUrl(input);
        } else if (input && input.url) {
          input = new Request(proxyUrl(input.url), input);
        }
      } catch(e) {}
      return origFetch.call(this, input, init);
    };
  }

  // Intercept XMLHttpRequest.open
  var origOpen = XMLHttpRequest.prototype.open;
  if (origOpen) {
    XMLHttpRequest.prototype.open = function(method, url) {
      try {
        arguments[1] = proxyUrl(url);
      } catch(e) {}
      return origOpen.apply(this, arguments);
    };
  }

  // Intercept window.open
  var origWindowOpen = window.open;
  if (origWindowOpen) {
    window.open = function(url, target, features) {
      return origWindowOpen.call(window, proxyUrl(url), target, features);
    };
  }

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (a) {
      var rawHref = a.getAttribute('href');
      if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('#')) {
        var proxied = proxyUrl(rawHref);
        if (proxied && !proxied.startsWith('javascript:')) {
          e.preventDefault();
          window.location.href = proxied;
        }
      }
    }
  }, true);

  // Intercept form submissions via event
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form) {
      var rawAction = form.getAttribute('action') || currentTarget;
      form.action = proxyUrl(rawAction);
    }
  }, true);

  // Intercept programmatic form.submit() calls
  if (window.HTMLFormElement && HTMLFormElement.prototype) {
    var origFormSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      try {
        var rawAction = this.getAttribute('action') || currentTarget;
        this.action = proxyUrl(rawAction);
      } catch(e) {}
      return origFormSubmit.call(this);
    };
  }
})();
</script>"#;
                    
                    let interceptor = interceptor_template.replace("TARGET_URL_PLACEHOLDER", &target_url);

                    // Insert after <head> or at the very start
                    if let Some(pos) = html.find("<head>") {
                        html.insert_str(pos + 6, &interceptor);
                    } else if let Some(pos) = html.find("<head ") {
                        // Find the closing > of <head ...>
                        if let Some(end) = html[pos..].find('>') {
                            html.insert_str(pos + end + 1, &interceptor);
                        }
                    } else if let Some(pos) = html.find("<HEAD>") {
                        html.insert_str(pos + 6, &interceptor);
                    } else {
                        // Prepend it
                        html = format!("{}{}", interceptor, html);
                    }
                    
                    html.into_bytes()
                } else {
                    bytes
                }
            } else {
                bytes
            };
            
            builder.body(final_body).unwrap_or_else(|_| {
                tauri::http::Response::builder().status(500).body(b"Internal Error".to_vec()).unwrap()
            })
        } else {
            tauri::http::Response::builder().status(502).body(b"Bad Gateway".to_vec()).unwrap()
        }
    })
    .invoke_handler(tauri::generate_handler![
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
